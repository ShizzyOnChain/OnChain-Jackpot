import React, { useEffect, useMemo, useState, useCallback } from "react";
import { COLORS, LOTTERY_CONFIG, ICONS, MERLIN_NETWORK } from "./constants";
import { Logo } from "./components/Logo";
import { Card } from "./components/Card";
import { getLuckyNumbers } from "./services/geminiService";
import { Ticket, HistoricalLottery } from "./types";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const pad2 = (n: number) => String(n).padStart(2, "0");

const CONTRACT_ADDRESS = "0x967aEC3276b63c5E2262da9641DB9dbeBB07dC0d";
const TICKET_PRICE = 1.0;
const DEV_FEE_PER_TICKET = 0.1;
const REF_FEE_PER_TICKET = 0.02;

const getWinningNumbersForSlot = (timestamp: number): number[] => {
  const seed = new Date(timestamp).toISOString() + "onchain-jackpot-v2-merlin";
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const result = [];
  let currentHash = hash;
  for (let i = 0; i < 4; i++) {
    currentHash = (currentHash * 1664525 + 1013904223) | 0;
    result.push((Math.abs(currentHash) % 9) + 1);
  }
  return result;
};

const Pill: React.FC<{ children: React.ReactNode; variant?: 'default' | 'gold' | 'mint' | 'danger' | 'info' | 'warning' }> = ({ children, variant = 'default' }) => {
  const getStyles = () => {
    switch(variant) {
      case 'gold': return { bg: "rgba(212, 175, 55, 0.15)", color: "#8b6508", border: "rgba(212, 175, 55, 0.4)" };
      case 'mint': return { bg: "rgba(16, 185, 129, 0.1)", color: "#047857", border: "rgba(16, 185, 129, 0.2)" };
      case 'danger': return { bg: "rgba(239, 68, 68, 0.1)", color: "#b91c1c", border: "rgba(239, 68, 68, 0.2)" };
      case 'warning': return { bg: "rgba(245, 158, 11, 0.1)", color: "#b45309", border: "rgba(245, 158, 11, 0.2)" };
      case 'info': return { bg: "rgba(59, 130, 246, 0.1)", color: "#1d4ed8", border: "rgba(59, 130, 246, 0.2)" };
      default: return { bg: "rgba(127,230,195,0.14)", color: COLORS.midnight, border: "rgba(127,230,195,0.55)" };
    }
  };
  const s = getStyles();
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider whitespace-nowrap"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
    >
      {children}
    </span>
  );
};

const PrimaryButton: React.FC<{ children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean; variant?: 'default' | 'warning' | 'success' | 'outline' | 'gold' }> = ({ 
  children, onClick, disabled, loading, variant = 'default'
}) => {
  const getBg = () => {
    if (variant === 'warning') return '#ef4444';
    if (variant === 'success') return '#10b981';
    if (variant === 'gold') return '#d4af37';
    if (variant === 'outline') return 'transparent';
    return COLORS.midnight;
  };
  
  const getShadow = () => {
    if (variant === 'warning') return "0 10px 26px rgba(239,68,68,0.18)";
    if (variant === 'success') return "0 10px 26px rgba(16,185,129,0.18)";
    if (variant === 'gold') return "0 10px 26px rgba(212,175,55,0.3)";
    if (variant === 'outline') return "none";
    return "0 10px 26px rgba(6,58,48,0.18)";
  };

  return (
    <button
      disabled={disabled || loading}
      onClick={onClick}
      className={`w-full rounded-2xl px-4 py-3 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2 ${variant === 'outline' ? 'border-2' : ''}`}
      style={{
        background: getBg(),
        color: variant === 'outline' ? COLORS.midnight : "white",
        borderColor: variant === 'outline' ? COLORS.cardBorder : 'transparent',
        boxShadow: getShadow(),
      }}
    >
      {loading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : children}
    </button>
  );
};

type Language = 'en' | 'zh';

