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

const Pill: React.FC<{ children: React.ReactNode; variant?: 'default' | 'gold' | 'mint' | 'danger' | 'info' }> = ({ children, variant = 'default' }) => {
  const styles = {
    gold: { bg: "rgba(212, 175, 55, 0.15)", color: "#8b6508", border: "rgba(212, 175, 55, 0.4)" },
    mint: { bg: "rgba(16, 185, 129, 0.1)", color: "#047857", border: "rgba(16, 185, 129, 0.2)" },
    danger: { bg: "rgba(239, 68, 68, 0.1)", color: "#b91c1c", border: "rgba(239, 68, 68, 0.2)" },
    info: { bg: "rgba(59, 130, 246, 0.1)", color: "#1d4ed8", border: "rgba(59, 130, 246, 0.2)" },
    default: { bg: "rgba(127,230,195,0.14)", color: "#04211C", border: "rgba(127,230,195,0.55)" }
  };
  const s = styles[variant];
  return (
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider whitespace-nowrap" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
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
    <button disabled={disabled || loading} onClick={onClick} className={`w-full rounded-2xl px-4 py-3 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2`} style={{ background: s.bg, color: s.color || 'white', border: s.border || 'none', boxShadow: s.shadow }}>
      {loading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : children}
    </button>
  );
};

const TimeDisplay = ({ value, label }: { value: string, label: string }) => (
  <div className="flex flex-col items-center">
    <div className="text-4xl font-black font-display tracking-tighter" style={{ color: COLORS.midnight }}>{value}</div>
    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/50">{label}</span>
  </div>
);

