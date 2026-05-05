import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, MoreHorizontal, Settings, Trash2, Download, DownloadCloud, CheckCircle, AlertCircle, Home, LogOut } from 'lucide-react';
import SettingsOverlay from './SettingsOverlay';
import { generateMeetingPDF } from '../utils/pdfGenerator';
import icon from "./icon.png";
import MeetingDetails from './MeetingDetails';
import TopSearchPill from './TopSearchPill';
import GlobalChatOverlay from './GlobalChatOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import { analytics } from '../lib/analytics/analytics.service'; // Added analytics import
import { useShortcuts } from '../hooks/useShortcuts';
import { useResolvedTheme } from '../hooks/useResolvedTheme';
import { isMac } from '../utils/platformUtils';
import WindowControls from './WindowControls';

interface Meeting {
    id: string;
    title: string;
    date: string;
    duration: string;
    summary: string;
    detailedSummary?: {
        actionItems: string[];
        keyPoints: string[];
    };
    transcript?: Array<{
        speaker: string;
        text: string;
        timestamp: number;
    }>;
    usage?: Array<{
        type: 'assist' | 'followup' | 'chat' | 'followup_questions';
        timestamp: number;
        question?: string;
        answer?: string;
        items?: string[];
    }>;
    active?: boolean; // UI state
    time?: string; // Optional for compatibility
}

interface LauncherProps {
    onStartMeeting: () => void;
    onOpenSettings: (tab?: string) => void;
    onOpenModes?: () => void;
    onPageChange?: (isMain: boolean) => void;
    ollamaPullStatus?: 'idle' | 'downloading' | 'complete' | 'failed';
    ollamaPullPercent?: number;
    ollamaPullMessage?: string;
}