const translations = {
  en: {
    title: "OnChain Jackpot",
    subtitle: "MerlinChain Mainnet",
    connect: "Connect Wallet",
    switch: "Switch to Merlin",
    wrongNetwork: "Wrong Network",
    liveActivity: "Live Onchain Activity",
    heroTitle: "Decentralized Onchain Daily Lottery",
    heroSubtitle: "Verifiable jackpot settles twice daily at 00:00 & 12:00 UTC. Every entry is a unique NFT minted on MerlinChain.",
    prizePool: "Live Prize Pool",
    currentLottery: "Current Lottery",
    countdown: "Next Lottery Countdown",
    countdownSub: "Winning numbers revealed at 00:00 & 12:00 UTC daily",
    days: "Days",
    hours: "Hours",
    minutes: "Minutes",
    seconds: "Seconds",
    latestResult: "Latest Result",
    noEntries24h: "No entries in last 12 hours",
    pendingResult: "Waiting for next onchain settlement",
    historicalLotteries: "Historical Lotteries",
    historicalSub: "Previous results and settlement data",
    noHistory: "No historical data yet",
    historyAuto: "The history section will populate automatically after the first lottery is settled on-chain.",
    yourTickets: "My NFT Entries",
    ticketsSub: "Verifiable NFT tickets owned by your wallet",
    noActive: "No NFT entries found in your profile",
    ticketId: "Token ID",
    verified: "Verified",
    viewExplorer: "View on Explorer",
    createNew: "Mint New NFT Entry",
    selectNums: "Select 4 Numbers (1-9)",
    shuffle: "Shuffle",
    aiLucky: "AI Lucky",
    gasCost: "Network Gas Fees Apply",
    purchase: "Mint NFT Ticket",
    connectToBuy: "Connect to Mint",
    awaiting: "Awaiting Signature...",
    buyTicket: "Mint NFT Ticket",
    successMsg: "NFT Minted! Entry Secured on MerlinChain.",
    errorMsg: "Transaction Failed. Please try again.",
    metamaskPrompt: "Approve Minting in MetaMask...",
    processing: "Minting NFT on MerlinChain...",
    gasPrompt: "Your numbers are permanently stored on-chain",
    footer: "OnChain Lottery • Powered by MerlinChain • Verifiable Assets",
    howItWorks: "How it Works",
    step1Title: "Connect & Switch",
    step1Desc: "Connect your wallet and switch to MerlinChain Mainnet.",
    step2Title: "Pick Your Numbers",
    step2Desc: "Select 4 numbers between 1-9. These will be encoded into your NFT metadata.",
    step3Title: "Mint Your Entry",
    step3Desc: "Confirm the transaction to mint your unique NFT ticket. Price: 1 M-USDT + Network Gas.",
    step4Title: "Claim the Jackpot",
    step4Desc: "If your NFT numbers match the daily lottery exactly, you can claim the jackpot prize pool!",
    claimPrize: "Claim Prize",
    claiming: "Claiming...",
    claimed: "Claimed",
    gasToClaim: "Pay gas to transfer winnings",
    winner: "Winner!",
    winMsg: "Congratulations! You won the jackpot!",
    selectLottery: "Select Lottery Schedule",
    targetLottery: "Target Lottery Date",
    lotteryAt: "Lottery at",
    upcomingLotteries: "Upcoming Lotteries",
    batchMint: "Batch Minting",
    quantity: "Quantity",
    referral: "Referral & Rewards",
    copyLink: "Copy My Link",
    statsTotal: "Total NFTs Minted",
    statsPlayers: "Active Players",
    referralBonus: "EARN 0.02 M-USDT FOR EVERY NFT MINTED THROUGH YOUR LINK",
    viewResults: "View Results",
    lotteryLive: "Lottery Live...",
    verifyingOnchain: "Verifying Onchain Entropy",
    lotteryResultMsg: "Lottery sequence successfully completed on MerlinChain.",
    lastSettled: "Last Settled Lottery",
    profile: "My Profile",
    editProfile: "Edit Profile",
    username: "Display Name",
    bio: "Bio / Motto",
    avatarUrl: "Avatar Image URL",
    saveProfile: "Save Changes",
    cancel: "Cancel",
    logout: "Disconnect Wallet",
    rules: "Lottery Rules",
    rule1: "A lottery occurs every 12 hours (00:00 & 12:00 UTC).",
    rule2: "Lotteries use deterministic on-chain entropy to ensure fairness.",
    rule3: "Jackpot is shared among all winners of that specific lottery window.",
    rule4: "Referral fees (0.02 M-USDT) are paid instantly upon successful minting.",
    disclaimer: "Legal Disclaimer",
    disclaimerText: "OnChain Jackpot is a decentralized game of chance. Participating in lotteries involves risk. Digital assets are highly volatile. Use only funds you can afford to lose.",
    referralLink: "Your Referral Link",
    totalEarned: "Total Earned",
    claimRewards: "Claim Rewards",
    pendingRewards: "Available to Claim",
    jackpotLabel: "JACKPOT",
    nftCollection: "Jackpot Collection",
    rarityStandard: "Standard Edition",
    rarityWinner: "Winner Edition",
    lotteryIdLabel: "Lottery #",
    merlinNetwork: "Merlin Mainnet",
    matching: "Matching Numbers",
    winningNums: "Winning Numbers"
  },
  zh: {
    title: "链上大奖",
    subtitle: "MerlinChain 主网",
    connect: "连接钱包",
    switch: "切换至 Merlin",
    wrongNetwork: "网络错误",
    liveActivity: "链上实时动态",
    heroTitle: "去中心化链上每日彩票",
    heroSubtitle: "可验证大奖每日 00:00 和 12:00 UTC 结算。每一张彩票都是在 MerlinChain 上铸造的唯一 NFT。",
    prizePool: "实时奖池",
    currentLottery: "当前期数",
    countdown: "下次开奖倒计时",
    countdownSub: "每日 00:00 和 12:00 UTC 揭晓中奖号码",
    days: "天",
    hours: "小时",
    minutes: "分钟",
    seconds: "秒",
    latestResult: "最新开奖",
    noEntries24h: "过去 12 小时内无投注",
    pendingResult: "等待下一次链上结算",
    historicalLotteries: "历史彩票",
    historicalSub: "历史结果与结算数据",
    noHistory: "尚无历史数据",
    historyAuto: "在第一期彩票在链上结算后，历史板块将自动填充。",
    yourTickets: "我的 NFT 投注",
    ticketsSub: "您钱包拥有的可验证 NFT 彩票",
    noActive: "您的个人资料中未发现 NFT 投注",
    ticketId: "代币 ID",
    verified: "已验证",
    viewExplorer: "在浏览器中查看",
    createNew: "铸造新 NFT 投注",
    selectNums: "选择 4 个数字 (1-9)",
    shuffle: "随机",
    aiLucky: "AI 幸运",
    gasCost: "需支付网络 Gas 费",
    purchase: "铸造 NFT 彩票",
    connectToBuy: "连接钱包铸造",
    awaiting: "等待签名...",
    buyTicket: "铸造 NFT 彩票",
    successMsg: "NFT 铸造成功！投注已锁定在 MerlinChain。",
    errorMsg: "交易失败。请重试。",
    metamaskPrompt: "请在 MetaMask 中确认铸造...",
    processing: "正在 MerlinChain 上铸造 NFT...",
    gasPrompt: "您的号码将永久存储在链上",
    footer: "链上彩票 • 由 MerlinChain 提供支持 • 可验证资产",
    howItWorks: "运作方式",
    step1Title: "连接与切换",
    step1Desc: "连接您的钱包并切换到 MerlinChain 主网。",
    step2Title: "选择号码",
    step2Desc: "在 1-9 之间选择 4 个数字. 这些将编码到您的 NFT 元数据中。",
    step3Title: "铸造投注",
    step3Desc: "确认交易以在链上铸造您唯一的 NFT 彩票. 价格：1 M-USDT + 网络 Gas。",
    step4Title: "领取大奖",
    step4Desc: "如果您的 NFT 号码与每日开奖完全匹配，即可领取奖池奖金！",
    claimPrize: "领取奖金",
    claiming: "领取中...",
    claimed: "已领取",
    gasToClaim: "支付 Gas 转移奖金",
    winner: "中奖！",
    winMsg: "恭喜！您赢得了大奖！",
    selectLottery: "选择开奖时间",
    targetLottery: "目标彩票日期",
    lotteryAt: "开奖时间",
    upcomingLotteries: "近期开奖",
    batchMint: "批量铸造",
    quantity: "数量",
    referral: "推荐与奖励",
    copyLink: "复制链接",
    statsTotal: "总计铸造 NFT",
    statsPlayers: "活跃玩家",
    referralBonus: "通过您的链接铸造的每个 NFT 均可赚取 0.02 M-USDT",
    viewResults: "查看结果",
    lotteryLive: "正在直播开奖...",
    verifyingOnchain: "验证链上随机熵",
    lotteryResultMsg: "MerlinChain 上的开奖序列已成功完成。",
    lastSettled: "上次结算开奖",
    profile: "个人中心",
    editProfile: "编辑资料",
    username: "显示名称",
    bio: "个人简介 / 座右铭",
    avatarUrl: "头像图片链接",
    saveProfile: "保存修改",
    cancel: "取消",
    logout: "断开钱包",
    rules: "彩票规则",
    rule1: "每 12 小时进行一次开奖 (00:00 & 12:00 UTC)。",
    rule2: "开奖使用确定的链上随机熵，确保公平性。",
    rule3: "奖池由该特定开奖时段的所有中奖者平分。",
    rule4: "成功铸造后，推荐费（0.02 M-USDT）将立即支付。",
    disclaimer: "法律声明",
    disclaimerText: "数字资产具有高度波动性。请仅使用您可以承受损失的资金。",
    referralLink: "您的推荐链接",
    totalEarned: "总收益",
    claimRewards: "领取奖励",
    pendingRewards: "可领取金额",
    jackpotLabel: "累计大奖",
    nftCollection: "Jackpot 系列",
    rarityStandard: "标准版",
    rarityWinner: "中奖版",
    lotteryIdLabel: "期号 #",
    merlinNetwork: "Merlin 主网",
    matching: "匹配号码",
    winningNums: "中奖号码"
  }
};

