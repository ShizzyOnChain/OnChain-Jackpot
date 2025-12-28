import React, { useState, useEffect, useRef } from 'react';
import { Ticket, Draw } from '../types';
import { PrimaryButton } from './PrimaryButton';

// The TicketCard component is passed as a prop to avoid circular dependencies
// and because its props are derived from the main App state.
interface ProfileModalProps {
    t: any;
    isOpen: boolean;
    onClose: () => void;
    profile: { username: string; bio: string; avatarUrl: string };
    setProfile: (profile: any) => void;
    account: string;
    referralBalance: number;
    btcPrice: number | null;
    onClaimReferral: () => void;
    isClaimingReferral: boolean;
    onLogout: () => void;
    tickets: Ticket[];
    TicketCardComponent: React.FC<any>;
    formatDate: (ts: number | string) => string;
    formatTime: (ts: number | string) => string;
    handleClaim: (ticketId: string) => void;
    claimStatus: Record<string, 'idle' | 'claiming' | 'success'>;
    previousDraws: Record<string, Draw>;
}

const ProfileModal: React.FC<ProfileModalProps> = (props) => {
    const { t, isOpen, onClose, profile, setProfile, account, referralBalance, btcPrice, onClaimReferral, isClaimingReferral, onLogout, tickets, TicketCardComponent, ...ticketCardProps } = props;
    
    const [localProfile, setLocalProfile] = useState(profile);
    const [copyButtonText, setCopyButtonText] = useState(t.copyLink);
    const [activeTab, setActiveTab] = useState('entries');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLocalProfile(profile);
    }, [profile]);

    const handleSave = () => {
        localStorage.setItem(`profile_${account}`, JSON.stringify(localProfile));
        setProfile(localProfile);
        onClose();
    };

    const handleCopy = () => {
        const referralLink = `${window.location.origin}?ref=${account}`;
        navigator.clipboard.writeText(referralLink);
        setCopyButtonText(t.copied);
        setTimeout(() => setCopyButtonText(t.copyLink), 2000);
    };
    
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setLocalProfile({ ...localProfile, avatarUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div className="relative z-10 w-full max-w-4xl bg-white dark:bg-[#04211C] rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-6 right-6 p-2 text-gray-400 dark:text-white hover:scale-110 transition-all z-20"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                <div className="grid grid-cols-1 md:grid-cols-12">
                    <div className="md:col-span-5 bg-gray-50 dark:bg-emerald-500/5 p-8 border-r border-gray-100 dark:border-emerald-500/10 flex flex-col">
                        <h2 className="text-2xl font-bold font-display text-[#04211C] dark:text-white mb-8">{t.profile}</h2>
                        
                        <div className="relative w-32 h-32 mx-auto mb-6 group">
                            <img src={localProfile.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover border-4 border-white dark:border-[#04211C] shadow-lg"/>
                            <button onClick={handleAvatarClick} className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">{t.uploadAvatar}</button>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                        </div>

                        <div className="space-y-4 mb-8">
                            <div><label className="text-[10px] font-black text-emerald-900/40 dark:text-white/30 uppercase tracking-widest mb-2 block">{t.nameLabel}</label><input type="text" value={localProfile.username} onChange={e => setLocalProfile({...localProfile, username: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-emerald-500/20 bg-white dark:bg-emerald-500/5 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"/></div>
                            <div><label className="text-[10px] font-black text-emerald-900/40 dark:text-white/30 uppercase tracking-widest mb-2 block">{t.bioLabel}</label><textarea value={localProfile.bio} onChange={e => setLocalProfile({...localProfile, bio: e.target.value})} className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-emerald-500/20 bg-white dark:bg-emerald-500/5 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" rows={3}></textarea></div>
                        </div>

                        <div className="mt-auto space-y-2">
                           <PrimaryButton onClick={handleSave}>{t.save}</PrimaryButton>
                           <PrimaryButton onClick={onLogout} variant="outline">{t.logout}</PrimaryButton>
                        </div>
                    </div>
                    <div className="md:col-span-7 p-8 flex flex-col">
                         <div className="border-b border-gray-200 dark:border-emerald-500/10 mb-6">
                            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                <button onClick={() => setActiveTab('entries')} className={`${activeTab === 'entries' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-white/40 dark:hover:text-white'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>{t.myTickets}</button>
                                <button onClick={() => setActiveTab('rewards')} className={`${activeTab === 'rewards' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-white/40 dark:hover:text-white'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>{t.referral}</button>
                                <button onClick={() => setActiveTab('nfts')} className={`${activeTab === 'nfts' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-white/40 dark:hover:text-white'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>{t.myNfts}</button>
                            </nav>
                        </div>
                        
                        <div className="flex-grow overflow-y-auto max-h-[60vh] pr-2 -mr-2">
                             {activeTab === 'entries' && (
                                <div className="space-y-4">
                                    {tickets.length > 0 ? tickets.map((ticket: Ticket) => <TicketCardComponent key={ticket.id} ticket={ticket} t={t} {...ticketCardProps} />) : <div className="text-center py-12 px-6 rounded-2xl bg-gray-50 dark:bg-emerald-500/5 border border-gray-100 dark:border-emerald-500/10"><h3 className="mt-4 text-sm font-semibold text-gray-800 dark:text-white">{t.noTicketsFound}</h3><p className="text-xs text-gray-400 mt-2">{t.mintToSee}</p></div>}
                                </div>
                            )}
                            {activeTab === 'rewards' && (
                                <div className="space-y-6">
                                    <div><label className="text-[10px] font-black text-emerald-900/40 dark:text-white/30 uppercase tracking-widest mb-2 block">{t.yourReferralLink}</label><div className="flex gap-2"><input type="text" readOnly value={`${window.location.origin}?ref=${account}`} className="flex-grow px-4 py-2 rounded-lg border border-gray-200 dark:border-emerald-500/20 bg-gray-50 dark:bg-emerald-500/5 dark:text-white/70 focus:outline-none text-sm"/><button onClick={handleCopy} className="px-4 py-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 text-xs font-bold hover:bg-emerald-200 dark:hover:bg-emerald-500/20 transition-colors w-24">{copyButtonText}</button></div></div>
                                    <div className="bg-emerald-50 dark:bg-emerald-500/5 rounded-2xl p-6 border dark:border-emerald-500/10 text-center">
                                        <p className="text-[10px] font-black text-emerald-900/40 dark:text-white/30 uppercase tracking-widest mb-2">{t.available}</p>
                                        <p className="text-3xl font-black font-display dark:text-white">{referralBalance.toFixed(6)} BTC</p>
                                        {btcPrice && <p className="text-sm font-medium text-emerald-600/60 dark:text-emerald-400/60 mt-1">(${(referralBalance * btcPrice).toLocaleString('en-US', { style: 'currency', currency: 'USD' })})</p>}
                                        <div className="mt-6"><PrimaryButton onClick={onClaimReferral} loading={isClaimingReferral} disabled={referralBalance <= 0 || isClaimingReferral} variant="success">{t.claimAll}</PrimaryButton></div>
                                    </div>
                                </div>
                            )}
                             {activeTab === 'nfts' && (
                                <div className="space-y-4">
                                    {tickets.length > 0 ? (
                                        tickets.map((ticket: Ticket) => <TicketCardComponent key={ticket.id} ticket={ticket} t={t} {...ticketCardProps} />)
                                    ) : (
                                        <div className="text-center py-12 px-6 rounded-2xl bg-gray-50 dark:bg-emerald-500/5 border border-gray-100 dark:border-emerald-500/10">
                                            <h3 className="mt-4 text-sm font-semibold text-gray-800 dark:text-white">{t.noNftTickets}</h3>
                                            <p className="text-xs text-gray-400 mt-2">{t.mintOneToStart}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileModal;
