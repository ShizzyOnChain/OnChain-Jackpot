import React from 'react';
import { Step } from './Step';

interface GuideModalProps {
    t: any; // Translation object
    onClose: () => void;
}

const GuideModal: React.FC<GuideModalProps> = ({ t, onClose }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="relative z-10 w-full max-w-3xl bg-white dark:bg-[#04211C] rounded-[2rem] p-10 shadow-2xl animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-6 right-6 p-2 dark:text-white hover:scale-110 transition-all"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
                <h2 className="text-3xl font-black font-display text-[#04211C] dark:text-white mb-10 text-center">{t.howItWorks}</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    <Step num={1} title={t.step1Title} desc={t.step1Desc} />
                    <Step num={2} title={t.step2Title} desc={t.step2Desc} />
                    <Step num={3} title={t.step3Title} desc={t.step3Desc} />
                    <Step num={4} title={t.step4Title} desc={t.step4Desc} />
                </div>

                <hr className="my-10 border-gray-200 dark:border-emerald-500/10" />

                <div className="grid md:grid-cols-2 gap-8 lg:gap-12 text-left">
                    <div>
                        <h3 className="text-xl font-bold font-display text-[#04211C] dark:text-white mb-6">{t.rules}</h3>
                        <ul className="space-y-4">
                            {[t.rule1, t.rule2, t.rule3, t.rule4].map((rule, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <div className="p-1 bg-emerald-100 dark:bg-emerald-500/10 rounded-full mt-1 shrink-0">
                                        <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                                    </div>
                                    <span className="text-sm text-emerald-900/70 dark:text-white/60 font-medium">{rule}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold font-display text-[#04211C] dark:text-white mb-6">{t.disclaimer}</h3>
                        <p className="text-sm text-emerald-900/60 dark:text-white/50 font-medium leading-relaxed border-l-4 border-emerald-200 dark:border-emerald-500/20 pl-6">{t.disclaimerText}</p>
                    </div>
                </div>
            </div>
        </div>
    )
};

export default GuideModal;