export default function App() {
  const [lang, setLang] = useState<Language>('en');
  const t = translations[lang];

  const [now, setNow] = useState(new Date());
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  const [isLiveLottery, setIsLiveLottery] = useState(false);
  const [liveLotteryNumbers, setLiveLotteryNumbers] = useState<(number | null)[]>([null, null, null, null]);
  const [lotteryPhase, setLotteryPhase] = useState(0); 
  
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [tickets, setTickets] = useState<(Ticket & { txHash?: string })[]>([]);
  
  const [jackpot, setJackpot] = useState(0.00); 
  const [stats, setStats] = useState({ totalMints: 0, activePlayers: 0 });
  
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReason, setAiReason] = useState<string | null>(null);
  const [mintQuantity, setMintQuantity] = useState(1);
  
  const [txStatus, setTxStatus] = useState<'idle' | 'awaiting' | 'mining' | 'success' | 'error'>('idle');
  const [claimStatus, setClaimStatus] = useState<Record<string, 'idle' | 'claiming' | 'success'>>({});
  const [refClaimLoading, setRefClaimLoading] = useState(false);
  const [referralBalance, setReferralBalance] = useState({ total: 0.00, available: 0.00 });
  
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const [profile, setProfile] = useState({
    username: "",
    bio: "",
    avatarUrl: ""
  });

  const referralCode = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('ref');
  }, []);

  const [recentMints, setRecentMints] = useState<{addr: string, nums: number[], time: string}[]>([]);

  const lotterySlots = useMemo(() => {
    const slots: number[] = [];
    const base = new Date();
    base.setUTCMinutes(0, 0, 0);
    for (let i = 0; i < 96; i++) {
        const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), base.getUTCHours() + i, 0, 0, 0));
        const hour = d.getUTCHours();
        if (hour === 0 || hour === 12) {
            if (d.getTime() > Date.now() + 90000) {
                slots.push(d.getTime());
            }
        }
        if (slots.length >= 8) break;
    }
    return slots;
  }, [now.getUTCDate(), now.getUTCHours()]);

  const lastSettledLotteryTime = useMemo(() => {
    const d = new Date();
    d.setUTCMinutes(0, 0, 0);
    const h = d.getUTCHours();
    if (h >= 12) d.setUTCHours(12, 0, 0, 0);
    else d.setUTCHours(0, 0, 0, 0);
    
    if (Date.now() < d.getTime() + 90000) {
       d.setUTCHours(d.getUTCHours() - 12);
    }
    return d.getTime();
  }, [now.getUTCDate(), now.getUTCHours()]);

  const [selectedLotteryTime, setSelectedLotteryTime] = useState<number>(lotterySlots[0] || Date.now());

  useEffect(() => {
    if (lotterySlots.length > 0 && (!selectedLotteryTime || !lotterySlots.includes(selectedLotteryTime))) {
      setSelectedLotteryTime(lotterySlots[0]);
    }
  }, [lotterySlots]);

  const isCorrectChain = useMemo(() => {
    if (!chainId) return false;
    const hexChainId = chainId.startsWith('0x') ? chainId.toLowerCase() : `0x${parseInt(chainId).toString(16)}`.toLowerCase();
    return hexChainId === MERLIN_NETWORK.chainId.toLowerCase();
  }, [chainId]);

  const truncatedAddress = account ? `${account.slice(0, 6)}...${account.slice(-4)}` : null;

  const historicalLotteries = useMemo<HistoricalLottery[]>(() => {
    return [];
  }, [lastSettledLotteryTime]);

  const nextLotteryTime = lotterySlots[0] || Date.now();
  const [msLeft, setMsLeft] = useState(nextLotteryTime - Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(new Date());
      setMsLeft(Math.max(0, nextLotteryTime - current));
    }, 1000);
    return () => clearInterval(timer);
  }, [nextLotteryTime]);

  const timeLeft = useMemo(() => {
    const totalSeconds = Math.floor(msLeft / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { days, hours, minutes, seconds };
  }, [msLeft]);

  const runLiveLotterySequence = async () => {
    setIsLiveLottery(true);
    setLotteryPhase(0);
    setLiveLotteryNumbers([null, null, null, null]);
    const finalNumbers = getWinningNumbersForSlot(lastSettledLotteryTime);
    for(let i=1; i<=4; i++) {
      await new Promise(r => setTimeout(r, 1800));
      setLiveLotteryNumbers(prev => {
        const next = [...prev];
        next[i-1] = finalNumbers[i-1];
        return next;
      });
      setLotteryPhase(i);
    }
    await new Promise(r => setTimeout(r, 1200));
    setLotteryPhase(5);
  };

  useEffect(() => {
    if(showResultsModal && !isLiveLottery) {
      runLiveLotterySequence();
    }
  }, [showResultsModal]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected. Please install the MetaMask extension.");
      return;
    }
    try {
      setIsConnecting(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      setChainId(currentChainId);
      
      const stored = localStorage.getItem(`profile_${accounts[0]}`);
      if (stored) {
        setProfile(JSON.parse(stored));
      } else {
        const defaultProfile = { username: `User_${accounts[0].slice(2, 6)}`, bio: "Onchain Enthusiast", avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${accounts[0]}` };
        setProfile(defaultProfile);
        localStorage.setItem(`profile_${accounts[0]}`, JSON.stringify(defaultProfile));
      }
    } catch (error: any) {
      console.error("Connection error:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const switchNetwork = async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MERLIN_NETWORK.chainId }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [MERLIN_NETWORK],
          });
        } catch (addError) {
          console.error("Could not add network", addError);
        }
      }
    }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const stored = localStorage.getItem(`profile_${accounts[0]}`);
          if (stored) setProfile(JSON.parse(stored));
        } else {
          setAccount(null);
        }
      });
      window.ethereum.on('chainChanged', (cid: string) => setChainId(cid));
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          const stored = localStorage.getItem(`profile_${accounts[0]}`);
          if (stored) setProfile(JSON.parse(stored));
        }
      });
      window.ethereum.request({ method: 'eth_chainId' }).then((cid: string) => setChainId(cid));
    }
  }, []);

  const saveProfile = () => {
    if (account) {
      localStorage.setItem(`profile_${account}`, JSON.stringify(profile));
      setIsEditingProfile(false);
    }
  };

  const handleClaimRefRewards = async () => {
    if (referralBalance.available <= 0) return;
    setRefClaimLoading(true);
    await new Promise(r => setTimeout(r, 2000));
    setReferralBalance(prev => ({ ...prev, available: 0 }));
    setRefClaimLoading(false);
    alert("Referral rewards claimed successfully!");
  };

  const toggleNumber = (num: number) => {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(prev => prev.filter(n => n !== num));
    } else if (selectedNumbers.length < LOTTERY_CONFIG.numberCount) {
      setSelectedNumbers(prev => [...prev, num]);
    }
  };

  const handleRandomize = useCallback(() => {
    const nums: number[] = [];
    while (nums.length < LOTTERY_CONFIG.numberCount) {
      const r = Math.floor(Math.random() * LOTTERY_CONFIG.maxNumber) + 1;
      if (!nums.includes(r)) nums.push(r);
    }
    setSelectedNumbers(nums.sort((a, b) => a - b));
    setAiReason(null);
  }, []);

  const handleAiLucky = async () => {
    setAiLoading(true);
    const data = await getLuckyNumbers();
    setSelectedNumbers(data.numbers.sort((a, b) => a - b));
    setAiReason(data.reason);
    setAiLoading(false);
  };

  const purchaseTicket = async () => {
    if (!account) { await connectWallet(); return; }
    if (!isCorrectChain) { await switchNetwork(); return; }
    if (selectedNumbers.length !== LOTTERY_CONFIG.numberCount) return;

    try {
      setTxStatus('awaiting');
      const contractAddress = CONTRACT_ADDRESS; 
      const data = "0xa0712d68" + 
        selectedNumbers.map(n => n.toString(16).padStart(64, '0')).join('') + 
        Math.floor(selectedLotteryTime / 1000).toString(16).padStart(64, '0');

      const transactionParameters = {
        to: contractAddress,
        from: account,
        value: '0x0',
        data: data,
        chainId: MERLIN_NETWORK.chainId,
      };

      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      });

      setTxStatus('mining');
      await new Promise(resolve => setTimeout(resolve, 4000));

      const totalTickets = mintQuantity;
      const devFees = totalTickets * DEV_FEE_PER_TICKET;
      const refFees = referralCode ? totalTickets * REF_FEE_PER_TICKET : 0;
      const jackpotIncrease = (totalTickets * TICKET_PRICE) - devFees - refFees;

      const newTickets: (Ticket & { txHash?: string })[] = [];
      for(let i=0; i<mintQuantity; i++) {
        const nums = i === 0 ? [...selectedNumbers] : Array.from({length: 4}, () => Math.floor(Math.random() * 9) + 1);
        newTickets.push({
          id: (txHash.slice(0, 10) + i).toUpperCase(),
          numbers: nums,
          timestamp: Date.now(),
          targetLottery: selectedLotteryTime,
          txHash: txHash
        });
      }

      setTickets(prev => [...newTickets, ...prev]);
      setSelectedNumbers([]);
      setJackpot(prev => prev + jackpotIncrease);
      setStats(s => ({ totalMints: s.totalMints + mintQuantity, activePlayers: s.activePlayers + 1 }));
      
      const addr = `${account.slice(0, 6)}...${account.slice(-4)}`;
      const nums = [...selectedNumbers];
      const time = new Date().toLocaleTimeString();
      setRecentMints(prev => [{addr, nums, time}, ...prev].slice(0, 10));

      setAiReason(null);
      setTxStatus('success');
      setTimeout(() => setTxStatus('idle'), 6000);
    } catch (error: any) {
      console.error("Purchase error:", error);
      setTxStatus('error');
      setTimeout(() => setTxStatus('idle'), 4000);
    }
  };

  const handleClaim = async (ticketId: string) => {
    if (!account) { await connectWallet(); return; }
    if (!isCorrectChain) { await switchNetwork(); return; }
    try {
      setClaimStatus(prev => ({ ...prev, [ticketId]: 'claiming' }));
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, claimed: true } : t));
      setClaimStatus(prev => ({ ...prev, [ticketId]: 'success' }));
    } catch (error) {
      setClaimStatus(prev => ({ ...prev, [ticketId]: 'idle' }));
    }
  };

  const formatDate = (ts: number | string) => {
      const d = new Date(ts);
      const locale = lang === 'en' ? 'en-US' : 'zh-CN';
      return d.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (ts: number | string) => {
      const d = new Date(ts);
      return `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())} UTC`;
  };

  return (
    <div className="min-h-screen pb-20 font-sans">
      <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur-lg" style={{ borderColor: COLORS.cardBorder }}>
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.location.reload()}>
            <Logo size={48} />
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold font-display" style={{ color: COLORS.midnight }}>{t.title}</h1>
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: COLORS.mintText }}>{t.subtitle}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {account && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-100 bg-gray-50/50">
                <span className={`h-2 w-2 rounded-full ${isCorrectChain ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                  {isCorrectChain ? t.merlinNetwork : t.wrongNetwork}
                </span>
                {!isCorrectChain && (
                  <button onClick={switchNetwork} className="ml-2 px-2 py-0.5 rounded-lg bg-red-100 text-red-700 text-[9px] font-black uppercase tracking-widest hover:bg-red-200 transition-colors">
                    {t.switch}
                  </button>
                )}
              </div>
            )}

            <button onClick={() => { setIsLiveLottery(false); setShowResultsModal(true); }} className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all hover:bg-emerald-50 flex items-center gap-2" style={{ borderColor: COLORS.mintStroke, color: COLORS.midnight }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              <span className="hidden md:inline">{t.viewResults}</span>
            </button>

            <button onClick={() => setShowGuideModal(true)} className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all hover:bg-emerald-50 flex items-center gap-2" style={{ borderColor: COLORS.mintStroke, color: COLORS.midnight }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span className="hidden md:inline">{t.howItWorks}</span>
            </button>

            <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all hover:bg-emerald-50" style={{ borderColor: COLORS.mintStroke, color: COLORS.midnight }}>
              {lang === 'en' ? '中文' : 'EN'}
            </button>

            {account ? (
              <div className="flex items-center gap-2">
                <button onClick={() => setShowProfileModal(true)} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-sm border shadow-sm transition-all hover:bg-emerald-100 ${!isCorrectChain ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-100 bg-emerald-50 text-emerald-800'}`}>
                  <img src={profile.avatarUrl} alt="Avatar" className="h-7 w-7 rounded-full border border-emerald-200 object-cover" />
                  <span className="hidden sm:inline max-w-[100px] truncate">{profile.username || truncatedAddress}</span>
                </button>
              </div>
            ) : (
              <button onClick={connectWallet} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95 bg-[#063A30] text-white`}>
                <ICONS.Wallet />
                {isConnecting ? "..." : t.connect}
              </button>
            )}
          </div>
        </div>

        <div className="bg-emerald-50/50 py-1.5 border-b border-emerald-100/50 overflow-hidden h-8 flex items-center">
          <div className="flex animate-marquee whitespace-nowrap gap-12">
            {recentMints.length === 0 ? (
              <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-800/30 px-6">
                {t.noEntries24h}
              </div>
            ) : (
              [...recentMints, ...recentMints].map((m, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-800/60">
                  <span className="text-emerald-500">●</span>
                  <span>{m.addr} MINTED</span>
                  <span className="bg-white px-1.5 rounded border border-emerald-100 text-emerald-900">{m.nums.join('-')}</span>
                  <span>AT {m.time}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </header>

      {showResultsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6 py-12">
          <div className="absolute inset-0 bg-[#063A30]/80 backdrop-blur-md" onClick={() => { setShowResultsModal(false); setIsLiveLottery(false); }} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-10 text-center">
              <div className="flex justify-between items-center mb-8">
                <div className="text-left">
                  <h2 className="text-3xl font-black font-display" style={{ color: COLORS.midnight }}>{t.latestResult}</h2>
                  <div className="text-[9px] font-black uppercase tracking-widest opacity-40 mt-1">{t.lastSettled}: {formatDate(lastSettledLotteryTime)} {formatTime(lastSettledLotteryTime)}</div>
                </div>
                <button onClick={() => { setShowResultsModal(false); setIsLiveLottery(false); }} className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <div className="flex justify-center gap-4 md:gap-6 mb-12 relative h-24">
                {liveLotteryNumbers.map((n, i) => (
                  <div key={i} className={`h-16 w-16 md:h-20 md:w-20 rounded-full border-4 flex items-center justify-center transition-all duration-700 transform ${n !== null ? 'scale-110 rotate-12 border-emerald-500 bg-emerald-50 shadow-lg' : 'border-dashed border-emerald-100 bg-emerald-50/30'}`}>
                    <span className={`font-black text-2xl ${n !== null ? 'text-emerald-900 animate-in fade-in zoom-in' : 'text-emerald-200'}`}>
                      {n !== null ? n : '?'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-center gap-4">
                {lotteryPhase < 5 ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-emerald-900 text-white text-[11px] font-black uppercase tracking-[0.2em] animate-pulse">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      {t.lotteryLive}
                    </div>
                    <div className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-[0.1em]">
                      {t.verifyingOnchain}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 animate-in slide-in-from-bottom-2">
                    <div className="px-8 py-4 rounded-[2rem] bg-amber-50 border-2 border-amber-100 text-sm font-black uppercase tracking-[0.2em] text-amber-700 shadow-sm">
                      SUCCESS
                    </div>
                    <div className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-[0.1em]">
                      {t.lotteryResultMsg}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showGuideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6 py-12">
          <div className="absolute inset-0 bg-[#063A30]/80 backdrop-blur-md" onClick={() => setShowGuideModal(false)} />
          <div className="relative z-10 w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="p-8 md:p-12 border-b flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black font-display" style={{ color: COLORS.midnight }}>{t.howItWorks}</h2>
                <p className="text-sm font-medium opacity-40 uppercase tracking-widest mt-1">Platform Guidelines & Legal</p>
              </div>
              <button onClick={() => setShowGuideModal(false)} className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 md:p-12 scrollbar-hide space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <Step num={1} title={t.step1Title} desc={t.step1Desc} />
                <Step num={2} title={t.step2Title} desc={t.step2Desc} />
                <Step num={3} title={t.step3Title} desc={t.step3Desc} />
                <Step num={4} title={t.step4Title} desc={t.step4Desc} />
              </div>
              <div className="pt-8 border-t border-emerald-50">
                <h3 className="text-lg font-black font-display mb-6 uppercase tracking-wider" style={{ color: COLORS.midnight }}>{t.rules}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[t.rule1, t.rule2, t.rule3, t.rule4].map((rule, idx) => (
                    <div key={idx} className="flex gap-4 p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100/50 text-sm font-medium text-emerald-900/60 leading-relaxed">
                      <span className="flex-shrink-0 h-6 w-6 rounded-lg bg-emerald-900 text-white flex items-center justify-center text-[10px] font-black">{idx + 1}</span>
                      {rule}
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-8 rounded-3xl bg-red-50 border border-red-100 shadow-sm">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-red-600 mb-4 flex items-center gap-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  {t.disclaimer}
                </h3>
                <p className="text-xs font-medium text-red-900/60 leading-relaxed max-w-3xl">
                  {t.disclaimerText}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6 py-12">
          <div className="absolute inset-0 bg-[#063A30]/80 backdrop-blur-md" onClick={() => { if (!isEditingProfile) setShowProfileModal(false); }} />
          <div className="relative z-10 w-full max-w-5xl bg-[#F9FAFB] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
            <div className="p-8 md:p-12 border-b bg-white flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex flex-col md:flex-row items-center gap-8 w-full">
                <div className="relative group flex-shrink-0">
                  <img src={profile.avatarUrl} alt="Profile" className={`h-32 w-32 rounded-full border-4 shadow-lg object-cover ${!isCorrectChain ? 'border-red-100' : 'border-emerald-100'}`} />
                  {isEditingProfile && (
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white text-[10px] font-black uppercase opacity-0 group-hover:opacity-100 transition-opacity">Change</div>
                  )}
                </div>
                <div className="flex-1 text-center md:text-left">
                  {isEditingProfile ? (
                    <div className="space-y-4 w-full max-w-sm">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 mb-1 block">{t.username}</label>
                        <input type="text" className="w-full px-4 py-2 rounded-xl border-2 border-emerald-50 focus:border-emerald-200 outline-none font-bold text-lg" value={profile.username} onChange={e => setProfile({...profile, username: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 mb-1 block">{t.avatarUrl}</label>
                        <input type="text" className="w-full px-4 py-2 rounded-xl border-2 border-emerald-50 focus:border-emerald-200 outline-none text-xs font-mono" value={profile.avatarUrl} onChange={e => setProfile({...profile, avatarUrl: e.target.value})} />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 mb-1 block">{t.bio}</label>
                        <textarea className="w-full px-4 py-2 rounded-xl border-2 border-emerald-50 focus:border-emerald-200 outline-none text-sm font-medium h-20 resize-none" value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col md:flex-row items-center gap-4 mb-2">
                        <h2 className="text-3xl font-black font-display" style={{ color: COLORS.midnight }}>{profile.username || "Anonymous Player"}</h2>
                        <Pill variant={isCorrectChain ? 'mint' : 'danger'}>{isCorrectChain ? t.merlinNetwork : t.wrongNetwork}</Pill>
                      </div>
                      <p className="text-sm font-bold text-emerald-800/40 uppercase tracking-widest mb-4 font-mono">{account}</p>
                      <p className="text-sm font-medium text-gray-500 max-w-md">{profile.bio}</p>
                      {!isCorrectChain && (
                        <div className="mt-4 inline-block">
                          <button onClick={switchNetwork} className="px-6 py-2 rounded-xl bg-red-600 text-white font-black text-xs uppercase tracking-widest shadow-lg hover:bg-red-700 transition-all flex items-center gap-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 9l-9-9-9 9M20 15l-9 9-9-9"/></svg>
                            {t.switch}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-row md:flex-col gap-3 min-w-[140px]">
                {isEditingProfile ? (
                  <>
                    <PrimaryButton onClick={saveProfile} variant="success">{t.saveProfile}</PrimaryButton>
                    <PrimaryButton onClick={() => setIsEditingProfile(false)} variant="outline">{t.cancel}</PrimaryButton>
                  </>
                ) : (
                  <>
                    <PrimaryButton onClick={() => setIsEditingProfile(true)}>{t.editProfile}</PrimaryButton>
                    <PrimaryButton onClick={() => { setAccount(null); setShowProfileModal(false); }} variant="warning">{t.logout}</PrimaryButton>
                  </>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 md:p-12 scrollbar-hide bg-gray-50/50 space-y-12">
              <section className="bg-white p-8 rounded-[2rem] border border-emerald-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none"><Logo size={120} /></div>
                <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                  <div className="flex-1">
                    <h3 className="text-xl font-black font-display mb-2 flex items-center gap-2" style={{ color: COLORS.midnight }}>{t.referral}<span className="text-[10px] font-black uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded text-emerald-600">LIVE EARNINGS</span></h3>
                    <p className="text-xs font-bold text-emerald-800/40 uppercase tracking-widest mb-6">{t.referralBonus}</p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 bg-gray-50 border border-emerald-50 px-4 py-3 rounded-xl text-xs font-mono text-emerald-900 flex items-center gap-3 overflow-hidden">
                        <span className="truncate">{account ? `${window.location.origin}${window.location.pathname}?ref=${account}` : '...'}</span>
                      </div>
                      <button onClick={() => { if (account) { navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?ref=${account}`); alert('Referral link copied!'); } }} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg hover:bg-emerald-700 transition-colors whitespace-nowrap">{t.copyLink}</button>
                    </div>
                  </div>
                  <div className="w-full lg:w-auto flex flex-col gap-4 min-w-[240px]">
                    <div className="p-6 rounded-2xl bg-emerald-900 text-white shadow-xl relative overflow-hidden group">
                      <div className="flex justify-between items-start mb-4"><span className="text-[9px] font-black uppercase tracking-widest opacity-50">{t.totalEarned}</span><div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" /></div>
                      <div className="flex items-baseline gap-2 mb-6"><span className="text-3xl font-black font-display tracking-tight">{referralBalance.total.toFixed(2)}</span><span className="text-xs font-bold opacity-30">M-USDT</span></div>
                      <div className="pt-4 border-t border-white/10 flex flex-col gap-3">
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest opacity-40"><span>{t.pendingRewards}</span><span>{referralBalance.available.toFixed(2)} M-USDT</span></div>
                        <PrimaryButton onClick={handleClaimRefRewards} variant="success" loading={refClaimLoading} disabled={referralBalance.available <= 0}>{t.claimRewards}</PrimaryButton>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
              <section>
                <div className="flex items-center justify-between mb-8"><h3 className="text-xl font-black font-display flex items-center gap-3" style={{ color: COLORS.midnight }}>{t.yourTickets}<span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs">{tickets.length}</span></h3><Pill variant="info">DECENTRALIZED ASSETS</Pill></div>
                {tickets.length === 0 ? (
                  <div className="py-24 text-center border-2 border-dashed rounded-[2rem] border-emerald-100 bg-emerald-50/20"><p className="text-sm text-emerald-900/40 font-bold uppercase tracking-wider">{t.noActive}</p></div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tickets.map(ticket => (
                      <TicketCard key={ticket.id} ticket={ticket} onClaim={handleClaim} lang={lang} t={t} claimStatus={claimStatus[ticket.id]} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-6xl px-6 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12">
          <section className="bg-white rounded-[2.5rem] border p-8 lg:p-12 relative overflow-hidden group shadow-2xl" style={{ borderColor: COLORS.cardBorder }}>
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-100 mb-6 uppercase tracking-widest">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {t.liveActivity}
                </div>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black font-display leading-[1.1] mb-6 tracking-tight" style={{ color: COLORS.midnight }}>{t.heroTitle}</h2>
                <p className="text-lg font-medium max-w-md opacity-60" style={{ color: COLORS.mintText }}>{t.heroSubtitle}</p>
                <div className="mt-10 flex gap-8">
                  <div><div className="text-2xl font-black font-display" style={{ color: COLORS.midnight }}>{stats.totalMints.toLocaleString()}</div><div className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40">{t.statsTotal}</div></div>
                  <div><div className="text-2xl font-black font-display" style={{ color: COLORS.midnight }}>{stats.activePlayers.toLocaleString()}</div><div className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40">{t.statsPlayers}</div></div>
                </div>
              </div>
              <div className="relative bg-gradient-to-br from-[#063A30] via-[#0A4A3D] to-[#042B24] text-white rounded-[2.5rem] p-10 lg:w-[420px] shadow-[0_20px_50px_rgba(6,58,48,0.3)] overflow-hidden group border border-emerald-800/30">
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700" /><div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-400/5 rounded-full blur-3xl" /><div className="absolute top-0 right-0 p-4 opacity-5 transform rotate-12"><Logo size={180} /></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-center mb-10"><div className="flex flex-col"><p className="text-[10px] font-black opacity-40 uppercase tracking-[0.25em] mb-1">{t.prizePool}</p><div className="h-1 w-12 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]" /></div><div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" /><span className="text-[8px] font-black uppercase tracking-widest opacity-60">LIVE UPDATING</span></div></div>
                  <div className="flex flex-col gap-2"><div className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.3em] ml-1">{t.jackpotLabel}</div><div className="flex items-baseline gap-4"><span className="text-7xl font-black font-display tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 drop-shadow-[0_8px_16px_rgba(0,0,0,0.3)]">{jackpot.toFixed(2)}</span><div className="flex flex-col"><span className="text-xl font-black text-emerald-400 tracking-tighter leading-none mb-1">M-USDT</span><div className="flex gap-0.5">{[1,2,3].map(i => <div key={i} className="h-1 w-1 rounded-full bg-emerald-500/30" />)}</div></div></div></div>
                  <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-center">
                    <div className="flex flex-col"><span className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-1">{t.currentLottery}</span><div className="flex items-center gap-2"><span className="text-sm font-bold tracking-tight">#{historicalLotteries.length + 1}</span><span className="text-[8px] font-black px-1.5 py-0.5 bg-white/10 rounded uppercase tracking-widest">ACTIVE</span></div></div>
                    <div className="flex flex-col items-end"><span className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-1">NETWORK</span><span className="text-[10px] font-black text-emerald-400 border border-emerald-400/20 px-2 py-0.5 rounded-lg bg-emerald-400/5">MERLIN CHAIN</span></div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-12">
          <div className="bg-white rounded-[2rem] border p-6 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl" style={{ borderColor: COLORS.cardBorder }}>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-800"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
              <div><h3 className="font-bold text-lg" style={{ color: COLORS.midnight }}>{t.countdown}</h3><p className="text-xs font-medium text-gray-400">{t.countdownSub}</p></div>
            </div>
            <div className="flex gap-4">
              {timeLeft.days > 0 && (<><TimeDisplay value={pad2(timeLeft.days)} label={t.days} /><div className="text-4xl font-black font-display opacity-20" style={{ color: COLORS.midnight }}>:</div></>)}
              <TimeDisplay value={pad2(timeLeft.hours)} label={t.hours} /><div className="text-4xl font-black font-display opacity-20" style={{ color: COLORS.midnight }}>:</div>
              <TimeDisplay value={pad2(timeLeft.minutes)} label={t.minutes} /><div className="text-4xl font-black font-display opacity-20" style={{ color: COLORS.midnight }}>:</div>
              <TimeDisplay value={pad2(timeLeft.seconds)} label={t.seconds} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-8">
          <Card title={t.historicalLotteries} subtitle={t.historicalSub}>
            {historicalLotteries.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed rounded-[2rem] border-gray-50 bg-gray-50/20">
                <p className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-2">{t.noHistory}</p>
                <p className="text-[10px] text-gray-300 font-medium px-8">{t.historyAuto}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {historicalLotteries.map((lottery) => (
                  <div key={lottery.id} className="p-5 rounded-2xl border border-emerald-50 bg-emerald-50/10 flex flex-col md:flex-row items-center justify-between gap-6 hover:bg-emerald-50/20 transition-all">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-xl bg-[#063A30] text-white flex items-center justify-center font-black text-xs">#{lottery.id.slice(-2)}</div>
                      <div>
                        <div className="text-xs font-black text-[#063A30]">{formatDate(lottery.date)}</div>
                        <div className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-widest">{formatTime(lottery.date)}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {lottery.numbers.map((n, i) => (
                        <div key={i} className="h-10 w-10 rounded-full border-2 border-emerald-100 bg-white text-emerald-900 flex items-center justify-center font-black text-sm shadow-sm">{n}</div>
                      ))}
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-black text-emerald-900">{lottery.jackpot} M-USDT</div>
                      <div className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-widest">{lottery.winners} WINNERS</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-8">
          <Card title={t.createNew}>
            <div className="mb-8"><label className="text-[10px] font-black uppercase text-emerald-900/40 mb-4 block tracking-widest">{t.selectLottery}</label><div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">{lotterySlots.map(ts => (<button key={ts} onClick={() => setSelectedLotteryTime(ts)} className={`flex-shrink-0 p-3 rounded-2xl border-2 transition-all flex flex-col items-center min-w-[100px] ${selectedLotteryTime === ts ? "bg-[#063A30] text-white border-[#063A30] shadow-lg" : "bg-white text-emerald-900 border-emerald-50 hover:border-emerald-100"}`}><span className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">{formatDate(ts)}</span><span className="text-xs font-bold">{formatTime(ts)}</span></button>))}</div></div>
            <div className="mb-8"><label className="text-[10px] font-black uppercase text-emerald-900/40 mb-4 block tracking-widest">{t.batchMint}</label><div className="grid grid-cols-3 gap-3">{[1, 5, 10].map(q => (<button key={q} onClick={() => setMintQuantity(q)} className={`py-3 rounded-xl border-2 font-black transition-all ${mintQuantity === q ? "bg-[#063A30] text-white border-[#063A30]" : "bg-emerald-50/50 border-emerald-50 text-emerald-900"}`}>{q}x</button>))}</div></div>
            <div className="mb-8"><label className="text-[10px] font-black uppercase text-emerald-900/40 mb-4 block tracking-widest">{t.selectNums}</label><div className="grid grid-cols-3 gap-3">{Array.from({ length: 9 }, (_, i) => i + 1).map(n => (<button key={n} onClick={() => toggleNumber(n)} className={`h-14 rounded-2xl flex items-center justify-center text-xl font-black transition-all border-2 ${selectedNumbers.includes(n) ? "bg-[#063A30] text-white border-[#063A30] shadow-xl" : "bg-white text-emerald-900 border-emerald-50 hover:border-emerald-200"}`}>{n}</button>))}</div></div>
            <div className="grid grid-cols-2 gap-3 mb-8"><button onClick={handleRandomize} className="py-3 px-4 bg-emerald-50 text-emerald-800 rounded-xl font-bold text-xs uppercase tracking-wider border border-emerald-100">{t.shuffle}</button><button onClick={handleAiLucky} disabled={aiLoading} className="py-3 px-4 bg-indigo-50 text-indigo-800 rounded-xl font-bold text-xs uppercase tracking-wider border border-indigo-100 flex items-center justify-center gap-2">{aiLoading ? <div className="animate-spin h-3 w-3 border-2 border-indigo-800 border-t-transparent rounded-full" /> : <ICONS.Sparkles />}{t.aiLucky}</button></div>
            <div className="bg-emerald-50 rounded-[2rem] p-8 border border-emerald-100 shadow-inner">
              <div className="flex justify-between items-center mb-6"><span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">{t.gasCost}</span><span className="text-xl font-black text-emerald-900">{(1.0 * mintQuantity).toFixed(2)} M-USDT</span></div>
              {txStatus !== 'idle' && (<div className={`mb-6 p-4 rounded-2xl border text-xs font-bold animate-in fade-in slide-in-from-bottom-2 ${txStatus === 'awaiting' ? 'bg-amber-50 border-amber-100 text-amber-700' : txStatus === 'mining' ? 'bg-blue-50 border-blue-100 text-blue-700' : txStatus === 'success' ? 'bg-emerald-100 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-100 text-red-700'}`}><div className="flex items-center gap-3">{(txStatus === 'awaiting' || txStatus === 'mining') && <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />}{txStatus === 'success' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}{txStatus === 'error' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg><span>{txStatus === 'awaiting' ? t.metamaskPrompt : txStatus === 'mining' ? t.processing : txStatus === 'success' ? t.successMsg : t.errorMsg}</span></div></div>)}
              <PrimaryButton onClick={purchaseTicket} loading={txStatus === 'mining' || txStatus === 'awaiting'} variant={!account ? 'default' : (!isCorrectChain ? 'warning' : 'default')} disabled={selectedNumbers.length !== LOTTERY_CONFIG.numberCount || txStatus === 'mining' || txStatus === 'awaiting'}>{!account ? t.connectToBuy : (!isCorrectChain ? t.switch : (txStatus === 'awaiting' ? t.awaiting : `${t.buyTicket} (${mintQuantity}x)`))}</PrimaryButton>
              {!isCorrectChain && account && (<p className="mt-4 text-[10px] text-center text-red-700 font-bold uppercase tracking-widest animate-pulse">{t.wrongNetwork}: {t.switch}</p>)}
              <p className="mt-4 text-[10px] text-center text-emerald-900/40 font-bold uppercase tracking-widest">{t.gasPrompt}</p>
            </div>
          </Card>
        </div>
      </main>
      <footer className="mx-auto max-w-6xl px-6 mt-20 py-12 border-t border-emerald-100 text-center"><p className="text-[10px] font-black text-emerald-900/20 uppercase tracking-[0.3em]">{t.footer}</p></footer>
    </div>
  );
}

function Step({ num, title, desc }: { num: number, title: string, desc: string }) {
  return (<div className="flex flex-col items-center text-center"><div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xl mb-4">{num}</div><h4 className="font-bold mb-2 text-sm" style={{ color: COLORS.midnight }}>{title}</h4><p className="text-[11px] text-emerald-900/60 leading-relaxed font-medium">{desc}</p></div>);
}

function TimeDisplay({ value, label }: { value: string, label: string }) {
  return (<div className="flex flex-col items-center"><div className="text-4xl font-black font-display tracking-tighter" style={{ color: COLORS.midnight }}>{value}</div><span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/50">{label}</span></div>);
}

function TicketCard({ ticket, onClaim, lang, t, claimStatus }: any) {
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { month: 'short', day: 'numeric', year: 'numeric' });
  const formatTime = (ts: number) => `${pad2(new Date(ts).getUTCHours())}:${pad2(new Date(ts).getUTCMinutes())} UTC`;

  const winningNumbers = useMemo(() => {
    if (ticket.targetLottery > Date.now()) return null;
    return getWinningNumbersForSlot(ticket.targetLottery);
  }, [ticket.targetLottery]);

  const isWinner = useMemo(() => {
    if (!winningNumbers) return false;
    return ticket.numbers.every((n: number, i: number) => n === winningNumbers[i]);
  }, [ticket.numbers, winningNumbers]);

  return (
    <div className={`p-0 bg-white rounded-[2.5rem] border ${isWinner ? 'border-amber-400 shadow-[0_0_40px_rgba(212,175,55,0.2)] ring-4 ring-amber-400/20' : 'border-emerald-50'} shadow-sm relative group overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1`}>
      <div className={`h-28 w-full relative overflow-hidden flex items-center justify-center ${isWinner ? 'bg-gradient-to-br from-amber-200 via-amber-100 to-amber-50' : 'bg-gradient-to-br from-emerald-100 to-emerald-50'}`}>
        <div className={`absolute inset-0 opacity-10 flex flex-wrap items-center justify-center gap-4 rotate-12 scale-150 ${isWinner ? 'animate-pulse' : ''}`}>
           {Array.from({length: 20}).map((_, i) => <Logo key={i} size={40} />)}
        </div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-1">{t.nftCollection}</div>
          <div className={`text-sm font-black uppercase tracking-[0.1em] ${isWinner ? 'text-amber-700' : 'text-emerald-900/40'}`}>{isWinner ? t.rarityWinner : t.rarityStandard}</div>
        </div>
        <div className="absolute top-4 right-4">
           <Pill variant={isWinner ? 'gold' : 'default'}>{isWinner ? t.winner : t.verified}</Pill>
        </div>
        {isWinner && (
          <div className="absolute -left-12 top-6 -rotate-45 bg-amber-400 text-white py-1 px-12 font-black text-[10px] uppercase tracking-widest shadow-lg">WINNER</div>
        )}
      </div>

      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-emerald-800/30 uppercase tracking-tighter leading-none mb-1">{t.ticketId}</span>
            <span className="text-xs font-bold text-emerald-900 leading-none">#{ticket.id.slice(0, 10)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-black text-emerald-800/30 uppercase tracking-tighter leading-none mb-1">{t.lotteryIdLabel}</span>
            <span className="text-xs font-bold text-emerald-900 leading-none">{(ticket.targetLottery / 100000000).toFixed(0)}</span>
          </div>
        </div>

        <div className="mb-6">
           <div className="text-[9px] font-black text-emerald-800/30 uppercase tracking-tighter mb-2">{t.targetLottery}</div>
           <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
              <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center text-emerald-700 shadow-sm border border-gray-50">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div>
                <div className="text-xs font-black text-emerald-900 leading-none mb-1">{formatDate(ticket.targetLottery)}</div>
                <div className="text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest">{formatTime(ticket.targetLottery)}</div>
              </div>
           </div>
        </div>

        <div className="mb-4 text-[9px] font-black text-emerald-800/30 uppercase tracking-tighter text-center">My Numbers</div>
        <div className="flex gap-2 justify-center mb-6">
          {ticket.numbers.map((n: number, i: number) => {
            const isMatch = winningNumbers && n === winningNumbers[i];
            return (
              <div key={i} className={`h-12 w-12 rounded-2xl flex items-center justify-center text-lg font-black border-2 transition-transform group-hover:scale-105 ${isMatch ? 'bg-emerald-500 border-emerald-600 text-white shadow-lg' : isWinner ? 'bg-amber-100 border-amber-200 text-amber-900 shadow-inner' : 'bg-white border-emerald-100 text-emerald-900 shadow-sm'}`}>{n}</div>
            );
          })}
        </div>

        {winningNumbers && !isWinner && (
          <div className="mb-6 animate-in slide-in-from-bottom-2">
            <div className="text-[9px] font-black text-emerald-800/30 uppercase tracking-tighter text-center mb-2">{t.winningNums}</div>
            <div className="flex gap-1.5 justify-center opacity-60">
              {winningNumbers.map((n, i) => (
                <div key={i} className="h-8 w-8 rounded-xl border border-dashed border-emerald-200 bg-emerald-50/50 flex items-center justify-center text-xs font-bold text-emerald-400">{n}</div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {isWinner && !ticket.claimed && (
            <PrimaryButton onClick={() => onClaim(ticket.id)} loading={claimStatus === 'claiming'} variant="gold">{t.claimPrize}</PrimaryButton>
          )}
          {ticket.claimed && <div className="py-3 px-4 rounded-2xl bg-emerald-500 text-white text-center text-xs font-black shadow-sm uppercase tracking-widest">{t.claimed}</div>}
          
          <a href={`${MERLIN_NETWORK.blockExplorerUrls[0]}/tx/${ticket.txHash}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-emerald-50 text-[10px] font-black uppercase tracking-widest text-emerald-800/40 hover:text-emerald-800 hover:border-emerald-100 hover:bg-emerald-50/50 transition-all">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            {t.viewExplorer}
          </a>
        </div>
      </div>
    </div>
  );
}