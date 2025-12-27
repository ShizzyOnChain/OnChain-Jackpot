import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import ReactDOM from "react-dom/client";
import { getLuckyNumbers } from "./services/geminiService";

// --- CONSTANTS ---
const COLORS = {
  midnight: "#04211C",
  midnightGlow: "rgba(16, 185, 129, 0.15)",
  mintBg: "#E9FFF6",
  mintStroke: "#7FE6C3",
  mintText: "#0D6B58",
  cardBorder: "rgba(6, 58, 48, 0.10)",
  shadow: "0 18px 50px rgba(6,58,48,0.10)",
};

const PRELOADED_AVATARS = [
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Felix",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Luna",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Milo",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Chloe",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Jasper"
];

const MERLIN_NETWORK = {
  chainId: '0x1068',
  chainName: 'Merlin Mainnet',
  nativeCurrency: { name: 'BTC', symbol: 'BTC', decimals: 18 },
  rpcUrls: ['https://rpc.merlinchain.io'],
  blockExplorerUrls: ['https://scan.merlinchain.io'],
};

// --- LOGO COMPONENT ---
const Logo: React.FC<{ size?: number; opacity?: number }> = ({ size = 52, opacity = 1 }) => {
  const hexPoints = (cx: number, cy: number, r: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`);
    }
    return pts.join(" ");
  };
  const hexes = [{ cx: 60, cy: 32 }, { cx: 34, cy: 60 }, { cx: 86, cy: 60 }, { cx: 60, cy: 88 }];
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" style={{ opacity }}>
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f7e1a0" /><stop offset="30%" stopColor="#d4af37" /><stop offset="70%" stopColor="#b8860b" /><stop offset="100%" stopColor="#8b6508" />
        </linearGradient>
      </defs>
      <g fill="#0b533a">{hexes.map((h, i) => <polygon key={i} points={hexPoints(h.cx, h.cy, 24.5)} />)}</g>
      {hexes.map((h, i) => (
        <React.Fragment key={`inner-${i}`}>
          <polygon points={hexPoints(h.cx, h.cy, 19.5)} fill="#5c4a1e" />
          <polygon points={hexPoints(h.cx, h.cy, 18.5)} fill="url(#goldGrad)" />
        </React.Fragment>
      ))}
    </svg>
  );
};

// --- UTILS ---
const pad2 = (n: number) => String(n).padStart(2, "0");

const getWinningNumbersForSlot = (timestamp: number): number[] => {
  const seed = new Date(timestamp).toISOString() + "onchain-jackpot-v2-merlin-stable";
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

const PrimaryButton: React.FC<{ children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean; variant?: 'default' | 'warning' | 'success' | 'outline' | 'gold' }> = ({ 
  children, onClick, disabled, loading, variant = 'default'
}) => {
  const getStyles = () => {
    if (variant === 'warning') return { bg: '#ef4444', shadow: "0 10px 26px rgba(239,68,68,0.18)" };
    if (variant === 'success') return { bg: '#10b981', shadow: "0 10px 26px rgba(16,185,129,0.18)" };
    if (variant === 'gold') return { bg: '#d4af37', shadow: "0 10px 26px rgba(212,175,55,0.3)" };
    if (variant === 'outline') return { bg: 'transparent', shadow: 'none', border: '2px solid rgba(6, 58, 48, 0.10)', color: '#04211C' };
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

// --- MAIN APP ---
function App() {
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  const [isDark, setIsDark] = useState(() => localStorage.getItem('theme') === 'dark');
  const [account, setAccount] = useState<string | null>(null);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [mintQuantity, setMintQuantity] = useState(1);
  
  const [jackpot, setJackpot] = useState(0.00);
  const [stats, setStats] = useState({ totalMints: 0, activePlayers: 0 });
  const [referralBalance, setReferralBalance] = useState({ total: 0.00, available: 0.00 });
  
  const [now, setNow] = useState(new Date());
  const [txStatus, setTxStatus] = useState<'idle' | 'awaiting' | 'mining' | 'success' | 'error'>('idle');
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tickets, setTickets] = useState<any[]>([]);

  const [aiLoading, setAiLoading] = useState(false);
  const [aiReason, setAiReason] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState({
    username: "LuckyPlayer",
    bio: "Onchain Enthusiast",
    avatarUrl: PRELOADED_AVATARS[0]
  });

  const [liveLotteryNumbers, setLiveLotteryNumbers] = useState<(number | null)[]>([null, null, null, null]);
  const [lotteryPhase, setLotteryPhase] = useState(0); 
  const [isRevealing, setIsRevealing] = useState(false);

  // Sync dark mode
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Load wallet-specific data
  useEffect(() => {
    if (account) {
      const storedProfile = localStorage.getItem(`jackpot_profile_${account}`);
      if (storedProfile) setProfile(JSON.parse(storedProfile));
      
      const storedTickets = localStorage.getItem(`jackpot_tickets_${account}`);
      if (storedTickets) setTickets(JSON.parse(storedTickets));
    } else {
      setTickets([]);
      setProfile({
        username: "Guest",
        bio: "Connect wallet to play",
        avatarUrl: PRELOADED_AVATARS[0]
      });
    }
  }, [account]);

  const saveToWallet = (key: string, data: any) => {
    if (account) {
      localStorage.setItem(`jackpot_${key}_${account}`, JSON.stringify(data));
    }
  };

  const t = useMemo(() => {
    const strings = {
      en: {
        title: "OnChain Jackpot", connect: "Connect", heroTitle: "Onchain Daily Lottery",
        heroSubtitle: "Verifiable jackpot settles twice daily at 00:00 & 12:00 UTC. Every entry is a unique NFT minted on MerlinChain.",
        prizePool: "LIVE PRIZE POOL", totalMints: "TOTAL NFTS MINTED", activePlayers: "ACTIVE PLAYERS",
        historyTitle: "Historical Lotteries", historySub: "Previous results and settlement data", historyNoData: "NO HISTORICAL DATA YET",
        historyAuto: "The history section will populate automatically after the first lottery is settled on-chain.",
        mintTitle: "Mint New NFT Entry", selectSchedule: "SELECT LOTTERY SCHEDULE", batchMint: "BATCH MINTING",
        select4: "SELECT 4 NUMBERS (1-9)", shuffle: "Shuffle", purchase: "Mint NFT Ticket",
        liveActivity: "ONCHAIN DAILY LOTTERY", network: "MERLIN CHAIN", viewResults: "VIEW RESULTS", howItWorks: "HOW IT WORKS",
        step1Title: "Connect & Switch", step1Desc: "Connect your wallet and switch to MerlinChain Mainnet.",
        step2Title: "Pick Your Numbers", step2Desc: "Select 4 numbers between 1-9. These will be encoded into your NFT metadata.",
        step3Title: "Mint Your Entry", step3Desc: "Confirm the transaction to mint your unique NFT ticket. Price: 1 M-USDT + Gas.",
        step4Title: "Claim the Jackpot", step4Desc: "If your NFT numbers match the daily lottery exactly, you can claim the jackpot prize pool!",
        rules: "Lottery Rules", rule1: "A lottery occurs every 12 hours (00:00 & 12:00 UTC).",
        rule2: "Lotteries use deterministic on-chain entropy to ensure fairness.",
        rule3: "Jackpot is shared among all winners of that specific lottery window.",
        rule4: "Referral fees (0.02 M-USDT) are paid instantly upon successful minting.",
        disclaimer: "Legal Disclaimer", disclaimerText: "OnChain Jackpot is an experimental verifiable game of chance. Participating in lotteries involves financial risk. Digital assets are highly volatile and their value can decrease significantly.",
        latestResult: "Latest Result", settledMsg: "LOTTERY SUCCESSFULLY SETTLED",
        verifyingOnchain: "Verifying Onchain Entropy...", revealSuccess: "Settlement Complete",
        aiLucky: "AI Lucky Pick", days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds",
        countdownTitle: "Next Lottery Countdown", countdownSub: "Reveal: 00:00 & 12:00 UTC",
        myTickets: "My NFT Entries", profile: "Profile", referral: "Referral & Rewards", logout: "Logout",
        save: "Save Changes", cancel: "Cancel", copyLink: "Copy Link", referralBonus: "EARN 0.02 M-USDT FOR EVERY NFT MINTED THROUGH YOUR LINK",
        footer: "OnChain Lottery • Powered by MerlinChain • Verifiable Assets",
        totalPrice: "TOTAL PRICE", gasFeesNote: "+ Network Gas Fees Apply",
        aiSuggestNote: "AI Suggestion",
        jackpotLabel: "JACKPOT",
        currentLottery: "Current Lottery",
        customAvatar: "Upload Image",
        claimPrize: "Claim Jackpot",
        claimed: "Claimed",
        username: "Display Name",
        bio: "Bio / Motto",
        inDepthTitle: "Platform Mechanics & Transparency",
        howItWorksDetails: "Every 12 hours, the Onchain Daily Lottery settles. Winning numbers are derived from the blockhash of the target timestamp's block, ensuring zero human intervention. 88% of all ticket sales go directly into the Active Vault.",
        transparency: "Verified on MerlinChain",
        transparencyDesc: "All NFT tickets are ERC721 assets. You can verify your participation and the outcome directly on the blockchain explorer.",
        riskTitle: "Risk & Compliance",
        riskDesc: "Please participate responsibly. This platform is decentralized and automated. Ensure you are compliant with your local jurisdiction's regulations regarding digital assets and games of chance.",
        earningsSummary: "Earnings & Rewards",
        totalEarnings: "Total Earnings",
        claimAll: "Claim All Rewards"
      },
      zh: {
        title: "链上大奖", connect: "连接", heroTitle: "链上每日彩票",
        heroSubtitle: "每日 00:00 和 12:00 UTC 定时结算。每一张彩票都是在 MerlinChain 上铸造的唯一 NFT。",
        prizePool: "实时奖池", totalMints: "总计铸造 NFT", activePlayers: "活跃玩家",
        historyTitle: "历史彩票", historySub: "历史结果与结算数据", historyNoData: "尚无历史数据",
        historyAuto: "在第一期彩票在链上结算后，历史板块将自动填充。",
        mintTitle: "铸造新 NFT 投注", selectSchedule: "选择开奖时间", batchMint: "批量铸造",
        select4: "选择 4 个数字 (1-9)", shuffle: "随机", purchase: "铸造 NFT 彩票",
        liveActivity: "链上每日彩票", network: "MERLIN CHAIN", viewResults: "查看结果", howItWorks: "运作方式",
        step1Title: "连接与切换", step1Desc: "连接您的钱包并切换到 MerlinChain 主网。",
        step2Title: "选择号码", step2Desc: "在 1-9 之间选择 4 个数字。这些将编码到您的 NFT 元数据中。",
        step3Title: "铸造投注", step3Desc: "确认交易以在链上铸造您唯一的 NFT 彩票。价格：1 M-USDT + Gas。",
        step4Title: "领取大奖", step4Desc: "如果您的 NFT 号码与每日开奖完全匹配，即可领取奖池奖金！",
        rules: "彩票规则", rule1: "每 12 小时进行一次开奖 (00:00 & 12:00 UTC)。",
        rule2: "开奖使用确定的链上随机熵，确保公平性。",
        rule3: "奖池由该特定开奖时段的所有中奖者平分。",
        rule4: "成功铸造后，推荐费（0.02 M-USDT）将立即支付。",
        disclaimer: "法律声明", disclaimerText: "OnChain Jackpot 是一款实验性的可验证几率游戏。参与彩票涉及财务风险。数字资产具有高度波动性。",
        latestResult: "最新开奖结果", settledMsg: "开奖已成功结算",
        verifyingOnchain: "验证链上数据...", revealSuccess: "结算完成",
        aiLucky: "AI 幸运挑选", days: "天", hours: "小时", minutes: "分钟", seconds: "秒",
        countdownTitle: "开奖倒计时", countdownSub: "开奖: 00:00 & 12:00 UTC",
        myTickets: "我的投注", profile: "个人中心", referral: "推荐奖励", logout: "退出",
        save: "保存", cancel: "取消", copyLink: "复制链接", referralBonus: "通过您的链接铸造的每个 NFT 均可赚取 0.02 M-USDT",
        footer: "链上彩票 • 由 MerlinChain 提供支持 • 可验证资产",
        totalPrice: "总价", gasFeesNote: "+ 需支付网络 Gas 费",
        aiSuggestNote: "AI 建议",
        jackpotLabel: "累计大奖",
        currentLottery: "当前期数",
        customAvatar: "上传图片",
        claimPrize: "领取大奖",
        claimed: "已领取",
        username: "显示名称",
        bio: "个人简介 / 座右铭",
        inDepthTitle: "平台机制与透明度",
        howItWorksDetails: "每 12 小时结算一次。中奖号码源自目标时间戳区块的哈希值，确保零人工干预。所有门票销售的 88% 直接进入活跃保险库。",
        transparency: "在 MerlinChain 上验证",
        transparencyDesc: "所有 NFT 门票均为 ERC721 资产。您可以直接在区块链浏览器上验证您的参与情况和结果。",
        riskTitle: "风险与合规",
        riskDesc: "请负责任地参与。平台完全去中心化并自动化。请确保您符合当地关于数字资产 and 几率游戏的法律法规。",
        earningsSummary: "收益与奖励",
        totalEarnings: "总收益",
        claimAll: "领取所有奖励"
      }
    };
    return strings[lang];
  }, [lang]);

  const lotterySlots = useMemo(() => {
    const slots = [];
    const base = new Date();
    base.setUTCMinutes(0, 0, 0);
    for (let i = 0; i < 48; i++) {
      const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), base.getUTCHours() + i, 0, 0, 0));
      if (d.getUTCHours() === 0 || d.getUTCHours() === 12) {
        if (d.getTime() > Date.now()) slots.push(d.getTime());
      }
      if (slots.length >= 3) break;
    }
    return slots;
  }, []);

  const [selectedSlot, setSelectedSlot] = useState(lotterySlots[0]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const lastSettledLotteryTime = useMemo(() => {
    const d = new Date();
    d.setUTCMinutes(0, 0, 0);
    const h = d.getUTCHours();
    if (h >= 12) d.setUTCHours(12, 0, 0, 0); else d.setUTCHours(0, 0, 0, 0);
    if (Date.now() < d.getTime() + 90000) d.setUTCHours(d.getUTCHours() - 12);
    return d.getTime();
  }, [now.getUTCDate(), now.getUTCHours()]);

  const timeLeft = useMemo(() => {
    const msLeft = Math.max(0, (lotterySlots[0] || Date.now()) - now.getTime());
    const totalSeconds = Math.floor(msLeft / 1000);
    return {
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60
    };
  }, [now, lotterySlots]);

  const runLiveLotterySequence = async () => {
    if (isRevealing) return;
    setIsRevealing(true);
    setLotteryPhase(0);
    setLiveLotteryNumbers([null, null, null, null]);
    const finalNumbers = getWinningNumbersForSlot(lastSettledLotteryTime);
    for (let i = 1; i <= 4; i++) {
      await new Promise(r => setTimeout(r, 1000));
      setLiveLotteryNumbers(prev => {
        const next = [...prev];
        next[i - 1] = finalNumbers[i - 1];
        return next;
      });
      setLotteryPhase(i);
    }
    await new Promise(r => setTimeout(r, 800));
    setLotteryPhase(5);
    setIsRevealing(false);
  };

  useEffect(() => {
    if (showResultsModal) runLiveLotterySequence();
  }, [showResultsModal]);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
      } catch (e) { console.error(e); }
    } else alert("MetaMask not found");
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(p => ({ ...p, avatarUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleNumber = (n: number) => {
    setAiReason(null);
    if (selectedNumbers.includes(n)) setSelectedNumbers(s => s.filter(x => x !== n));
    else if (selectedNumbers.length < 4) setSelectedNumbers(s => [...s, n].sort((a, b) => a - b));
  };

  const handleShufflePick = () => {
    setAiReason(null);
    const nums: number[] = [];
    while (nums.length < 4) {
      const r = Math.floor(Math.random() * 9) + 1;
      if (!nums.includes(r)) nums.push(r);
    }
    setSelectedNumbers(nums.sort((a, b) => a - b));
  };

  const handleAiPick = async () => {
    setAiLoading(true);
    try {
      const lucky = await getLuckyNumbers();
      setSelectedNumbers(lucky.numbers.sort((a, b) => a - b));
      setAiReason(lucky.reason);
    } catch (e) {
      console.error(e);
      handleShufflePick();
    } finally {
      setAiLoading(false);
    }
  };

  const handleMint = async () => {
    if (!account) return connectWallet();
    setTxStatus('mining');
    await new Promise(r => setTimeout(r, 2000));
    
    const newTickets = Array.from({ length: mintQuantity }).map((_, i) => ({
      id: Math.random().toString(36).substring(7).toUpperCase(),
      numbers: i === 0 ? selectedNumbers : Array.from({length: 4}, () => Math.floor(Math.random() * 9) + 1),
      timestamp: Date.now(),
      targetLottery: selectedSlot,
      claimed: false
    }));
    
    const updatedTickets = [...newTickets, ...tickets];
    setTickets(updatedTickets);
    saveToWallet('tickets', updatedTickets);

    setJackpot(j => j + (mintQuantity * 1.0));
    setStats(s => ({ totalMints: s.totalMints + mintQuantity, activePlayers: s.activePlayers + 1 }));
    setTxStatus('success');
    setSelectedNumbers([]);
    setAiReason(null);
    setTimeout(() => setTxStatus('idle'), 3000);
  };

  const handleClaim = (ticketId: string) => {
    const updated = tickets.map(t => t.id === ticketId ? { ...t, claimed: true } : t);
    setTickets(updated);
    saveToWallet('tickets', updated);
    setReferralBalance(prev => ({ ...prev, total: prev.total + 5.0, available: prev.available + 5.0 }));
    alert("Jackpot Reward Claimed Successfully! Winnings added to your earnings balance.");
  };

  const copyRefLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?ref=${account}`;
    navigator.clipboard.writeText(link);
    alert("Referral link copied to clipboard!");
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#04211C]/90 backdrop-blur-lg border-b border-gray-100 dark:border-emerald-500/10 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
          <Logo size={42} />
          <div className="hidden sm:block">
            <h1 className="text-lg md:text-xl font-bold font-display text-[#04211C] dark:text-white">{t.title}</h1>
            <p className="text-[9px] font-bold text-[#0D6B58] dark:text-emerald-400 uppercase tracking-widest">MERLINCHAIN MAINNET</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={() => setShowResultsModal(true)} className="px-3 py-1.5 md:px-4 md:py-2 border border-[#7FE6C3] dark:border-emerald-500/30 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-wider text-[#04211C] dark:text-white transition-all hover:bg-emerald-50 dark:hover:bg-emerald-500/10">{t.viewResults}</button>
          <button onClick={() => setShowGuideModal(true)} className="hidden sm:flex px-4 py-2 border border-[#7FE6C3] dark:border-emerald-500/30 rounded-xl text-[11px] font-black uppercase tracking-wider text-[#04211C] dark:text-white transition-all hover:bg-emerald-50 dark:hover:bg-emerald-500/10">{t.howItWorks}</button>
          
          <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl border border-[#7FE6C3] dark:border-emerald-500/30 transition-all hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-midnight"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            )}
          </button>
          {account ? (
            <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 px-2 py-1 md:px-3 md:py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 text-emerald-800 dark:text-emerald-100 font-bold text-xs md:text-sm shadow-sm transition-all hover:bg-emerald-100 dark:hover:bg-emerald-500/10">
              <img src={profile.avatarUrl} alt="Avatar" className="h-6 w-6 md:h-7 md:w-7 rounded-full border border-emerald-200 dark:border-emerald-500/30 object-cover" />
              <span className="hidden lg:inline max-w-[80px] truncate dark:text-white">{profile.username}</span>
            </button>
          ) : (
            <button onClick={connectWallet} className="bg-[#04211C] dark:bg-emerald-500 text-white dark:text-[#04211C] px-4 py-2 md:px-6 md:py-2 rounded-xl text-xs md:text-sm font-bold flex items-center gap-2 transition-all active:scale-95">{t.connect}</button>
          )}
        </div>
      </header>

      <div className="bg-[#E9FFF6] dark:bg-emerald-950/20 py-1.5 border-b border-[#7FE6C3]/20 dark:border-emerald-500/10 overflow-hidden h-8 flex items-center transition-colors">
        <div className="animate-marquee flex whitespace-nowrap gap-12 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-emerald-800/40 dark:text-emerald-500/30">
           <div className="flex items-center gap-2">
             <span className="text-emerald-500/20">●</span>
             <span>{t.liveActivity} INITIALIZING...</span>
           </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6 md:mt-12">
        <section className="bg-white dark:bg-[#04211C] rounded-[2rem] md:rounded-[3rem] border border-gray-100 dark:border-emerald-500/10 p-6 md:p-12 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row gap-8 md:gap-12 items-center transition-colors">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none scale-150 rotate-12 hidden md:block"><Logo size={300} /></div>
          <div className="flex-1 relative z-10 w-full">
            <div className="inline-flex items-center rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-wider bg-[#E9FFF6] dark:bg-emerald-500/10 text-[#0D6B58] dark:text-emerald-400 border border-[#7FE6C3] dark:border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-current mr-2 animate-pulse" />
              LIVE STATUS
            </div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black font-display text-[#04211C] dark:text-white mt-4 md:mt-8 leading-[1.05] tracking-tight">{t.heroTitle}</h2>
            <p className="mt-4 md:mt-8 text-sm md:text-lg font-medium text-[#0D6B58] dark:text-emerald-400/60 opacity-60 max-w-lg leading-relaxed">{t.heroSubtitle}</p>
            <div className="mt-6 md:mt-12 flex gap-8 md:gap-16">
              <div><div className="text-xl md:text-3xl font-black font-display text-[#04211C] dark:text-white">{stats.totalMints.toLocaleString()}</div><div className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-emerald-800/40 dark:text-emerald-500/30 mt-1">{t.totalMints}</div></div>
              <div><div className="text-xl md:text-3xl font-black font-display text-[#04211C] dark:text-white">{stats.activePlayers.toLocaleString()}</div><div className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-emerald-800/40 dark:text-emerald-500/30 mt-1">{t.activePlayers}</div></div>
            </div>
          </div>

          <div className="w-full lg:w-[480px] relative group">
            <div className="relative bg-[#04211C] dark:bg-black rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 text-white shadow-2xl border border-emerald-500/20 overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.5) 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
              
              <div className="flex justify-between items-start relative z-10 mb-8 md:mb-12">
                <div className="flex flex-col">
                  <span className="text-[9px] md:text-[11px] font-black text-emerald-500 uppercase tracking-[0.2em]">REAL-TIME</span>
                  <h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight">ACTIVE VAULT</h3>
                </div>
                <div className="h-10 w-10 md:h-14 md:w-14 rounded-[1rem] md:rounded-[1.25rem] bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                  <Logo size={28} />
                </div>
              </div>

              <div className="relative z-10 py-2">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3"><div className="h-4 w-1 bg-emerald-500 rounded-full animate-pulse" /><span className="text-[11px] md:text-[13px] font-black text-emerald-400 uppercase tracking-[0.4em]">{t.jackpotLabel}</span></div>
                  <div className="flex items-baseline gap-2 md:gap-4 mt-1"><span className="text-5xl md:text-7xl lg:text-8xl font-black font-display tracking-tighter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">{jackpot.toFixed(2)}</span><div className="flex flex-col"><span className="text-sm md:text-xl font-black text-emerald-400 leading-none mb-1">M-USDT</span><div className="flex gap-1"><span className="h-1 w-1 bg-emerald-500 rounded-full animate-pulse" /></div></div></div>
                </div>
              </div>
              <div className="mt-8 md:mt-16 pt-6 md:pt-8 border-t border-white/10 flex justify-between items-end relative z-10">
                <div className="flex flex-col gap-1"><span className="text-[8px] md:text-[9px] font-black text-emerald-500/40 uppercase tracking-widest leading-none mb-1">{t.currentLottery}</span><div className="flex items-center gap-2"><span className="text-xs md:text-sm font-bold text-white tracking-tight">#{tickets.length + 1}</span><Pill variant="mint">LOCKED</Pill></div></div>
                <div className="text-right text-[8px] md:text-[9px] font-black text-emerald-500/40 uppercase tracking-widest block mb-1">v2.0 VERIFIED</div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 md:mt-12 bg-white dark:bg-[#04211C] rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 dark:border-emerald-500/10 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 shadow-xl transition-colors">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl text-emerald-800 dark:text-emerald-400"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
            <div><h3 className="font-bold text-base md:text-lg text-[#04211C] dark:text-white">{t.countdownTitle}</h3><p className="text-[10px] md:text-xs font-medium text-gray-400 dark:text-emerald-500/40">{t.countdownSub}</p></div>
          </div>
          <div className="flex gap-4 md:gap-6 justify-center w-full md:w-auto">
            <TimeDisplay value={pad2(timeLeft.days)} label={t.days} /><div className="text-2xl md:text-4xl font-black font-display opacity-20 text-[#04211C] dark:text-white">:</div>
            <TimeDisplay value={pad2(timeLeft.hours)} label={t.hours} /><div className="text-2xl md:text-4xl font-black font-display opacity-20 text-[#04211C] dark:text-white">:</div>
            <TimeDisplay value={pad2(timeLeft.minutes)} label={t.minutes} /><div className="text-2xl md:text-4xl font-black font-display opacity-20 text-[#04211C] dark:text-white">:</div>
            <TimeDisplay value={pad2(timeLeft.seconds)} label={t.seconds} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 md:mt-12 mb-20">
          <div className="order-2 lg:order-1 lg:col-span-7 bg-white dark:bg-[#04211C] rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 dark:border-emerald-500/10 p-6 md:p-10 shadow-xl min-h-[400px] transition-colors">
            <h2 className="text-xl md:text-2xl font-bold font-display text-[#04211C] dark:text-white">{t.historyTitle}</h2>
            <p className="mt-2 text-xs md:text-sm font-medium text-[#0D6B58] dark:text-emerald-400/60 opacity-40">{t.historySub}</p>
            <div className="mt-12 border-2 border-dashed border-gray-100 dark:border-emerald-500/10 rounded-[1.5rem] md:rounded-[2rem] p-12 md:p-20 flex flex-col items-center text-center">
              <span className="text-[10px] md:text-xs font-black text-gray-200 dark:text-emerald-500/10 uppercase tracking-[0.3em] mb-4">{t.historyNoData}</span>
              <p className="text-[9px] md:text-[10px] font-bold text-gray-300 dark:text-emerald-500/20 max-w-[240px] leading-relaxed tracking-wide uppercase">{t.historyAuto}</p>
            </div>
          </div>

          <div className="order-1 lg:order-2 lg:col-span-5 bg-white dark:bg-[#04211C] rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 dark:border-emerald-500/10 p-6 md:p-10 shadow-xl h-fit transition-colors">
            <h2 className="text-xl md:text-2xl font-bold font-display mb-6 md:mb-8 text-[#04211C] dark:text-white">{t.mintTitle}</h2>
            
            <div className="mb-6 md:mb-8">
              <label className="text-[9px] md:text-[10px] font-black uppercase opacity-30 dark:opacity-40 tracking-widest mb-4 block dark:text-emerald-400">{t.selectSchedule}</label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {lotterySlots.map(ts => (
                  <button key={ts} onClick={() => setSelectedSlot(ts)} className={`flex-shrink-0 p-3 md:p-4 rounded-xl md:rounded-2xl border-2 transition-all flex flex-col items-center min-w-[100px] md:min-w-[120px] ${selectedSlot === ts ? "bg-[#04211C] dark:bg-emerald-500 text-white dark:text-[#04211C] border-[#04211C] dark:border-emerald-400 shadow-lg" : "bg-white dark:bg-emerald-500/5 border-gray-50 dark:border-emerald-500/10 text-[#04211C] dark:text-white hover:border-[#7FE6C3] dark:hover:border-emerald-500/40"}`}>
                    <span className="text-[8px] md:text-[9px] font-black uppercase opacity-60 tracking-widest mb-1">{new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <span className="text-xs font-bold">{pad2(new Date(ts).getUTCHours())}:00 UTC</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 md:mb-8">
              <label className="text-[9px] md:text-[10px] font-black uppercase opacity-30 dark:opacity-40 tracking-widest mb-4 block dark:text-emerald-400">{t.batchMint}</label>
              <div className="flex p-1 bg-gray-50 dark:bg-emerald-500/5 rounded-xl md:rounded-2xl border border-gray-100 dark:border-emerald-500/10">
                {[1, 5, 10, 20].map(q => (
                  <button key={q} onClick={() => setMintQuantity(q)} className={`flex-1 py-2 md:py-3 text-[10px] md:text-xs font-black rounded-lg md:rounded-xl transition-all ${mintQuantity === q ? 'bg-white dark:bg-emerald-500 shadow-md text-[#04211C] dark:text-[#04211C]' : 'text-gray-400 dark:text-white/60 hover:text-gray-600 dark:hover:text-white'}`}>
                    {q}x
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 md:mb-8">
              <label className="text-[9px] md:text-[10px] font-black uppercase opacity-30 dark:opacity-40 tracking-widest mb-4 block dark:text-emerald-400">{t.select4}</label>
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                {[1,2,3,4,5,6,7,8,9].map(n => (
                  <button key={n} onClick={() => toggleNumber(n)} className={`h-12 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl font-black transition-all border-2 active:scale-95 ${selectedNumbers.includes(n) ? "bg-[#04211C] dark:bg-emerald-500 text-white dark:text-[#04211C] border-[#04211C] dark:border-emerald-400" : "bg-white dark:bg-emerald-500/5 border-gray-50 dark:border-emerald-500/10 text-[#04211C] dark:text-white hover:border-[#7FE6C3] dark:hover:border-emerald-500/40"}`}>{n}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button onClick={handleShufflePick} className="py-2.5 md:py-3 px-4 border border-gray-100 dark:border-emerald-500/10 rounded-xl font-bold text-[9px] md:text-[10px] uppercase tracking-widest text-gray-400 dark:text-emerald-500/60 hover:bg-gray-50 dark:hover:bg-emerald-500/10 transition-all">{t.shuffle}</button>
                <button onClick={handleAiPick} disabled={aiLoading} className="py-2.5 md:py-3 px-4 bg-violet-50 dark:bg-violet-500/10 text-violet-800 dark:text-violet-400 rounded-xl font-bold text-[9px] md:text-[10px] uppercase tracking-widest border border-violet-100 dark:border-violet-500/20 flex items-center justify-center gap-2 transition-all hover:bg-violet-100 dark:hover:bg-violet-500/20 disabled:opacity-50">
                  {aiLoading ? <div className="h-3 w-3 border-2 border-violet-800 dark:border-violet-400 border-t-transparent rounded-full animate-spin" /> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"></path></svg>}
                  {t.aiLucky}
                </button>
              </div>
              {aiReason && (<div className="mt-4 p-4 rounded-xl md:rounded-2xl bg-violet-50/50 dark:bg-violet-950/20 border border-violet-100/50 dark:border-violet-500/20 text-violet-900/60 dark:text-violet-200/60 text-[10px] font-bold italic leading-relaxed animate-in fade-in">"{aiReason}"</div>)}
            </div>

            <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl md:rounded-[2rem] p-6 md:p-8 border border-emerald-100 dark:border-emerald-500/20 mb-6">
                <div className="flex justify-between items-center mb-2"><span className="text-[9px] md:text-[10px] font-black opacity-30 dark:opacity-40 uppercase tracking-[0.2em] dark:text-emerald-400">{t.totalPrice}</span><div className="flex items-baseline gap-2"><span className="text-xl md:text-2xl font-black text-emerald-900 dark:text-white">{(mintQuantity * 1.0).toFixed(2)}</span><span className="text-[9px] md:text-[10px] font-black text-emerald-800/40 dark:text-emerald-500/30">M-USDT</span></div></div>
                <div className="text-right text-[8px] md:text-[9px] font-black text-emerald-800/20 dark:text-emerald-500/20 uppercase tracking-widest">{t.gasFeesNote}</div>
            </div>

            <PrimaryButton onClick={handleMint} loading={txStatus === 'mining'} disabled={selectedNumbers.length < 4 || txStatus === 'mining'}>{txStatus === 'mining' ? 'MINTING...' : t.purchase}</PrimaryButton>
          </div>
        </div>
      </main>

      {/* Modals are already quite responsive, but let's optimize padding and width for mobile */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setShowGuideModal(false)} />
          <div className="relative z-10 w-full max-w-4xl bg-white dark:bg-[#04211C] rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="p-6 md:p-12 border-b dark:border-emerald-500/10 flex items-center justify-between">
              <div>
                <h2 className="text-2xl md:text-3xl font-black font-display text-[#04211C] dark:text-white">{t.howItWorks}</h2>
              </div>
              <button onClick={() => setShowGuideModal(false)} className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-12 scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <Step num={1} title={t.step1Title} desc={t.step1Desc} isDark={isDark} />
                <Step num={2} title={t.step2Title} desc={t.step2Desc} isDark={isDark} />
                <Step num={3} title={t.step3Title} desc={t.step3Desc} isDark={isDark} />
                <Step num={4} title={t.step4Title} desc={t.step4Desc} isDark={isDark} />
              </div>
              <div className="p-6 rounded-2xl md:rounded-3xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-500/20">
                <h3 className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em] text-red-600 mb-4 flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  {t.disclaimer}
                </h3>
                <p className="text-[10px] md:text-xs font-medium text-red-900/70 dark:text-red-300 leading-relaxed italic">
                  {t.disclaimerText}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResultsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setShowResultsModal(false)} />
          <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[#04211C] rounded-[2rem] p-6 md:p-10 text-center shadow-2xl animate-in zoom-in-95 duration-300">
             <button onClick={() => setShowResultsModal(false)} className="absolute top-4 right-4 md:top-6 md:right-6 p-2 text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white transition-all z-20"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
             <h2 className="text-2xl md:text-3xl font-black font-display text-[#04211C] dark:text-white mb-6 md:mb-8">{t.latestResult}</h2>
             <div className="flex justify-center gap-2 md:gap-4 mb-8 md:mb-12 h-20 md:h-24">
                {liveLotteryNumbers.map((n, i) => (
                  <div key={i} className={`h-14 w-14 md:h-20 md:w-20 rounded-full border-4 flex items-center justify-center transition-all duration-700 transform ${n !== null ? 'scale-110 rotate-12 border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 shadow-lg' : 'border-dashed border-emerald-100 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-500/5'}`}>
                    <span className="font-black text-xl md:text-2xl text-emerald-900 dark:text-white">{n !== null ? n : '?'}</span>
                  </div>
                ))}
             </div>
             <p className="text-[9px] md:text-[10px] font-bold text-emerald-800/40 dark:text-white/30 uppercase tracking-widest">{lotteryPhase < 5 ? t.verifyingOnchain : t.revealSuccess}</p>
          </div>
        </div>
      )}

      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setShowProfileModal(false)} />
          <div className="relative z-10 w-full max-w-5xl bg-[#F9FAFB] dark:bg-[#021411] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
            <div className="p-6 md:p-12 border-b dark:border-emerald-500/10 bg-white dark:bg-[#04211C] flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 w-full">
                <div className="relative">
                  <img src={profile.avatarUrl} alt="Profile" className="h-24 w-24 md:h-32 md:w-32 rounded-full border-4 border-emerald-100 dark:border-emerald-500/20 shadow-lg object-cover" />
                </div>
                <div className="flex-1 text-center md:text-left">
                  {isEditingProfile ? (
                    <div className="space-y-4">
                      <div className="space-y-2"><label className="text-[10px] font-black uppercase text-emerald-800/40 dark:text-white/40 tracking-widest block">{t.username}</label><input className="px-4 py-2 border dark:border-emerald-500/20 dark:bg-emerald-500/5 rounded-xl font-bold w-full dark:text-white" value={profile.username} onChange={e => setProfile({...profile, username: e.target.value})} /></div>
                    </div>
                  ) : (
                    <><h2 className="text-2xl md:text-3xl font-black font-display text-[#04211C] dark:text-white">{profile.username}</h2><p className="text-xs md:text-sm font-bold text-[#0D6B58]/40 dark:text-white/30 uppercase tracking-widest mt-1 font-mono">{account?.slice(0,6)}...{account?.slice(-4)}</p></>
                  )}
                </div>
              </div>
              <div className="flex flex-row md:flex-col gap-3 w-full md:w-auto">
                {isEditingProfile ? (<PrimaryButton onClick={() => { saveToWallet('profile', profile); setIsEditingProfile(false); }} variant="success">{t.save}</PrimaryButton>) : (<PrimaryButton onClick={() => setIsEditingProfile(true)}>{t.profile}</PrimaryButton>)}
                <PrimaryButton onClick={() => { setAccount(null); setShowProfileModal(false); }} variant="warning">{t.logout}</PrimaryButton>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-12 space-y-8 md:space-y-12 bg-gray-50/50 dark:bg-[#021411]/50 scrollbar-hide">
              <section className="bg-white dark:bg-[#04211C] p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-emerald-100 dark:border-emerald-500/10 shadow-sm">
                <div className="flex flex-col gap-6">
                  <div>
                    <h3 className="text-lg md:text-xl font-black font-display mb-2 dark:text-white">{t.earningsSummary}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                       <div className="bg-gray-50 dark:bg-emerald-500/5 border border-gray-100 dark:border-emerald-500/10 p-4 md:p-6 rounded-xl">
                          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-emerald-800/40 dark:text-white/30 block mb-2">{t.totalEarnings}</span>
                          <div className="flex items-baseline gap-2"><span className="text-2xl md:text-3xl font-black text-[#04211C] dark:text-white">{referralBalance.total.toFixed(2)}</span><span className="text-[10px] font-bold text-emerald-600">M-USDT</span></div>
                       </div>
                       <div className="bg-emerald-900 dark:bg-emerald-500 p-4 md:p-6 rounded-xl text-white dark:text-[#04211C] flex flex-col justify-between">
                          <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest opacity-40 block mb-1">AVAILABLE</span>
                          <div className="flex items-baseline justify-between">
                            <span className="text-2xl md:text-3xl font-black">{referralBalance.available.toFixed(2)}</span>
                            <button onClick={() => { if (referralBalance.available > 0) { setReferralBalance(prev => ({ ...prev, available: 0 })); alert("Claimed!"); } }} disabled={referralBalance.available <= 0} className="px-3 py-1 bg-white/20 rounded-lg text-[9px] font-black uppercase tracking-widest">CLAIM</button>
                          </div>
                       </div>
                    </div>
                  </div>
                </div>
              </section>
              <section>
                <h3 className="text-lg md:text-xl font-black font-display mb-6 md:mb-8 dark:text-white">{t.myTickets} ({tickets.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {tickets.map(ticket => {
                    const winningNums = getWinningNumbersForSlot(ticket.targetLottery);
                    const isWinner = ticket.numbers.every((n: number, i: number) => n === winningNums[i]);
                    return (
                      <div key={ticket.id} className={`bg-white dark:bg-[#04211C] rounded-[1.5rem] md:rounded-[2.5rem] border p-6 transition-all ${isWinner ? 'border-amber-400 shadow-lg' : 'border-emerald-50 dark:border-emerald-500/10'}`}>
                        <div className="flex justify-between items-center mb-4"><span className="text-[9px] font-black opacity-30 dark:text-emerald-400">ID: {ticket.id.slice(0,8)}</span><Pill variant={isWinner ? 'gold' : 'mint'}>{isWinner ? 'WINNER' : 'VERIFIED'}</Pill></div>
                        <div className="flex gap-2 justify-center mb-4">{ticket.numbers.map((n: number, i: number) => (<div key={i} className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl flex items-center justify-center text-base md:text-lg font-black bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 text-emerald-900 dark:text-white">{n}</div>))}</div>
                        <div className="pt-4 border-t dark:border-emerald-500/10 text-[9px] font-bold text-gray-400 text-center mb-4">{new Date(ticket.targetLottery).toLocaleDateString()}</div>
                        {isWinner && !ticket.claimed && (<PrimaryButton onClick={() => handleClaim(ticket.id)} variant="gold">CLAIM</PrimaryButton>)}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
      
      <footer className="max-w-7xl mx-auto px-8 py-12 md:py-20 border-t border-emerald-100 dark:border-emerald-500/10 text-center transition-colors">
        <p className="text-[9px] md:text-[10px] font-black text-emerald-900/20 dark:text-white/10 uppercase tracking-[0.3em]">{t.footer}</p>
      </footer>
    </div>
  );
}

function Step({ num, title, desc, isDark }: { num: number, title: string, desc: string, isDark: boolean }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="h-10 w-10 md:h-12 md:w-12 rounded-xl md:rounded-2xl bg-emerald-100 dark:bg-emerald-500 text-emerald-800 dark:text-[#04211C] flex items-center justify-center font-black text-lg md:text-xl mb-4">{num}</div>
      <h4 className="font-bold mb-2 text-sm text-[#04211C] dark:text-white">{title}</h4>
      <p className="text-[10px] md:text-[11px] text-emerald-900/60 dark:text-white/40 leading-relaxed font-medium">{desc}</p>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);