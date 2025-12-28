import React from 'react';

export const Pill: React.FC<{ children: React.ReactNode; variant?: 'default' | 'gold' | 'mint' | 'danger' | 'info' | 'warning' }> = ({ children, variant = 'default' }) => {
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
