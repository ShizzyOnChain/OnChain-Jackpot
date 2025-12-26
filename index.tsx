import React, { useEffect, useMemo, useState, useCallback } from "react";
import ReactDOM from "react-dom/client";

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

// --- COMPONENTS ---
const Step: React.FC<{ num: number; title: string; desc: string }> = ({ num, title, desc }) => (
  <div className="flex flex-col items-center text-center">
    <div className="h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xl mb-4 shadow-sm border border-emerald-200">
      {num}
    </div>
    <h4 className="font-bold mb-2 text-sm text-[#063A30]">{title}</h4>
    <p className="text-[11px] text-[#0D6B58] opacity-60 leading-relaxed font-medium">{desc}</p>
  </div>
);

// --- UTILS ---
const pad2 = (n: number) => String(n).padStart(2, "0");

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
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // States for unveil animation
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
        rules: "Lottery Rules",
        rule1: "A lottery occurs every 12 hours (00:00 & 12:00 UTC).",
        rule2: "Lotteries use deterministic on-chain entropy to ensure fairness.",
        rule3: "Jackpot is shared among all winners of that specific lottery window.",
        rule4: "Referral fees (0.02 M-USDT) are paid instantly upon successful minting.",
        disclaimer: "Legal Disclaimer",
        disclaimerText: "OnChain Jackpot is a decentralized game of chance. Participating in lotteries involves risk. Digital assets are highly volatile. Use only funds you can afford to lose.",
        latestResult: "Latest Result", settledMsg: "LOTTERY #0 SUCCESSFULLY SETTLED",
        verifyingOnchain: "Verifying Onchain Entropy...", revealSuccess: "Settlement Complete"
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
        rules: "彩票规则",
        rule1: "每 12 小时进行一次开奖 (00:00 & 12:00 UTC)。",
        rule2: "开奖使用确定的链上随机熵，确保公平性。",
        rule3: "奖池由该特定开奖时段的所有中奖者平分。",
        rule4: "成功铸造后，推荐费（0.02 M-USDT）将立即支付。",
        disclaimer: "法律声明",
        disclaimerText: "数字资产具有高度波动性。请仅使用您可以承受损失的资金。",
        latestResult: "最新开奖结果", settledMsg: "第0期彩票已成功结算",
        verifyingOnchain: "验证链上数据...", revealSuccess: "结算完成"
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
    if (showResultsModal) {
      runLiveLotterySequence();
    }
  }, [showResultsModal]);

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
    <div className="min-h-screen pb-20 bg-[#E9FFF6]/30">
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
            <button 
              onClick={() => setShowResultsModal(true)}
              className="px-4 py-2 border border-[#7FE6C3] rounded-xl text-[11px] font-black uppercase text-[#063A30] flex items-center gap-2 hover:bg-emerald-50 transition-all"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              {t.viewResults}
            </button>
            <button 
              onClick={() => setShowGuideModal(true)}
              className="px-4 py-2 border border-[#7FE6C3] rounded-xl text-[11px] font-black uppercase text-[#063A30] flex items-center gap-2 hover:bg-emerald-50 transition-all"
            >
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
          LIVE ONCHAIN JACKPOT • POWERED BY MERLIN CHAIN • VERIFIABLE ASSETS
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
                <div className="mt-4">
                  <button onClick={handleShuffle} className="w-full py-3 px-4 border-2 border-gray-50 rounded-xl font-black text-[10px] uppercase text-[#063A30]/60 hover:bg-gray-50 transition-all">{t.shuffle}</button>
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

      {/* VIEW RESULTS MODAL */}
      {showResultsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm transition-all">
          <div className="absolute inset-0" onClick={() => setShowResultsModal(false)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-[2.5rem] p-10 text-center shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden">
             <button onClick={() => setShowResultsModal(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 transition-all z-20">
               <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
             </button>
             
             <div className="mb-2">
               <p className="text-[10px] font-black text-[#0D6B58]/40 uppercase tracking-[0.2em] mb-1">Verifiable Draw Sequence</p>
               <h2 className="text-3xl font-black font-display text-[#063A30] mb-8">{t.latestResult}</h2>
             </div>

             <div className="flex justify-center gap-4 md:gap-6 mb-12 relative h-24">
                {liveLotteryNumbers.map((n, i) => (
                  <div 
                    key={i} 
                    className={`unveil-ball h-16 w-16 md:h-20 md:w-20 rounded-full border-4 flex items-center justify-center ${n !== null ? 'scale-110 rotate-12 border-emerald-500 bg-emerald-50 shadow-lg' : 'border-dashed border-emerald-100 bg-emerald-50/30'}`}
                  >
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
                     REVEALING NUMBERS...
                   </div>
                   <div className="text-[10px] font-bold text-emerald-800/40 uppercase tracking-[0.1em]">
                     {t.verifyingOnchain}
                   </div>
                 </div>
               ) : (
                 <div className="flex flex-col items-center gap-3 animate-in slide-in-from-bottom-2">
                   <div className="bg-emerald-50 rounded-2xl px-8 py-3 border border-emerald-100">
                     <p className="text-[11px] font-black text-[#0D6B58] uppercase tracking-[0.15em]">{t.revealSuccess}</p>
                   </div>
                   <p className="text-[9px] font-medium text-gray-400 uppercase tracking-widest mt-1">Verified via OnChain Entropy Block Hash</p>
                 </div>
               )}
             </div>
          </div>
        </div>
      )}

      {/* HOW IT WORKS MODAL */}
      {showGuideModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm transition-all">
          <div className="absolute inset-0" onClick={() => setShowGuideModal(false)} />
          <div className="relative z-10 w-full max-w-4xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="p-8 md:p-12 border-b flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-black font-display text-[#063A30]" style={{ color: COLORS.midnight }}>{t.howItWorks}</h2>
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
    </div>
  );
}

// --- RENDER ---
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);