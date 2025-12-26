
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
const COLORS = {
  midnight: "#063A30",
  midnight2: "#0A4A3D",
  mintBg: "#E9FFF6",
  mintBg2: "#DFFAEF",
  mintStroke: "#7FE6C3",
  mintText: "#0D6B58",
  cardBorder: "rgba(6, 58, 48, 0.10)",
  shadow: "0 18px 50px rgba(6,58,48,0.10)",
};

const LOTTERY_CONFIG = {
  numberCount: 4,
  maxNumber: 9,
  ticketPrice: 1.00,
  currency: "M-USDT",
  network: "MerlinChain"
};

const MERLIN_NETWORK = {
  chainId: '0x1068',
  chainName: 'Merlin Mainnet',
  nativeCurrency: { name: 'BTC', symbol: 'BTC', decimals: 18 },
  rpcUrls: ['https://rpc.merlinchain.io'],
  blockExplorerUrls: ['https://scan.merlinchain.io'],
};

const ICONS = {
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

// --- SERVICES ---
async function getLuckyNumbers() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Generate exactly 4 lucky numbers between 1 and 9 for an onchain lottery. Provide a short, cryptic reason based on 'onchain cosmic alignment'.",
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

// --- COMPONENTS ---
const Logo: React.FC<{ size?: number }> = ({ size = 52 }) => {
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

const Pill: React.FC<{ children: React.ReactNode; variant?: 'mint' | 'danger' }> = ({ children, variant = 'mint' }) => (
  <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${variant === 'mint' ? 'bg-[#E9FFF6] text-[#0D6B58] border border-[#7FE6C3]' : 'bg-red-50 text-red-700 border border-red-200'}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current mr-2 animate-pulse" />
    {children}
  </span>
);

const PrimaryButton: React.FC<{ children: React.ReactNode; onClick?: () => void; loading?: boolean; disabled?: boolean }> = ({ children, onClick, loading, disabled }) => (
  <button disabled={disabled || loading} onClick={onClick} className="w-full bg-[#063A30] text-white rounded-2xl py-4 font-bold text-sm transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl">
    {loading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : children}
  </button>
);

// --- APP ---
function App() {
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  const [now, setNow] = useState(new Date());
  const [account, setAccount] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [jackpot, setJackpot] = useState(0.00);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [mintQuantity, setMintQuantity] = useState(1);
  const [txStatus, setTxStatus] = useState<'idle' | 'mining' | 'success'>('idle');
  const [aiLoading, setAiLoading] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  const t = useMemo(() => {
    const translations = {
      en: {
        title: "OnChain Jackpot", connect: "Connect Wallet", heroTitle: "Decentralized Onchain Daily Lottery",
        heroSubtitle: "Verifiable jackpot settles twice daily at 00:00 & 12:00 UTC. Every entry is a unique NFT minted on MerlinChain.",
        prizePool: "LIVE PRIZE POOL", totalMints: "TOTAL NFTS MINTED", activePlayers: "ACTIVE PLAYERS",
        historyTitle: "Historical Lotteries", historySub: "Previous results and settlement data", historyNoData: "NO HISTORICAL DATA YET",
        historyAuto: "The history section will populate automatically after the first lottery is settled on-chain.",
        mintTitle: "Mint New NFT Entry", selectSchedule: "SELECT LOTTERY SCHEDULE", batchMint: "BATCH MINTING",
        select4: "SELECT 4 NUMBERS (1-9)", shuffle: "Shuffle", aiLucky: "AI Lucky", purchase: "Mint NFT Ticket"
      },
      zh: {
        title: "链上大奖", connect: "连接钱包", heroTitle: "去中心化链上每日彩票",
        heroSubtitle: "每日 00:00 和 12:00 UTC 定时结算。每一张彩票都是在 MerlinChain 上铸造的唯一 NFT。",
        prizePool: "实时奖池", totalMints: "总计铸造 NFT", activePlayers: "活跃玩家",
        historyTitle: "历史彩票", historySub: "历史结果与结算数据", historyNoData: "尚无历史数据",
        historyAuto: "在第一期彩票在链上结算后，历史板块将自动填充。",
        mintTitle: "铸造新 NFT 投注", selectSchedule: "选择开奖时间", batchMint: "批量铸造",
        select4: "选择 4 个数字 (1-9)", shuffle: "随机", aiLucky: "AI 幸运", purchase: "铸造 NFT 彩票"
      }
    };
    return translations[lang];
  }, [lang]);

  const lotterySlots = useMemo(() => {
    const slots = [];
    const base = new Date();
    base.setUTCMinutes(0,0,0);
    for (let i = 0; i < 48; i++) {
      const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), base.getUTCHours() + i, 0, 0, 0));
      if (d.getUTCHours() === 0 || d.getUTCHours() === 12) {
        if (d.getTime() > Date.now()) slots.push(d.getTime());
      }
      if (slots.length >= 3) break;
    }
    return slots;
  }, [now.getUTCDate()]);

  const [selectedSlot, setSelectedSlot] = useState(lotterySlots[0]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const connectWallet = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
    } else alert("Install MetaMask");
  };

  const toggleNumber = (n: number) => {
    if (selectedNumbers.includes(n)) setSelectedNumbers(s => s.filter(x => x !== n));
    else if (selectedNumbers.length < 4) setSelectedNumbers(s => [...s, n].sort((a,b)=>a-b));
  };

  const handleShuffle = () => {
    const ns: number[] = [];
    while(ns.length < 4) {
      const r = Math.floor(Math.random() * 9) + 1;
      if (!ns.includes(r)) ns.push(r);
    }
    setSelectedNumbers(ns.sort((a,b)=>a-b));
  };

  const handleAiLucky = async () => {
    setAiLoading(true);
    const data = await getLuckyNumbers();
    setSelectedNumbers(data.numbers.sort((a:number,b:number)=>a-b));
    setAiLoading(false);
  };

  const mintTicket = async () => {
    if (!account) return connectWallet();
    setTxStatus('mining');
    await new Promise(r => setTimeout(r, 2000));
    const newTks = Array.from({length: mintQuantity}, () => ({
      id: Math.random().toString(36).slice(2, 10).toUpperCase(),
      numbers: [...selectedNumbers],
      timestamp: Date.now(),
      targetLottery: selectedSlot
    }));
    setTickets(prev => [...newTks, ...prev]);
    setJackpot(j => j + (mintQuantity * 1.0));
    setTxStatus('success');
    setSelectedNumbers([]);
    setTimeout(() => setTxStatus('idle'), 3000);
  };

  return (
    <div className="min-h-screen pb-20 overflow-x-hidden">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.location.reload()}>
            <Logo size={48} />
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold font-display text-[#063A30] leading-none">{t.title}</h1>
              <p className="text-[10px] font-bold text-[#0D6B58] uppercase tracking-widest mt-1">MERLINCHAIN MAINNET</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowResultsModal(true)} className="px-4 py-2 border border-[#7FE6C3] rounded-xl text-[11px] font-black uppercase text-[#063A30] flex items-center gap-2 hover:bg-emerald-50">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              VIEW RESULTS
            </button>
            <button onClick={() => setShowGuideModal(true)} className="px-4 py-2 border border-[#7FE6C3] rounded-xl text-[11px] font-black uppercase text-[#063A30] flex items-center gap-2 hover:bg-emerald-50">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              HOW IT WORKS
            </button>
            <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="px-3 py-2 border border-[#7FE6C3] rounded-xl text-[11px] font-black">{lang === 'en' ? '中文' : 'EN'}</button>
            <button onClick={connectWallet} className="bg-[#063A30] text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
              <ICONS.Wallet /> {account ? `${account.slice(0,6)}...${account.slice(-4)}` : t.connect}
            </button>
          </div>
        </div>
      </header>

      <div className="bg-[#E9FFF6] py-2 border-b border-[#7FE6C3]/30 overflow-hidden">
        <div className="max-w-7xl mx-auto px-8 text-[10px] font-black uppercase tracking-widest text-[#0D6B58]/40">
          NO ENTRIES IN LAST 12 HOURS
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-8 mt-12">
        <section className="bg-white rounded-[3rem] border border-gray-100 p-12 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row gap-12 items-center">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none scale-150 rotate-12"><Logo size={300} /></div>
          
          <div className="flex-1 relative z-10">
            <Pill>LIVE ONCHAIN ACTIVITY</Pill>
            <h2 className="text-6xl font-black font-display text-[#063A30] mt-8 leading-[1.05] tracking-tight">{t.heroTitle}</h2>
            <p className="mt-8 text-lg font-medium text-[#0D6B58] opacity-60 max-w-lg leading-relaxed">{t.heroSubtitle}</p>
            <div className="mt-12 flex gap-16">
              <div>
                <div className="text-3xl font-black font-display text-[#063A30]">{tickets.length}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#0D6B58]/40 mt-1">{t.totalMints}</div>
              </div>
              <div>
                <div className="text-3xl font-black font-display text-[#063A30]">{account ? '1' : '0'}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#0D6B58]/40 mt-1">{t.activePlayers}</div>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[460px] relative z-10">
            <div className="bg-gradient-to-br from-[#063A30] to-[#042B24] rounded-[2.5rem] p-10 text-white shadow-[0_25px_60px_-15px_rgba(6,58,48,0.4)] border border-white/5 relative group">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none rotate-12 group-hover:rotate-45 transition-transform duration-1000"><Logo size={180} /></div>
              
              <div className="flex justify-between items-center mb-10">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em] mb-1">{t.prizePool}</span>
                  <div className="h-1 w-12 bg-[#10b981] rounded-full" />
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-black opacity-60 tracking-widest">LIVE UPDATING</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.3em] ml-1">JACKPOT</span>
                <div className="flex items-baseline gap-3">
                  <span className="text-7xl font-black font-display tracking-tighter">{jackpot.toFixed(2)}</span>
                  <span className="text-xl font-black text-emerald-400">M-USDT</span>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-1">CURRENT LOTTERY</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tracking-tight">#1</span>
                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-emerald-400/20 text-emerald-400 rounded uppercase tracking-widest">ACTIVE</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-black opacity-40 uppercase tracking-widest mb-1">NETWORK</span>
                  <div className="px-3 py-1 bg-emerald-400/10 rounded-lg text-emerald-400 text-[9px] font-black tracking-widest border border-emerald-400/20">MERLIN CHAIN</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
          <div className="lg:col-span-7">
            <section className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-xl h-full">
              <h2 className="text-2xl font-bold font-display text-[#063A30]">{t.historyTitle}</h2>
              <p className="mt-2 text-sm font-medium text-[#0D6B58] opacity-40">{t.historySub}</p>
              
              <div className="mt-12 border-2 border-dashed border-gray-50 rounded-[2rem] p-20 flex flex-col items-center text-center">
                <span className="text-xs font-black text-gray-200 uppercase tracking-[0.3em] mb-4">{t.historyNoData}</span>
                <p className="text-[10px] font-bold text-gray-300 max-w-[240px] leading-relaxed tracking-wide uppercase">{t.historyAuto}</p>
              </div>
            </section>
          </div>

          <div className="lg:col-span-5">
            <section className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-xl">
              <h2 className="text-2xl font-bold font-display text-[#063A30]">{t.mintTitle}</h2>
              
              <div className="mt-8">
                <label className="text-[10px] font-black uppercase text-[#063A30]/30 tracking-widest mb-4 block">{t.selectSchedule}</label>
                <div className="flex gap-2">
                  {lotterySlots.map(ts => (
                    <button key={ts} onClick={() => setSelectedSlot(ts)} className={`flex-1 p-4 rounded-2xl border-2 transition-all flex flex-col items-center ${selectedSlot === ts ? "bg-[#063A30] text-white border-[#063A30]" : "bg-white border-gray-50 text-[#063A30] hover:border-[#7FE6C3]"}`}>
                      <span className="text-[9px] font-black uppercase opacity-60 tracking-widest mb-1">{new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      <span className="text-xs font-bold">{pad2(new Date(ts).getUTCHours())}:00 UTC</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <label className="text-[10px] font-black uppercase text-[#063A30]/30 tracking-widest mb-4 block">{t.batchMint}</label>
                <div className="grid grid-cols-3 gap-3">
                  {[1, 5, 10].map(q => (
                    <button key={q} onClick={() => setMintQuantity(q)} className={`py-4 rounded-xl border-2 font-black transition-all ${mintQuantity === q ? "bg-[#063A30] text-white border-[#063A30]" : "bg-[#F9FAFB] border-gray-50 text-[#063A30] hover:border-[#7FE6C3]"}`}>
                      {q}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-8">
                <label className="text-[10px] font-black uppercase text-[#063A30]/30 tracking-widest mb-4 block">{t.select4}</label>
                <div className="grid grid-cols-3 gap-3">
                  {[1,2,3,4,5,6,7,8,9].map(n => (
                    <button key={n} onClick={() => toggleNumber(n)} className={`h-16 rounded-2xl flex items-center justify-center text-xl font-black transition-all border-2 ${selectedNumbers.includes(n) ? "bg-[#063A30] text-white border-[#063A30] shadow-lg" : "bg-white border-gray-50 text-[#063A30] hover:border-[#7FE6C3]"}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <button onClick={handleShuffle} className="py-3 px-4 border-2 border-gray-50 rounded-xl font-black text-[10px] uppercase text-[#063A30]/60 hover:bg-gray-50">{t.shuffle}</button>
                  <button onClick={handleAiLucky} disabled={aiLoading} className="py-3 px-4 bg-indigo-50 text-indigo-800 border border-indigo-100 rounded-xl font-black text-[10px] uppercase flex items-center justify-center gap-2">
                    {aiLoading ? "Thinking..." : <><ICONS.Sparkles /> {t.aiLucky}</>}
                  </button>
                </div>
              </div>

              <div className="mt-10">
                <PrimaryButton onClick={mintTicket} loading={txStatus === 'mining'} disabled={selectedNumbers.length < 4}>
                  {txStatus === 'mining' ? 'MINTING...' : t.purchase}
                </PrimaryButton>
              </div>
            </section>
          </div>
        </div>
      </main>

      {showGuideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#063A30]/80 backdrop-blur-md" onClick={() => setShowGuideModal(false)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-[2.5rem] p-10 animate-in zoom-in-95 duration-200">
            <h2 className="text-3xl font-black font-display text-[#063A30] mb-8">How It Works</h2>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-[#0D6B58] flex items-center justify-center font-black">1</div>
                <div><p className="font-bold text-sm">Pick 4 Numbers</p><p className="text-xs text-gray-500 mt-1">Select any 4 unique numbers from 1 to 9 for your entry.</p></div>
              </div>
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-[#0D6B58] flex items-center justify-center font-black">2</div>
                <div><p className="font-bold text-sm">Mint NFT Entry</p><p className="text-xs text-gray-500 mt-1">Pay 1 M-USDT to secure your numbers permanently on MerlinChain.</p></div>
              </div>
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-emerald-50 text-[#0D6B58] flex items-center justify-center font-black">3</div>
                <div><p className="font-bold text-sm">Wait for Reveal</p><p className="text-xs text-gray-500 mt-1">Lottery settles at 00:00 and 12:00 UTC using onchain entropy.</p></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showResultsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#063A30]/80 backdrop-blur-md" onClick={() => setShowResultsModal(false)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-[2.5rem] p-10 animate-in zoom-in-95 duration-200 text-center">
            <h2 className="text-2xl font-black font-display text-[#063A30] mb-8">Latest Result</h2>
            <div className="flex justify-center gap-4 mb-10">
              {[2,5,7,1].map((n, i) => (
                <div key={i} className="h-16 w-16 rounded-full border-4 border-[#7FE6C3] bg-[#E9FFF6] flex items-center justify-center font-black text-2xl text-[#063A30] shadow-lg">
                  {n}
                </div>
              ))}
            </div>
            <p className="text-[10px] font-black text-[#0D6B58]/40 uppercase tracking-widest">LOTTERY #0 SUCCESSFULLY SETTLED</p>
          </div>
        </div>
      )}
    </div>
  );
}

// --- RENDER ---
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);
