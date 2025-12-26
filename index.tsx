import React, { useEffect, useMemo, useState, useCallback } from "react";
import ReactDOM from "react-dom/client";
import { GoogleGenAI, Type } from "@google/genai";

// --- TYPES ---
export interface Ticket {
  id: string;
  numbers: number[];
  timestamp: number;
  targetLottery: number;
  isWinner?: boolean;
  claimed?: boolean;
}

export interface HistoricalLottery {
  id: string;
  numbers: number[];
  date: string;
  jackpot: string;
  winners: number;
  txHash: string;
}

// --- CONSTANTS ---
export const COLORS = {
  midnight: "#063A30",
  midnight2: "#0A4A3D",
  mintBg: "#E9FFF6",
  mintBg2: "#DFFAEF",
  mintStroke: "#7FE6C3",
  mintText: "#0D6B58",
  cardBorder: "rgba(6, 58, 48, 0.10)",
  shadow: "0 18px 50px rgba(6,58,48,0.10)",
};

export const LOTTERY_CONFIG = {
  numberCount: 4,
  maxNumber: 9,
  ticketPrice: 1.00,
  currency: "M-USDT",
  network: "MerlinChain"
};

export const MERLIN_NETWORK = {
  chainId: '0x1068',
  chainName: 'Merlin Mainnet',
  nativeCurrency: { name: 'BTC', symbol: 'BTC', decimals: 18 },
  rpcUrls: ['https://rpc.merlinchain.io'],
  blockExplorerUrls: ['https://scan.merlinchain.io'],
};

export const ICONS = {
  Wallet: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5z"></path><path d="M16 12h.01"></path></svg>
  ),
  Sparkles: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"></path></svg>
  )
};

const pad2 = (n: number) => String(n).padStart(2, "0");
const CONTRACT_ADDRESS = "0x967aEC3276b63c5E2262da9641DB9dbeBB07dC0d";
const TICKET_PRICE = 1.0;
const DEV_FEE_PER_TICKET = 0.1;
const REF_FEE_PER_TICKET = 0.02;

// --- LOGO COMPONENT ---
export const Logo: React.FC<{ size?: number }> = ({ size = 52 }) => {
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
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f7e1a0" /><stop offset="30%" stopColor="#d4af37" /><stop offset="70%" stopColor="#b8860b" /><stop offset="100%" stopColor="#8b6508" />
        </linearGradient>
        <filter id="innerBevel" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.5" in="SourceAlpha" result="blur" /><feOffset dx="0.5" dy="0.5" in="blur" result="offsetBlur" /><feComposite in="SourceGraphic" in2="offsetBlur" operator="over" />
        </filter>
        <filter id="greenDepth" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="1" stdDeviation="1" floodColor="#000" floodOpacity="0.2" /></filter>
      </defs>
      <g fill="#0b533a" filter="url(#greenDepth)">{hexes.map((h, i) => <polygon key={`outer-${i}`} points={hexPoints(h.cx, h.cy, 24.5)} />)}</g>
      <g filter="url(#innerBevel)">
        {hexes.map((h, i) => (
          <React.Fragment key={`inner-gold-${i}`}>
            <polygon points={hexPoints(h.cx, h.cy, 18.5 + 1)} fill="#5c4a1e" /><polygon points={hexPoints(h.cx, h.cy, 18.5)} fill="url(#goldGrad)" />
          </React.Fragment>
        ))}
      </g>
    </svg>
  );
};

// --- CARD COMPONENT ---
export const Card: React.FC<{ title: string; subtitle?: string; children: React.ReactNode; centerTitle?: boolean; className?: string }> = ({ 
  title, subtitle, children, centerTitle = false, className = "" 
}) => (
  <section className={`rounded-3xl border bg-white overflow-hidden ${className}`} style={{ borderColor: COLORS.cardBorder, boxShadow: COLORS.shadow }}>
    <div className="p-8">
      <div className={centerTitle ? "text-center" : ""}><h2 className="text-2xl font-bold font-display" style={{ color: COLORS.midnight }}>{title}</h2>{subtitle && <p className="mt-2 text-sm font-medium" style={{ color: COLORS.mintText }}>{subtitle}</p>}</div>
      <div className="mt-6">{children}</div>
    </div>
  </section>
);

