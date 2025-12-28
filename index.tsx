import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import ReactDOM from "react-dom/client";
import { ethers } from "ethers";
import { MERLIN_NETWORK, CONTRACT_ADDRESS, LOTTERY_ABI } from "./constants";

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

// --- TYPES ---
interface Ticket {
  id: string;
  owner: string;
  numbers: number[];
  drawTimestamp: number;
  claimed: boolean;
}

interface Draw {
    jackpotTotal: number;
    winnerCount: number;
    prizePerWinner: number;
    winningNumbers: number[];
    settled: boolean;
    isRollover?: boolean;
}

// --- UTILS ---
const pad2 = (n: number) => String(n).padStart(2, "0");

const getWinningNumbersForSlot = (timestamp: number): number[] => {
  const seed = new Date(timestamp).toISOString() + ONCHAIN_SEED_PHRASE;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const result: number[] = [];
  let currentHash = hash;
  while (result.length < 4) {
    currentHash = (currentHash * 1664525 + 1013904223) | 0;
    const num = (Math.abs(currentHash) % 9) + 1;
    if (!result.includes(num)) result.push(num);
  }
  return result.sort((a, b) => a - b);
};

// --- SUB-COMPONENTS ---
const Pill: React.FC<{ children: React.ReactNode; variant?: 'default' | 'gold' | 'mint' | 'danger' | 'info' | 'warning' }> = ({ children, variant = 'default' }) => {
  const styles = {
    gold: { bg: "rgba(212, 175, 55, 0.15)", color: "#d4af37", border: "rgba(212, 175, 55, 0.4)" },
    mint: { bg: "rgba(16, 185, 129, 0.1)", color: "#10b981", border: "rgba(16, 185, 129, 0.2)" },
    danger: { bg: "rgba(239, 68, 68, 0.1)", color: "#ef4444", border: "rgba(239, 68, 68, 0.2)" },
    warning: { bg: "rgba(245, 158, 11, 0.1)", color: "#f59e0b", border: "rgba(245, 158, 11, 0.2)" },
    info: { bg: "rgba(59, 130, 246, 0.1)", color: "#3b82f6", border: "rgba(59, 130, 246, 0.2)" },
    default: { bg: "rgba(127,230,195,0.14)", color: "#04211C", border: "rgba(127,230,195,0.55)" }
  };
  const s = styles[variant];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider whitespace-nowrap dark:border-emerald-500/30 ${variant === 'default' ? 'dark:text-emerald-400' : ''}`} style={{ background: s.bg, color: variant === 'default' ? undefined : s.color, border: `1px solid ${s.border}` }}>
      {children}
    </span>
  );
};

const PrimaryButton: React.FC<{ children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean; variant?: 'default' | 'warning' | 'success' | 'outline' | 'gold' | 'ai' }> = ({ 
  children, onClick, disabled, loading, variant = 'default'
}) => {
  const getStyles = () => {
    if (variant === 'warning') return { bg: '#ef4444', shadow: "0 10px 26px rgba(239,68,68,0.18)" };
    if (variant === 'success') return { bg: '#10b981', shadow: "0 10px 26px rgba(16,185,129,0.18)" };
    if (variant === 'gold') return { bg: '#d4af37', shadow: "0 10px 26px rgba(212,175,55,0.3)" };
    if (variant === 'outline') return { bg: 'transparent', shadow: 'none', border: '2px solid rgba(6, 58, 48, 0.10)', color: '#04211C' };
    if (variant === 'ai') return { bg: '#6366f1', shadow: "0 10px 26px rgba(99,102,241,0.18)" };
    return { bg: '#04211C', shadow: "0 10px 26px rgba(4,33,28,0.18)" };
  };
  const s = getStyles();
  return (
    <button disabled={disabled || loading} onClick={onClick} className={`w-full rounded-2xl px-4 py-3 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 dark:border-emerald-500/20 dark:text-white ${variant === 'outline' ? 'dark:border-white/20' : ''}`} style={{ background: s.bg, color: variant === 'outline' ? undefined : 'white', border: s.border || 'none', boxShadow: s.shadow }}>
      {loading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : children}
    </button>
  );
};

const TimeDisplay = ({ value, label }: { value: string, label: string }) => (
  <div className="flex flex-col items-center">
    <div className="text-2xl md:text-4xl font-black font-display tracking-tighter text-[#04211C] dark:text-white">{value}</div>
    <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-emerald-600/50 dark:text-white/60">{label}</span>
  </div>
);

function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-black text-xl mb-4">{num}</div>
      <h4 className="font-bold mb-2 text-sm text-[#04211C] dark:text-white">{title}</h4>
      <p className="text-[11px] text-emerald-900/60 dark:text-white/40 leading-relaxed font-medium">{desc}</p>
    </div>
  );
};

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

  const [livePredictionNumbers, setLivePredictionNumbers] = useState<(number | null)[]>([null, null, null, null]);
  const [predictionPhase, setPredictionPhase] = useState(0); 

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

  const runLivePredictionSequence = useCallback(async () => {
    setPredictionPhase(0);
    setLivePredictionNumbers([null, null, null, null]);
    
    const lastDrawTime = Object.keys(previousDraws).map(Number).sort((a,b) => b-a)[0];
    if (!lastDrawTime) return;

    const finalNumbers = previousDraws[lastDrawTime].winningNumbers;
    for (let i = 1; i <= 4; i++) {
      await new Promise(r => setTimeout(r, 1200));
      setLivePredictionNumbers(prev => {
        const next = [...prev];
        next[i - 1] = finalNumbers[i - 1];
        return next;
      });
      setPredictionPhase(i);
    }
    await new Promise(r => setTimeout(r, 800));
    setPredictionPhase(5);
  }, [previousDraws]);

  useEffect(() => { 
    if (showResultsModal && Object.keys(previousDraws).length > 0) {
      runLivePredictionSequence();
    }
  }, [showResultsModal, runLivePredictionSequence, previousDraws]);

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

  const TicketCard: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
    const draw = previousDraws[ticket.drawTimestamp];
    const isPast = !!draw;
    
    const isWinner = useMemo(() => {
        if (!draw) return false;
        // Bitmask check to match contract logic
        const ticketMask = ticket.numbers.reduce((mask, n) => mask | (1 << n), 0);
        const winningMask = draw.winningNumbers.reduce((mask, n) => mask | (1 << n), 0);
        return ticketMask === winningMask;
    }, [ticket.numbers, draw]);
  
    const hue = useMemo(() => parseInt(ticket.id.slice(0, 6), 16) % 360, [ticket.id]);
    const gradientStyle = { background: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 45) % 360}, 80%, 60%))` };
    const status = isWinner ? 'winner' : isPast ? 'played' : 'upcoming';
  
    return (
        <div className={`rounded-3xl border-2 overflow-hidden shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${isWinner && !ticket.claimed ? 'border-yellow-400 ring-4 ring-yellow-400/20' : 'dark:border-emerald-500/10 border-gray-100'}`}>
            <div className="p-6 text-white relative" style={gradientStyle}>
                <div className="relative z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold font-display text-lg">Onchain Jackpot</h3>
                            <p className="text-xs opacity-60 font-mono">#{ticket.id}</p>
                        </div>
                        {status === 'winner' && <Pill variant="gold">{t.winner}</Pill>}
                        {status === 'upcoming' && <Pill variant="mint">UPCOMING</Pill>}
                        {status === 'played' && <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider whitespace-nowrap bg-black/10 text-white/70 border border-white/20">PLAYED</span>}
                    </div>
                    <div className="flex justify-center gap-3 my-8">
                        {ticket.numbers.map((n: number, i: number) => <div key={i} className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl font-black border border-white/30 shadow-md">{n}</div>)}
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-60 text-center">Draw Date</p>
                        <p className="text-center font-bold">{formatDate(ticket.drawTimestamp)} - {formatTime(ticket.drawTimestamp)}</p>
                    </div>
                </div>
            </div>
            {isWinner && (
                <div className="p-4 bg-white dark:bg-[#031814]">
                    {ticket.claimed ? <div className="py-2 text-center rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-bold uppercase tracking-wider text-gray-400">{t.claimed}</div> : <PrimaryButton onClick={() => handleClaim(ticket.id)} loading={claimStatus[ticket.id] === 'claiming'} variant="gold">{t.claimPrize}</PrimaryButton>}
                </div>
            )}
            {isPast && !isWinner && draw && (
                <div className="p-4 text-center bg-gray-50 dark:bg-[#021411]">
                    <p className="text-[9px] font-bold text-emerald-800/40 dark:text-white/30 uppercase tracking-widest mb-2">{t.winningNums}</p>
                    <div className="flex gap-1.5 justify-center">{draw.winningNumbers.map((n, i) => <div key={i} className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-white/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-sm font-bold">{n}</div>)}</div>
                </div>
            )}
        </div>
    );
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
                    <g fill="#0D6B58"><polygon points="62,20 51,39.05 29,39.05 18,20 29,0.95 51,0.95"/><polygon points="62,80 51,99.05 29,99.05 18,80 29,60.95 51,60.95"/><polygon points="44.68,50 33.68,69.05 11.68,69.05 0.68,50 11.68,30.95 33.68,30.95"/><polygon points="79.32,50 68.32,69.05 46.32,69.05 35.32,50 46.32,30.95 68.32,30.95"/></g>
                    <g fill="#D4AF37"><polygon points="60,20 50,37.32 30,37.32 20,20 30,2.68 50,2.68"/><polygon points="60,80 50,97.32 30,97.32 20,80 30,62.68 50,62.68"/><polygon points="42.68,50 32.68,67.32 12.68,67.32 2.68,50 12.68,32.68 32.68,32.68"/><polygon points="77.32,50 67.32,67.32 47.32,67.32 37.32,50 47.32,32.68 67.32,32.68"/></g>
                    <g fill="none" stroke="#F9D77E" strokeWidth="1.5"><polygon points="58,20 49,35.59 31,35.59 22,20 31,4.41 49,4.41"/><polygon points="58,80 49,95.59 31,95.59 22,80 31,64.41 49,64.41"/><polygon points="40.68,50 31.68,65.59 13.68,65.59 4.68,50 13.68,34.41 31.68,34.41"/><polygon points="75.32,50 66.32,65.59 48.32,65.59 39.32,50 48.32,34.41 66.32,34.41"/></g>
                  </svg>
                </div>
                <span className="text-4xl font-black text-yellow-400 uppercase tracking-[0.4em] mb-4">{t.jackpotLabel}</span>
                <p className="text-2xl font-medium text-white/60 mt-4">{jackpot.toFixed(4)} BTC</p>
                <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-7xl md:text-8xl font-black font-display tracking-tight text-white [text-shadow:0_0_30px_rgba(255,255,255,0.4)]">
                        ${btcPrice ? (jackpot * btcPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '...'}
                    </span>
                </div>
            </div>
          </div>
        </section>

        <div className="mt-12 bg-white dark:bg-[#04211C] rounded-[2rem] border border-gray-100 dark:border-emerald-500/10 p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div className="flex items-center gap-4"><div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-800 dark:text-emerald-400"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div><h3 className="font-bold text-lg dark:text-white">{t.countdownTitle}</h3><p className="text-xs font-bold text-black dark:text-white">{t.countdownSub}</p></div></div>
          <div className="flex gap-6 justify-center"><TimeDisplay value={pad2(timeLeft.d)} label={t.days} /><div className="text-4xl font-black opacity-20 dark:text-white">:</div><TimeDisplay value={pad2(timeLeft.h)} label={t.hours} /><div className="text-4xl font-black opacity-20 dark:text-white">:</div><TimeDisplay value={pad2(timeLeft.m)} label={t.minutes} /><div className="text-4xl font-black opacity-20 dark:text-white">:</div><TimeDisplay value={pad2(timeLeft.s)} label={t.seconds} /></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
          <div className="lg:col-span-7 bg-white dark:bg-[#04211C] rounded-[2.5rem] border border-gray-100 dark:border-emerald-500/10 p-10 shadow-xl min-h-[400px]">
            <h2 className="text-2xl font-bold font-display dark:text-white mb-8">{account ? t.myTickets : t.previousDrawings}</h2>
             {account ? (
                <div className="space-y-4">
                    {tickets.length === 0 ? (
                         <div className="text-center py-12 px-6 rounded-2xl bg-gray-50 dark:bg-emerald-500/5 border border-gray-100 dark:border-emerald-500/10"><h3 className="mt-4 text-sm font-semibold text-gray-800 dark:text-white">{t.noTicketsFound}</h3><p className="text-xs text-gray-400 mt-2">{t.mintToSee}</p></div>
                    ) : (
                        tickets.map(ticket => <TicketCard key={ticket.id} ticket={ticket} />)
                    )}
                </div>
            ) : (
                 <div className="space-y-4">
                  {Object.keys(previousDraws).length === 0 ? (
                    <div className="text-center py-12 px-6 rounded-2xl bg-gray-50 dark:bg-emerald-500/5 border border-gray-100 dark:border-emerald-500/10"><h3 className="mt-4 text-sm font-semibold text-gray-800 dark:text-white">{t.noSettledPredictions}</h3></div>
                  ) : (
                    Object.entries(previousDraws).sort((a, b) => Number(b[0]) - Number(a[0])).map(([drawTime, drawData]: [string, Draw]) => (
                        <div key={drawTime} className="bg-gray-50 dark:bg-emerald-500/5 p-4 rounded-2xl border dark:border-emerald-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div><p className="font-bold text-sm dark:text-white">{formatDate(drawTime)}</p><p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 dark:text-emerald-500/40">{formatTime(drawTime)}</p></div>
                          <div className="flex gap-2">{drawData.winningNumbers.map((n, i) => <div key={i} className="h-10 w-10 rounded-full border-2 border-emerald-200 bg-white dark:bg-emerald-500/10 dark:border-emerald-500/20 text-emerald-800 dark:text-white flex items-center justify-center font-black text-sm shadow-sm">{n}</div>)}</div>
                          <div className="text-center">
                              <p className="font-black text-lg dark:text-white">{drawData.winnerCount}</p>
                              <p className="text-[9px] uppercase tracking-widest font-bold text-gray-400 dark:text-emerald-500/40 -mt-1">{t.winnersList}</p>
                              {drawData.isRollover && (
                                  <div className="mt-2">
                                      <Pill variant="info">{t.rolledOver.toUpperCase()}</Pill>
                                  </div>
                              )}
                          </div>
                          <button onClick={() => setShowVerifyModal({timestamp: Number(drawTime), numbers: drawData.winningNumbers})} className="px-3 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/10 transition-colors flex items-center gap-2"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>{t.verifyFairness}</button>
                        </div>
                    ))
                  )}
                </div>
            )}
          </div>

          <div className="lg:col-span-5 space-y-8">
            <div className="bg-white dark:bg-[#04211C] rounded-[2.5rem] border border-gray-100 dark:border-emerald-500/10 p-10 shadow-xl">
              <h2 className="text-2xl font-bold font-display mb-8 dark:text-white">{t.createNftTicket}</h2>
              
              <TicketPreview t={t} numbers={selectedNumbers} timestamp={selectedPredictionSlot} formatDate={formatDate} formatTime={formatTime} />

              <div className="mb-8">
                <label className="text-xl font-black uppercase text-black dark:text-white mb-4 block tracking-widest">{t.selectSchedule}</label>
                {predictionSlots.length > 0 && selectedPredictionSlot ? (
                  <div className="relative">
                    <select value={selectedPredictionSlot} onChange={(e) => setSelectedPredictionSlot(Number(e.target.value))} className="w-full appearance-none px-5 py-4 rounded-2xl border-2 border-emerald-50 dark:border-emerald-500/10 bg-white dark:bg-emerald-500/5 text-sm font-bold text-emerald-900 dark:text-white focus:outline-none focus:border-emerald-400 transition-all cursor-pointer">
                      {predictionSlots.map(ts => (<option key={ts} value={ts} className="dark:bg-[#04211C]">{formatDate(ts)} - {formatTime(ts)}</option>))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-800/40"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg></div>
                  </div>
                ) : (
                  <div className="text-center py-4 rounded-2xl bg-gray-50 dark:bg-emerald-500/5 border border-gray-100 dark:border-emerald-500/10">
                    <p className="text-sm font-semibold text-gray-800 dark:text-white">{t.noDrawsAvailable}</p>
                    <p className="text-xs text-gray-400 mt-1">{t.checkBackLater}</p>
                  </div>
                )}
              </div>
              <div className="mb-8"><label className="text-xs font-black uppercase tracking-widest text-black/60 dark:text-white/60 mb-3 block">{t.select4}</label><div className="grid grid-cols-3 gap-3">{[1,2,3,4,5,6,7,8,9].map(n => {
                  const isSelected = selectedNumbers.includes(n);
                  const selectionIndex = isSelected ? selectedNumbers.indexOf(n) : -1;
                  return (
                      <button 
                          key={n} 
                          onClick={() => { 
                              if(isSelected) {
                                  setSelectedNumbers(s => s.filter(x => x !== n));
                              } else if(selectedNumbers.length < 4) {
                                  setSelectedNumbers(s => [...s, n]);
                              }
                          }} 
                          className={`relative h-16 rounded-2xl flex items-center justify-center text-xl font-black transition-all border-2 ${isSelected ? "bg-emerald-500 dark:bg-emerald-600 text-white border-emerald-600 dark:border-emerald-700" : "bg-white dark:bg-emerald-500/5 border-gray-50 dark:border-emerald-500/10 dark:text-white hover:border-[#7FE6C3]"}`}
                      >
                          {n}
                          {isSelected && (
                              <span className="absolute top-1.5 right-1.5 text-[10px] font-bold bg-black/20 text-white rounded-full h-5 w-5 flex items-center justify-center backdrop-blur-sm">
                                  {selectionIndex + 1}
                              </span>
                          )}
                      </button>
                  )
              })}</div></div>
              <div className="grid grid-cols-2 gap-3 mb-8">
                  <PrimaryButton onClick={handleRandomize} variant="outline">{t.randomize}</PrimaryButton>
                  <PrimaryButton onClick={() => setSelectedNumbers([])} variant="outline">{t.clear}</PrimaryButton>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-500/5 rounded-[2rem] p-8 border dark:border-emerald-500/10">
                <div className="flex justify-between items-center mb-6 h-[52px]">
                  <span className="text-xs font-black text-black/60 dark:text-white/60 uppercase tracking-widest">{t.totalPrice}</span>
                  <div className="text-right">
                    <span className="text-xl font-black text-black dark:text-white">{ticketPrice > 0 ? `${parseFloat(ticketPrice.toPrecision(10))} BTC` : '...'}</span>
                    {btcPrice && ticketPrice > 0 && <p className="text-sm font-medium text-emerald-600/60 dark:text-emerald-400/60">({(ticketPrice * btcPrice).toLocaleString('en-US', { style: 'currency', currency: 'USD' })})</p>}
                  </div>
                </div>
                <PrimaryButton onClick={handleMint} disabled={selectedNumbers.length < 4 || txStatus === 'mining' || txStatus === 'awaiting' || !contract || !selectedPredictionSlot || ticketPrice === 0}>{account ? t.purchase : t.connect}</PrimaryButton>
                <p className="mt-4 text-xs text-center text-black/50 dark:text-white/50 uppercase tracking-widest">{t.gasFeesNote}</p>
              </div>
            </div>
          </div>
        </div>
        
        <section className="mt-12 bg-white dark:bg-[#04211C] rounded-[2rem] border border-gray-100 dark:border-emerald-500/10 p-8 md:p-12 shadow-xl">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-16">
            <div>
              <h3 className="text-xl font-bold font-display text-[#04211C] dark:text-white mb-6">{t.rules}</h3>
              <ul className="space-y-4">
                {[t.rule1, t.rule2, t.rule3, t.rule4].map((rule, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="p-1 bg-emerald-100 dark:bg-emerald-500/10 rounded-full mt-1">
                      <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    </div>
                    <span className="text-sm text-emerald-900/70 dark:text-white/60 font-medium">{rule}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold font-display text-[#04211C] dark:text-white mb-6">{t.disclaimer}</h3>
              <p className="text-sm text-emerald-900/60 dark:text-white/50 font-medium leading-relaxed border-l-4 border-emerald-200 dark:border-emerald-500/20 pl-6">{t.disclaimerText}</p>
            </div>
          </div>
        </section>

        {/* --- All Modals --- */}
        {showResultsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[#04211C] rounded-[2rem] p-10 text-center shadow-2xl animate-in zoom-in-95 duration-300">
              <button onClick={() => setShowResultsModal(false)} className="absolute top-6 right-6 p-2 dark:text-white hover:scale-110 transition-all"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
              <h2 className="text-3xl font-black font-display text-[#04211C] dark:text-white mb-8">{t.latestResult}</h2>
              {Object.keys(previousDraws).length > 0 ? (
                <>
                  <div className="flex justify-center gap-4 mb-12 h-24">
                      {livePredictionNumbers.map((n, i) => (<div key={i} className={`h-20 w-20 rounded-full border-4 flex items-center justify-center transition-all duration-700 ${n !== null ? 'scale-110 border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 shadow-lg' : 'border-dashed border-emerald-100 dark:border-emerald-500/20'}`}><span className="font-black text-2xl dark:text-white">{n !== null ? n : '?'}</span></div>))}
                  </div>
                  <p className="text-[10px] font-black text-emerald-800/40 dark:text-white/30 uppercase tracking-widest">{predictionPhase < 4 ? t.verifyingOnchain : t.revealSuccess}</p>
                </>
              ) : (
                <div className="py-8">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t.noSettledPredictions}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {showGuideModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={() => setShowGuideModal(false)}>
            <div className="relative z-10 w-full max-w-3xl bg-white dark:bg-[#04211C] rounded-[2rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setShowGuideModal(false)} className="absolute top-6 right-6 p-2 dark:text-white hover:scale-110 transition-all"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
              <h2 className="text-3xl font-black font-display text-[#04211C] dark:text-white mb-10 text-center">{t.howItWorks}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <Step num={1} title={t.step1Title} desc={t.step1Desc} />
                <Step num={2} title={t.step2Title} desc={t.step2Desc} />
                <Step num={3} title={t.step3Title} desc={t.step3Desc} />
                <Step num={4} title={t.step4Title} desc={t.step4Desc} />
              </div>

              <hr className="my-10 border-gray-200 dark:border-emerald-500/10" />

              <div className="grid md:grid-cols-2 gap-8 lg:gap-12 text-left">
                <div>
                  <h3 className="text-xl font-bold font-display text-[#04211C] dark:text-white mb-6">{t.rules}</h3>
                  <ul className="space-y-4">
                    {[t.rule1, t.rule2, t.rule3, t.rule4].map((rule, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <div className="p-1 bg-emerald-100 dark:bg-emerald-500/10 rounded-full mt-1 shrink-0">
                          <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                        </div>
                        <span className="text-sm text-emerald-900/70 dark:text-white/60 font-medium">{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-bold font-display text-[#04211C] dark:text-white mb-6">{t.disclaimer}</h3>
                  <p className="text-sm text-emerald-900/60 dark:text-white/50 font-medium leading-relaxed border-l-4 border-emerald-200 dark:border-emerald-500/20 pl-6">{t.disclaimerText}</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {showProfileModal && account && (
          <ProfileModal
            t={t}
            isOpen={showProfileModal}
            onClose={() => setShowProfileModal(false)}
            profile={profile}
            setProfile={setProfile}
            account={account}
            referralBalance={referralBalance}
            btcPrice={btcPrice}
            onClaimReferral={handleClaimReferral}
            isClaimingReferral={isClaimingReferral}
            onLogout={disconnectWallet}
            tickets={tickets}
            TicketCard={TicketCard}
          />
        )}
        
      </main>
      
      <footer className="max-w-7xl mx-auto px-8 py-20 mt-12 border-t border-emerald-100 dark:border-emerald-500/10 text-center">
        <p className="text-[10px] font-black text-emerald-900/20 dark:text-white/10 uppercase tracking-[0.3em]">{t.footer}</p>
      </footer>
    </div>
  );
}

const ProfileModal = ({ t, isOpen, onClose, profile, setProfile, account, referralBalance, btcPrice, onClaimReferral, isClaimingReferral, onLogout, tickets, TicketCard }: any) => {
    const [localProfile, setLocalProfile] = useState(profile);
    const [copyButtonText, setCopyButtonText] = useState(t.copyLink);
    const [activeTab, setActiveTab] = useState('entries');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLocalProfile(profile);
    }, [profile]);

    const handleSave = () => {
        localStorage.setItem(`profile_${account}`, JSON.stringify(localProfile));
        setProfile(localProfile);
        onClose();
    };

    const handleCopy = () => {
        const referralLink = `${window.location.origin}?ref=${account}`;
        navigator.clipboard.writeText(referralLink);
        setCopyButtonText(t.copied);
        setTimeout(() => setCopyButtonText(t.copyLink), 2000);
    };
    
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLocalProfile({ ...localProfile, avatarUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="relative z-10 w-full max-w-4xl bg-white dark:bg-[#04211C] rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 dark:text-white hover:scale-110 transition-all z-20"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                <div className="grid grid-cols-1 md:grid-cols-12">
                    <div className="md:col-span-5 bg-gray-50 dark:bg-emerald-500/5 p-8 border-r border-gray-100 dark:border-emerald-500/10 flex flex-col">
                        <h2 className="text-2xl font-bold font-display text-[#04211C] dark:text-white mb-8">{t.profile}</h2>
                        
                        <div className="relative w-32 h-32 mx-auto mb-6 group">
                            <img src={localProfile.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover border-4 border-white dark:border-[#04211C] shadow-lg"/>
                            <button onClick={handleAvatarClick} className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">{t.uploadAvatar}</button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                        </div>

                        <div className="space-y-4 mb-8">
                            <div><label className="text-[10px] font-black text-emerald-900/40 dark:text-white/30 uppercase tracking-widest mb-2 block">{t.nameLabel}</label><input type="text" value={localProfile.username} onChange={e => setLocalProfile({...localProfile, username: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-emerald-500/20 bg-white dark:bg-emerald-500/5 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"/></div>
                            <div><label className="text-[10px] font-black text-emerald-900/40 dark:text-white/30 uppercase tracking-widest mb-2 block">{t.bioLabel}</label><textarea value={localProfile.bio} onChange={e => setLocalProfile({...localProfile, bio: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-emerald-500/20 bg-white dark:bg-emerald-500/5 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" rows={3}></textarea></div>
                        </div>

                        <div className="mt-auto space-y-2">
                           <PrimaryButton onClick={handleSave}>{t.save}</PrimaryButton>
                           <PrimaryButton onClick={onLogout} variant="outline">{t.logout}</PrimaryButton>
                        </div>
                    </div>
                    <div className="md:col-span-7 p-8 flex flex-col">
                         <div className="border-b border-gray-200 dark:border-emerald-500/10 mb-6">
                            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                <button onClick={() => setActiveTab('entries')} className={`${activeTab === 'entries' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-white/40 dark:hover:text-white'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>{t.myTickets}</button>
                                <button onClick={() => setActiveTab('rewards')} className={`${activeTab === 'rewards' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-white/40 dark:hover:text-white'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>{t.referral}</button>
                                <button onClick={() => setActiveTab('nfts')} className={`${activeTab === 'nfts' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-white/40 dark:hover:text-white'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>{t.myNfts}</button>
                            </nav>
                        </div>
                        
                        <div className="flex-grow overflow-y-auto max-h-[60vh] pr-2 -mr-2">
                             {activeTab === 'entries' && (
                                <div className="space-y-4">
                                    {tickets.length > 0 ? tickets.map((ticket: Ticket) => <TicketCard key={ticket.id} ticket={ticket} />) : <div className="text-center py-12 px-6 rounded-2xl bg-gray-50 dark:bg-emerald-500/5 border border-gray-100 dark:border-emerald-500/10"><h3 className="mt-4 text-sm font-semibold text-gray-800 dark:text-white">{t.noTicketsFound}</h3><p className="text-xs text-gray-400 mt-2">{t.mintToSee}</p></div>}
                                </div>
                            )}
                            {activeTab === 'rewards' && (
                                <div className="space-y-6">
                                    <div><label className="text-[10px] font-black text-emerald-900/40 dark:text-white/30 uppercase tracking-widest mb-2 block">{t.yourReferralLink}</label><div className="flex gap-2"><input type="text" readOnly value={`${window.location.origin}?ref=${account}`} className="flex-grow px-4 py-2 rounded-lg border border-gray-200 dark:border-emerald-500/20 bg-gray-50 dark:bg-emerald-500/5 dark:text-white/70 focus:outline-none text-sm"/><button onClick={handleCopy} className="px-4 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-200 dark:hover:bg-emerald-500/20 transition-colors w-24">{copyButtonText}</button></div></div>
                                    <div className="bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl p-6 border dark:border-emerald-500/10 text-center">
                                        <p className="text-[10px] font-black text-emerald-900/40 dark:text-white/30 uppercase tracking-widest mb-2">{t.available}</p>
                                        <p className="text-3xl font-black font-display dark:text-white">{referralBalance.toFixed(6)} BTC</p>
                                        {btcPrice && <p className="text-sm font-medium text-emerald-600/60 dark:text-emerald-400/60 mt-1">(${(referralBalance * btcPrice).toLocaleString('en-US', { style: 'currency', currency: 'USD' })})</p>}
                                        <div className="mt-6"><PrimaryButton onClick={onClaimReferral} loading={isClaimingReferral} disabled={referralBalance <= 0 || isClaimingReferral} variant="success">{t.claimAll}</PrimaryButton></div>
                                    </div>
                                </div>
                            )}
                             {activeTab === 'nfts' && (
                                <div className="space-y-4">
                                    {tickets.length > 0 ? (
                                        tickets.map((ticket: Ticket) => <TicketCard key={ticket.id} ticket={ticket} />)
                                    ) : (
                                        <div className="text-center py-12 px-6 rounded-2xl bg-gray-50 dark:bg-emerald-500/5 border border-gray-100 dark:border-emerald-500/10">
                                            <h3 className="mt-4 text-sm font-semibold text-gray-800 dark:text-white">{t.noNftTickets}</h3>
                                            <p className="text-xs text-gray-400 mt-2">{t.mintOneToStart}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);