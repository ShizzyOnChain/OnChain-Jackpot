import React from 'react';

export function Step({ num, title, desc }: { num: number; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 flex items-center justify-center font-black text-xl mb-4">{num}</div>
      <h4 className="font-bold mb-2 text-sm text-[#04211C] dark:text-white">{title}</h4>
      <p className="text-[11px] text-emerald-900/60 dark:text-white/40 leading-relaxed font-medium">{desc}</p>
    </div>
  );
};
