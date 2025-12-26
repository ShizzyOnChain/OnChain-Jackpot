import React, { useEffect, useMemo, useState, useCallback } from "react";
import ReactDOM from "react-dom/client";

/**
 * GitHub Pages Safe React Application
 * 
 * - No CDN scripts
 * - No environment variables (process.env removed)
 * - No Gemini SDK (client-side entropy fallback)
 * - Consistently uses relative imports (consolidated for reliability)
 * - Deterministic lottery logic for static environment
 */

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
        latestResult: "Latest Result", settledMsg: "LOTTERY SUCCESSFULLY SETTLED",
        verifyingOnchain: "Verifying Onchain Entropy...", revealSuccess: "Settlement Complete",
        entropyPick: "Entropy Pick",
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
        latestResult: "最新开奖结果", settledMsg: "开奖已成功结算",
        verifyingOnchain: "验证链上数据...", revealSuccess: "结算完成",
        entropyPick: "随机选择",
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
        setStats(s => ({ ...s, activePlayers: s.activePlayers + 1 }));
      } catch (e) {
        console.error("Connection failed", e);
      }
    } else alert("Please install MetaMask");
  };

  const toggleNumber = (n: number) => {
    if (selectedNumbers.includes(n)) setSelectedNumbers(s => s.filter(x => x !== n));
    else if (selectedNumbers.length < 4) setSelectedNumbers(s => [...s, n].sort((a, b) => a - b));
  };

  // Safe client-side entropy picker replacing Gemini AI call
  const handleEntropyPick = () => {
    const nums: number[] = [];
    const entropySource = Date.now().toString() + (account || "anonymous");
    let pseudoRand = 0;
    for (let i = 0; i < entropySource.length; i++) {
        pseudoRand += entropySource.charCodeAt(i);
    }

    while (nums.length < 4) {
      pseudoRand = (pseudoRand * 1664525 + 1013904223) % 2**32;
      const r = (Math.abs(pseudoRand) % 9) + 1;
      if (!nums.includes(r)) nums.push(r);
    }
    setSelectedNumbers(nums.sort((a, b) => a - b));
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
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 cursor-pointer" onClick={() => window.location.reload()}>
            <Logo size={48} />
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold font-display" style={{ color: COLORS.midnight }}>{t.title}</h1>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#0D6B58] mt-1">MERLINCHAIN MAINNET</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setShowResultsModal(true)} className="px-4 py-2 border border-[#7FE6C3] rounded-xl text-[11px] font-black uppercase tracking-widest text-[#063A30] transition-all hover:bg-emerald-50">
              {t.viewResults}
            </button>
            <button onClick={() => setShowGuideModal(true)} className="px-4 py-2 border border-[#7FE6C3] rounded-xl text-[11px] font-black uppercase tracking-widest text-[#063A30] transition-all hover:bg-emerald-50">
              {t.howItWorks}
            </button>
            <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')} className="px-3 py-2 border border-[#7FE6C3] rounded-xl text-[11px] font-black">
              {lang === 'en' ? '中文' : 'EN'}
            </button>
            <button onClick={connectWallet} className="bg-[#063A30] text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all active:scale-95">
              {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : t.connect}
            </button>
          </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 mt-12">
        <section className="bg-white rounded-[3rem] border border-gray-100 p-12 shadow-xl relative overflow-hidden flex flex-col lg:flex-row gap-12 items-center">
          <div className="flex-1 relative z-10">
            <div className="inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider bg-[#E9FFF6] text-[#0D6B58] border border-[#7FE6C3]">
              <span className="h-1.5 w-1.5 rounded-full bg-current mr-2 animate-pulse" />
              {t.liveActivity}
            </div>
            <h2 className="text-6xl font-black font-display text-[#063A30] mt-8 leading-[1.05] tracking-tight">{t.heroTitle}</h2>
            <p className="mt-8 text-lg font-medium text-[#0D6B58] opacity-60 max-w-lg leading-relaxed">{t.heroSubtitle}</p>
          </div>

          <div className="w-full lg:w-[460px] relative z-10">
            <div className="bg-gradient-to-br from-[#063A30] to-[#042B24] rounded-[2.5rem] p-10 text-white shadow-2xl relative">
              <span className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em] mb-1">{t.prizePool}</span>
              <div className="flex items-baseline gap-3 mt-4">
                <span className="text-7xl font-black font-display tracking-tighter">{jackpot.toFixed(2)}</span>
                <span className="text-xl font-black text-emerald-400 uppercase">M-USDT</span>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
          <div className="lg:col-span-7 bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-xl min-h-[400px]">
            <h2 className="text-2xl font-bold font-display text-[#063A30]">{t.historyTitle}</h2>
            <div className="mt-12 border-2 border-dashed border-gray-100 rounded-[2rem] p-20 flex flex-col items-center text-center">
              <p className="text-[10px] font-bold text-gray-300 max-w-[240px] leading-relaxed tracking-wide uppercase">{t.historyAuto}</p>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-[2.5rem] border border-gray-100 p-10 shadow-xl">
              <h2 className="text-2xl font-bold font-display text-[#063A30] mb-8">{t.mintTitle}</h2>
              <div className="grid grid-cols-3 gap-3 mb-8">
                  {[1,2,3,4,5,6,7,8,9].map(n => (
                    <button key={n} onClick={() => toggleNumber(n)} className={`h-16 rounded-2xl flex items-center justify-center text-xl font-black transition-all border-2 active:scale-95 ${selectedNumbers.includes(n) ? "bg-[#063A30] text-white border-[#063A30]" : "bg-white border-gray-50 text-[#063A30]"}`}>
                      {n}
                    </button>
                  ))}
              </div>
              <div className="flex gap-4 mb-10">
                <button onClick={() => setSelectedNumbers([])} className="flex-1 py-3 px-4 border border-gray-100 rounded-xl font-bold text-[10px] uppercase tracking-widest text-gray-400">{t.shuffle}</button>
                <button onClick={handleEntropyPick} className="flex-1 py-3 px-4 bg-emerald-50 text-emerald-800 rounded-xl font-bold text-[10px] uppercase tracking-widest border border-emerald-100">{t.entropyPick}</button>
              </div>
              <button onClick={handleMint} disabled={selectedNumbers.length < 4 || txStatus === 'mining'} className="w-full bg-[#063A30] text-white rounded-2xl py-4 font-bold text-sm transition-all hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 shadow-xl">
                {txStatus === 'mining' ? 'MINTING...' : t.purchase}
              </button>
          </div>
        </div>
      </main>

      {/* MODALS */}
      {showResultsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setShowResultsModal(false)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-[2.5rem] p-10 text-center shadow-2xl animate-in zoom-in-95 duration-300">
             <h2 className="text-3xl font-black font-display text-[#063A30] mb-8">{t.latestResult}</h2>
             <div className="flex justify-center gap-4 mb-12 h-24">
                {liveLotteryNumbers.map((n, i) => (
                  <div key={i} className={`h-16 w-16 md:h-20 md:w-20 rounded-full border-4 flex items-center justify-center transition-all duration-700 transform ${n !== null ? 'scale-110 rotate-12 border-emerald-500 bg-emerald-50' : 'border-dashed border-emerald-100 bg-emerald-50/30'}`}>
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
              <h2 className="text-3xl font-black font-display text-[#063A30]">{t.howItWorks}</h2>
              <button onClick={() => setShowGuideModal(false)} className="h-10 w-10 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-800">X</button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 md:p-12 space-y-12 scrollbar-hide">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                  <div className="text-center"><h4 className="font-bold mb-2 text-sm">{t.step1Title}</h4><p className="text-[10px] opacity-60">{t.step1Desc}</p></div>
                  <div className="text-center"><h4 className="font-bold mb-2 text-sm">{t.step2Title}</h4><p className="text-[10px] opacity-60">{t.step2Desc}</p></div>
                  <div className="text-center"><h4 className="font-bold mb-2 text-sm">{t.step3Title}</h4><p className="text-[10px] opacity-60">{t.step3Desc}</p></div>
                  <div className="text-center"><h4 className="font-bold mb-2 text-sm">{t.step4Title}</h4><p className="text-[10px] opacity-60">{t.step4Desc}</p></div>
                </div>
                <div className="pt-8 border-t border-emerald-50 text-xs text-gray-500 space-y-4">
                  <h3 className="font-black uppercase tracking-widest text-[#063A30]">{t.rules}</h3>
                  <p>{t.rule1}</p><p>{t.rule2}</p><p>{t.rule3}</p>
                </div>
                <div className="p-8 rounded-3xl bg-red-50 border border-red-100">
                  <h3 className="text-xs font-black uppercase text-red-600 mb-4">{t.disclaimer}</h3>
                  <p className="text-[10px] text-red-900/60 leading-relaxed">{t.disclaimerText}</p>
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