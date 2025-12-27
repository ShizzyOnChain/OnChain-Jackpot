
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import ReactDOM from "react-dom/client";
import { GoogleGenAI, Type } from "@google/genai";

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

// --- GEMINI SERVICE ---
const getLuckyNumbers = async (): Promise<{ numbers: number[]; reason: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Suggest 4 unique lucky lottery numbers between 1 and 9. Provide a short, fun reason for the selection.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            numbers: { type: Type.ARRAY, items: { type: Type.INTEGER } },
            reason: { type: Type.STRING },
          },
          required: ["numbers", "reason"],
        },
      },
    });
    const data = JSON.parse(response.text || '{}');
    return {
      numbers: Array.isArray(data.numbers) ? data.numbers.slice(0, 4).map(Number) : [1, 2, 3, 4],
      reason: data.reason || "The stars have aligned for these numbers!"
    };
  } catch (e) {
    return { numbers: [1, 3, 7, 9], reason: "These numbers resonate with the current block entropy." };
  }
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

// --- TRANSLATIONS ---
const translations = {
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
    disclaimer: "Legal Disclaimer", disclaimerText: "OnChain Jackpot is an experimental verifiable game of chance. Participating in lotteries involves financial risk. Digital assets are highly volatile.",
    latestResult: "Latest Result", settledMsg: "LOTTERY SUCCESSFULLY SETTLED",
    verifyingOnchain: "Verifying Onchain Entropy...", revealSuccess: "Settlement Complete",
    aiLucky: "AI Lucky Pick", days: "Days", hours: "Hours", minutes: "Minutes", seconds: "Seconds",
    countdownTitle: "Next Lottery Countdown", countdownSub: "Reveal: 00:00 & 12:00 UTC",
    myTickets: "My NFT Entries", profile: "Profile", referral: "Referral & Rewards", logout: "Logout",
    save: "Save Changes", cancel: "Cancel", copyLink: "Copy Link", referralBonus: "EARN 0.02 M-USDT FOR EVERY NFT MINTED THROUGH YOUR LINK",
    footer: "OnChain Lottery • Powered by MerlinChain • Verifiable Assets",
    totalPrice: "TOTAL PRICE", gasFeesNote: "+ Network Gas Fees Apply",
    jackpotLabel: "JACKPOT", currentLottery: "Current Lottery", claimPrize: "Claim",
    earningsSummary: "Earnings & Rewards", totalEarnings: "Total Earnings",
    username: "Username", bio: "Bio", claimed: "Claimed", verified: "Verified"
  },
  zh: {
    title: "链上大奖", connect: "连接", heroTitle: "链上每日彩票",
    heroSubtitle: "可验证奖池每日 00:00 和 12:00 UTC 定时结算。每一张投注都是在 MerlinChain 上铸造的唯一 NFT。",
    prizePool: "实时奖池", totalMints: "总计铸造 NFT", activePlayers: "活跃玩家",
    historyTitle: "历史开奖", historySub: "历史结果与结算数据", historyNoData: "尚无历史数据",
    historyAuto: "在第一期彩票在链上结算后，历史板块将自动填充。",
    mintTitle: "铸造新 NFT 投注", selectSchedule: "选择开奖时间", batchMint: "批量铸造",
    select4: "选择 4 个数字 (1-9)", shuffle: "随机", purchase: "铸造 NFT 彩票",
    liveActivity: "链上每日彩票", network: "MERLIN CHAIN", viewResults: "查看结果", howItWorks: "运作方式",
    step1Title: "连接并切换", step1Desc: "连接您的钱包并切换到 MerlinChain 主网。",
    step2Title: "选择号码", step2Desc: "在 1-9 之间选择 4 个数字。这些将编码到您的 NFT 元数据中。",
    step3Title: "铸造投注", step3Desc: "确认交易以在链上铸造您唯一的 NFT 彩票。价格：1 M-USDT + Gas。",
    step4Title: "领取大奖", step4Desc: "如果您的 NFT 号码与每日开奖完全匹配，即可领取奖池奖金！",
    rules: "彩票规则", rule1: "每 12 小时进行一次开奖 (00:00 & 12:00 UTC)。",
    rule2: "开奖使用确定的链上随机熵，确保公平性。",
    rule3: "奖池由该特定开奖时段的所有中奖者平分。",
    rule4: "成功铸造后，推荐费 (0.02 M-USDT) 将立即支付。",
    disclaimer: "法律声明", disclaimerText: "OnChain Jackpot 是一款实验性的几率游戏。参与彩票涉及财务风险。数字资产波动性极高。",
    latestResult: "最新开奖", settledMsg: "开奖已成功结算",
    verifyingOnchain: "验证链上数据...", revealSuccess: "结算完成",
    aiLucky: "AI 幸运挑选", days: "天", hours: "小时", minutes: "分钟", seconds: "秒",
    countdownTitle: "下次开奖倒计时", countdownSub: "开奖时间: 00:00 & 12:00 UTC",
    myTickets: "我的投注", profile: "个人中心", referral: "推荐奖励", logout: "断开连接",
    save: "保存修改", cancel: "取消", copyLink: "复制链接", referralBonus: "通过您的链接铸造的每个 NFT 均可赚取 0.02 M-USDT",
    footer: "链上彩票 • 由 MerlinChain 提供支持 • 可验证资产",
    totalPrice: "总价", gasFeesNote: "+ 需支付网络 Gas 费",
    jackpotLabel: "累计大奖", currentLottery: "当前期数", claimPrize: "领取",
    earningsSummary: "收益与奖励", totalEarnings: "总收益",
    username: "用户名", bio: "简介", claimed: "已领取", verified: "已验证"
  }
};

