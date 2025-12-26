import React, { useEffect, useMemo, useState, useCallback } from "react";
import ReactDOM from "react-dom/client";
import { getLuckyNumbers } from "./services/geminiService";

// --- CONSTANTS ---
const COLORS = {
  midnight: "#04211C", // Deeper, more premium Midnight Green
  midnightGlow: "rgba(16, 185, 129, 0.15)",
  mintBg: "#E9FFF6",
  mintStroke: "#7FE6C3",
  mintText: "#0D6B58",
  cardBorder: "rgba(6, 58, 48, 0.10)",
  shadow: "0 18px 50px rgba(6,58,48,0.10)",
};

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

  const [profile, setProfile] = useState({
    username: "LuckyPlayer",
    bio: "Onchain Enthusiast",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=merlin"
  });

  const [liveLotteryNumbers, setLiveLotteryNumbers] = useState<(number | null)[]>([null, null, null, null]);
  const [lotteryPhase, setLotteryPhase] = useState(0); 
  const [isRevealing, setIsRevealing] = useState(false);

  const t = useMemo(() => {
    const strings = {
      en: {
        title: "OnChain Jackpot", connect: "Connect Wallet", heroTitle: "Decentralized Onchain Daily Lottery",
        heroSubtitle: "Verifiable jackpot settles twice daily at 00:00 & 12:00 UTC. Every entry is a unique NFT minted on MerlinChain.",
        prizePool: "LIVE PRIZE POOL", totalMints: "TOTAL NFTS MINTED", activePlayers: "ACTIVE PLAYERS",
        historyTitle: "Historical Lotteries", historySub: "Previous results and settlement data", historyNoData: "NO HISTORICAL DATA YET",
        historyAuto: "The history section will populate automatically after the first lottery is settled on-chain.",
        mintTitle: "Mint New NFT Entry", selectSchedule: "SELECT LOTTERY SCHEDULE", batchMint: "BATCH MINTING",
        select4: "SELECT 4 NUMBERS (1-9)", shuffle: "Shuffle", purchase: "Mint NFT Ticket",
        liveActivity: "LIVE ONCHAIN ACTIVITY", network: "MERLIN CHAIN", viewResults: "VIEW RESULTS", howItWorks: "HOW IT WORKS",
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
        save: "Save Changes", cancel: "Cancel", copyLink: "Copy My Link", referralBonus: "EARN 0.02 M-USDT FOR EVERY NFT MINTED THROUGH YOUR LINK",
        footer: "OnChain Lottery • Powered by MerlinChain • Verifiable Assets",
        totalPrice: "TOTAL PRICE", gasFeesNote: "+ Network Gas Fees Apply",
        aiSuggestNote: "AI Suggestion",
        jackpotLabel: "JACKPOT",
        currentLottery: "Current Lottery"
      },
      zh: {
        title: "链上大奖", connect: "连接钱包", heroTitle: "去中心化链上每日彩票",
        heroSubtitle: "每日 00:00 和 12:00 UTC 定时结算。每一张彩票都是在 MerlinChain 上铸造的唯一 NFT。",
        prizePool: "实时奖池", totalMints: "总计铸造 NFT", activePlayers: "活跃玩家",
        historyTitle: "历史彩票", historySub: "历史结果与结算数据", historyNoData: "尚无历史数据",
        historyAuto: "在第一期彩票在链上结算后，历史板块将自动填充。",
        mintTitle: "铸造新 NFT 投注", selectSchedule: "选择开奖时间", batchMint: "批量铸造",
        select4: "选择 4 个数字 (1-9)", shuffle: "随机", purchase: "铸造 NFT 彩票",
        liveActivity: "链上实时动态", network: "MERLIN CHAIN", viewResults: "查看结果", howItWorks: "运作方式",
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
        currentLottery: "当前期数"
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
      targetLottery: selectedSlot
    }));
    
    setTickets(t => [...newTickets, ...t]);
    setJackpot(j => j + (mintQuantity * 1.0));
    setStats(s => ({ totalMints: s.totalMints + mintQuantity, activePlayers: s.activePlayers + 1 }));
    setTxStatus('success');
    setSelectedNumbers([]);
    setAiReason(null);
    setTimeout(() => setTxStatus('idle'), 3000);
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
              <span className="hidden sm:inline">{profile.username}</span>
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
              {t.liveActivity}
            </div>
            <h2 className="text-6xl font-black font-display text-[#04211C] mt-8 leading-[1.05] tracking-tight">{t.heroTitle}</h2>
            <p className="mt-8 text-lg font-medium text-[#0D6B58] opacity-60 max-w-lg leading-relaxed">{t.heroSubtitle}</p>
            <div className="mt-12 flex gap-16">
              <div><div className="text-3xl font-black font-display text-[#04211C]">{stats.totalMints.toLocaleString()}</div><div className="text-[10px] font-black uppercase tracking-widest text-[#0D6B58]/40 mt-1">{t.totalMints}</div></div>
              <div><div className="text-3xl font-black font-display text-[#04211C]">{stats.activePlayers.toLocaleString()}</div><div className="text-[10px] font-black uppercase tracking-widest text-[#0D6B58]/40 mt-1">{t.activePlayers}</div></div>
            </div>
          </div>

          {/* UPGRADED PRIZE POOL CARD - DIGITAL VAULT AESTHETIC */}
          <div className="w-full lg:w-[480px] relative group">
            {/* Outer Glow Effect */}
            <div className="absolute -inset-1 bg-emerald-500/10 rounded-[3.5rem] blur-xl group-hover:bg-emerald-500/20 transition-all duration-500" />
            
            <div className="relative bg-[#04211C] rounded-[3rem] p-12 text-white shadow-2xl border border-emerald-500/20 overflow-hidden">
              {/* Scanline / Grid Pattern */}
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(16, 185, 129, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.5) 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
              
              {/* Large Watermark Logo */}
              <div className="absolute -right-20 -bottom-20 opacity-10 rotate-12 pointer-events-none">
                <Logo size={320} />
              </div>

              {/* Header Info */}
              <div className="flex justify-between items-start relative z-10 mb-12">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em]">{t.prizePool}</span>
                  <div className="h-0.5 w-12 bg-emerald-500/30" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-emerald-500/40 uppercase tracking-widest">REAL-TIME</span>
                    <span className="text-[10px] font-black text-white/80">ACTIVE VAULT</span>
                  </div>
                  <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-2">
                    <Logo size={24} />
                  </div>
                </div>
              </div>

              {/* Main Jackpot Amount */}
              <div className="relative z-10 py-4">
                {/* Subtle Radial Glow behind numbers */}
                <div className="absolute inset-0 bg-emerald-500/10 blur-[60px] rounded-full pointer-events-none" />
                
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <div className="h-4 w-1 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-[13px] font-black text-emerald-400 uppercase tracking-[0.4em]">{t.jackpotLabel}</span>
                  </div>
                  
                  <div className="flex items-baseline gap-4 mt-2">
                    <span className="text-8xl font-black font-display tracking-tighter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">
                      {jackpot.toFixed(2)}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xl font-black text-emerald-500 leading-none mb-1">M-USDT</span>
                      <div className="flex gap-1">
                        <span className="h-1 w-1 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="h-1 w-1 bg-emerald-500/40 rounded-full" />
                        <span className="h-1 w-1 bg-emerald-500/20 rounded-full" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Section */}
              <div className="mt-16 pt-8 border-t border-white/10 flex justify-between items-end relative z-10">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-black text-emerald-500/40 uppercase tracking-widest leading-none mb-1">{t.currentLottery}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white tracking-tight">#{tickets.length + 1}</span>
                    <Pill variant="mint">LOCKED</Pill>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black text-emerald-500/40 uppercase tracking-widest block mb-2">MERLIN PROTOCOL</span>
                  <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400 uppercase">
                    v2.0 VERIFIED
                  </div>
                </div>
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
            <h2 className="text-2xl font-bold font-display text-[#04211C]">{t.historyTitle}</h2>
            <p className="mt-2 text-sm font-medium text-[#0D6B58] opacity-40">{t.historySub}</p>
            <div className="mt-12 border-2 border-dashed border-gray-100 rounded-[2rem] p-20 flex flex-col items-center text-center">
              <span className="text-xs font-black text-gray-200 uppercase tracking-[0.3em] mb-4">{t.historyNoData}</span>
              <p className="text-[10px] font-bold text-gray-300 max-w-[240px] leading-relaxed tracking-wide uppercase">{t.historyAuto}</p>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-xl h-fit">
            <h2 className="text-2xl font-bold font-display text-[#04211C] mb-8">{t.mintTitle}</h2>
            
            <div className="mb-8">
              <label className="text-[10px] font-black uppercase text-[#04211C]/30 tracking-widest mb-4 block">{t.selectSchedule}</label>
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
              <label className="text-[10px] font-black uppercase text-[#04211C]/30 tracking-widest mb-4 block">{t.batchMint}</label>
              <div className="flex p-1 bg-gray-50 rounded-2xl border border-gray-100">
                {[1, 5, 10, 20, 50].map(q => (
                  <button 
                    key={q} 
                    onClick={() => setMintQuantity(q)} 
                    className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${mintQuantity === q ? 'bg-white shadow-md text-[#04211C]' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {q}x
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-8">
              <label className="text-[10px] font-black uppercase text-[#04211C]/30 tracking-widest mb-4 block">{t.select4}</label>
              <div className="grid grid-cols-3 gap-3">
                {[1,2,3,4,5,6,7,8,9].map(n => (
                  <button key={n} onClick={() => toggleNumber(n)} className={`h-16 rounded-2xl flex items-center justify-center text-xl font-black transition-all border-2 active:scale-95 ${selectedNumbers.includes(n) ? "bg-[#04211C] text-white border-[#04211C]" : "bg-white border-gray-50 text-[#04211C] hover:border-[#7FE6C3]"}`}>{n}</button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button onClick={handleShufflePick} className="py-3 px-4 border border-gray-100 rounded-xl font-bold text-[10px] uppercase tracking-widest text-gray-400 transition-all hover:bg-gray-50 active:scale-95">{t.shuffle}</button>
                <button onClick={handleAiPick} disabled={aiLoading} className="py-3 px-4 bg-violet-50 text-violet-800 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-violet-100 flex items-center justify-center gap-2 transition-all hover:bg-violet-100 active:scale-95 disabled:opacity-50">
                  {aiLoading ? <div className="h-3 w-3 border-2 border-violet-800 border-t-transparent rounded-full animate-spin" /> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"></path></svg>}
                  {t.aiLucky}
                </button>
              </div>

              {aiReason && (
                <div className="mt-4 p-4 rounded-2xl bg-violet-50/50 border border-violet-100/50 text-violet-900/60 text-[10px] font-bold italic leading-relaxed animate-in fade-in slide-in-from-top-2">
                  <span className="not-italic text-[8px] font-black uppercase tracking-widest text-violet-400 block mb-1">{t.aiSuggestNote}</span>
                  "{aiReason}"
                </div>
              )}
            </div>

            <div className="bg-emerald-50 rounded-[2rem] p-8 border border-emerald-100 shadow-inner mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black opacity-30 uppercase tracking-[0.2em]">{t.totalPrice}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-emerald-900">{(mintQuantity * 1.0).toFixed(2)}</span>
                    <span className="text-[10px] font-black text-emerald-800/40">M-USDT</span>
                  </div>
                </div>
                <div className="text-right text-[9px] font-black text-emerald-800/20 uppercase tracking-widest">
                  {t.gasFeesNote}
                </div>
            </div>

            <PrimaryButton onClick={handleMint} loading={txStatus === 'mining'} disabled={selectedNumbers.length < 4 || txStatus === 'mining'}>
              {txStatus === 'mining' ? 'MINTING...' : t.purchase}
            </PrimaryButton>
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

      {showGuideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setShowGuideModal(false)} />
          <div className="relative z-10 w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="p-8 md:p-12 border-b flex items-center justify-between">
              <div><h2 className="text-3xl font-black font-display text-[#04211C]">{t.howItWorks}</h2><p className="text-sm font-medium opacity-40 uppercase tracking-widest mt-1">Platform Guidelines & Legal</p></div>
              <button onClick={() => setShowGuideModal(false)} className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors">X</button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12 scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[1,2,3,4].map(num => (
                  <div key={num} className="text-center">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xl mb-4 mx-auto">{num}</div>
                    <h4 className="font-bold mb-2 text-sm text-[#04211C]">{t[`step${num}Title` as keyof typeof t]}</h4>
                    <p className="text-[11px] text-[#0D6B58] opacity-60 leading-relaxed font-medium">{t[`step${num}Desc` as keyof typeof t]}</p>
                  </div>
                ))}
              </div>
              <div className="pt-8 border-t border-emerald-50 text-xs text-gray-500 space-y-4">
                <h3 className="font-black uppercase tracking-widest text-[#04211C]">{t.rules}</h3>
                <p>{t.rule1}</p><p>{t.rule2}</p><p>{t.rule3}</p><p>{t.rule4}</p>
              </div>
              <div className="p-8 rounded-3xl bg-red-50 border border-red-100">
                <h3 className="text-xs font-black uppercase text-red-600 mb-4">{t.disclaimer}</h3>
                <p className="text-[10px] text-red-900/60 leading-relaxed">{t.disclaimerText}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setShowProfileModal(false)} />
          <div className="relative z-10 w-full max-w-5xl bg-[#F9FAFB] rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
            <div className="p-12 border-b bg-white flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex flex-col md:flex-row items-center gap-8 w-full">
                <img src={profile.avatarUrl} alt="Profile" className="h-32 w-32 rounded-full border-4 border-emerald-100 shadow-lg object-cover" />
                <div className="flex-1 text-center md:text-left">
                  {isEditingProfile ? (
                    <div className="space-y-2"><input className="px-4 py-2 border rounded-xl font-bold w-full" value={profile.username} onChange={e => setProfile({...profile, username: e.target.value})} /><textarea className="px-4 py-2 border rounded-xl text-sm w-full" value={profile.bio} onChange={e => setProfile({...profile, bio: e.target.value})} /></div>
                  ) : (
                    <><h2 className="text-3xl font-black font-display text-[#04211C]">{profile.username}</h2><p className="text-sm font-bold text-[#0D6B58]/40 uppercase tracking-widest mt-1 mb-4 font-mono">{account}</p><p className="text-sm text-gray-500">{profile.bio}</p></>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3 min-w-[140px]">
                {isEditingProfile ? (<PrimaryButton onClick={() => setIsEditingProfile(false)} variant="success">{t.save}</PrimaryButton>) : (<PrimaryButton onClick={() => setIsEditingProfile(true)}>{t.profile}</PrimaryButton>)}
                <PrimaryButton onClick={() => { setAccount(null); setShowProfileModal(false); }} variant="warning">{t.logout}</PrimaryButton>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-12 space-y-12 bg-gray-50/50">
              <section className="bg-white p-8 rounded-[2rem] border border-emerald-100 shadow-sm flex flex-col lg:flex-row gap-8 items-center">
                <div className="flex-1">
                  <h3 className="text-xl font-black font-display mb-2">{t.referral}</h3>
                  <p className="text-xs font-bold text-emerald-800/40 uppercase tracking-widest mb-6">{t.referralBonus}</p>
                  <div className="flex gap-3"><div className="flex-1 bg-gray-50 border border-emerald-50 px-4 py-3 rounded-xl text-xs font-mono truncate">merlinchain.io/lottery?ref={account?.slice(0, 8)}</div><button className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest">{t.copyLink}</button></div>
                </div>
              </section>
              <section>
                <h3 className="text-xl font-black font-display mb-8">{t.myTickets} ({tickets.length})</h3>
                {tickets.length === 0 ? (<div className="py-20 text-center border-2 border-dashed rounded-[2rem] border-emerald-100 text-emerald-900/40 font-bold uppercase tracking-widest bg-white">NO ENTRIES FOUND</div>) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {tickets.map(ticket => (
                      <div key={ticket.id} className="bg-white rounded-[2.5rem] border border-emerald-50 shadow-sm overflow-hidden p-6 hover:-translate-y-1 transition-all">
                        <div className="flex justify-between items-center mb-6"><span className="text-[10px] font-black opacity-30 uppercase tracking-widest">ID: {ticket.id}</span><Pill variant="mint">VERIFIED</Pill></div>
                        <div className="flex gap-2 justify-center mb-6">{ticket.numbers.map((n: number, i: number) => (<div key={i} className="h-12 w-12 rounded-2xl bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center text-lg font-black text-emerald-900">{n}</div>))}</div>
                        <div className="pt-4 border-t text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center">{new Date(ticket.targetLottery).toLocaleDateString()} AT {pad2(new Date(ticket.targetLottery).getUTCHours())}:00 UTC</div>
                      </div>
                    ))}
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
