import React, { useMemo } from 'react';
import { Ticket, Draw } from '../types';
import { Pill } from './Pill';
import { PrimaryButton } from './PrimaryButton';

interface TicketCardProps {
    ticket: Ticket;
    t: any; // Translation object
    previousDraws: Record<string, Draw>;
    handleClaim: (ticketId: string) => void;
    claimStatus: Record<string, 'idle' | 'claiming' | 'success'>;
    formatDate: (ts: number | string) => string;
    formatTime: (ts: number | string) => string;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, t, previousDraws, handleClaim, claimStatus, formatDate, formatTime }) => {
    const draw = previousDraws[ticket.drawTimestamp];
    const isPast = !!draw;
    
    const isWinner = useMemo(() => {
        if (!draw) return false;
        // Bitmask check to match contract logic
        const ticketMask = ticket.numbers.reduce((mask, n) => mask | (1 << n), 0);
        const winningMask = draw.winningNumbers.reduce((mask, n) => mask | (1 << n), 0);
        return ticketMask === winningMask;
    }, [ticket.numbers, draw]);
  
    const hue = useMemo(() => parseInt(ticket.id.slice(0, 6), 16) % 360, [ticket.id]);
    const gradientStyle = { background: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 45) % 360}, 80%, 60%))` };
    const status = isWinner ? 'winner' : isPast ? 'played' : 'upcoming';
  
    return (
        <div className={`rounded-3xl border-2 overflow-hidden shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${isWinner && !ticket.claimed ? 'border-yellow-400 ring-4 ring-yellow-400/20' : 'dark:border-emerald-500/10 border-gray-100'}`}>
            <div className="p-6 text-white relative" style={gradientStyle}>
                <div className="relative z-10">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold font-display text-lg">Onchain Jackpot</h3>
                            <p className="text-xs opacity-60 font-mono">#{ticket.id}</p>
                        </div>
                        {status === 'winner' && <Pill variant="gold">{t.winner}</Pill>}
                        {status === 'upcoming' && <Pill variant="mint">UPCOMING</Pill>}
                        {status === 'played' && <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider whitespace-nowrap bg-black/10 text-white/70 border border-white/20">PLAYED</span>}
                    </div>
                    <div className="flex justify-center gap-3 my-8">
                        {ticket.numbers.map((n: number, i: number) => <div key={i} className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl font-black border border-white/30 shadow-md">{n}</div>)}
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-widest opacity-60 text-center">Draw Date</p>
                        <p className="text-center font-bold">{formatDate(ticket.drawTimestamp)} - {formatTime(ticket.drawTimestamp)}</p>
                    </div>
                </div>
            </div>
            {isWinner && (
                <div className="p-4 bg-white dark:bg-[#031814]">
                    {ticket.claimed ? <div className="py-2 text-center rounded-lg bg-gray-100 dark:bg-gray-700 text-xs font-bold uppercase tracking-wider text-gray-400">{t.claimed}</div> : <PrimaryButton onClick={() => handleClaim(ticket.id)} loading={claimStatus[ticket.id] === 'claiming'} variant="gold">{t.claimPrize}</PrimaryButton>}
                </div>
            )}
            {isPast && !isWinner && draw && (
                <div className="p-4 text-center bg-gray-50 dark:bg-[#021411]">
                    <p className="text-[9px] font-bold text-emerald-800/40 dark:text-white/30 uppercase tracking-widest mb-2">{t.winningNums}</p>
                    <div className="flex gap-1.5 justify-center">{draw.winningNumbers.map((n, i) => <div key={i} className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-white/10 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-sm font-bold">{n}</div>)}</div>
                </div>
            )}
        </div>
    );
  };