// --- GEMINI SERVICE ---
async function getLuckyNumbers() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate 4 'lucky' numbers between 1 and 9 for an onchain lottery. Provide a short, cryptic reason why these numbers were chosen.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            numbers: { type: Type.ARRAY, items: { type: Type.NUMBER } },
            reason: { type: Type.STRING }
          },
          required: ["numbers", "reason"]
        }
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    return { numbers: [1, 3, 7, 9], reason: "The stars align for these classic constants." };
  }
}

const getWinningNumbersForSlot = (timestamp: number): number[] => {
  const seed = new Date(timestamp).toISOString() + "onchain-jackpot-v2-merlin";
  let hash = 0;
  for (let i = 0; i < seed.length; i++) { hash = ((hash << 5) - hash) + seed.charCodeAt(i); hash |= 0; }
  const result = [];
  let currentHash = hash;
  for (let i = 0; i < 4; i++) { currentHash = (currentHash * 1664525 + 1013904223) | 0; result.push((Math.abs(currentHash) % 9) + 1); }
  return result;
};

// --- APP COMPONENT ---
function App() {
  const [lang, setLang] = useState<'en' | 'zh'>('en');
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
  const [profile, setProfile] = useState({ username: "", bio: "", avatarUrl: "" });
  const referralCode = useMemo(() => new URLSearchParams(window.location.search).get('ref'), []);
  const [recentMints, setRecentMints] = useState<{addr: string, nums: number[], time: string}[]>([]);

  const lotterySlots = useMemo(() => {
    const slots: number[] = [];
    const base = new Date();
    base.setUTCMinutes(0, 0, 0);
    for (let i = 0; i < 96; i++) {
        const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), base.getUTCHours() + i, 0, 0, 0));
        const hour = d.getUTCHours();
        if ((hour === 0 || hour === 12) && d.getTime() > Date.now() + 90000) {
            slots.push(d.getTime());
        }
        if (slots.length >= 8) break;
    }
    return slots;
  }, [now.getUTCDate(), now.getUTCHours()]);

  const lastSettledLotteryTime = useMemo(() => {
    const d = new Date();
    d.setUTCMinutes(0, 0, 0);
    const h = d.getUTCHours();
    if (h >= 12) d.setUTCHours(12, 0, 0, 0); else d.setUTCHours(0, 0, 0, 0);
    if (Date.now() < d.getTime() + 90000) d.setUTCHours(d.getUTCHours() - 12);
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
    return { days: Math.floor(totalSeconds / 86400), hours: Math.floor((totalSeconds % 86400) / 3600), minutes: Math.floor((totalSeconds % 3600) / 60), seconds: totalSeconds % 60 };
  }, [msLeft]);

  const runLiveLotterySequence = async () => {
    setIsLiveLottery(true);
    setLotteryPhase(0);
    setLiveLotteryNumbers([null, null, null, null]);
    const finalNumbers = getWinningNumbersForSlot(lastSettledLotteryTime);
    for(let i=1; i<=4; i++) {
      await new Promise(r => setTimeout(r, 1800));
      setLiveLotteryNumbers(prev => { const next = [...prev]; next[i-1] = finalNumbers[i-1]; return next; });
      setLotteryPhase(i);
    }
    await new Promise(r => setTimeout(r, 1200));
    setLotteryPhase(5);
  };

  useEffect(() => { if(showResultsModal && !isLiveLottery) runLiveLotterySequence(); }, [showResultsModal]);

  const connectWallet = async () => {
    if (!window.ethereum) return alert("MetaMask not detected.");
    try {
      setIsConnecting(true);
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      setChainId(await window.ethereum.request({ method: 'eth_chainId' }));
      const stored = localStorage.getItem(`profile_${accounts[0]}`);
      if (stored) setProfile(JSON.parse(stored));
      else {
        const defaultProfile = { username: `User_${accounts[0].slice(2, 6)}`, bio: "Onchain Enthusiast", avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${accounts[0]}` };
        setProfile(defaultProfile);
        localStorage.setItem(`profile_${accounts[0]}`, JSON.stringify(defaultProfile));
      }
    } catch (error) { console.error(error); } finally { setIsConnecting(false); }
  };

  const switchNetwork = async () => {
    if (!window.ethereum) return;
    try { await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: MERLIN_NETWORK.chainId }] }); } 
    catch (e: any) { if (e.code === 4902) window.ethereum.request({ method: 'wallet_addEthereumChain', params: [MERLIN_NETWORK] }); }
  };

  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => { if (accounts.length > 0) setAccount(accounts[0]); else setAccount(null); });
      window.ethereum.on('chainChanged', (cid: string) => setChainId(cid));
    }
  }, []);

  const purchaseTicket = async () => {
    if (!account) return connectWallet();
    if (!isCorrectChain) return switchNetwork();
    if (selectedNumbers.length !== LOTTERY_CONFIG.numberCount) return;
    try {
      setTxStatus('awaiting');
      await new Promise(r => setTimeout(r, 2000));
      setTxStatus('mining');
      await new Promise(r => setTimeout(r, 3000));
      const newTickets = [];
      for(let i=0; i<mintQuantity; i++) {
        newTickets.push({ id: Math.random().toString(36).slice(2, 10).toUpperCase(), numbers: i === 0 ? [...selectedNumbers] : Array.from({length: 4}, () => Math.floor(Math.random() * 9) + 1), timestamp: Date.now(), targetLottery: selectedLotteryTime, txHash: "0x..." });
      }
      setTickets(prev => [...newTickets, ...prev]);
      setJackpot(prev => prev + (mintQuantity * 0.9));
      setStats(s => ({ totalMints: s.totalMints + mintQuantity, activePlayers: s.activePlayers + 1 }));
      setRecentMints(prev => [{addr: `${account.slice(0, 6)}...`, nums: [...selectedNumbers], time: new Date().toLocaleTimeString()}, ...prev].slice(0, 10));
      setTxStatus('success');
      setTimeout(() => setTxStatus('idle'), 3000);
    } catch { setTxStatus('error'); }
  };

  const handleClaim = async (ticketId: string) => {
    setClaimStatus(prev => ({ ...prev, [ticketId]: 'claiming' }));
    await new Promise(r => setTimeout(r, 1500));
    setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, claimed: true } : t));
    setClaimStatus(prev => ({ ...prev, [ticketId]: 'success' }));
  };

  return (
    <div className="min-h-screen pb-20 font-sans">
      <header className="sticky top-0 z-50 border-b bg-white/90 backdrop-blur-lg" style={{ borderColor: COLORS.cardBorder }}>
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.location.reload()}>
            <Logo size={48} /><div className="hidden sm:block"><h1 className="text-xl font-bold font-display" style={{ color: COLORS.midnight }}>{t.title}</h1><p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: COLORS.mintText }}>{t.subtitle}</p></div>
          </div>
          <div className="flex items-center gap-3">
            {account && <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-100 bg-gray-50/50"><span className={`h-2 w-2 rounded-full ${isCorrectChain ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} /><span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{isCorrectChain ? t.merlinNetwork : t.wrongNetwork}</span>{!isCorrectChain && <button onClick={switchNetwork} className="ml-2 px-2 py-0.5 rounded-lg bg-red-100 text-red-700 text-[9px] font-black uppercase tracking-widest hover:bg-red-200">{t.switch}</button>}</div>}
            <button onClick={() => setShowResultsModal(true)} className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-emerald-200 text-[#063A30] flex items-center gap-2"><span className="hidden md:inline">{t.viewResults}</span></button>
            <button onClick={() => setShowGuideModal(true)} className="px-3 py-2 rounded-xl text-xs font-black uppercase tracking-widest border border-emerald-200 text-[#063A30] flex items-center gap-2"><span className="hidden md:inline">{t.howItWorks}</span></button>
            <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="px-3 py-2 rounded-xl text-xs font-black border border-emerald-200">{lang === 'en' ? '中文' : 'EN'}</button>
            {account ? <button onClick={() => setShowProfileModal(true)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-sm border bg-emerald-50 text-emerald-800"><img src={profile.avatarUrl} className="h-7 w-7 rounded-full" /><span className="hidden sm:inline">{profile.username || truncatedAddress}</span></button> : <button onClick={connectWallet} className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm bg-[#063A30] text-white"><ICONS.Wallet />{t.connect}</button>}
          </div>
        </div>
      </header>

      <div className="bg-emerald-50/50 py-1.5 border-b border-emerald-100/50 overflow-hidden h-8 flex items-center"><div className="flex animate-marquee whitespace-nowrap gap-12">{recentMints.map((m, i) => <div key={i} className="flex items-center gap-2 text-[10px] font-bold text-emerald-800/60 uppercase"><span>{m.addr} MINTED</span><span className="bg-white px-1.5 rounded border border-emerald-100 text-emerald-900">{m.nums.join('-')}</span><span>AT {m.time}</span></div>)}</div></div>

      <main className="mx-auto max-w-6xl px-6 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-12">
          <section className="bg-white rounded-[2.5rem] border p-8 lg:p-12 relative overflow-hidden group shadow-2xl" style={{ borderColor: COLORS.cardBorder }}>
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-12">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black border border-emerald-100 mb-6 uppercase">● {t.liveActivity}</div>
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-black font-display leading-[1.1] mb-6 tracking-tight" style={{ color: COLORS.midnight }}>{t.heroTitle}</h2>
                <p className="text-lg font-medium max-w-md opacity-60" style={{ color: COLORS.mintText }}>{t.heroSubtitle}</p>
              </div>
              <div className="relative bg-[#063A30] text-white rounded-[2.5rem] p-10 lg:w-[420px] shadow-2xl">
                <p className="text-[10px] font-black opacity-40 uppercase tracking-[0.25em] mb-1">{t.prizePool}</p>
                <div className="flex items-baseline gap-4"><span className="text-7xl font-black font-display tracking-tighter">{jackpot.toFixed(2)}</span><span className="text-xl font-black text-emerald-400">M-USDT</span></div>
                <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-center">
                  <div><span className="text-[9px] font-black opacity-30 uppercase">{t.currentLottery}</span><p className="text-sm font-bold tracking-tight">#124</p></div>
                  <div className="text-right"><span className="text-[9px] font-black opacity-30 uppercase">NETWORK</span><p className="text-[10px] font-black text-emerald-400">MERLIN CHAIN</p></div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="lg:col-span-12">
          <div className="bg-white rounded-[2rem] border p-6 flex flex-col md:flex-row items-center justify-between gap-8 shadow-xl" style={{ borderColor: COLORS.cardBorder }}>
            <div className="flex items-center gap-4"><div className="p-3 bg-emerald-50 rounded-2xl text-emerald-800"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div><div><h3 className="font-bold text-lg" style={{ color: COLORS.midnight }}>{t.countdown}</h3><p className="text-xs font-medium text-gray-400">{t.countdownSub}</p></div></div>
            <div className="flex gap-4">
              <TimeDisplay value={pad2(timeLeft.hours)} label={t.hours} /><div className="text-4xl font-black opacity-20">:</div>
              <TimeDisplay value={pad2(timeLeft.minutes)} label={t.minutes} /><div className="text-4xl font-black opacity-20">:</div>
              <TimeDisplay value={pad2(timeLeft.seconds)} label={t.seconds} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 space-y-8">
          <Card title={t.historicalLotteries} subtitle={t.historicalSub}>
            <div className="py-12 text-center border-2 border-dashed rounded-[2rem] border-gray-50 bg-gray-50/20"><p className="text-sm text-gray-400 font-bold uppercase tracking-wider">{t.noHistory}</p><p className="text-[10px] text-gray-300 font-medium px-8">{t.historyAuto}</p></div>
          </Card>
        </div>

        <div className="lg:col-span-5 space-y-8">
          <Card title={t.createNew}>
            <div className="mb-6"><label className="text-[10px] font-black uppercase text-emerald-900/40 mb-3 block tracking-widest">{t.selectNums}</label><div className="grid grid-cols-3 gap-3">{[1,2,3,4,5,6,7,8,9].map(n => <button key={n} onClick={() => toggleNumber(n)} className={`h-14 rounded-2xl flex items-center justify-center text-xl font-black transition-all border-2 ${selectedNumbers.includes(n) ? "bg-[#063A30] text-white border-[#063A30]" : "bg-white text-emerald-900 border-emerald-50"}`}>{n}</button>)}</div></div>
            <div className="grid grid-cols-2 gap-3 mb-6"><button onClick={handleRandomize} className="py-3 px-4 bg-emerald-50 text-emerald-800 rounded-xl font-bold text-xs uppercase border border-emerald-100">{t.shuffle}</button><button onClick={handleAiLucky} className="py-3 px-4 bg-indigo-50 text-indigo-800 rounded-xl font-bold text-xs uppercase border border-indigo-100 flex items-center justify-center gap-2">{aiLoading ? "..." : <ICONS.Sparkles />}{t.aiLucky}</button></div>
            <div className="bg-emerald-50 rounded-[2rem] p-8 border border-emerald-100">
              <div className="flex justify-between items-center mb-6"><span className="text-[10px] font-black opacity-30 uppercase">{t.gasCost}</span><span className="text-xl font-black text-emerald-900">{(1.0 * mintQuantity).toFixed(2)} M-USDT</span></div>
              <PrimaryButton onClick={purchaseTicket} loading={txStatus === 'mining' || txStatus === 'awaiting'} disabled={selectedNumbers.length < 4}>{!account ? t.connectToBuy : txStatus === 'mining' ? t.processing : t.purchase}</PrimaryButton>
            </div>
          </Card>
        </div>
      </main>

      {showGuideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-[#063A30]/80 backdrop-blur-md" onClick={() => setShowGuideModal(false)} />
          <div className="relative z-10 w-full max-w-4xl bg-white rounded-[2.5rem] p-10 max-h-[90vh] overflow-y-auto">
            <h2 className="text-3xl font-black font-display mb-8">{t.howItWorks}</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <Step num={1} title={t.step1Title} desc={t.step1Desc} />
              <Step num={2} title={t.step2Title} desc={t.step2Desc} />
              <Step num={3} title={t.step3Title} desc={t.step3Desc} />
              <Step num={4} title={t.step4Title} desc={t.step4Desc} />
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Fix: Added toggleNumber function
  function toggleNumber(num: number) {
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(prev => prev.filter(n => n !== num));
    } else if (selectedNumbers.length < LOTTERY_CONFIG.numberCount) {
      setSelectedNumbers(prev => [...prev, num]);
    }
  }

  function handleRandomize() {
    const nums: number[] = [];
    while (nums.length < 4) { const r = Math.floor(Math.random() * 9) + 1; if (!nums.includes(r)) nums.push(r); }
    setSelectedNumbers(nums);
  }

  async function handleAiLucky() {
    setAiLoading(true);
    const data = await getLuckyNumbers();
    setSelectedNumbers(data.numbers);
    setAiLoading(false);
  }
}

function TimeDisplay({ value, label }: { value: string, label: string }) {
  return (<div className="flex flex-col items-center"><div className="text-4xl font-black font-display tracking-tighter" style={{ color: COLORS.midnight }}>{value}</div><span className="text-[10px] font-black uppercase tracking-widest text-emerald-600/50">{label}</span></div>);
}

function Step({ num, title, desc }: { num: number, title: string, desc: string }) {
  return (<div className="flex flex-col items-center text-center"><div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xl mb-4">{num}</div><h4 className="font-bold mb-2 text-sm">{title}</h4><p className="text-[11px] text-emerald-900/60 leading-relaxed font-medium">{desc}</p></div>);
}

const PrimaryButton: React.FC<{ children: React.ReactNode; onClick?: () => void; disabled?: boolean; loading?: boolean; variant?: string }> = ({ 
  children, onClick, disabled, loading, variant = 'default' 
}) => (
  <button disabled={disabled || loading} onClick={onClick} className={`w-full rounded-2xl px-4 py-3 text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 text-white shadow-xl bg-[#063A30] ${variant === 'warning' ? 'bg-red-600' : ''}`}>
    {loading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : children}
  </button>
);

// Fix: Added connectToBuy to translations
const translations = {
  en: { title: "OnChain Jackpot", subtitle: "MerlinChain Mainnet", connect: "Connect Wallet", liveActivity: "Live Onchain Activity", heroTitle: "Decentralized Onchain Daily Lottery", heroSubtitle: "Verifiable jackpot settles twice daily at 00:00 & 12:00 UTC.", prizePool: "Live Prize Pool", countdown: "Next Lottery Countdown", countdownSub: "Reveal at 00:00 & 12:00 UTC daily", yourTickets: "My NFT Entries", createNew: "Mint New NFT Entry", selectNums: "Select 4 Numbers (1-9)", shuffle: "Shuffle", aiLucky: "AI Lucky", purchase: "Mint NFT Ticket", processing: "Minting...", connectToBuy: "Connect to Mint", howItWorks: "How it Works", step1Title: "Connect", step1Desc: "Connect to MerlinChain.", step2Title: "Pick Numbers", step2Desc: "Choose 4 lucky numbers.", step3Title: "Mint", step3Desc: "Secure your entry on-chain.", step4Title: "Win", step4Desc: "Match and win the jackpot!", footer: "OnChain Lottery • Powered by MerlinChain", gasCost: "Network Fees", gasPrompt: "Stored permanently on-chain", currentLottery: "Current Pool", historicalLotteries: "History", historicalSub: "Past settlements", noHistory: "No data yet", historyAuto: "Populates after settlement", viewResults: "Results", switch: "Switch", merlinNetwork: "Merlin Mainnet", wrongNetwork: "Wrong Network", hours: "Hours", minutes: "Mins", seconds: "Secs" },
  zh: { title: "链上大奖", subtitle: "MerlinChain 主网", connect: "连接钱包", liveActivity: "实时动态", heroTitle: "去中心化链上彩票", heroSubtitle: "每日 00:00 和 12:00 UTC 结算。", prizePool: "实时奖池", countdown: "开奖倒计时", countdownSub: "每日定时开奖", yourTickets: "我的投注", createNew: "铸造投注", selectNums: "选择 4 个数字", shuffle: "随机", aiLucky: "AI 幸运", purchase: "铸造彩票", processing: "铸造中...", connectToBuy: "连接钱包铸造", howItWorks: "运作方式", step1Title: "连接", step1Desc: "连接您的钱包。", step2Title: "选号", step2Desc: "选择 4 个幸运数字。", step3Title: "铸造", step3Desc: "确认交易。", step4Title: "中奖", step4Desc: "匹配即可领奖！", footer: "由 MerlinChain 提供支持", gasCost: "网络费用", gasPrompt: "永久链上存储", currentLottery: "当前期数", historicalLotteries: "历史", historicalSub: "历史数据", noHistory: "暂无数据", historyAuto: "结算后自动显示", viewResults: "结果", switch: "切换", merlinNetwork: "Merlin 主网", wrongNetwork: "网络错误", hours: "时", minutes: "分", seconds: "秒" }
};

const rootElement = document.getElementById('root');
if (rootElement) ReactDOM.createRoot(rootElement).render(<App />);