// --- MAIN APP ---
function App() {
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  const t = translations[lang];
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
  const [profile, setProfile] = useState({ username: "LuckyPlayer", bio: "Onchain Enthusiast", avatarUrl: PRELOADED_AVATARS[0] });
  const [liveLotteryNumbers, setLiveLotteryNumbers] = useState<(number | null)[]>([null, null, null, null]);
  const [lotteryPhase, setLotteryPhase] = useState(0); 
  const [isRevealing, setIsRevealing] = useState(false);

  useEffect(() => {
    if (isDark) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [isDark]);

  useEffect(() => {
    if (account) {
      const stored = localStorage.getItem(`jackpot_profile_${account}`);
      if (stored) setProfile(JSON.parse(stored));
      const tks = localStorage.getItem(`jackpot_tickets_${account}`);
      if (tks) setTickets(JSON.parse(tks));
    }
  }, [account]);

  const saveToWallet = (key: string, data: any) => { if (account) localStorage.setItem(`jackpot_${key}_${account}`, JSON.stringify(data)); };

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
  }, [now]);

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
      setLiveLotteryNumbers(prev => { const next = [...prev]; next[i - 1] = finalNumbers[i - 1]; return next; });
      setLotteryPhase(i);
    }
    await new Promise(r => setTimeout(r, 800));
    setLotteryPhase(5);
    setIsRevealing(false);
  };

  useEffect(() => { if (showResultsModal) runLiveLotterySequence(); }, [showResultsModal]);

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
      } catch (e) { console.error(e); }
    } else alert("Please install MetaMask");
  };

  const handleAiPick = async () => {
    setAiLoading(true);
    const lucky = await getLuckyNumbers();
    setSelectedNumbers(lucky.numbers.sort((a, b) => a - b));
    setAiReason(lucky.reason);
    setAiLoading(false);
  };

  const handleMint = async () => {
    if (!account) return connectWallet();
    setTxStatus('mining');
    await new Promise(r => setTimeout(r, 2000));
    const newTk = { id: Math.random().toString(36).substring(7).toUpperCase(), numbers: [...selectedNumbers], targetLottery: selectedSlot, claimed: false };
    const updated = [newTk, ...tickets];
    setTickets(updated);
    saveToWallet('tickets', updated);
    setJackpot(j => j + (mintQuantity * 1.0));
    setStats(s => ({ totalMints: s.totalMints + mintQuantity, activePlayers: s.activePlayers + 1 }));
    setTxStatus('success');
    setSelectedNumbers([]);
    setTimeout(() => setTxStatus('idle'), 3000);
  };

  return (
    <div className="min-h-screen pb-12 transition-colors duration-300">
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#04211C]/90 backdrop-blur-lg border-b border-gray-100 dark:border-emerald-500/10 px-4 md:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.reload()}>
          <Logo size={42} />
          <div className="hidden sm:block">
            <h1 className="text-lg md:text-xl font-bold font-display text-[#04211C] dark:text-white">{t.title}</h1>
            <p className="text-[9px] font-bold text-[#0D6B58] dark:text-emerald-400 uppercase tracking-widest">{t.network}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={() => setShowResultsModal(true)} className="px-3 py-1.5 md:px-4 md:py-2 border border-[#7FE6C3] dark:border-emerald-500/30 rounded-xl text-[9px] md:text-[11px] font-black uppercase tracking-wider text-[#04211C] dark:text-white transition-all hover:bg-emerald-50 dark:hover:bg-emerald-500/10">{t.viewResults}</button>
          <button onClick={() => setShowGuideModal(true)} className="hidden sm:flex px-4 py-2 border border-[#7FE6C3] dark:border-emerald-500/30 rounded-xl text-[11px] font-black uppercase tracking-wider text-[#04211C] dark:text-white transition-all hover:bg-emerald-50 dark:hover:bg-emerald-500/10">{t.howItWorks}</button>
          <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="px-3 py-2 border border-[#7FE6C3] dark:border-emerald-500/30 rounded-xl text-[11px] font-black text-[#04211C] dark:text-white hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all">{lang === 'en' ? '中文' : 'EN'}</button>
          <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-xl border border-[#7FE6C3] dark:border-emerald-500/30 transition-all hover:bg-emerald-50 dark:hover:bg-emerald-500/10">
            {isDark ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-midnight"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
          </button>
          {account ? (
            <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 px-2 py-1 md:px-3 md:py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 text-emerald-800 dark:text-emerald-100 font-bold text-xs md:text-sm shadow-sm">
              <img src={profile.avatarUrl} alt="Avatar" className="h-6 w-6 md:h-7 md:w-7 rounded-full border border-emerald-200 dark:border-emerald-500/30 object-cover" />
              <span className="hidden lg:inline max-w-[80px] truncate dark:text-white">{profile.username}</span>
            </button>
          ) : <button onClick={connectWallet} className="bg-[#04211C] dark:bg-emerald-500 text-white dark:text-[#04211C] px-4 py-2 md:px-6 md:py-2 rounded-xl text-xs md:text-sm font-bold transition-all active:scale-95">{t.connect}</button>}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6 md:mt-12">
        <section className="bg-white dark:bg-[#04211C] rounded-[2rem] md:rounded-[3rem] border border-gray-100 dark:border-emerald-500/10 p-6 md:p-12 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row gap-8 md:gap-12 items-center transition-colors">
          <div className="flex-1 relative z-10 w-full">
            <div className="inline-flex items-center rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-wider bg-[#E9FFF6] dark:bg-emerald-500/10 text-[#0D6B58] dark:text-emerald-400 border border-[#7FE6C3] dark:border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-current mr-2 animate-pulse" />
              LIVE STATUS
            </div>
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black font-display text-[#04211C] dark:text-white mt-4 md:mt-8 leading-[1.05] tracking-tight">{t.heroTitle}</h2>
            <p className="mt-4 md:mt-8 text-sm md:text-lg font-medium text-[#0D6B58] dark:text-emerald-400/60 opacity-60 max-w-lg leading-relaxed">{t.heroSubtitle}</p>
          </div>
          <div className="w-full lg:w-[480px] relative group">
            <div className="relative bg-[#04211C] dark:bg-black rounded-[2rem] md:rounded-[3rem] p-8 md:p-12 text-white shadow-2xl border border-emerald-500/20 overflow-hidden">
              <div className="flex flex-col gap-2 relative z-10">
                <span className="text-[11px] md:text-[13px] font-black text-emerald-400 uppercase tracking-[0.4em]">{t.jackpotLabel}</span>
                <div className="flex items-baseline gap-2 md:gap-4 mt-1"><span className="text-5xl md:text-7xl lg:text-8xl font-black font-display tracking-tighter bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70">{jackpot.toFixed(2)}</span><span className="text-sm md:text-xl font-black text-emerald-400">M-USDT</span></div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 md:mt-12 bg-white dark:bg-[#04211C] rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 dark:border-emerald-500/10 p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 shadow-xl">
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

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 md:mt-12">
          <div className="lg:col-span-7 bg-white dark:bg-[#04211C] rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 dark:border-emerald-500/10 p-6 md:p-10 shadow-xl min-h-[400px]">
            <h2 className="text-xl md:text-2xl font-bold font-display text-[#04211C] dark:text-white">{t.historyTitle}</h2>
            <p className="mt-2 text-xs md:text-sm font-medium text-[#0D6B58] dark:text-emerald-400/60 opacity-40">{t.historySub}</p>
            <div className="mt-12 border-2 border-dashed border-gray-100 dark:border-emerald-500/10 rounded-[1.5rem] p-12 md:p-20 flex flex-col items-center text-center">
              <span className="text-[10px] md:text-xs font-black text-gray-200 dark:text-emerald-500/10 uppercase tracking-[0.3em] mb-4">{t.historyNoData}</span>
              <p className="text-[9px] md:text-[10px] font-bold text-gray-300 dark:text-emerald-500/20 max-w-[240px] leading-relaxed tracking-wide uppercase">{t.historyAuto}</p>
            </div>
          </div>
          <div className="lg:col-span-5 bg-white dark:bg-[#04211C] rounded-[2rem] md:rounded-[2.5rem] border border-gray-100 dark:border-emerald-500/10 p-6 md:p-10 shadow-xl h-fit">
            <h2 className="text-xl md:text-2xl font-bold font-display mb-6 md:mb-8 text-[#04211C] dark:text-white">{t.mintTitle}</h2>
            <div className="grid grid-cols-3 gap-2 md:gap-3 mb-8">
              {[1,2,3,4,5,6,7,8,9].map(n => (
                <button key={n} onClick={() => { if(selectedNumbers.includes(n)) setSelectedNumbers(s => s.filter(x => x !== n)); else if(selectedNumbers.length < 4) setSelectedNumbers(s => [...s, n].sort()); }} className={`h-12 md:h-16 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-xl font-black transition-all border-2 active:scale-95 ${selectedNumbers.includes(n) ? "bg-[#04211C] dark:bg-emerald-500 text-white dark:text-[#04211C] border-[#04211C] dark:border-emerald-400" : "bg-white dark:bg-emerald-500/5 border-gray-50 dark:border-emerald-500/10 text-[#04211C] dark:text-white hover:border-[#7FE6C3]"}`}>{n}</button>
              ))}
            </div>
            <PrimaryButton onClick={handleAiPick} disabled={aiLoading} variant="outline" loading={aiLoading}>{t.aiLucky}</PrimaryButton>
            <div className="mt-6"><PrimaryButton onClick={handleMint} disabled={selectedNumbers.length < 4 || txStatus === 'mining'} loading={txStatus === 'mining'}>{t.purchase}</PrimaryButton></div>
          </div>
        </div>
      </main>

      {/* --- HOW IT WORKS MODAL --- */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setShowGuideModal(false)} />
          <div className="relative z-10 w-full max-w-4xl bg-white dark:bg-[#04211C] rounded-[2rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="p-6 md:p-12 border-b dark:border-emerald-500/10 flex items-center justify-between">
              <div><h2 className="text-2xl md:text-3xl font-black font-display text-[#04211C] dark:text-white">{t.howItWorks}</h2><p className="text-xs font-bold text-emerald-800/40 dark:text-emerald-400/40 uppercase tracking-widest mt-1">Platform Guide & Rules</p></div>
              <button onClick={() => setShowGuideModal(false)} className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-100 transition-colors"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-12 space-y-12 scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <Step num={1} title={t.step1Title} desc={t.step1Desc} />
                <Step num={2} title={t.step2Title} desc={t.step2Desc} />
                <Step num={3} title={t.step3Title} desc={t.step3Desc} />
                <Step num={4} title={t.step4Title} desc={t.step4Desc} />
              </div>
              <div className="pt-8 border-t dark:border-emerald-500/10">
                <h3 className="text-lg font-black font-display mb-6 uppercase tracking-wider text-[#04211C] dark:text-white">{t.rules}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[t.rule1, t.rule2, t.rule3, t.rule4].map((rule, i) => (
                    <div key={i} className="flex gap-4 p-4 rounded-2xl bg-emerald-50/40 dark:bg-emerald-500/5 border border-emerald-100 dark:border-emerald-500/10 text-sm font-medium text-emerald-900/60 dark:text-white/60 leading-relaxed">
                      <span className="flex-shrink-0 h-6 w-6 rounded-lg bg-emerald-900 dark:bg-emerald-500 text-white dark:text-[#04211C] flex items-center justify-center text-[10px] font-black">{i + 1}</span>{rule}
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6 rounded-2xl md:rounded-3xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-500/20">
                <h3 className="text-[10px] md:text-sm font-black uppercase tracking-[0.2em] text-red-600 mb-4 flex items-center gap-2"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>{t.disclaimer}</h3>
                <p className="text-[10px] md:text-xs font-medium text-red-900/70 dark:text-red-300 leading-relaxed italic">{t.disclaimerText}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- RESULTS MODAL --- */}
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

      {/* --- PROFILE MODAL --- */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setShowProfileModal(false)} />
          <div className="relative z-10 w-full max-w-5xl bg-[#F9FAFB] dark:bg-[#021411] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
            <div className="p-6 md:p-12 border-b dark:border-emerald-500/10 bg-white dark:bg-[#04211C] flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 w-full text-center md:text-left">
                <img src={profile.avatarUrl} alt="Profile" className="h-24 w-24 md:h-32 md:w-32 rounded-full border-4 border-emerald-100 dark:border-emerald-500/20 shadow-lg object-cover" />
                <div className="flex-1">
                  <h2 className="text-2xl md:text-3xl font-black font-display text-[#04211C] dark:text-white">{profile.username}</h2>
                  <p className="text-xs md:text-sm font-bold text-emerald-800/40 dark:text-white/30 uppercase tracking-widest mt-1 font-mono truncate">{account}</p>
                </div>
                <div className="flex gap-2"><PrimaryButton onClick={() => { setAccount(null); setShowProfileModal(false); }} variant="warning">{t.logout}</PrimaryButton></div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-12 space-y-8 bg-gray-50/50 dark:bg-[#021411]/50 scrollbar-hide">
                <section className="bg-white dark:bg-[#04211C] p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-emerald-100 dark:border-emerald-500/10 shadow-sm"><h3 className="text-lg md:text-xl font-black font-display mb-6 dark:text-white">{t.myTickets} ({tickets.length})</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tickets.map(tk => (
                    <div key={tk.id} className="bg-white dark:bg-[#04211C] p-6 rounded-3xl border border-emerald-50 dark:border-emerald-500/10 shadow-sm relative overflow-hidden group">
                      <div className="flex justify-between items-center mb-6"><span className="text-[10px] font-black opacity-30 dark:text-emerald-400">ID: {tk.id}</span><Pill variant="mint">{t.verified}</Pill></div>
                      <div className="flex gap-2 justify-center mb-6">{tk.numbers.map((n: number, i: number) => (<div key={i} className="h-10 w-10 md:h-12 md:w-12 rounded-xl flex items-center justify-center text-lg font-black bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-900 dark:text-white">{n}</div>))}</div>
                      <div className="pt-4 border-t dark:border-emerald-500/10 text-center"><span className="text-[10px] font-bold text-emerald-800/40 dark:text-emerald-400/40 uppercase tracking-widest">LOTTERY AT {new Date(tk.targetLottery).toLocaleDateString()}</span></div>
                    </div>
                  ))}
                </div></section>
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

function Step({ num, title, desc }: { num: number, title: string, desc: string }) {
  return (<div className="flex flex-col items-center text-center"><div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500 text-emerald-800 dark:text-[#04211C] flex items-center justify-center font-black text-xl mb-4">{num}</div><h4 className="font-bold mb-2 text-sm text-[#04211C] dark:text-white">{title}</h4><p className="text-[11px] text-emerald-900/60 dark:text-white/40 leading-relaxed font-medium">{desc}</p></div>);
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