// Helper to format date groups
const getGroupLabel = (dateStr: string) => {
    if (dateStr === "Today") return "Today"; // Backward compatibility

    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (checkDate.getTime() === today.getTime()) return "Today";
    if (checkDate.getTime() === yesterday.getTime()) return "Yesterday";

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

// Helper to format time (e.g. 3:14pm)
const formatTime = (dateStr: string) => {
    if (dateStr === "Today") return "Just now"; // Legacy
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
};

const NavBtn: React.FC<{ label: string; active: boolean; onClick: () => void; children: React.ReactNode }> = ({ label, active, onClick, children }) => (
    <div className="relative group/navbtn">
        <button
            onClick={onClick}
            className={`w-9 h-9 flex items-center justify-center rounded-[10px] border transition-all duration-100 ${
                active
                    ? 'border-white/[0.11] bg-white/[0.09] text-[#e2e5ed]'
                    : 'border-transparent text-[#e2e5ed]/40 hover:bg-white/[0.06] hover:text-[#e2e5ed]/75'
            }`}
        >
            {children}
        </button>
        {/* Tooltip */}
        <div className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 opacity-0 group-hover/navbtn:opacity-100 transition-opacity duration-100 z-[500]">
            <div className="bg-[rgba(13,15,20,0.95)] border border-white/[0.10] text-[#e2e5ed]/85 text-[11px] font-medium px-[9px] py-[4px] rounded-[6px] whitespace-nowrap">
                {label}
            </div>
        </div>
    </div>
);

const Launcher: React.FC<LauncherProps> = ({ onStartMeeting, onOpenSettings, onOpenModes, onPageChange, ollamaPullStatus = 'idle', ollamaPullPercent = 0, ollamaPullMessage = '' }) => {
    const [activeView, setActiveView] = useState<'home' | 'history' | 'queue' | 'solutions' | 'settings'>('home');
    const [settingsTab, setSettingsTab] = useState('general');
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [isDetectable, setIsDetectable] = useState(false);
    const [isMeetingActive, setIsMeetingActive] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

    // Global search state (for AI chat overlay)
    const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);
    const [submittedGlobalQuery, setSubmittedGlobalQuery] = useState('');

    const [showModesOnboarding, setShowModesOnboarding] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const fetchMeetings = () => {
        if (window.electronAPI && window.electronAPI.getRecentMeetings) {
            window.electronAPI.getRecentMeetings().then(setMeetings).catch(err => console.error("Failed to fetch meetings:", err));
        }
    };


    // Keybinds
    const { isShortcutPressed } = useShortcuts();
    const isLight = useResolvedTheme() === 'light';
    useEffect(() => {
        let mounted = true;
        console.log("Launcher mounted");
        // Seed demo data if needed (safe to call always — runs ONCE on mount)
        if (window.electronAPI && window.electronAPI.seedDemo) {
            window.electronAPI.seedDemo().catch(err => console.error("Failed to seed demo:", err));
        }

        // Onboarding Check
        const hasSeenModesOnboarding = localStorage.getItem('natively_seen_modes_onboarding_v5');
        if (!hasSeenModesOnboarding) {
            setTimeout(() => {
                if (mounted) setShowModesOnboarding(true);
            }, 8000); // Increased delay so it doesn't overlap with other startup notifications
        }

        // Sync initial undetectable state
        if (window.electronAPI?.getUndetectable) {
            window.electronAPI.getUndetectable().then((undetectable) => {
                if (mounted) setIsDetectable(!undetectable);
            });
        }

        // Listen for undetectable changes
        let removeUndetectableListener: (() => void) | undefined;
        if (window.electronAPI?.onUndetectableChanged) {
            removeUndetectableListener = window.electronAPI.onUndetectableChanged((undetectable) => {
                setIsDetectable(!undetectable);
            });
        }

        fetchMeetings();

        // Sync initial meeting active state — guarded so unmounted component isn't written to
        if (window.electronAPI?.getMeetingActive) {
            window.electronAPI.getMeetingActive()
                .then((active) => { if (mounted) setIsMeetingActive(active); })
                .catch(() => {});
        }

        // Listen for meeting state changes (e.g. meeting started/ended from overlay)
        let removeMeetingStateListener: (() => void) | undefined;
        if (window.electronAPI?.onMeetingStateChanged) {
            removeMeetingStateListener = window.electronAPI.onMeetingStateChanged(({ isActive }) => {
                setIsMeetingActive(isActive);
            });
        }

        // Listen for background updates (e.g. after meeting processing finishes)
        const removeMeetingsListener = window.electronAPI.onMeetingsUpdated(() => {
            console.log("Received meetings-updated event");
            fetchMeetings();
        });

        return () => {
            mounted = false;
            if (removeMeetingsListener) removeMeetingsListener();
            if (removeUndetectableListener) removeUndetectableListener();
            if (removeMeetingStateListener) removeMeetingStateListener();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Mount-only: stable setup that must run exactly once

    // Separate effect for keyboard listener — re-registers when isShortcutPressed changes
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isShortcutPressed(e, 'toggleVisibility')) {
                e.preventDefault();
                window.electronAPI.toggleWindow();
            } else if (isShortcutPressed(e, 'moveWindowUp')) {
                e.preventDefault();
                window.electronAPI.moveWindowUp?.();
            } else if (isShortcutPressed(e, 'moveWindowDown')) {
                e.preventDefault();
                window.electronAPI.moveWindowDown?.();
            } else if (isShortcutPressed(e, 'moveWindowLeft')) {
                e.preventDefault();
                window.electronAPI.moveWindowLeft?.();
            } else if (isShortcutPressed(e, 'moveWindowRight')) {
                e.preventDefault();
                window.electronAPI.moveWindowRight?.();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isShortcutPressed]);

    if (!window.electronAPI) {
        return <div className="text-white p-10">Error: Electron API not initialized. Check preload script.</div>;
    }

    // Group meetings
    const groupedMeetings = meetings.reduce((acc, meeting) => {
        const label = getGroupLabel(meeting.date);
        if (!acc[label]) acc[label] = [];
        acc[label].push(meeting);
        return acc;
    }, {} as Record<string, Meeting[]>);

    // Group order (Today, Yesterday, then others sorted new to old is implicit via API return order ideally, 
    // but JS object key order isn't guaranteed. We can use a Map or just known keys.)
    // Simple sort for keys:
    const sortedGroups = Object.keys(groupedMeetings).sort((a, b) => {
        if (a === 'Today') return -1;
        if (b === 'Today') return 1;
        if (a === 'Yesterday') return -1;
        if (b === 'Yesterday') return 1;
        // Approximation for others: parse date
        return new Date(b).getTime() - new Date(a).getTime();
    });


    const [forwardMeeting, setForwardMeeting] = useState<Meeting | null>(null);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [menuEntered, setMenuEntered] = useState(false);

    useEffect(() => {
        setMenuEntered(false);
    }, [activeMenuId]);

    // Global click listener to close menu
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    // Notify parent if we are on the main launcher list view
    useEffect(() => {
        if (onPageChange) {
            onPageChange(!selectedMeeting && !isGlobalChatOpen);
        }
    }, [selectedMeeting, isGlobalChatOpen, onPageChange]);

    const handleOpenMeeting = async (meeting: Meeting) => {
        setForwardMeeting(null); // Clear forward history on new navigation
        console.log("[Launcher] Opening meeting:", meeting.id);
        analytics.trackCommandExecuted('open_meeting_details');

        // Fetch full meeting details including transcript and usage
        if (window.electronAPI && window.electronAPI.getMeetingDetails) {
            try {
                console.log("[Launcher] Fetching full meeting details...");
                const fullMeeting = await window.electronAPI.getMeetingDetails(meeting.id);
                console.log("[Launcher] Got meeting details:", fullMeeting);
                console.log("[Launcher] Transcript count:", fullMeeting?.transcript?.length);
                console.log("[Launcher] Usage count:", fullMeeting?.usage?.length);
                if (fullMeeting) {
                    setSelectedMeeting(fullMeeting);
                    return;
                }
            } catch (err) {
                console.error("[Launcher] Failed to fetch meeting details:", err);
            }
        } else {
            console.warn("[Launcher] getMeetingDetails not available on electronAPI");
        }
        // Fallback to list-view data if fetch fails
        setSelectedMeeting(meeting);
    };

    const handleBack = () => {
        setForwardMeeting(selectedMeeting);
        setSelectedMeeting(null);
    };

    const handleForward = () => {
        if (forwardMeeting) {
            setSelectedMeeting(forwardMeeting);
            setForwardMeeting(null);
        }
    };

    // Helper to format duration to mm:ss or mmm:ss
    // Helper to format duration to mm:ss or mmm:ss
    const formatDurationPill = (durationStr: string) => {
        if (!durationStr) return "00:00";

        // Check if it's already in colon format (e.g. "5:30", "105:20")
        if (durationStr.includes(':')) {
            const parts = durationStr.split(':');
            const mins = parts[0];
            const secs = parts[1] || "00";

            // Allow 3 digits for mins if >= 100, otherwise pad to 2
            const formattedMins = mins.length >= 3 ? mins : mins.padStart(2, '0');
            return `${formattedMins}:${secs}`;
        }

        // Fallback for "X min" format (legacy)
        const minutes = parseInt(durationStr.replace('min', '').trim()) || 0;
        const mm = minutes.toString().padStart(2, '0');
        return `${mm}:00`;
    };

    return (
        <div className="h-full w-full flex flex-col bg-[#080a0e] text-[#e2e5ed] font-sans overflow-hidden selection:bg-accent-secondary/30">
            {/* 1. Header (Static) */}
            <header className="relative w-full h-[40px] shrink-0 flex items-center justify-between pl-0 drag-region select-none bg-[#0d0f14] border-b border-white/[0.07] z-[200]">
                {/* Left: Spacing for Traffic Lights + Navigation Arrows */}
                <div className="flex items-center gap-1 no-drag">
                    {isMac && <div className="w-[70px]" />} {/* Traffic Light Spacer (macOS only) */}

                    {/* Back Button */}
                    <button
                        onClick={selectedMeeting ? handleBack : undefined}
                        disabled={!selectedMeeting}
                        className={`
                            transition-all duration-300 p-1 flex items-center justify-center mt-1 ml-2
                            ${selectedMeeting
                                ? 'text-[#e2e5ed]/50 hover:text-[#e2e5ed] hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                                : 'text-[#e2e5ed]/20 opacity-50 cursor-default'}
                        `}
                    >
                        <ArrowLeft size={16} />
                    </button>

                    {/* Forward Button */}
                    <button
                        onClick={handleForward}
                        disabled={!forwardMeeting}
                        className={`
                            transition-all duration-300 p-1 flex items-center justify-center mt-1
                            ${forwardMeeting
                                ? 'text-[#e2e5ed]/50 hover:text-[#e2e5ed] hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]'
                                : 'text-[#e2e5ed]/20 opacity-0 cursor-default'}
                        `}
                    >
                        <ArrowRight size={16} />
                    </button>
                </div>


                {/* Center: Spotlight-style Search Pill */}
                <TopSearchPill
                    meetings={meetings}
                    onAIQuery={(query) => {
                        analytics.trackCommandExecuted('ai_query_search');
                        setSubmittedGlobalQuery(query);
                        setIsGlobalChatOpen(true);
                    }}
                    onLiteralSearch={(query) => {
                        // For now, also use AI query for literal search
                        // Could be enhanced to do fuzzy filtering in the UI
                        analytics.trackCommandExecuted('literal_search');
                        setSubmittedGlobalQuery(query);
                        setIsGlobalChatOpen(true);
                    }}
                    onOpenMeeting={(meetingId) => {
                        const meeting = meetings.find(m => m.id === meetingId);
                        if (meeting) {
                            handleOpenMeeting(meeting);
                            analytics.trackCommandExecuted('open_meeting_from_search');
                        }
                    }}
                />

                {/* Right: Actions */}
                <div className={`flex items-center gap-1 no-drag shrink-0 ${isMac ? 'mr-1' : ''}`}>
                    <div className="relative group/modes-btn select-none">
                        <button
                            onClick={() => {
                                setShowModesOnboarding(false);
                                localStorage.setItem('natively_seen_modes_onboarding_v5', 'true');
                                onOpenModes?.();
                            }}
                            title="Modes"
                            className="p-2 text-[#e2e5ed]/50 hover:text-[#e2e5ed] transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                        >
                            <svg width={18} height={18} viewBox="0 0 14 14" fill="none">
                                <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.9"/>
                                <rect x="7.5" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.9"/>
                                <rect x="1" y="7.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.9"/>
                                <rect x="7.5" y="7.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.35"/>
                            </svg>
                        </button>
                        
                        <AnimatePresence>
                            {showModesOnboarding && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6, scale: 0.96, filter: "blur(4px)" }}
                                    animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                                    exit={{ opacity: 0, y: -2, scale: 0.98, filter: "blur(2px)", transition: { duration: 0.15, ease: "easeOut" } }}
                                    transition={{ type: "spring", stiffness: 350, damping: 25, mass: 1 }}
                                    className={`absolute top-[38px] right-2 w-[270px] rounded-[20px] p-4 z-[300] origin-top-right backdrop-blur-[40px] saturate-[180%] transform-gpu ${
                                        isLight 
                                        ? 'bg-white/70 shadow-[0_8px_30px_rgb(0,0,0,0.12),0_0_0_1px_rgba(0,0,0,0.04)]' 
                                        : 'bg-[#18181A]/70 shadow-[0_8px_30px_rgb(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.08)]'
                                    }`}
                                >
                                    {/* Triangle Pointer */}
                                    <div className={`absolute -top-[5px] right-[14px] w-2.5 h-2.5 rotate-45 rounded-tl-[3px] ${
                                        isLight 
                                        ? 'bg-white/70 border-t border-l border-black/5 backdrop-blur-[40px]' 
                                        : 'bg-[#18181A]/70 border-t border-l border-white/5 backdrop-blur-[40px]'
                                    }`} />
                                    
                                    <div className="relative flex gap-3">
                                        <div className={`w-9 h-9 flex items-center justify-center shrink-0 rounded-full ${
                                            isLight
                                            ? 'bg-orange-500 bg-opacity-10 text-orange-500'
                                            : 'bg-orange-500 bg-opacity-15 text-orange-400'
                                        }`}>
                                            <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                                                <rect x="1" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.9"/>
                                                <rect x="7.5" y="1" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.9"/>
                                                <rect x="1" y="7.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.9"/>
                                                <rect x="7.5" y="7.5" width="5.5" height="5.5" rx="1.5" fill="currentColor" opacity="0.4"/>
                                            </svg>
                                        </div>
                                        <div className="flex-1 pt-[2px]">
                                            <h3 className="text-[14px] font-semibold tracking-[-0.015em] mb-1 flex items-center gap-2">
                                                <span className={isLight ? 'text-slate-900' : 'text-slate-100'}>Modes</span>
                                                <span className={`text-[10px] font-medium px-1.5 py-[1px] rounded-[5px] ${
                                                    isLight
                                                    ? 'bg-orange-50 text-orange-600 border border-orange-100/50'
                                                    : 'bg-orange-500/10 text-orange-400'
                                                }`}>
                                                    Beta
                                                </span>
                                            </h3>
                                            <p className={`text-[12px] leading-[1.35] mb-3.5 tracking-[-0.01em] ${
                                                isLight ? 'text-slate-500' : 'text-slate-400'
                                            }`}>
                                                Custom instructions and formulas designed for different meeting contexts.
                                            </p>
                                            <div className="flex justify-end gap-1.5 isolate">
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        setShowModesOnboarding(false); 
                                                        localStorage.setItem('natively_seen_modes_onboarding_v5', 'true'); 
                                                    }}
                                                    className={`text-[12px] font-medium px-3.5 py-[6px] rounded-full transition-all active:scale-95 ${
                                                        isLight
                                                        ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                                                        : 'text-slate-400 hover:text-slate-100 hover:bg-white/10'
                                                    }`}
                                                >
                                                    Dismiss
                                                </button>
                                                <button 
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        onOpenModes?.(); 
                                                        setShowModesOnboarding(false); 
                                                        localStorage.setItem('natively_seen_modes_onboarding_v5', 'true'); 
                                                    }}
                                                    className={`text-[12px] font-medium px-4 py-[6px] rounded-full transition-all active:scale-95 shadow-sm ${
                                                        isLight
                                                        ? 'bg-slate-900 text-white hover:bg-slate-800'
                                                        : 'bg-slate-100 text-slate-900 hover:bg-white'
                                                    }`}
                                                >
                                                    Try it out
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                    {!isMac && <WindowControls />}
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden min-h-0">
                {/* Icon Sidebar */}
                <div className="flex flex-col items-center py-3 gap-1 border-r shrink-0 w-[52px] bg-[#0d0f14] border-white/[0.07]">
                    {/* Logo */}
                    <div className="w-[30px] h-[30px] rounded-[9px] mb-3 overflow-hidden shrink-0 flex items-center justify-center bg-gradient-to-br from-[#d97757] to-[#b05530]">
                        <img src={icon} alt="LiveLens" className="w-[18px] h-[18px] object-contain brightness-0 invert opacity-90" draggable="false" />
                    </div>

                    {/* Home */}
                    <NavBtn label="Home" active={activeView === 'home'} onClick={() => setActiveView('home')}>
                        <Home size={16} />
                    </NavBtn>

                    {/* History */}
                    <NavBtn label="History" active={activeView === 'history'} onClick={() => setActiveView('history')}>
                        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                    </NavBtn>


                    {/* Solutions */}
                    <NavBtn label="Solutions" active={activeView === 'solutions'} onClick={() => setActiveView('solutions')}>
                        <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                    </NavBtn>

                    <div className="flex-1" />

                    {/* Settings */}
                    <NavBtn label="Settings" active={activeView === 'settings'} onClick={() => setActiveView('settings')}>
                        <Settings size={16} />
                    </NavBtn>

                    {/* Logout */}
                    <NavBtn label="Logout" active={false} onClick={() => setShowLogoutConfirm(true)}>
                        <LogOut size={16} />
                    </NavBtn>
                </div>

            <div className="relative flex-1 flex flex-col overflow-hidden min-h-0">
                {/* Inline Settings View */}
                {activeView === 'settings' && (
                    <SettingsOverlay
                        inline
                        isOpen
                        onClose={() => setActiveView('home')}
                        initialTab={settingsTab}
                    />
                )}

                <AnimatePresence mode="wait">
                    {activeView === 'settings' ? null : activeView === 'solutions' ? (
                        <motion.div key="solutions" className="flex-1 flex flex-col items-center justify-center gap-3"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                            <svg viewBox="0 0 24 24" width={28} height={28} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#e2e5ed]/20">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                            <p className="text-[12px] text-[#e2e5ed]/25">Solutions — coming soon</p>
                        </motion.div>
                    ) : selectedMeeting && activeView === 'home' ? (
                        <motion.div
                            key="details"
                            className="flex-1 overflow-hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <MeetingDetails
                                meeting={selectedMeeting}
                                onBack={handleBack}
                                onOpenSettings={onOpenSettings}
                            />
                        </motion.div>
                    ) : activeView === 'history' ? (
                        <motion.div
                            key="history"
                            className="flex-1 flex flex-col overflow-hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <main className="flex-1 overflow-y-auto custom-scrollbar" style={{ scrollbarWidth: 'none' }}>
                                <div className="px-5 py-4">
                                    <p className="text-[10.5px] font-bold tracking-[0.08em] uppercase text-[#e2e5ed]/25 px-1 pb-3">All Sessions</p>
                                    {sortedGroups.map((label) => (
                                        <div key={label} className="mb-3">
                                            <div className="text-[10.5px] font-bold tracking-[0.08em] uppercase text-[#e2e5ed]/25 px-1 pb-[6px]">{label}</div>
                                            <div className="rounded-[12px] border border-white/[0.07] overflow-hidden bg-white/[0.02]">
                                                {groupedMeetings[label].map((m, idx) => (
                                                    <div
                                                        key={m.id}
                                                        className={`group relative flex items-center gap-3 px-[14px] py-[10px] cursor-pointer hover:bg-white/[0.03] transition-colors ${idx < groupedMeetings[label].length - 1 ? 'border-b border-white/[0.05]' : ''}`}
                                                        onClick={() => { setActiveView('home'); handleOpenMeeting(m); }}
                                                    >
                                                        <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 border ${m.active ? 'bg-[rgba(74,222,128,0.10)] border-[rgba(74,222,128,0.18)] text-[#4ade80]' : 'bg-white/[0.05] border-white/[0.08] text-[#e2e5ed]/35'}`}>
                                                            <svg viewBox="0 0 24 24" className="w-[13px] h-[13px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className={`text-[13px] font-medium truncate ${m.title === 'Processing...' ? 'text-blue-400 italic animate-pulse' : 'text-[#e2e5ed]'}`}>{m.title}</div>
                                                            <div className="text-[11px] text-[#e2e5ed]/38 mt-[1px]">{formatTime(m.date)}</div>
                                                        </div>
                                                        {m.active ? (
                                                            <span className="text-[10px] font-semibold px-[7px] py-[2px] rounded-full bg-[rgba(74,222,128,0.10)] text-[#4ade80] border border-[rgba(74,222,128,0.18)] tracking-[0.04em] shrink-0">LIVE</span>
                                                        ) : (
                                                            <span className="text-[10.5px] text-[#e2e5ed]/30 shrink-0">{formatDurationPill(m.duration)}</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                    {meetings.length === 0 && (
                                        <div className="text-[12px] text-[#e2e5ed]/25 px-1 pt-2">No recorded sessions yet.</div>
                                    )}
                                </div>
                            </main>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="launcher"
                            className="flex-1 flex flex-col overflow-hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            {/* ── Hero ── */}
                            <section className="px-5 pt-5 pb-4 border-b border-white/[0.06] shrink-0">
                                <div className="flex items-start justify-between mb-[18px]">
                                    <div>
                                        <h1 className="text-[20px] font-semibold text-[#e2e5ed] tracking-[-0.025em] leading-[1.2]">My LiveLens</h1>
                                        <p className="text-[12px] text-[#e2e5ed]/40 mt-[3px]">
                                            {meetings.length > 0 ? `${meetings.length} session${meetings.length !== 1 ? 's' : ''} recorded` : 'No sessions yet'}
                                        </p>
                                    </div>
                                    <div className={`w-[7px] h-[7px] rounded-full mt-[6px] shrink-0 transition-colors ${isMeetingActive ? 'bg-[#4ade80] shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-[#e2e5ed]/20'}`} />
                                </div>

                                {/* Ollama status bar — compact, only when active */}
                                <AnimatePresence>
                                    {ollamaPullStatus !== 'idle' && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            animate={{ opacity: 1, height: 'auto', marginBottom: 10 }}
                                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-white/[0.04] border border-white/[0.07] overflow-hidden"
                                        >
                                            {ollamaPullStatus === 'downloading' ? (
                                                <DownloadCloud size={12} className="text-blue-400 animate-pulse shrink-0" />
                                            ) : ollamaPullStatus === 'complete' ? (
                                                <CheckCircle size={12} className="text-emerald-400 shrink-0" />
                                            ) : (
                                                <AlertCircle size={12} className="text-red-400 shrink-0" />
                                            )}
                                            <span className="text-[11px] text-[#e2e5ed]/50 flex-1">
                                                {ollamaPullStatus === 'downloading' ? `Setting up AI memory… ${ollamaPullPercent}%` : ollamaPullMessage}
                                            </span>
                                            {ollamaPullStatus === 'downloading' && (
                                                <div className="w-16 h-[3px] bg-white/10 rounded-full overflow-hidden shrink-0">
                                                    <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${ollamaPullPercent}%` }} />
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* CTA button */}
                                <button
                                    onClick={() => {
                                        if (isMeetingActive) {
                                            window.electronAPI?.setWindowMode?.('overlay', true);
                                            analytics.trackCommandExecuted('resume_meeting_from_launcher');
                                        } else {
                                            onStartMeeting();
                                            analytics.trackCommandExecuted('start_natively_cta');
                                        }
                                    }}
                                    className={`w-full py-[11px] rounded-[11px] text-white text-[13.5px] font-semibold tracking-[-0.01em] flex items-center justify-center gap-2 border transition-opacity hover:opacity-[0.88] active:scale-[0.99] ${
                                        isMeetingActive
                                            ? 'bg-gradient-to-br from-[#065f46] to-[#047857] border-[rgba(74,222,128,0.18)] shadow-[0_4px_20px_rgba(5,150,105,0.25)]'
                                            : 'bg-gradient-to-br from-[#d97757] to-[#b05530] border-[rgba(217,119,87,0.25)] shadow-[0_4px_20px_rgba(217,119,87,0.30)]'
                                    }`}
                                >
                                    {isMeetingActive ? (
                                        <>
                                            <span className="relative flex h-[8px] w-[8px] shrink-0">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
                                                <span className="relative inline-flex rounded-full h-[8px] w-[8px] bg-white" />
                                            </span>
                                            Meeting ongoing
                                        </>
                                    ) : (
                                        <>
                                            <svg viewBox="0 0 24 24" className="w-[13px] h-[13px] fill-white shrink-0"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                            Start LiveLens
                                        </>
                                    )}
                                </button>
                            </section>

                            {/* ── Meeting list ── */}
                            <main className="flex-1 overflow-y-auto custom-scrollbar" style={{ scrollbarWidth: 'none' }}>
                                <div className="px-5 py-4">
                                    {sortedGroups.map((label) => (
                                        <div key={label} className="mb-3">
                                            <div className="text-[10.5px] font-bold tracking-[0.08em] uppercase text-[#e2e5ed]/25 px-1 pb-[6px]">{label}</div>
                                            <div className="rounded-[12px] border border-white/[0.07] overflow-hidden bg-white/[0.02]">
                                                {groupedMeetings[label].map((m, idx) => (
                                                    <div
                                                        key={m.id}
                                                        className={`group relative flex items-center gap-3 px-[14px] py-[10px] cursor-pointer hover:bg-white/[0.03] transition-colors ${idx < groupedMeetings[label].length - 1 ? 'border-b border-white/[0.05]' : ''}`}
                                                        onClick={() => handleOpenMeeting(m)}
                                                    >
                                                        {/* Icon */}
                                                        <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 border ${
                                                            m.active
                                                                ? 'bg-[rgba(74,222,128,0.10)] border-[rgba(74,222,128,0.18)] text-[#4ade80]'
                                                                : 'bg-white/[0.05] border-white/[0.08] text-[#e2e5ed]/35'
                                                        }`}>
                                                            <svg viewBox="0 0 24 24" className="w-[13px] h-[13px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                                                                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                                            </svg>
                                                        </div>

                                                        {/* Info */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className={`text-[13px] font-medium truncate ${m.title === 'Processing...' ? 'text-blue-400 italic animate-pulse' : 'text-[#e2e5ed]'}`}>
                                                                {m.title}
                                                            </div>
                                                            <div className="text-[11px] text-[#e2e5ed]/38 mt-[1px]">{formatTime(m.date)}</div>
                                                        </div>

                                                        {/* Right: duration or LIVE badge or processing */}
                                                        {m.title === 'Processing...' ? (
                                                            <div className="flex items-center gap-1.5 shrink-0">
                                                                <svg className="animate-spin w-[11px] h-[11px] text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                                                <span className="text-[10px] text-blue-400 font-medium">Finalizing</span>
                                                            </div>
                                                        ) : m.active ? (
                                                            <span className="text-[10px] font-semibold px-[7px] py-[2px] rounded-full bg-[rgba(74,222,128,0.10)] text-[#4ade80] border border-[rgba(74,222,128,0.18)] tracking-[0.04em] shrink-0">LIVE</span>
                                                        ) : (
                                                            <span className="text-[10.5px] text-[#e2e5ed]/30 shrink-0 transition-opacity group-hover:opacity-0">{formatDurationPill(m.duration)}</span>
                                                        )}

                                                        {/* Context menu trigger — slides in on hover */}
                                                        <div className="absolute right-[14px] top-1/2 -translate-y-1/2 opacity-0 translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0">
                                                            <button
                                                                className="p-1 text-[#e2e5ed]/40 hover:text-[#e2e5ed]/80 transition-colors"
                                                                onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === m.id ? null : m.id); }}
                                                            >
                                                                <MoreHorizontal size={15} />
                                                            </button>
                                                        </div>

                                                        {/* Dropdown */}
                                                        <AnimatePresence>
                                                            {activeMenuId === m.id && (
                                                                <motion.div
                                                                    initial={{ opacity: 0, scale: 0.95, y: 6 }}
                                                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                    exit={{ opacity: 0, scale: 0.95, y: 4 }}
                                                                    transition={{ duration: 0.1 }}
                                                                    className="absolute right-2 top-full mt-1 w-[90px] bg-[#1a1c22] border border-white/[0.10] rounded-[8px] shadow-2xl z-50 overflow-hidden"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                    onMouseEnter={() => setMenuEntered(true)}
                                                                    onMouseLeave={() => { if (menuEntered) setActiveMenuId(null); }}
                                                                >
                                                                    <div className="p-1 flex flex-col gap-0.5">
                                                                        <button
                                                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-[#e2e5ed]/70 hover:text-[#e2e5ed] hover:bg-white/[0.06] rounded-[6px] transition-colors text-left"
                                                                            onClick={async () => {
                                                                                setActiveMenuId(null);
                                                                                analytics.trackPdfExported();
                                                                                if (window.electronAPI?.getMeetingDetails) {
                                                                                    try {
                                                                                        const full = await window.electronAPI.getMeetingDetails(m.id);
                                                                                        generateMeetingPDF(full ?? m);
                                                                                    } catch { generateMeetingPDF(m); }
                                                                                } else { generateMeetingPDF(m); }
                                                                            }}
                                                                        >
                                                                            <Download size={12} />Export
                                                                        </button>
                                                                        <button
                                                                            className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-[6px] transition-colors text-left"
                                                                            onClick={async () => {
                                                                                if (window.electronAPI?.deleteMeeting) {
                                                                                    const ok = await window.electronAPI.deleteMeeting(m.id);
                                                                                    if (ok) setMeetings(prev => prev.filter(x => x.id !== m.id));
                                                                                }
                                                                                setActiveMenuId(null);
                                                                            }}
                                                                        >
                                                                            <Trash2 size={12} />Delete
                                                                        </button>
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    {meetings.length === 0 && (
                                        <div className="text-[12px] text-[#e2e5ed]/25 px-1 pt-2">No recorded sessions yet.</div>
                                    )}
                                </div>
                            </main>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            </div>{/* end sidebar+content flex row */}



            {/* Global Chat Overlay */}
            <GlobalChatOverlay
                isOpen={isGlobalChatOpen}
                onClose={() => {
                    setIsGlobalChatOpen(false);
                    setSubmittedGlobalQuery('');
                }}
                initialQuery={submittedGlobalQuery}
            />

            {/* Logout confirmation dialog */}
            <AnimatePresence>
                {showLogoutConfirm && (
                    <motion.div
                        key="logout-backdrop"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="absolute inset-0 z-50 flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
                        onClick={() => setShowLogoutConfirm(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.93, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 8 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                width: 320, borderRadius: 16,
                                background: 'linear-gradient(150deg, #1a1917 0%, #141413 100%)',
                                border: '1px solid rgba(255,255,255,0.09)',
                                boxShadow: '0 32px 80px rgba(0,0,0,0.9)',
                                padding: '24px',
                                display: 'flex', flexDirection: 'column', gap: 16,
                            }}
                        >
                            {/* Icon */}
                            <div style={{
                                width: 40, height: 40, borderRadius: 12,
                                background: 'rgba(217,119,87,0.12)', border: '1px solid rgba(217,119,87,0.22)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <LogOut size={18} color="#d97757" strokeWidth={1.75} />
                            </div>

                            {/* Text */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <span style={{ fontSize: 15, fontWeight: 640, color: '#faf9f5', letterSpacing: '-0.02em' }}>
                                    Quit LiveLens?
                                </span>
                                <span style={{ fontSize: 12.5, color: 'rgba(250,249,245,0.45)', lineHeight: 1.55 }}>
                                    Any active session will be stopped. Your meeting history and settings will be saved.
                                </span>
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    style={{
                                        flex: 1, height: 38, borderRadius: 10,
                                        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)',
                                        color: 'rgba(250,249,245,0.65)', fontSize: 13, fontWeight: 540,
                                        cursor: 'pointer', transition: 'background 150ms',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => window.electronAPI.quitApp()}
                                    style={{
                                        flex: 1, height: 38, borderRadius: 10,
                                        background: 'linear-gradient(135deg, #d97757 0%, #b05530 100%)',
                                        border: '1px solid rgba(217,119,87,0.4)',
                                        color: '#fff', fontSize: 13, fontWeight: 640,
                                        cursor: 'pointer', transition: 'opacity 150ms',
                                    }}
                                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                                >
                                    Quit
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default Launcher;
