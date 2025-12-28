import React, { useEffect, useMemo, useState, useCallback, Suspense } from "react";
import ReactDOM from "react-dom/client";
import { ethers } from "ethers";
import { MERLIN_NETWORK, CONTRACT_ADDRESS, LOTTERY_ABI } from "./constants";
import { Ticket, Draw } from "./types";

const ProfileModal = React.lazy(() => import('./components/ProfileModal'));
const ResultsModal = React.lazy(() => import('./components/ResultsModal'));
const GuideModal = React.lazy(() => import('./components/GuideModal'));

import { Pill } from "./components/Pill";
import { PrimaryButton } from "./components/PrimaryButton";
import { TicketCard } from "./components/TicketCard";

// FIX: Add type definition for window.ethereum to fix TypeScript errors.
declare global {
  interface Window {
    ethereum: any;
  }
}

// --- CONSTANTS ---
const PRELOADED_AVATARS = [
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Felix",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Luna",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Milo",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Chloe",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Jasper"
];

const COINGECKO_API_URL = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";
const ONCHAIN_SEED_PHRASE = "onchain-jackpot-v3-merlin-stable";

// --- UTILS ---
const pad2 = (n: number) => String(n).padStart(2, "0");

// --- SUB-COMPONENTS ---
const TimeDisplay = ({ value, label }: { value: string, label: string }) => (
  <div className="flex flex-col items-center">
    <div className="text-2xl md:text-4xl font-black font-display tracking-tighter text-[#04211C] dark:text-white">{value}</div>
    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-emerald-600/50 dark:text-white/60">{label}</span>
  </div>
);

const TicketPreview = ({ t, numbers, timestamp, formatDate, formatTime }: any) => {
    const displayNumbers = [...numbers];
    while (displayNumbers.length < 4) {
        displayNumbers.push(null);
    }

    return (
        <div className="mb-8">
            <label className="text-xs font-black uppercase tracking-widest text-black/60 dark:text-white/60 mb-3 block">{t.preview}</label>
            <div className="rounded-3xl p-6 relative overflow-hidden bg-gradient-to-br from-[#0D6B58] to-[#04211C] text-white border border-emerald-500/20 shadow-lg">
                 <div className="flex justify-between items-center">
                    <h3 className="font-bold font-display text-lg text-emerald-400">Onchain Ticket</h3>
                    <Pill variant="mint">UNMINTED</Pill>
                </div>
                 <div className="flex justify-center gap-3 my-6">
                    {displayNumbers.map((n, i) => (
                        <div key={i} className="h-16 w-16 bg-black/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl font-black border border-emerald-500/30 shadow-md">
                            {n !== null ? n : '?'}
                        </div>
                    ))}
                </div>
                <div>
                    <p className="text-xs font-bold uppercase tracking-widest opacity-60 text-center">Draw Date</p>
                    <p className="text-center font-bold">{timestamp ? `${formatDate(timestamp)} - ${formatTime(timestamp)}` : '...'}</p>
                </div>
            </div>
        </div>
    );
};

