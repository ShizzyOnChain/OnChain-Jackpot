import React, { useState, useEffect, useCallback } from 'react';
import { Draw } from '../types';

interface ResultsModalProps {
    t: any;
    onClose: () => void;
    previousDraws: Record<string, Draw>;
}

const ResultsModal: React.FC<ResultsModalProps> = ({ t, onClose, previousDraws }) => {
    const [livePredictionNumbers, setLivePredictionNumbers] = useState<(number | null)[]>([null, null, null, null, null, null]);
    const [predictionPhase, setPredictionPhase] = useState(0);

    const runLivePredictionSequence = useCallback(async () => {
        setPredictionPhase(0);
        setLivePredictionNumbers([null, null, null, null, null, null]);

        const lastDrawTime = Object.keys(previousDraws).map(Number).sort((a, b) => b - a)[0];
        if (!lastDrawTime) return;

        const finalNumbers = previousDraws[lastDrawTime].winningNumbers;
        for (let i = 1; i <= 6; i++) {
            await new Promise(r => setTimeout(r, 800));
            setLivePredictionNumbers(prev => {
                const next = [...prev];
                next[i - 1] = finalNumbers[i - 1];
                return next;
            });
            setPredictionPhase(i);
        }
        await new Promise(r => setTimeout(r, 800));
        setPredictionPhase(7);
    }, [previousDraws]);

    useEffect(() => {
        if (Object.keys(previousDraws).length > 0) {
            runLivePredictionSequence();
        }
    }, [previousDraws, runLivePredictionSequence]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
            <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[#04211C] rounded-[2rem] p-10 text-center shadow-2xl animate-in zoom-in-95 duration-300">
                <button onClick={onClose} className="absolute top-6 right-6 p-2 dark:text-white hover:scale-110 transition-all"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                <h2 className="text-3xl font-black font-display text-[#04211C] dark:text-white mb-8">{t.latestResult}</h2>
                {Object.keys(previousDraws).length > 0 ? (
                    <>
                        <div className="grid grid-cols-3 gap-4 mb-12 h-auto">
                            {livePredictionNumbers.map((n, i) => (<div key={i} className={`h-16 w-full rounded-2xl border-4 flex items-center justify-center transition-all duration-700 ${n !== null ? 'scale-105 border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 shadow-lg' : 'border-dashed border-emerald-100 dark:border-emerald-500/20'}`}><span className="font-black text-2xl dark:text-white">{n !== null ? n : '?'}</span></div>))}
                        </div>
                        <p className="text-[10px] font-black text-emerald-800/40 dark:text-white/30 uppercase tracking-widest">{predictionPhase < 6 ? t.verifyingOnchain : t.revealSuccess}</p>
                    </>
                ) : (
                    <div className="py-8">
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t.noSettledPredictions}</p>
                    </div>
                )}
            </div>
        </div>
    )
};

export default ResultsModal;