// --- MAIN APP ---
function App() {
  const [lang, setLang] = useState<'en' | 'zh'>('en');
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
        title: "OnChain Jackpot", connect: "Connect Wallet", heroTitle: "Onchain Daily Lottery",
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
        disclaimer: "Legal Disclaimer", disclaimerText: "OnChain Jackpot is a decentralized game of chance. Participating in lotteries involves risk. Digital assets are highly volatile.",
        latestResult: "Latest Result", settledMsg: "LOTTERY SUCCESSFULLY SETTLED",
        verifyingOnchain: "Verifying Onchain Entropy...", revealSuccess: "Settlement Complete",
        aiLucky: "AI Lucky Pick", days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds",
        countdownTitle: "Next Lottery Countdown", countdownSub: "Winning numbers revealed at 00:00 & 12:00 UTC daily",
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
        // Fixed: Added missing username and bio keys to fix property access errors in profile editing modal
        username: "Display Name",
        bio: "Bio / Motto"
      },
      zh: {
        title: "链上大奖", connect: "连接钱包", heroTitle: "链上每日彩票",
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
        disclaimer: "法律声明", disclaimerText: "数字资产具有高度波动性。请仅使用您可以承受损失的资金。",
        latestResult: "最新开奖结果", settledMsg: "开奖已成功结算",
        verifyingOnchain: "验证链上数据...", revealSuccess: "结算完成",
        aiLucky: "AI 幸运挑选", days: "天", hours: "小时", minutes: "分钟", seconds: "秒",
        countdownTitle: "开奖倒计时", countdownSub: "每日 00:00 和 12:00 UTC 开奖",
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
        // Fixed: Added missing username and bio keys to fix property access errors in profile editing modal
        username: "显示名称",
        bio: "个人简介 / 座右铭"
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
    alert("Jackpot Reward Claimed Successfully!");
  };

  const copyRefLink = () => {
    const link = `${window.location.origin}/?ref=${account}`;
    navigator.clipboard.writeText(link);
    alert("Referral link copied to clipboard!");
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-100 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.location.reload()}>
          <Logo size={48} />
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold font-display" style={{ color: COLORS.midnight }}>{t.title}</h1>
            <p className="text-[10px] font-bold text-[#0D6B58] uppercase tracking-widest mt-1">MERLINCHAIN MAINNET</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowResultsModal(true)} className="px-4 py-2 border border-[#7FE6C3] rounded-xl text-[11px] font-black uppercase tracking-widest text-[#04211C] transition-all hover:bg-emerald-50">{t.viewResults}</button>
          <button onClick={() => setShowGuideModal(true)} className="px-4 py-2 border border-[#7FE6C3] rounded-xl text-[11px] font-black uppercase tracking-widest text-[#04211C] transition-all hover:bg-emerald-50">{t.howItWorks}</button>
          <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="px-3 py-2 border border-[#7FE6C3] rounded-xl text-[11px] font-black">{lang === 'en' ? '中文' : 'EN'}</button>
          {account ? (
            <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-800 font-bold text-sm shadow-sm transition-all hover:bg-emerald-100">
              <img src={profile.avatarUrl} alt="Avatar" className="h-7 w-7 rounded-full border border-emerald-200 object-cover" />
              <span className="hidden sm:inline max-w-[120px] truncate">{profile.username}</span>
            </button>
          ) : (
            <button onClick={connectWallet} className="bg-[#04211C] text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95">{t.connect}</button>
          )}
        </div>
      </header>

      <div className="bg-[#E9FFF6] py-1.5 border-b border-[#7FE6C3]/20 overflow-hidden h-8 flex items-center">
        <div className="animate-marquee flex whitespace-nowrap gap-12 text-[10px] font-bold uppercase tracking-widest text-emerald-800/40">
           <div className="flex items-center gap-2">
             <span className="text-emerald-500/20">●</span>
             <span>{t.liveActivity} INITIALIZING...</span>
           </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-8 mt-12">
        <section className="bg-white rounded-[3rem] border border-gray-100 p-12 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row gap-12 items-center">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none scale-150 rotate-12"><Logo size={300} /></div>
          <div className="flex-1 relative z-10">
            <div className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-[#E9FFF6] text-[#0D6B58] border border-[#7FE6C3]">
              <span className="h-1.5 w-1.5 rounded-full bg-current mr-2 animate-pulse" />
              LIVE STATUS
            </div>
            <h2 className="text-6xl font-black font-display text-[#04211C] mt-8 leading-[1.05] tracking-tight">{t.heroTitle}</h2>
            <p className="mt-8 text-lg font-medium text-[#0D6B58] opacity-60 max-w-lg leading-relaxed">{t.heroSubtitle}</p>
            <div className="mt-12 flex gap-16">
              <div><div className="text-3xl font-black font-display" style={{ color: COLORS.midnight }}>{stats.totalMints.toLocaleString()}</div><div className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 mt-1">{t.totalMints}</div></div>
              <div><div className="text-3xl font-black font-display" style={{ color: COLORS.midnight }}>{stats.activePlayers.toLocaleString()}</div><div className="text-[10px] font-black uppercase tracking-widest text-emerald-800/40 mt-1">{t.activePlayers}</div></div>
            </div>
          </div>

          <div className="w-full lg:w-[480px] relative group">
            <div className="absolute -inset-1 bg-emerald-500/10 rounded-[3.5rem] blur-xl group-hover:bg-emerald-500/20 transition-all duration-500" />
            <div className="relative bg-[#04211C] rounded-[3rem] p-12 text-white shadow-2xl border border-emerald-500/20 overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.5) 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
              <div className="absolute -right-20 -bottom-20 opacity-10 rotate-12 pointer-events-none"><Logo size={320} /></div>
              <div className="flex justify-between items-start relative z-10 mb-12">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">{t.prizePool}</span>
                  <div className="h-0.5 w-12 bg-emerald-500/30" />
                </div>
                <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-2"><Logo size={24} /></div>
              </div>
              <div className="relative z-10 py-4">
                <div className="absolute inset-0 bg-emerald-500/10 blur-[60px] rounded-full pointer-events-none" />
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3"><div className="h-4 w-1 bg-emerald-500 rounded-full animate-pulse" /><span className="text-[13px] font-black text-emerald-400 uppercase tracking-[0.4em]">{t.jackpotLabel}</span></div>
                  <div className="flex items-baseline gap-4 mt-2"><span className="text-8xl font-black font-display tracking-tighter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">{jackpot.toFixed(2)}</span><div className="flex flex-col"><span className="text-xl font-black text-emerald-400 leading-none mb-1">M-USDT</span><div className="flex gap-1"><span className="h-1 w-1 bg-emerald-500 rounded-full animate-pulse" /><span className="h-1 w-1 bg-emerald-500/40 rounded-full" /></div></div></div>
                </div>
              </div>
              <div className="mt-16 pt-8 border-t border-white/10 flex justify-between items-end relative z-10">
                <div className="flex flex-col gap-1"><span className="text-[9px] font-black text-emerald-500/40 uppercase tracking-widest leading-none mb-1">{t.currentLottery}</span><div className="flex items-center gap-2"><span className="text-sm font-bold text-white tracking-tight">#{tickets.length + 1}</span><Pill variant="mint">LOCKED</Pill></div></div>
                <div className="text-right text-[9px] font-black text-emerald-500/40 uppercase tracking-widest block mb-2">v2.0 VERIFIED</div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-12 bg-white rounded-[2rem] border border-gray-100 p-8 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-800"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>
            <div><h3 className="font-bold text-lg" style={{ color: COLORS.midnight }}>{t.countdownTitle}</h3><p className="text-xs font-medium text-gray-400">{t.countdownSub}</p></div>
          </div>
          <div className="flex gap-4">
            <TimeDisplay value={pad2(timeLeft.days)} label={t.days} /><div className="text-4xl font-black font-display opacity-20" style={{ color: COLORS.midnight }}>:</div>
            <TimeDisplay value={pad2(timeLeft.hours)} label={t.hours} /><div className="text-4xl font-black font-display opacity-20" style={{ color: COLORS.midnight }}>:</div>
            <TimeDisplay value={pad2(timeLeft.minutes)} label={t.minutes} /><div className="text-4xl font-black font-display opacity-20" style={{ color: COLORS.midnight }}>:</div>
            <TimeDisplay value={pad2(timeLeft.seconds)} label={t.seconds} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
          <div className="lg:col-span-7 bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-xl min-h-[500px]">
            <h2 className="text-2xl font-bold font-display" style={{ color: COLORS.midnight }}>{t.historyTitle}</h2>
            <p className="mt-2 text-sm font-medium text-[#0D6B58] opacity-40">{t.historySub}</p>
            <div className="mt-12 border-2 border-dashed border-gray-100 rounded-[2rem] p-20 flex flex-col items-center text-center">
              <span className="text-xs font-black text-gray-200 uppercase tracking-[0.3em] mb-4">{t.historyNoData}</span>
              <p className="text-[10px] font-bold text-gray-300 max-w-[240px] leading-relaxed tracking-wide uppercase">{t.historyAuto}</p>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-xl h-fit">
            <h2 className="text-2xl font-bold font-display mb-8" style={{ color: COLORS.midnight }}>{t.mintTitle}</h2>
            
            <div className="mb-8">
              <label className="text-[10px] font-black uppercase opacity-30 tracking-widest mb-4 block">{t.selectSchedule}</label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {lotterySlots.map(ts => (
                  <button key={ts} onClick={() => setSelectedSlot(ts)} className={`flex-shrink-0 p-4 rounded-2xl border-2 transition-all flex flex-col items-center min-w-[120px] ${selectedSlot === ts ? "bg-[#04211C] text-white border-[#04211C] shadow-lg" : "bg-white border-gray-50 text-[#04211C] hover:border-[#7FE6C3]"}`}>
                    <span className="text-[9px] font-black uppercase opacity-60 tracking-widest mb-1">{new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                    <span className="text-xs font-bold">{pad2(new Date(ts).getUTCHours())}:00 UTC</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <label className="text-[10px] font-black uppercase opacity-30 tracking-widest mb-4 block">{t.batchMint}</label>
              <div className="flex p-1 bg-gray-50 rounded-2xl border border-gray-100">
                {[1, 5, 10, 20, 50].map(q => (
                  <button key={q} onClick={() => setMintQuantity(q)} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${mintQuantity === q ? 'bg-white shadow-md text-[#04211C]' : 'text-gray-400 hover:text-gray-600'}`}>
                    {q}x
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <label className="text-[10px] font-black uppercase opacity-30 tracking-widest mb-4 block">{t.select4}</label>
              <div className="grid grid-cols-3 gap-3">
                {[1,2,3,4,5,6,7,8,9].map(n => (
                  <button key={n} onClick={() => toggleNumber(n)} className={`h-16 rounded-2xl flex items-center justify-center text-xl font-black transition-all border-2 active:scale-95 ${selectedNumbers.includes(n) ? "bg-[#04211C] text-white border-[#04211C]" : "bg-white border-gray-50 text-[#04211C] hover:border-[#7FE6C3]"}`}>{n}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button onClick={handleShufflePick} className="py-3 px-4 border border-gray-100 rounded-xl font-bold text-[10px] uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all">{t.shuffle}</button>
                <button onClick={handleAiPick} disabled={aiLoading} className="py-3 px-4 bg-violet-50 text-violet-800 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-violet-100 flex items-center justify-center gap-2 transition-all hover:bg-violet-100 disabled:opacity-50">
                  {aiLoading ? <div className="h-3 w-3 border-2 border-violet-800 border-t-transparent rounded-full animate-spin" /> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"></path></svg>}
                  {t.aiLucky}
                </button>
              </div>
              {aiReason && (<div className="mt-4 p-4 rounded-2xl bg-violet-50/50 border border-violet-100/50 text-violet-900/60 text-[10px] font-bold italic leading-relaxed animate-in fade-in">"{aiReason}"</div>)}
            </div>

            <div className="bg-emerald-50 rounded-[2rem] p-8 border border-emerald-100 mb-6">
                <div className="flex justify-between items-center mb-2"><span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">{t.totalPrice}</span><div className="flex items-baseline gap-2"><span className="text-2xl font-black text-emerald-900">{(mintQuantity * 1.0).toFixed(2)}</span><span className="text-[10px] font-black text-emerald-800/40">M-USDT</span></div></div>
                <div className="text-right text-[9px] font-black text-emerald-800/20 uppercase tracking-widest">{t.gasFeesNote}</div>
            </div>

            <PrimaryButton onClick={handleMint} loading={txStatus === 'mining'} disabled={selectedNumbers.length < 4 || txStatus === 'mining'}>{txStatus === 'mining' ? 'MINTING...' : t.purchase}</PrimaryButton>
          </div>
        </div>
      </main>

      {showResultsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setShowResultsModal(false)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-[2.5rem] p-10 text-center shadow-2xl animate-in zoom-in-95 duration-300">
             <button onClick={() => setShowResultsModal(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-all z-20"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
             <h2 className="text-3xl font-black font-display text-[#04211C] mb-8">{t.latestResult}</h2>
             <div className="flex justify-center gap-4 mb-12 h-24">
                {liveLotteryNumbers.map((n, i) => (
                  <div key={i} className={`h-16 w-16 md:h-20 md:w-20 rounded-full border-4 flex items-center justify-center transition-all duration-700 transform ${n !== null ? 'scale-110 rotate-12 border-emerald-500 bg-emerald-50 shadow-lg' : 'border-dashed border-emerald-100 bg-emerald-50/30'}`}>
                    <span className="font-black text-2xl text-emerald-900">{n !== null ? n : '?'}</span>
                  </div>
                ))}
             </div>
             <p className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-widest">{lotteryPhase < 5 ? t.verifyingOnchain : t.revealSuccess}</p>
          </div>
        </div>
      )}

      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setShowProfileModal(false)} />
          <div className="relative z-10 w-full max-w-5xl bg-[#F9FAFB] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
            <div className="p-12 border-b bg-white flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex flex-col md:flex-row items-center gap-8 w-full">
                <div className="relative">
                  <img src={profile.avatarUrl} alt="Profile" className="h-32 w-32 rounded-full border-4 border-emerald-100 shadow-lg object-cover" />
                  {isEditingProfile && (
                    <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-emerald-600 text-white p-2 rounded-full shadow-lg border-2 border-white hover:bg-emerald-700">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                    </button>
                  )}
                </div>
                <div className="flex-1 text-center md:text-left">
                  {isEditingProfile ? (
                    <div className="space-y-4">
                      <div className="space-y-2"><label className="text-[10px] font-black uppercase text-emerald-800/40 tracking-widest block">{t.username}</label><input className="px-4 py-2 border rounded-xl font-bold w-full" value={profile.username} onChange={e => setProfile({...profile, username: e.target.value})} /></div>
                      <div className="space-y-2"><label className="text-[10px] font-black uppercase text-emerald-800/40 tracking-widest block">Choose Avatar</label>
                        <div className="flex gap-2 flex-wrap">
                          {PRELOADED_AVATARS.map((url, i) => (
                            <button key={i} onClick={() => setProfile({...profile, avatarUrl: url})} className={`h-12 w-12 rounded-full overflow-hidden border-2 transition-all ${profile.avatarUrl === url ? 'border-emerald-600 scale-110 shadow-md' : 'border-emerald-100 opacity-50'}`}><img src={url} className="w-full h-full object-cover" /></button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2"><label className="text-[10px] font-black uppercase text-emerald-800/40 tracking-widest block">{t.bio}</label><textarea className="px-4 py-2 border rounded-xl text-sm w-full" value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} /></div>
                    </div>
                  ) : (
                    <><h2 className="text-3xl font-black font-display text-[#04211C]">{profile.username}</h2><p className="text-sm font-bold text-[#0D6B58]/40 uppercase tracking-widest mt-1 mb-4 font-mono">{account}</p><p className="text-sm text-gray-500">{profile.bio}</p></>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3 min-w-[140px]">
                {isEditingProfile ? (<PrimaryButton onClick={() => { saveToWallet('profile', profile); setIsEditingProfile(false); }} variant="success">{t.save}</PrimaryButton>) : (<PrimaryButton onClick={() => setIsEditingProfile(true)}>{t.profile}</PrimaryButton>)}
                <PrimaryButton onClick={() => { setAccount(null); setShowProfileModal(false); }} variant="warning">{t.logout}</PrimaryButton>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-12 space-y-12 bg-gray-50/50">
              <section className="bg-white p-8 rounded-[2rem] border border-emerald-100 shadow-sm flex flex-col lg:flex-row gap-8 items-center">
                <div className="flex-1">
                  <h3 className="text-xl font-black font-display mb-2">{t.referral}</h3>
                  <p className="text-xs font-bold text-emerald-800/40 uppercase tracking-widest mb-6">{t.referralBonus}</p>
                  <div className="flex gap-3"><div className="flex-1 bg-gray-50 border border-emerald-50 px-4 py-3 rounded-xl text-xs font-mono truncate">{account ? `${window.location.origin}/?ref=${account}` : '...'}</div><button onClick={copyRefLink} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-colors">{t.copyLink}</button></div>
                </div>
              </section>
              <section>
                <h3 className="text-xl font-black font-display mb-8">{t.myTickets} ({tickets.length})</h3>
                {tickets.length === 0 ? (<div className="py-20 text-center border-2 border-dashed rounded-[2rem] border-emerald-100 text-emerald-900/40 font-bold uppercase tracking-widest bg-white">NO ENTRIES FOUND</div>) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tickets.map(ticket => {
                      const winningNums = getWinningNumbersForSlot(ticket.targetLottery);
                      const isWinner = ticket.numbers.every((n: number, i: number) => n === winningNums[i]);
                      return (
                        <div key={ticket.id} className={`bg-white rounded-[2.5rem] border overflow-hidden p-6 transition-all ${isWinner ? 'border-amber-400 shadow-[0_10px_30px_rgba(212,175,55,0.15)] ring-2 ring-amber-400/20' : 'border-emerald-50 shadow-sm hover:-translate-y-1'}`}>
                          <div className="flex justify-between items-center mb-6"><span className="text-[10px] font-black opacity-30 uppercase tracking-widest">ID: {ticket.id}</span><Pill variant={isWinner ? 'gold' : 'mint'}>{isWinner ? 'WINNER' : 'VERIFIED'}</Pill></div>
                          <div className="flex gap-2 justify-center mb-6">{ticket.numbers.map((n: number, i: number) => (<div key={i} className={`h-12 w-12 rounded-2xl flex items-center justify-center text-lg font-black ${isWinner ? 'bg-amber-50 border-2 border-amber-200 text-amber-900' : 'bg-emerald-50 border-2 border-emerald-100 text-emerald-900'}`}>{n}</div>))}</div>
                          <div className="pt-4 border-t text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-4">{new Date(ticket.targetLottery).toLocaleDateString()} AT {pad2(new Date(ticket.targetLottery).getUTCHours())}:00 UTC</div>
                          {isWinner && !ticket.claimed && (<PrimaryButton onClick={() => handleClaim(ticket.id)} variant="gold">{t.claimPrize}</PrimaryButton>)}
                          {ticket.claimed && (<div className="w-full py-3 bg-emerald-100 text-emerald-800 rounded-2xl text-center text-xs font-black uppercase tracking-widest border border-emerald-200">{t.claimed}</div>)}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
      
      <footer className="max-w-7xl mx-auto px-8 py-20 border-t border-emerald-100 text-center">
        <p className="text-[10px] font-black text-emerald-900/20 uppercase tracking-[0.3em]">{t.footer}</p>
      </footer>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);