const SystemStatusIndicator: React.FC<{ isDelayed: boolean; t: any }> = ({ isDelayed, t }) => {
  if (isDelayed) {
    return (
      <div className="relative group hidden lg:block">
        <Pill variant="warning">{t.systemDelayed}</Pill>
        <div className="absolute top-full mt-2 w-64 bg-white dark:bg-black border dark:border-gray-700 rounded-lg shadow-lg p-3 text-xs text-left opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
          <p className="font-bold mb-1 text-gray-800 dark:text-white">{t.systemDelayedTooltipTitle}</p>
          <p className="text-gray-600 dark:text-gray-400">{t.systemDelayedTooltipDesc}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group hidden lg:block">
      <Pill variant="mint">{t.systemOperational}</Pill>
      <div className="absolute top-full mt-2 w-64 bg-white dark:bg-black border dark:border-gray-700 rounded-lg shadow-lg p-3 text-xs text-left opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        <p className="font-bold mb-1 text-gray-800 dark:text-white">{t.systemOperationalTooltipTitle}</p>
        <p className="text-gray-600 dark:text-gray-400">{t.systemOperationalTooltipDesc}</p>
      </div>
    </div>
  );
};


// --- MAIN APP ---
function App() {
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  
  // On-chain state
  const [jackpot, setJackpot] = useState(0.00);
  const [ticketPrice, setTicketPrice] = useState(0.00);
  const [referralBalance, setReferralBalance] = useState(0.00);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [previousDraws, setPreviousDraws] = useState<Record<string, Draw>>({});
  const [userReferrer, setUserReferrer] = useState<string | null>(null);

  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const [now, setNow] = useState(new Date());
  
  // UI State
  const [txStatus, setTxStatus] = useState<'idle' | 'awaiting' | 'mining' | 'success' | 'error'>('idle');
  const [isConnecting, setIsConnecting] = useState(false);
  const [claimStatus, setClaimStatus] = useState<Record<string, 'idle' | 'claiming' | 'success'>>({});
  const [referrerFromUrl, setReferrerFromUrl] = useState<string | null>(null);
  const [isSettingReferrer, setIsSettingReferrer] = useState(false);
  const [isClaimingReferral, setIsClaimingReferral] = useState(false);

  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);

  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState<{timestamp: number, numbers: number[]} | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const [profile, setProfile] = useState({ username: "LuckyPlayer", bio: "Onchain Enthusiast", avatarUrl: PRELOADED_AVATARS[0] });


  // --- TRANSLATIONS ---
  const translations = {
    en: {
      title: "Onchain Jackpot", connect: "Connect", heroTitle: "Onchain Daily Prediction",
      heroSubtitle: "Verifiable jackpot settles twice daily at 00:00 & 12:00 UTC. Every entry is a unique ticket minted on MerlinChain.",
      mintTitle: "Mint New Entry", selectSchedule: "SELECT PREDICTION SCHEDULE",
      select4: "SELECT 4 NUMBERS (1-9)", randomize: "Randomize", purchase: "Mint Ticket",
      viewResults: "VIEW RESULTS", howItWorks: "HOW IT WORKS", countdownTitle: "Next Prediction Countdown", countdownSub: "00:00 & 12:00 UTC",
      myTickets: "My Entries", profile: "Profile", referral: "Referral & Rewards", logout: "Logout",
      save: "Save Changes", copyLink: "Copy Link", jackpotLabel: "JACKPOT", network: "MerlinChain",
      switchToTestnet: "Switch to MerlinChain", latestResult: "Latest Result", settledMsg: "PREDICTION SUCCESSFULLY SETTLED",
      verifyingOnchain: "Verifying Onchain Entropy...", revealSuccess: "Settlement Complete", days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds",
      totalPrice: "TOTAL PRICE", gasFeesNote: "+ Gas Fees Apply", targetLottery: "TARGET DRAW",
      referralBonus: "EARN ONCHAIN REWARDS FOR EVERY TICKET MINTED THROUGH YOUR LINK",
      footer: "Onchain Prediction • Powered by MerlinChain • Verifiable Assets",
      step1Title: "Connect & Switch", step1Desc: "Connect your wallet and switch to MerlinChain.",
      step2Title: "Pick Your Numbers", step2Desc: "Select 4 numbers between 1-9. The order does not matter. These will be encoded into your ticket's on-chain data.",
      step3Title: "Mint Your Entry", step3Desc: "Confirm the transaction to mint your unique ticket. Price is set by the contract owner.",
      step4Title: "Claim the Jackpot", step4Desc: "If your ticket's numbers match the daily prediction exactly, you can claim your share of the jackpot prize pool!",
      rules: "Prediction Rules", rule1: "A prediction event occurs every 12 hours (00:00 & 12:00 UTC).",
      rule2: "Predictions use deterministic on-chain entropy to ensure fairness.",
      rule3: "Jackpot is shared among all winners of that specific prediction window.",
      rule4: "Referral fees are paid instantly upon successful minting if a referrer is set.",
      disclaimer: "Legal Disclaimer", disclaimerText: "Onchain Jackpot is an experimental verifiable game of chance. Participating in predictions involves financial risk.",
      available: "Available to Claim", claimAll: "Claim All Rewards", editProfile: "Edit Profile",
      uploadAvatar: "Upload Image", bioLabel: "Bio / Motto", nameLabel: "Display Name",
      winner: "Winner!", claimPrize: "Claim Prize", claimed: "Claimed", winningNums: "Winning Numbers", matching: "Matching",
      previousDrawings: "Previous Predictions", winnersList: "Winners", noWinners: "No winners for this draw.",
      verifyFairness: "Verify Fairness", fairnessCheck: "Fairness Check", onchainSeed: "On-Chain Seed",
      hashingProcess: "Hashing Process", verifiedOutput: "Verified Output", verifiedOnchain: "Verified Fair & On-Chain",
      noSettledPredictions: "No settled predictions yet. Results will appear here after the first draw concludes.",
      saveReferrer: "Save Referrer", referrerFound: "Referrer found! Save them to earn rewards on future mints.",
      totalEarned: "Total Earned",
      noTicketsFound: "No tickets found.",
      mintToSee: "Mint an entry to see it here.",
      rolledOver: "Rolled Over",
      copied: "Copied!", yourReferralLink: "Your Referral Link",
      myNfts: "My NFTs", comingSoon: "Coming Soon!",
      noDrawsAvailable: "No upcoming draws available.",
      checkBackLater: "Please check back later.",
      createNftTicket: "Create NFT Ticket",
      noNftTickets: "No NFT Tickets Found.",
      mintOneToStart: "Mint your first ticket to see it here.",
      preview: "Preview",
      clear: "Clear",
      systemOperational: "System Operational",
      systemDelayed: "System Delayed",
      systemOperationalTooltipTitle: "All Systems Go!",
      systemOperationalTooltipDesc: "Draws are being settled automatically and on schedule.",
      systemDelayedTooltipTitle: "Settlement Delayed",
      systemDelayedTooltipDesc: "The automated process for finalizing draws is temporarily behind schedule. New entries are still being accepted.",
    },
    zh: {
      title: "链上大奖", connect: "连接", heroTitle: "链上每日预测",
      heroSubtitle: "可验证奖池每日 00:00 和 12:00 UTC 定时结算。每一次投注都会在 MerlinChain 上铸造一张独一无二的票证。",
      mintTitle: "铸造新票证", selectSchedule: "选择开奖时间",
      select4: "选择 4 个数字 (1-9)", randomize: "随机生成", purchase: "铸造票证",
      viewResults: "查看结果", howItWorks: "运作方式", countdownTitle: "下次预测倒计时", countdownSub: "00:00 & 12:00 UTC",
      myTickets: "我的票证", profile: "个人中心", referral: "推荐奖励", logout: "断开连接",
      save: "保存修改", copyLink: "复制链接", jackpotLabel: "当前奖池", network: "MerlinChain",
      switchToTestnet: "切换至 MerlinChain", latestResult: "最新开奖", settledMsg: "预测已成功结算",
      verifyingOnchain: "验证链上数据...", revealSuccess: "结算完成", days: "天", hours: "小时", minutes: "分钟", seconds: "秒",
      totalPrice: "总价", gasFeesNote: "+ 需支付网络 Gas 费", targetLottery: "目标期数",
      referralBonus: "通过您的链接每铸造一张票证，均可赚取链上奖励",
      footer: "链上预测 • 由 MerlinChain 提供支持 • 可验证资产",
      step1Title: "连接并切换", step1Desc: "连接您的钱包并切换到 MerlinChain。",
      step2Title: "选择号码", step2Desc: "在 1-9 之间选择 4 个数字。顺序无关紧要。这些将编码到您票证的链上数据中。",
      step3Title: "铸造投注", step3Desc: "确认交易以铸造您唯一的票证。价格由合约所有者设定。",
      step4Title: "领取大奖", step4Desc: "如果您的票证号码与每日预测完全匹配，即可领取奖池奖金份额！",
      rules: "预测规则", rule1: "每 12 小时进行一次预测 (00:00 & 12:00 UTC)。",
      rule2: "预测使用确定的链上随机熵，确保公平性。",
      rule3: "奖池由该特定预测时段的所有中奖者平分。",
      rule4: "如果设置了推荐人，成功铸造后将立即支付推荐费。",
      disclaimer: "法律声明", disclaimerText: "Onchain Jackpot 是一款实验性的几率游戏。参与预测涉及财务风险。",
      available: "可领取金额", claimAll: "领取所有奖励", editProfile: "编辑资料",
      uploadAvatar: "上传图片", bioLabel: "个人简介", nameLabel: "显示名称",
      winner: "中奖!", claimPrize: "领取奖金", claimed: "已领取", winningNums: "中奖号码", matching: "匹配",
      previousDrawings: "往期预测", winnersList: "中奖名单", noWinners: "本期无人中奖。",
      verifyFairness: "验证公平性", fairnessCheck: "公平性检查", onchainSeed: "链上种子",
      hashingProcess: "哈希过程", verifiedOutput: "已验证输出", verifiedOnchain: "已验证公平上链",
      noSettledPredictions: "尚无已结算的预测。首次开奖结束后，结果将显示在此处。",
      saveReferrer: "保存推荐人", referrerFound: "发现推荐人！保存后，您未来的铸造将产生奖励。",
      totalEarned: "总收益",
      noTicketsFound: "未找到任何票证。",
      mintToSee: "铸造一张票证即可在此处查看。",
      rolledOver: "已滚存",
      copied: "已复制!", yourReferralLink: "您的推荐链接",
      myNfts: "我的NFT", comingSoon: "敬请期待!",
      noDrawsAvailable: "暂无即将开始的抽奖。",
      checkBackLater: "请稍后再试。",
      createNftTicket: "创建NFT票证",
      noNftTickets: "未找到任何NFT票证。",
      mintOneToStart: "铸造您的第一张票证即可在此处查看。",
      preview: "预览",
      clear: "清空",
      systemOperational: "系统运行正常",
      systemDelayed: "系统延迟",
      systemOperationalTooltipTitle: "一切正常！",
      systemOperationalTooltipDesc: "开奖结算正按计划自动进行。",
      systemDelayedTooltipTitle: "结算延迟",
      systemDelayedTooltipDesc: "自动完成开奖的流程暂时落后于计划。仍然接受新的投注。",
    }
  };

  const t = translations[lang];

  // --- WEB3 & CONTRACT INTERACTION ---

  // Initialize provider and contract
  useEffect(() => {
    if (window.ethereum) {
      const ethProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(ethProvider);
      // FIX: Use ethers.isAddress for robust validation of the contract address, which also resolves the TypeScript error.
      if (CONTRACT_ADDRESS && ethers.isAddress(CONTRACT_ADDRESS)) {
        const lotteryContract = new ethers.Contract(CONTRACT_ADDRESS, LOTTERY_ABI, ethProvider);
        setContract(lotteryContract);
      }
    }
  }, []);

  // Handle account and chain changes
  useEffect(() => {
    const handleAccountsChanged = (accs: string[]) => {
      setAccount(accs[0] || null);
      if (!accs[0]) { // On disconnect
        setShowProfileModal(false);
      }
    };
    const handleChainChanged = (cid: string) => setChainId(cid);

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
      
      // Initial fetch
      window.ethereum.request({ method: 'eth_accounts' }).then(handleAccountsChanged);
      window.ethereum.request({ method: 'eth_chainId' }).then(handleChainChanged);
    }
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  // Check for referrer in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    if (refCode && ethers.isAddress(refCode)) {
      setReferrerFromUrl(refCode);
    }
  }, []);
  
  // Load profile from local storage
  useEffect(() => {
    const savedProfile = localStorage.getItem(`profile_${account}`);
    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    } else {
      // Reset to default if no saved profile for this account
      setProfile({ username: "LuckyPlayer", bio: "Onchain Enthusiast", avatarUrl: PRELOADED_AVATARS[0] });
    }
  }, [account]);

  const predictionSlots = useMemo(() => {
    const slots: number[] = [];
    const nowMs = now.getTime();
    const startHour = Math.floor(nowMs / 3600000) * 3600000;
    for (let i = 0; i < 240; i++) {
        const t = startHour + (i * 3600000);
        if (t <= nowMs) continue;
        const d = new Date(t);
        if (d.getUTCHours() === 0 || d.getUTCHours() === 12) slots.push(t);
        if (slots.length >= 10) break;
    }
    return slots.sort((a, b) => a - b);
  }, [now]);
  
  const [selectedPredictionSlot, setSelectedPredictionSlot] = useState<number | undefined>(predictionSlots[0]);

  useEffect(() => {
    if (predictionSlots.length > 0 && (!selectedPredictionSlot || !predictionSlots.includes(selectedPredictionSlot))) {
      setSelectedPredictionSlot(predictionSlots[0]);
    } else if (predictionSlots.length === 0) {
      setSelectedPredictionSlot(undefined);
    }
  }, [predictionSlots, selectedPredictionSlot]);

  const isCorrectChain = useMemo(() => {
    if (!chainId) return false;
    const hexId = chainId.startsWith('0x') ? chainId.toLowerCase() : `0x${parseInt(chainId, 10).toString(16)}`;
    return hexId === MERLIN_NETWORK.chainId.toLowerCase();
  }, [chainId]);

  const fetchContractData = useCallback(async () => {
    if (!contract || !isCorrectChain) {
      setTicketPrice(0);
      setJackpot(0);
      return;
    }
    try {
      // Always fetch public data
      const [price, totalJackpot] = await Promise.all([
        contract.ticketPrice(),
        contract.getJackpot()
      ]);
      setTicketPrice(parseFloat(ethers.formatEther(price)));
      setJackpot(parseFloat(ethers.formatEther(totalJackpot)));

      // Fetch user-specific data only if connected
      if (account) {
        const [refBalance, userTickets, refOf] = await Promise.all([
          contract.referralBalances(account),
          contract.getTicketsByOwner(account),
          contract.referrerOf(account)
        ]);
        
        setReferralBalance(parseFloat(ethers.formatEther(refBalance)));
        setUserReferrer(refOf === ethers.ZeroAddress ? null : refOf);
        
        const formattedTickets = userTickets.map((t: any) => ({
          id: t.id.toString(),
          owner: t.owner,
          numbers: t.numbers.map(Number),
          drawTimestamp: Number(t.drawTimestamp) * 1000,
          claimed: t.claimed,
        })).sort((a: Ticket, b: Ticket) => b.drawTimestamp - a.drawTimestamp);
        setTickets(formattedTickets);
      }
    } catch (error) {
      console.error("Error fetching contract data:", error);
      setTicketPrice(0);
      setJackpot(0);
    }
  }, [contract, account, isCorrectChain]);
  
  // Fetch settled draw data using events
  useEffect(() => {
    if (!contract) return;
    const fetchDraws = async () => {
      try {
        const settledFilter = contract.filters.DrawSettled();
        const settledEvents = await contract.queryFilter(settledFilter, 0, 'latest');
        const rolloverFilter = contract.filters.DrawRolledOver();
        const rolloverEvents = await contract.queryFilter(rolloverFilter, 0, 'latest');
        // FIX: Cast event `e` to `ethers.EventLog` to safely access the `args` property.
        const rolloverTimestamps = new Set<number>(rolloverEvents.map(e => Number((e as ethers.EventLog).args.fromDraw) * 1000));
        
        const draws: Record<string, Draw> = {};
        for (const event of settledEvents) {
            // FIX: Cast event `event` to `ethers.EventLog` to safely access the `args` property.
            const args = (event as ethers.EventLog).args;
            const ts = Number(args.drawTimestamp) * 1000;
            const winnerCount = Number(args.winnerCount);
            draws[ts] = {
                jackpotTotal: parseFloat(ethers.formatEther(args.jackpot)),
                winnerCount: winnerCount,
                prizePerWinner: parseFloat(ethers.formatEther(args.prizePerWinner)),
                winningNumbers: args.winningNumbers.map(Number),
                settled: true,
                isRollover: winnerCount === 0 && rolloverTimestamps.has(ts),
            };
        }
        setPreviousDraws(draws);
      } catch (e) {
        console.error("Could not fetch settled draws:", e);
      }
    };
    fetchDraws();
  }, [contract]);

  useEffect(() => {
    fetchContractData();
    if (contract && isCorrectChain) {
        const mintFilter = contract.filters.TicketMinted(account || undefined);
        const handleEvent = () => fetchContractData();
        contract.on(mintFilter, handleEvent);
        return () => { contract.off(mintFilter, handleEvent); };
    }
  }, [account, isCorrectChain, contract, fetchContractData]);

  useEffect(() => {
    if (!account) {
      setTickets([]);
      setReferralBalance(0);
      setUserReferrer(null);
    }
  }, [account]);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        setIsConnecting(true);
        const accs = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accs[0] || null);
      } catch (e) { 
        console.error("Wallet connection failed", e); 
      } finally {
        setIsConnecting(false);
      }
    } else {
      alert("Please install MetaMask to participate.");
    }
  };
  
  const disconnectWallet = () => {
    setAccount(null);
    setShowProfileModal(false);
  };

  const switchNetwork = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: MERLIN_NETWORK.chainId }] });
    } catch (e: any) {
      if (e.code === 4902) await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [MERLIN_NETWORK] });
    }
  };

  const handleSetReferrer = async () => {
    if (!referrerFromUrl || !provider || !contract || !account) return;
    setIsSettingReferrer(true);
    try {
        const signer = await provider.getSigner();
        const contractWithSigner = contract.connect(signer) as ethers.Contract;
        const tx = await contractWithSigner.setReferrer(referrerFromUrl);
        await tx.wait();
        setUserReferrer(referrerFromUrl);
        setReferrerFromUrl(null); // Hide the banner
    } catch (error) {
        console.error("Failed to set referrer:", error);
        alert("Failed to set referrer. They may already be set.");
    } finally {
        setIsSettingReferrer(false);
    }
  };

  const handleMint = async () => {
    if (!account) return connectWallet();
    if (!isCorrectChain) return switchNetwork();
    if (!provider || !contract || !selectedPredictionSlot) return;
    if (selectedNumbers.length !== 4) {
      alert("Please select exactly 4 numbers.");
      return;
    }

    setTxStatus('awaiting');
    try {
        const signer = await provider.getSigner();
        const contractWithSigner = contract.connect(signer) as ethers.Contract;
        const price = await contract.ticketPrice();
        
        const nums: [number, number, number, number] = [
            selectedNumbers[0],
            selectedNumbers[1],
            selectedNumbers[2],
            selectedNumbers[3]
        ];

        const tx = await contractWithSigner.mintTicket(
            nums,
            Math.floor(selectedPredictionSlot / 1000),
            { value: price }
        );

        setTxStatus('mining');
        await tx.wait();
        setTxStatus('success');
        setSelectedNumbers([]);
        fetchContractData(); // Refresh data
        setTimeout(() => setTxStatus('idle'), 3000);
    } catch (error) {
        console.error("Minting failed:", error);
        setTxStatus('error');
        setTimeout(() => setTxStatus('idle'), 3000);
    }
  };

  const handleClaim = async (ticketId: string) => {
    if (!provider || !contract) return;
    setClaimStatus(prev => ({ ...prev, [ticketId]: 'claiming' }));
    try {
        const signer = await provider.getSigner();
        const contractWithSigner = contract.connect(signer) as ethers.Contract;
        const tx = await contractWithSigner.claimPrize(ticketId);
        await tx.wait();
        await fetchContractData(); // Refetch to update claimed status
        setClaimStatus(prev => ({ ...prev, [ticketId]: 'success' }));
    } catch (error) {
        console.error("Claiming failed:", error);
        alert("Claim failed. Are you sure this is a winning ticket?");
        setClaimStatus(prev => ({ ...prev, [ticketId]: 'idle' }));
    }
  };
  
  const handleClaimReferral = async () => {
    if (!provider || !contract || referralBalance <= 0) return;
    setIsClaimingReferral(true);
    try {
        const signer = await provider.getSigner();
        const contractWithSigner = contract.connect(signer) as ethers.Contract;
        const tx = await contractWithSigner.claimReferralRewards();
        await tx.wait();
        await fetchContractData(); // Refetch to update balance
    } catch (error) {
        console.error("Referral claim failed:", error);
        alert("Referral claim failed.");
    } finally {
        setIsClaimingReferral(false);
    }
  };
  
  // --- UI & OTHER LOGIC ---

  useEffect(() => {
    if (isDark) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [isDark]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  useEffect(() => { fetchBtcPrice(); }, []);
  const fetchBtcPrice = async () => {
    try {
      const response = await fetch(COINGECKO_API_URL);
      const data = await response.json();
      setBtcPrice(data.bitcoin.usd);
    } catch (error) { console.error("Failed to fetch BTC price:", error); }
  };

  const timeLeft = useMemo(() => {
    const nextT = predictionSlots[0] || Date.now();
    const msLeft = Math.max(0, nextT - now.getTime());
    const s = Math.floor(msLeft / 1000);
    return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
  }, [now, predictionSlots]);

  const lastSettledTimestamp = useMemo(() => {
    const timestamps = Object.keys(previousDraws).map(Number);
    if (timestamps.length === 0) return 0;
    return Math.max(...timestamps);
  }, [previousDraws]);

  const isSystemDelayed = useMemo(() => {
      if (lastSettledTimestamp === 0 && Object.keys(previousDraws).length > 0) return false; // Not delayed if no draws have ever been settled
      if (lastSettledTimestamp === 0) return false;
      const timeSinceSettle = now.getTime() - lastSettledTimestamp;
      // 12 hour interval + 1 hour grace period
      return timeSinceSettle > 13 * 60 * 60 * 1000;
  }, [lastSettledTimestamp, now, previousDraws]);

  const handleRandomize = () => {
    const nums: number[] = [];
    while (nums.length < 4) {
      const r = Math.floor(Math.random() * 9) + 1;
      if (!nums.includes(r)) nums.push(r);
    }
    setSelectedNumbers(nums.sort((a, b) => a - b));
  };

  const formatDate = (ts: number | string) => {
    const d = new Date(ts);
    const locale = lang === 'en' ? 'en-US' : 'zh-CN';
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  };

  const formatTime = (ts: number | string) => {
    const d = new Date(ts);
    return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`;
  };
  
  return (
    <div className="min-h-screen pb-12 transition-colors duration-300">
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#04211C]/90 backdrop-blur-lg border-b border-gray-100 dark:border-emerald-500/10 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
            <div className="h-10 w-10">
              <svg width="42" height="42" viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <g fill="#0D6B58">
                  <polygon points="62,20 51,39.05 29,39.05 18,20 29,0.95 51,0.95"/>
                  <polygon points="62,80 51,99.05 29,99.05 18,80 29,60.95 51,60.95"/>
                  <polygon points="44.68,50 33.68,69.05 11.68,69.05 0.68,50 11.68,30.95 33.68,30.95"/>
                  <polygon points="79.32,50 68.32,69.05 46.32,69.05 35.32,50 46.32,30.95 68.32,30.95"/>
                </g>
                <g fill="#D4AF37">
                  <polygon points="60,20 50,37.32 30,37.32 20,20 30,2.68 50,2.68"/>
                  <polygon points="60,80 50,97.32 30,97.32 20,80 30,62.68 50,62.68"/>
                  <polygon points="42.68,50 32.68,67.32 12.68,67.32 2.68,50 12.68,32.68 32.68,32.68"/>
                  <polygon points="77.32,50 67.32,67.32 47.32,67.32 37.32,50 47.32,32.68 67.32,32.68"/>
                </g>
                <g fill="none" stroke="#F9D77E" strokeWidth="1.5">
                  <polygon points="58,20 49,35.59 31,35.59 22,20 31,4.41 49,4.41"/>
                  <polygon points="58,80 49,95.59 31,95.59 22,80 31,64.41 49,64.41"/>
                  <polygon points="40.68,50 31.68,65.59 13.68,65.59 4.68,50 13.68,34.41 31.68,34.41"/>
                  <polygon points="75.32,50 66.32,65.59 48.32,65.59 39.32,50 48.32,34.41 66.32,34.41"/>
                </g>
              </svg>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg md:text-xl font-bold font-display text-[#04211C] dark:text-white">{t.title}</h1>
              <p className="text-[9px] font-bold text-[#0D6B58] dark:text-emerald-400 uppercase tracking-widest">{t.network}</p>
            </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <SystemStatusIndicator isDelayed={isSystemDelayed} t={t} />
          {account && !isCorrectChain && (
            <button onClick={switchNetwork} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all hover:bg-indigo-100 dark:hover:bg-indigo-500/20">{t.switchToTestnet}</button>
          )}
          <button onClick={() => setShowResultsModal(true)} className="px-3 py-1.5 border border-[#7FE6C3] dark:border-emerald-500/30 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-wider text-[#04211C] dark:text-white transition-all hover:bg-emerald-50 dark:hover:bg-emerald-500/10">{t.viewResults}</button>
          <button onClick={() => setShowGuideModal(true)} className="px-3 py-1.5 border border-[#7FE6C3] dark:border-emerald-500/30 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-wider text-[#04211C] dark:text-white transition-all hover:bg-emerald-50 dark:hover:bg-emerald-500/10">{t.howItWorks}</button>
          <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="px-3 py-1.5 border border-[#7FE6C3] dark:border-emerald-500/30 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-wider text-[#04211C] dark:text-white transition-all hover:bg-emerald-50 dark:hover:bg-emerald-500/10">{lang === 'en' ? '中文' : 'EN'}</button>
          <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl border border-[#7FE6C3] dark:border-emerald-500/30">{isDark ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-400"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-midnight"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}</button>
          {account ? <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 text-emerald-800 dark:text-emerald-100 font-bold text-xs shadow-sm transition-all hover:bg-emerald-100 dark:hover:bg-emerald-500/10"><img src={profile.avatarUrl} alt="Avatar" className="h-6 w-6 rounded-full object-cover border border-emerald-200" /><span className="hidden lg:inline max-w-[80px] truncate">{profile.username || "Player"}</span></button> : <button onClick={connectWallet} disabled={isConnecting} className="bg-[#04211C] dark:bg-emerald-500 text-white dark:text-[#04211C] px-6 py-2 rounded-xl text-xs font-bold shadow-md hover:scale-[1.05] transition-all disabled:opacity-50">{isConnecting ? "..." : t.connect}</button>}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6">
        {referrerFromUrl && !userReferrer && account && (
            <div className="mb-6 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4">
                <div className="text-sm font-medium text-indigo-700 dark:text-indigo-300"><b>{t.referrerFound}</b><p className="text-xs opacity-70 font-mono hidden md:block">{referrerFromUrl}</p></div>
                <PrimaryButton onClick={handleSetReferrer} loading={isSettingReferrer} variant="ai">{t.saveReferrer}</PrimaryButton>
            </div>
        )}
        <section className="bg-white dark:bg-[#04211C] rounded-[3rem] border border-gray-100 dark:border-emerald-500/10 p-8 md:p-12 shadow-2xl flex flex-col lg:flex-row gap-12 items-stretch">
          <div className="flex-1 w-full"><Pill variant="mint">LIVE STATUS</Pill><h2 className="text-4xl md:text-6xl font-black font-display text-[#04211C] dark:text-white mt-8 leading-[1.05] tracking-tight">{t.heroTitle}</h2><p className="mt-8 text-lg font-bold text-black dark:text-white max-w-lg leading-relaxed">{t.heroSubtitle}</p></div>
          <div className="w-full lg:w-[480px]">
            <div className="relative flex flex-col items-center justify-center text-center bg-gradient-to-br from-[#111] to-black rounded-[3rem] p-8 md:p-12 text-white shadow-2xl border border-white/10 overflow-hidden h-full">
                <div className="absolute -inset-24 bg-emerald-500/10 [mask-image:radial-gradient(ellipse_at_center,black,transparent_60%)] blur-3xl opacity-60"></div>
                <div className="h-16 w-16 mb-4 opacity-80">
                  <svg width="64" height="64" viewBox="0 0 80 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g fill="#0D6B58">
                      <polygon points="62,20 51,39.05 29,39.05 18,20 29,0.95 51,0.95"/>
                      <polygon points="62,80 51,99.05 29,99.05 18,80 29,60.95 51,60.95"/>
                      <polygon points="44.68,50 33.68,69.05 11.68,69.05 0.68,50 11.68,30.95 33.68,30.95"/>
                      <polygon points="79.32,50 68.32,69.05 46.32,69.05 35.32,50 46.32,30.95 68.32,30.95"/>
                    </g>
                    <g fill="#D4AF37">
                      <polygon points="60,20 50,37.32 30,37.32 20,20 30,2.68 50,2.68"/>
                      <polygon points="60,80 50,97.32 30,97.32 20,80 30,62.68 50,62.68"/>
                      <polygon points="42.68,50 32.68,67.32 12.68,67.32 2.68,50 12.68,32.68 32.68,32.68"/>
                      <polygon points="77.32,50 67.32,67.32 47.32,67.32 37.32,50 47.32,32.68 67.32,32.68"/>
                    </g>
                    <g fill="none" stroke="#F9D77E" strokeWidth="1.5">
                      <polygon points="58,20 49,35.59 31,35.59 22,20 31,4.41 49,4.41"/>
                      <polygon points="58,80 49,95.59 31,95.59 22,80 31,64.41 49,64.41"/>
                      <polygon points="40.68,50 31.68,65.59 13.68,65.59 4.68,50 13.68,34.41 31.68,34.41"/>
                      <polygon points="75.32,50 66.32,65.59 48.32,65.59 39.32,50 48.32,34.41 66.32,34.41"/>
                    </g>
                  </svg>
                </div>
                <p className="text-[10px] font-black text-emerald-300 uppercase tracking-widest">{t.jackpotLabel}</p>
                <h3 className="text-4xl md:text-5xl font-black font-display tracking-tighter text-white my-2">{jackpot.toFixed(4)} <span className="text-3xl opacity-60">BTC</span></h3>
                {btcPrice && <p className="text-sm font-medium text-white/60">(${(jackpot * btcPrice).toLocaleString('en-US', { style: 'currency', currency: 'USD' })})</p>}
            </div>
          </div>
        </section>

        <section className="mt-8 text-center">
          <h3 className="text-sm font-black uppercase tracking-widest text-black dark:text-white">{t.countdownTitle}</h3>
          <div className="flex justify-center items-center gap-4 md:gap-8 mt-4">
            <TimeDisplay value={pad2(timeLeft.d)} label={t.days} />
            <span className="text-4xl font-black font-display text-emerald-900/20 dark:text-white/20 -mt-3">:</span>
            <TimeDisplay value={pad2(timeLeft.h)} label={t.hours} />
            <span className="text-4xl font-black font-display text-emerald-900/20 dark:text-white/20 -mt-3">:</span>
            <TimeDisplay value={pad2(timeLeft.m)} label={t.minutes} />
            <span className="text-4xl font-black font-display text-emerald-900/20 dark:text-white/20 -mt-3">:</span>
            <TimeDisplay value={pad2(timeLeft.s)} label={t.seconds} />
          </div>
          <p className="text-xs font-bold text-emerald-900/40 dark:text-white/30 mt-2">{t.countdownSub}</p>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-10 gap-8 mt-8">
          <div className="lg:col-span-6 bg-white dark:bg-[#04211C] rounded-[2rem] border border-gray-100 dark:border-emerald-500/10 p-8 shadow-2xl">
              <h3 className="text-2xl font-black font-display text-[#04211C] dark:text-white">{t.mintTitle}</h3>
              <div className="mt-8">
                  <label className="text-xs font-black uppercase tracking-widest text-black/60 dark:text-white/60 mb-3 block">{t.selectSchedule}</label>
                  {predictionSlots.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                          {predictionSlots.slice(0, 8).map(ts => (
                              <button key={ts} onClick={() => setSelectedPredictionSlot(ts)} className={`px-4 py-3 rounded-xl text-xs font-bold transition-all border ${selectedPredictionSlot === ts ? 'bg-emerald-500 text-white border-emerald-500 shadow-md' : 'bg-gray-50 dark:bg-emerald-500/5 border-gray-200 dark:border-emerald-500/10 hover:bg-gray-100 dark:hover:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'}`}>
                                  <span className="block">{formatDate(ts)}</span>
                                  <span className="opacity-70">{formatTime(ts)}</span>
                              </button>
                          ))}
                      </div>
                  ) : (
                    <div className="text-center p-4 rounded-xl bg-gray-50 dark:bg-emerald-500/5 border border-gray-100 dark:border-emerald-500/10 text-sm text-gray-500 dark:text-gray-400">{t.noDrawsAvailable}</div>
                  )}
              </div>
              <div className="mt-8">
                  <div className="flex justify-between items-center mb-3">
                      <label className="text-xs font-black uppercase tracking-widest text-black/60 dark:text-white/60">{t.select4}</label>
                      <div className="flex gap-2">
                        <button onClick={handleRandomize} className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline">{t.randomize}</button>
                        <button onClick={() => setSelectedNumbers([])} className="text-xs font-bold text-red-500 hover:underline">{t.clear}</button>
                      </div>
                  </div>
                  <div className="grid grid-cols-9 gap-1.5">
                      {Array.from({ length: 9 }, (_, i) => i + 1).map(num => (
                          <button key={num} onClick={() => setSelectedNumbers(prev => prev.includes(num) ? prev.filter(n => n !== num) : (prev.length < 4 ? [...prev, num].sort((a,b)=>a-b) : prev))} className={`h-10 w-full rounded-lg text-sm font-bold transition-all border ${selectedNumbers.includes(num) ? 'bg-emerald-500 text-white border-emerald-500 shadow-md scale-105' : 'bg-gray-50 dark:bg-emerald-500/5 hover:bg-gray-100 dark:hover:bg-emerald-500/10 border-gray-200 dark:border-emerald-500/10 text-emerald-800 dark:text-emerald-300'}`}>{num}</button>
                      ))}
                  </div>
              </div>
          </div>
          <div className="lg:col-span-4">
              <TicketPreview t={t} numbers={selectedNumbers} timestamp={selectedPredictionSlot} formatDate={formatDate} formatTime={formatTime} />
              <div className="bg-gray-50 dark:bg-emerald-500/5 border border-gray-100 dark:border-emerald-500/10 rounded-2xl p-4 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-widest text-emerald-900/40 dark:text-white/30">{t.totalPrice}</span>
                  <div className="text-right">
                    <p className="font-bold text-lg text-emerald-800 dark:text-white">{ticketPrice.toFixed(4)} BTC</p>
                    <p className="text-[10px] text-emerald-900/40 dark:text-white/30 font-bold">{t.gasFeesNote}</p>
                  </div>
              </div>
              <div className="mt-4">
                <PrimaryButton onClick={handleMint} disabled={selectedNumbers.length !== 4 || txStatus !== 'idle' || !selectedPredictionSlot} loading={txStatus === 'awaiting' || txStatus === 'mining'}>
                    {txStatus === 'success' ? 'Success!' : txStatus === 'error' ? 'Error!' : t.purchase}
                </PrimaryButton>
              </div>
          </div>
        </section>
      </main>

      <Suspense fallback={<div />}>
        {showProfileModal && <ProfileModal 
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            t={t}
            profile={profile}
            setProfile={setProfile}
            account={account!}
            referralBalance={referralBalance}
            btcPrice={btcPrice}
            onClaimReferral={handleClaimReferral}
            isClaimingReferral={isClaimingReferral}
            onLogout={disconnectWallet}
            tickets={tickets}
            TicketCardComponent={TicketCard}
            previousDraws={previousDraws}
            handleClaim={handleClaim}
            claimStatus={claimStatus}
            formatDate={formatDate}
            formatTime={formatTime}
        />}
        {showResultsModal && <ResultsModal t={t} onClose={() => setShowResultsModal(false)} previousDraws={previousDraws} />}
        {showGuideModal && <GuideModal t={t} onClose={() => setShowGuideModal(false)} />}
      </Suspense>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
