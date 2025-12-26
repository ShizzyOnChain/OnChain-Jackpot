import React, { useEffect, useMemo, useState, useCallback } from "react";
import ReactDOM from "react-dom/client";
import { GoogleGenAI, Type } from "@google/genai";

// --- CONSTANTS ---
const COLORS = {
  midnight: "#063A30",
  mintBg: "#E9FFF6",
  mintStroke: "#7FE6C3",
  mintText: "#0D6B58",
  cardBorder: "rgba(6, 58, 48, 0.10)",
};

const MERLIN_NETWORK = {
  chainId: '0x1068',
  chainName: 'Merlin Mainnet',
  nativeCurrency: { name: 'BTC', symbol: 'BTC', decimals: 18 },
  rpcUrls: ['https://rpc.merlinchain.io'],
  blockExplorerUrls: ['https://scan.merlinchain.io'],
};

// --- LOGO COMPONENT ---
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

// --- UTILS ---
const pad2 = (n: number) => String(n).padStart(2, "0");

// --- MAIN APP ---
function App() {
  const [lang, setLang] = useState<'en' | 'zh'>('en');
  const [account, setAccount] = useState<string | null>(null);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [mintQuantity, setMintQuantity] = useState(1);
  const [jackpot, setJackpot] = useState(0.0);
  const [stats, setStats] = useState({ totalMints: 0, activePlayers: 0 });
  const [now, setNow] = useState(new Date());
  const [txStatus, setTxStatus] = useState<'idle' | 'mining' | 'success'>('idle');
  const [aiLoading, setAiLoading] = useState(false);

  const t = useMemo(() => {
    const strings = {
      en: {
        title: "OnChain Jackpot", connect: "Connect Wallet", heroTitle: "Decentralized Onchain Daily Lottery",
        heroSubtitle: "Verifiable jackpot settles twice daily at 00:00 & 12:00 UTC. Every entry is a unique NFT minted on MerlinChain.",
        prizePool: "LIVE PRIZE POOL", totalMints: "TOTAL NFTS MINTED", activePlayers: "ACTIVE PLAYERS",
        historyTitle: "Historical Lotteries", historySub: "Previous results and settlement data", historyNoData: "NO HISTORICAL DATA YET",
        historyAuto: "The history section will populate automatically after the first lottery is settled on-chain.",
        mintTitle: "Mint New NFT Entry", selectSchedule: "SELECT LOTTERY SCHEDULE", batchMint: "BATCH MINTING",
        select4: "SELECT 4 NUMBERS (1-9)", shuffle: "Shuffle", aiLucky: "AI Lucky", purchase: "Mint NFT Ticket",
        liveActivity: "LIVE ONCHAIN ACTIVITY", network: "MERLIN CHAIN", viewResults: "VIEW RESULTS", howItWorks: "HOW IT WORKS"
      },
      zh: {
        title: "链上大奖", connect: "连接钱包", heroTitle: "去中心化链上每日彩票",
        heroSubtitle: "每日 00:00 和 12:00 UTC 定时结算。每一张彩票都是在 MerlinChain 上铸造的唯一 NFT。",
        prizePool: "实时奖池", totalMints: "总计铸造 NFT", activePlayers: "活跃玩家",
        historyTitle: "历史彩票", historySub: "历史结果与结算数据", historyNoData: "尚无历史数据",
        historyAuto: "在第一期彩票在链上结算后，历史板块将自动填充。",
        mintTitle: "铸造新 NFT 投注", selectSchedule: "选择开奖时间", batchMint: "批量铸造",
        select4: "选择 4 个数字 (1-9)", shuffle: "随机", aiLucky: "AI 幸运", purchase: "铸造 NFT 彩票",
        liveActivity: "链上实时动态", network: "MERLIN CHAIN", viewResults: "查看结果", howItWorks: "运作方式"
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

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        setAccount(accounts[0]);
        setStats(s => ({ ...s, activePlayers: 1 }));
      } catch (e) {
        console.error("Connection failed", e);
      }
    } else alert("Please install MetaMask");
  };

  const toggleNumber = (n: number) => {
    if (selectedNumbers.includes(n)) setSelectedNumbers(s => s.filter(x => x !== n));
    else if (selectedNumbers.length < 4) setSelectedNumbers(s => [...s, n].sort((a, b) => a - b));
  };

  const handleShuffle = () => {
    const ns: number[] = [];
    while (ns.length < 4) {
      const r = Math.floor(Math.random() * 9) + 1;
      if (!ns.includes(r)) ns.push(r);
    }
    setSelectedNumbers(ns.sort((a, b) => a - b));
  };

  const handleAiLucky = async () => {
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: "Generate exactly 4 unique lucky numbers between 1 and 9. Return as JSON array.",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              numbers: { type: Type.ARRAY, items: { type: Type.NUMBER } }
            }
          }
        }
      });
      const data = JSON.parse(response.text || "{}");
      if (data.numbers) setSelectedNumbers(data.numbers.slice(0, 4).sort((a: number, b: number) => a - b));
    } catch (e) {
      handleShuffle();
    } finally {
      setAiLoading(false);
    }
  };

  const handleMint = async () => {
    if (!account) return connectWallet();
    setTxStatus('mining');
    await new Promise(r => setTimeout(r, 2000));
    setJackpot(j => j + (mintQuantity * 1.0));
    setStats(s => ({ ...s, totalMints: s.totalMints + mintQuantity }));
    setTxStatus('success');
    setSelectedNumbers([]);
    setTimeout(() => setTxStatus('idle'), 3000);
  };

  return (
    <div className="min-h-screen pb-20">
      {/* HEADER */}
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
            <button className="px-4 py-2 border border-[#7FE6C3] rounded-xl text-[11px] font-black uppercase text-[#063A30] flex items-center gap-2 hover:bg-emerald-50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              {t.viewResults}
            </button>
            <button className="px-4 py-2 border border-[#7FE6C3] rounded-xl text-[11px] font-black uppercase text-[#063A30] flex items-center gap-2 hover:bg-emerald-50">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              {t.howItWorks}
            </button>
            <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="px-3 py-2 border border-[#7FE6C3] rounded-xl text-[11px] font-black">{lang === 'en' ? '中文' : 'EN'}</button>
            <button onClick={connectWallet} className="bg-[#063A30] text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5z"></path><path d="M16 12h.01"></path></svg>
              {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : t.connect}
            </button>
          </div>
        </div>
      </header>

      {/* BANNER */}
      <div className="bg-[#E9FFF6] py-2 border-b border-[#7FE6C3]/30">
        <div className="max-w-7xl mx-auto px-8 text-[10px] font-black uppercase tracking-widest text-[#0D6B58]/40">
          NO ENTRIES IN LAST 12 HOURS
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-8 mt-12">
        {/* HERO SECTION */}
        <section className="bg-white rounded-[3rem] border border-gray-100 p-12 shadow-2xl relative overflow-hidden flex flex-col lg:flex-row gap-12 items-center">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none scale-150 rotate-12"><Logo size={300} /></div>
          
          <div className="flex-1 relative z-10">
            <div className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-[#E9FFF6] text-[#0D6B58] border border-[#7FE6C3]">
              <span className="h-1.5 w-1.5 rounded-full bg-current mr-2 animate-pulse" />
              {t.liveActivity}
            </div>
            <h2 className="text-6xl font-black font-display text-[#063A30] mt-8 leading-[1.05] tracking-tight">{t.heroTitle}</h2>
            <p className="mt-8 text-lg font-medium text-[#0D6B58] opacity-60 max-w-lg leading-relaxed">{t.heroSubtitle}</p>
            <div className="mt-12 flex gap-16">
              <div>
                <div className="text-3xl font-black font-display text-[#063A30]">{stats.totalMints}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#0D6B58]/40 mt-1">{t.totalMints}</div>
              </div>
              <div>
                <div className="text-3xl font-black font-display text-[#063A30]">{stats.activePlayers}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[#0D6B58]/40 mt-1">{t.activePlayers}</div>
              </div>
            </div>
          </div>

          {/* JACKPOT CARD */}
          <div className="w-full lg:w-[460px] relative z-10">
            <div className="bg-gradient-to-br from-[#063A30] to-[#042B24] rounded-[2.5rem] p-10 text-white shadow-2xl border border-white/5 relative group">
              <div className="flex justify-between items-center mb-10">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em] mb-1">{t.prizePool}</span>
                  <div className="h-1 w-12 bg-[#10b981] rounded-full" />
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[9px] font-black opacity-60 tracking-widest uppercase">LIVE UPDATING</span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.3em] ml-1">JACKPOT</span>
                <div className="flex items-baseline gap-3">
                  <span className="text-7xl font-black font-display tracking-tighter">{jackpot.toFixed(2)}</span>
                  <span className="text-xl font-black text-emerald-400 uppercase">M-USDT</span>
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
                  <div className="px-3 py-1 bg-emerald-400/10 rounded-lg text-emerald-400 text-[9px] font-black tracking-widest border border-emerald-400/20 uppercase">{t.network}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM SECTIONS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
          {/* HISTORY */}
          <div className="lg:col-span-7">
            <section className="bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-xl h-full">
              <h2 className="text-2xl font-bold font-display text-[#063A30]">{t.historyTitle}</h2>
              <p className="mt-2 text-sm font-medium text-[#0D6B58] opacity-40">{t.historySub}</p>
              
              <div className="mt-12 border-2 border-dashed border-gray-100 rounded-[2rem] p-20 flex flex-col items-center text-center">
                <span className="text-xs font-black text-gray-200 uppercase tracking-[0.3em] mb-4">{t.historyNoData}</span>
                <p className="text-[10px] font-bold text-gray-300 max-w-[240px] leading-relaxed tracking-wide uppercase">{t.historyAuto}</p>
              </div>
            </section>
          </div>

          {/* MINT INTERFACE */}
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
                    {aiLoading ? "..." : <><span className="text-xs">✨</span> {t.aiLucky}</>}
                  </button>
                </div>
              </div>

              <div className="mt-10">
                <button onClick={handleMint} disabled={selectedNumbers.length < 4 || txStatus === 'mining'} className="w-full bg-[#063A30] text-white rounded-2xl py-4 font-bold text-sm transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl">
                  {txStatus === 'mining' ? 'MINTING...' : t.purchase}
                </button>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

// --- RENDER ---
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);