import React, { useState, useEffect } from 'react';
import {
    ArrowRight,
    ArrowLeft,
    MoreHorizontal,
    Settings,
    Trash2,
    Download,
    DownloadCloud,
    CheckCircle,
    AlertCircle,
    Home,
    LogOut,
    LayoutGrid,
    Minimize2,
} from 'lucide-react';
import { ANALYSIS_MODES } from '../config/analysisModes';
import SettingsOverlay from './settings/SettingsOverlay';
import { generateMeetingPDF } from '../utils/pdfGenerator';
import icon from './icon.png';
import MeetingDetails from './meetings/MeetingDetails';
import TopSearchPill from './TopSearchPill';
import GlobalChatOverlay from './chat/GlobalChatOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import { analytics } from '../lib/analytics/analytics.service'; // Added analytics import
import { useShortcuts } from '../hooks/useShortcuts';
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
    ollamaPullStatus?: 'idle' | 'downloading' | 'complete' | 'failed';
    ollamaPullPercent?: number;
    ollamaPullMessage?: string;
}

// Helper to format date groups
const getGroupLabel = (dateStr: string) => {
    if (dateStr === 'Today') return 'Today'; // Backward compatibility

    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (checkDate.getTime() === today.getTime()) return 'Today';
    if (checkDate.getTime() === yesterday.getTime()) return 'Yesterday';

    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

// Helper to format time (e.g. 3:14pm)
const formatTime = (dateStr: string) => {
    if (dateStr === 'Today') return 'Just now'; // Legacy
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
};

const NavBtn: React.FC<{ label: string; active: boolean; onClick: () => void; children: React.ReactNode }> = ({
    label,
    active,
    onClick,
    children,
}) => (
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

const Launcher: React.FC<LauncherProps> = ({
    onStartMeeting,
    ollamaPullStatus = 'idle',
    ollamaPullPercent = 0,
    ollamaPullMessage = '',
}) => {
    const [activeView, setActiveView] = useState<'home' | 'modes' | 'settings'>('home');
    const [settingsTab, setSettingsTab] = useState('general');
    const [currentMode, setCurrentMode] = useState<string>('general');
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [isMeetingActive, setIsMeetingActive] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

    // Global search state (for AI chat overlay)
    const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);
    const [submittedGlobalQuery, setSubmittedGlobalQuery] = useState('');

    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const fetchMeetings = () => {
        if (window.electronAPI && window.electronAPI.getRecentMeetings) {
            window.electronAPI
                .getRecentMeetings()
                .then(setMeetings)
                .catch((err) => console.error('Failed to fetch meetings:', err));
        }
    };

    // Keybinds
    const { isShortcutPressed } = useShortcuts();
    useEffect(() => {
        const removeOpenSettingsTab = window.electronAPI?.onOpenSettingsTab?.((tab: string) => {
            setSettingsTab(tab || 'general');
            setActiveView('settings');
        });
        return () => {
            removeOpenSettingsTab?.();
        };
    }, []);

    useEffect(() => {
        let mounted = true;
        console.log('Launcher mounted');
        // Seed demo data if needed (safe to call always — runs ONCE on mount)
        if (window.electronAPI && window.electronAPI.seedDemo) {
            window.electronAPI.seedDemo().catch((err) => console.error('Failed to seed demo:', err));
        }

        fetchMeetings();

        // Load persisted analysis mode
        window.electronAPI
            ?.getAnalysisMode?.()
            .then((m: string) => {
                if (m && mounted) setCurrentMode(m);
            })
            .catch(() => {});

        // Sync initial meeting active state — guarded so unmounted component isn't written to
        if (window.electronAPI?.getMeetingActive) {
            window.electronAPI
                .getMeetingActive()
                .then((active) => {
                    if (mounted) setIsMeetingActive(active);
                })
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
            console.log('Received meetings-updated event');
            fetchMeetings();
        });

        return () => {
            mounted = false;
            if (removeMeetingsListener) removeMeetingsListener();
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
    const groupedMeetings = meetings.reduce(
        (acc, meeting) => {
            const label = getGroupLabel(meeting.date);
            if (!acc[label]) acc[label] = [];
            acc[label].push(meeting);
            return acc;
        },
        {} as Record<string, Meeting[]>
    );

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

    const handleOpenMeeting = async (meeting: Meeting) => {
        setForwardMeeting(null); // Clear forward history on new navigation
        console.log('[Launcher] Opening meeting:', meeting.id);
        analytics.trackCommandExecuted('open_meeting_details');

        // Fetch full meeting details including transcript and usage
        if (window.electronAPI && window.electronAPI.getMeetingDetails) {
            try {
                console.log('[Launcher] Fetching full meeting details...');
                const fullMeeting = await window.electronAPI.getMeetingDetails(meeting.id);
                console.log('[Launcher] Got meeting details:', fullMeeting);
                console.log('[Launcher] Transcript count:', fullMeeting?.transcript?.length);
                console.log('[Launcher] Usage count:', fullMeeting?.usage?.length);
                if (fullMeeting) {
                    setSelectedMeeting(fullMeeting);
                    return;
                }
            } catch (err) {
                console.error('[Launcher] Failed to fetch meeting details:', err);
            }
        } else {
            console.warn('[Launcher] getMeetingDetails not available on electronAPI');
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
        if (!durationStr) return '00:00';

        // Check if it's already in colon format (e.g. "5:30", "105:20")
        if (durationStr.includes(':')) {
            const parts = durationStr.split(':');
            const mins = parts[0];
            const secs = parts[1] || '00';

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
            <header className="relative w-full h-[48px] shrink-0 flex items-center justify-between pl-0 drag-region select-none bg-[#0d0f14] border-b border-white/[0.07] z-[200]">
                {/* Left: Traffic light spacer (macOS only) */}
                <div className="flex items-center no-drag">{isMac && <div className="w-[72px]" />}</div>

                {/* Center: Spotlight-style Search Pill */}
                <TopSearchPill
                    meetings={meetings}
                    onAIQuery={(query) => {
                        analytics.trackCommandExecuted('ai_query_search');
                        setSubmittedGlobalQuery(query);
                        setIsGlobalChatOpen(true);
                    }}
                    onLiteralSearch={(query) => {
                        analytics.trackCommandExecuted('literal_search');
                        setSubmittedGlobalQuery(query);
                        setIsGlobalChatOpen(true);
                    }}
                    onOpenMeeting={(meetingId) => {
                        const meeting = meetings.find((m) => m.id === meetingId);
                        if (meeting) {
                            handleOpenMeeting(meeting);
                            analytics.trackCommandExecuted('open_meeting_from_search');
                        }
                    }}
                />

                {/* Right: compact mode toggle (macOS) + Window controls (Windows) */}
                <div className={`flex items-center no-drag shrink-0 gap-1 ${isMac ? 'mr-2' : ''}`}>
                    {isMac && (
                        <button
                            onClick={() => window.electronAPI?.setCompactMode?.(true)}
                            className="w-[26px] h-[26px] flex items-center justify-center rounded-[7px] border border-transparent text-[#e2e5ed]/30 hover:bg-white/[0.07] hover:border-white/[0.09] hover:text-[#e2e5ed]/70 transition-all duration-100"
                            title="Compact mode"
                        >
                            <Minimize2 size={12} />
                        </button>
                    )}
                    {!isMac && <WindowControls />}
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden min-h-0">
                {/* Icon Sidebar */}
                <div className="flex flex-col items-center py-3 gap-1 border-r shrink-0 w-[52px] bg-[#0d0f14] border-white/[0.07]">
                    {/* Logo */}
                    <div className="w-[30px] h-[30px] rounded-[9px] mb-3 overflow-hidden shrink-0 flex items-center justify-center bg-gradient-to-br from-[#d97757] to-[#b05530]">
                        <img
                            src={icon}
                            alt="LiveLens"
                            className="w-[18px] h-[18px] object-contain brightness-0 invert opacity-90"
                            draggable="false"
                        />
                    </div>

                    {/* Home */}
                    <NavBtn label="Home" active={activeView === 'home'} onClick={() => setActiveView('home')}>
                        <Home size={16} />
                    </NavBtn>

                    {/* Modes */}
                    <NavBtn label="Modes" active={activeView === 'modes'} onClick={() => setActiveView('modes')}>
                        <LayoutGrid size={16} />
                    </NavBtn>

                    <div className="flex-1" />

                    {/* Settings */}
                    <NavBtn
                        label="Settings"
                        active={activeView === 'settings'}
                        onClick={() => setActiveView('settings')}
                    >
                        <Settings size={16} />
                    </NavBtn>

                    {/* Logout */}
                    <NavBtn label="Quit" active={false} onClick={() => setShowLogoutConfirm(true)}>
                        <LogOut size={16} />
                    </NavBtn>
                </div>

                <div className="relative flex-1 flex flex-col overflow-hidden min-h-0">
                    {/* Inline Settings View */}
                    {activeView === 'settings' && (
                        <SettingsOverlay onClose={() => setActiveView('home')} initialTab={settingsTab} />
                    )}

                    {/* Inline Modes View */}
                    {activeView === 'modes' && (
                        <div className="flex-1 flex flex-col overflow-hidden">
                            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                                {/* .inner — exact match to prototype */}
                                <div className="w-full max-w-[760px] mx-auto px-5 pt-5 pb-6 flex flex-col gap-5">
                                    {/* Section header */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10.5px] font-bold tracking-[0.08em] uppercase text-text-dim-muted">
                                            Analysis Mode
                                        </span>
                                        <div className="inline-flex items-center gap-[5px] px-[9px] py-1 rounded-full bg-accent-primary/10 border border-accent-primary/[0.22]">
                                            <span className="w-[5px] h-[5px] rounded-full bg-accent-primary shrink-0 inline-block" style={{ boxShadow: '0 0 5px rgba(217,119,87,0.7)' }} />
                                            <span className="text-[10.5px] font-semibold text-accent-primary whitespace-nowrap">
                                                {ANALYSIS_MODES.find((m) => m.id === currentMode)?.label ?? 'General'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 2-col card grid */}
                                    <div className="grid grid-cols-2 gap-2">
                                        {ANALYSIS_MODES.map((mode) => {
                                            const isActive = currentMode === mode.id;
                                            return (
                                                <button
                                                    key={mode.id}
                                                    onClick={async () => {
                                                        setCurrentMode(mode.id);
                                                        await window.electronAPI
                                                            ?.setAnalysisMode?.(mode.id)
                                                            .catch(() => {});
                                                    }}
                                                    className={`group/modecard relative w-full flex flex-col gap-2.5 px-[14px] pt-[14px] pb-[13px] rounded-xl cursor-pointer text-left transition-all duration-[120ms] active:scale-[0.985] ${isActive ? 'bg-accent-primary/[0.08] border border-accent-primary/[0.22]' : 'bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.05] hover:border-white/[0.10]'}`}
                                                >
                                                    {/* Left accent bar */}
                                                    {isActive && (
                                                        <span className="absolute left-0 top-[10px] bottom-[10px] w-[2.5px] rounded-r-[2px] bg-accent-primary" />
                                                    )}

                                                    {/* Top row: emoji + check ring */}
                                                    <div className="flex items-start w-full">
                                                        <div
                                                            className="w-9 h-9 rounded-[9px] flex items-center justify-center text-[17px] shrink-0 transition-transform duration-[120ms] group-hover/modecard:scale-[1.06]"
                                                            style={{ background: mode.color, border: `1px solid ${mode.border}` }}
                                                        >
                                                            {mode.icon}
                                                        </div>
                                                        <div
                                                            className={`w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 mt-[1px] ml-auto transition-all duration-[150ms] ${isActive ? 'bg-accent-primary border-[1.5px] border-accent-primary' : 'bg-transparent border-[1.5px] border-white/[0.12]'}`}
                                                            style={{ boxShadow: isActive ? '0 0 10px rgba(217,119,87,0.4)' : 'none' }}
                                                        >
                                                            {isActive && (
                                                                <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                                                                    <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Label + description */}
                                                    <div>
                                                        <div className={`text-[13px] font-[590] tracking-[-0.01em] mb-[3px] transition-colors duration-[120ms] ${isActive ? 'text-[rgba(240,241,244,1)]' : 'text-[#e2e5ed]/65'}`}>
                                                            {mode.label}
                                                        </div>
                                                        <div className={`text-[11px] leading-[1.45] transition-colors duration-[120ms] ${isActive ? 'text-[#e2e5ed]/40' : 'text-[#e2e5ed]/25'}`}>
                                                            {mode.description}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Footer hint */}
                                    <div className="flex items-center gap-1.5 pt-1">
                                        <svg className="w-[13px] h-[13px] shrink-0 text-[#e2e5ed]/20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="10" />
                                            <line x1="12" y1="8" x2="12" y2="12" />
                                            <line x1="12" y1="16" x2="12.01" y2="16" />
                                        </svg>
                                        <p className="text-[10.5px] text-[#e2e5ed]/22 leading-[1.4]">
                                            Applies instantly.{' '}
                                            <span className="text-[#e2e5ed]/40 font-[580]">What to answer?</span>{' '}
                                            and{' '}
                                            <span className="text-[#e2e5ed]/40 font-[580]">Solve</span>{' '}
                                            will use this context.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {activeView === 'settings' || activeView === 'modes' ? null : selectedMeeting &&
                          activeView === 'home' ? (
                            <motion.div
                                key="details"
                                className="flex-1 overflow-hidden"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                            >
                                <MeetingDetails meeting={selectedMeeting} onBack={handleBack} />
                            </motion.div>
                        ) : (
                            /* ── Home View ── */
                            <motion.div
                                key="home"
                                className="flex-1 flex flex-col overflow-hidden"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                            >
                                <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                                    <div className="w-full max-w-[760px] mx-auto px-5 pt-5 pb-6 flex flex-col gap-5">
                                        {/* Live session banner */}
                                        <AnimatePresence>
                                            {isMeetingActive && (
                                                <motion.button
                                                    initial={{ opacity: 0, y: -6 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -6 }}
                                                    transition={{ duration: 0.2 }}
                                                    onClick={() => {
                                                        window.electronAPI?.setWindowMode?.('overlay', true);
                                                        analytics.trackCommandExecuted('resume_meeting_from_launcher');
                                                    }}
                                                    className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-[11px] bg-[rgba(74,222,128,0.07)] border border-[rgba(74,222,128,0.18)] text-[#4ade80] hover:bg-[rgba(74,222,128,0.11)] active:scale-[0.99] transition-all text-left shrink-0"
                                                >
                                                    <span className="relative flex h-[7px] w-[7px] shrink-0">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ade80] opacity-70" />
                                                        <span className="relative inline-flex h-[7px] w-[7px] rounded-full bg-[#4ade80]" />
                                                    </span>
                                                    <span className="flex-1 text-[13px] font-medium">
                                                        Session in progress
                                                    </span>
                                                    <ArrowRight size={13} className="opacity-50 shrink-0" />
                                                </motion.button>
                                            )}
                                        </AnimatePresence>

                                        {/* Ollama download bar */}
                                        <AnimatePresence>
                                            {ollamaPullStatus !== 'idle' && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="flex items-center gap-2 px-3 py-2 rounded-[8px] bg-white/[0.04] border border-white/[0.07] overflow-hidden shrink-0"
                                                >
                                                    {ollamaPullStatus === 'downloading' ? (
                                                        <DownloadCloud
                                                            size={12}
                                                            className="text-blue-400 animate-pulse shrink-0"
                                                        />
                                                    ) : ollamaPullStatus === 'complete' ? (
                                                        <CheckCircle size={12} className="text-emerald-400 shrink-0" />
                                                    ) : (
                                                        <AlertCircle size={12} className="text-red-400 shrink-0" />
                                                    )}
                                                    <span className="text-[11px] text-[#e2e5ed]/50 flex-1">
                                                        {ollamaPullStatus === 'downloading'
                                                            ? `Setting up AI memory… ${ollamaPullPercent}%`
                                                            : ollamaPullMessage}
                                                    </span>
                                                    {ollamaPullStatus === 'downloading' && (
                                                        <div className="w-16 h-[3px] bg-white/10 rounded-full overflow-hidden shrink-0">
                                                            <div
                                                                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                                                style={{ width: `${ollamaPullPercent}%` }}
                                                            />
                                                        </div>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Primary CTA */}
                                        <button
                                            onClick={() => {
                                                onStartMeeting();
                                                analytics.trackCommandExecuted('start_natively_cta');
                                            }}
                                            disabled={isMeetingActive}
                                            className="w-full flex items-center justify-between px-3 py-[14px] rounded-[12px] text-left transition-all duration-100 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 bg-accent-primary/[0.08] border border-accent-primary/[0.18] hover:bg-accent-primary/[0.13]"
                                        >
                                            <div className="flex items-center gap-[11px]">
                                                <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0 bg-gradient-to-br from-[#d97757] to-[#b05530]">
                                                    <svg
                                                        viewBox="0 0 24 24"
                                                        className="w-[12px] h-[12px] fill-white shrink-0"
                                                    >
                                                        <polygon points="5 3 19 12 5 21 5 3" />
                                                    </svg>
                                                </div>
                                                <div className="flex flex-col gap-[2px]">
                                                    <span className="text-[14px] font-[600] text-[#e2e5ed]/92 tracking-[-0.01em]">
                                                        Start LiveLens
                                                    </span>
                                                    <span className="text-[11.5px] text-[#e2e5ed]/35">
                                                        Begin recording &amp; analysis
                                                    </span>
                                                </div>
                                            </div>
                                            <div
                                                className="w-[24px] h-[24px] rounded-[7px] flex items-center justify-center shrink-0 bg-accent-primary/15"
                                            >
                                                <ArrowRight size={12} className="text-[#d97757]" />
                                            </div>
                                        </button>

                                        {/* Stats row */}
                                        {meetings.length > 0 &&
                                            (() => {
                                                const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                                                const thisWeek = meetings.filter(
                                                    (m) => new Date(m.date).getTime() > weekAgo
                                                ).length;
                                                const totalMins = meetings.reduce((acc, m) => {
                                                    if (!m.duration) return acc;
                                                    const parts = m.duration.split(':');
                                                    return acc + (parseInt(parts[0]) || 0);
                                                }, 0);
                                                const avgMin = meetings.length
                                                    ? Math.round(totalMins / meetings.length)
                                                    : 0;
                                                return (
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {[
                                                            {
                                                                label: 'Sessions',
                                                                value: String(meetings.length),
                                                                sub: 'All time',
                                                            },
                                                            {
                                                                label: 'This week',
                                                                value: String(thisWeek),
                                                                sub: 'Last 7 days',
                                                            },
                                                            {
                                                                label: 'Avg length',
                                                                value: avgMin ? `${avgMin}m` : '—',
                                                                sub: 'Per session',
                                                            },
                                                        ].map((s) => (
                                                            <div
                                                                key={s.label}
                                                                className="flex flex-col gap-[4px] px-[13px] py-[11px] rounded-[10px] bg-white/[0.03] border border-white/[0.06]"
                                                            >
                                                                <span className="text-[10px] font-[700] tracking-[0.06em] uppercase text-[#e2e5ed]/25">
                                                                    {s.label}
                                                                </span>
                                                                <span className="text-[20px] font-[650] text-[#e2e5ed]/88 tracking-[-0.03em] leading-none">
                                                                    {s.value}
                                                                </span>
                                                                <span className="text-[10.5px] text-[#e2e5ed]/28">
                                                                    {s.sub}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}

                                        {/* Sessions list */}
                                        {meetings.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                                                <div className="w-12 h-12 rounded-[14px] bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                                                    <svg
                                                        viewBox="0 0 24 24"
                                                        className="w-[20px] h-[20px] text-[#e2e5ed]/20"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="1.75"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                                        <line x1="12" y1="19" x2="12" y2="23" />
                                                        <line x1="8" y1="23" x2="16" y2="23" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-medium text-[#e2e5ed]/45 mb-1.5">
                                                        No sessions yet
                                                    </p>
                                                    <p className="text-[11.5px] text-[#e2e5ed]/25 leading-relaxed max-w-[190px]">
                                                        Press Start LiveLens to record and analyse your first
                                                        conversation.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-0">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-[10.5px] font-[700] tracking-[0.08em] uppercase text-[#e2e5ed]/25">
                                                        Sessions
                                                    </span>
                                                    <span className="text-[10.5px] text-[#e2e5ed]/20 tabular-nums">
                                                        {meetings.length}
                                                    </span>
                                                </div>

                                                {sortedGroups.map((label) => (
                                                    <div key={label} className="mb-4">
                                                        <div className="text-[10px] font-[600] tracking-[0.07em] uppercase text-[#e2e5ed]/20 mb-1.5 px-[2px]">
                                                            {label}
                                                        </div>
                                                        <div className="flex flex-col gap-[2px]">
                                                            {groupedMeetings[label].map((m) => (
                                                                <div
                                                                    key={m.id}
                                                                    className="group relative flex items-start gap-3 px-[10px] py-[9px] rounded-[10px] cursor-pointer hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors"
                                                                    onClick={() => handleOpenMeeting(m)}
                                                                >
                                                                    <div
                                                                        className={`w-[30px] h-[30px] rounded-[8px] flex items-center justify-center shrink-0 border mt-[1px] ${
                                                                            m.active
                                                                                ? 'bg-[rgba(74,222,128,0.10)] border-[rgba(74,222,128,0.18)] text-[#4ade80]'
                                                                                : 'bg-white/[0.04] border-white/[0.08] text-[#e2e5ed]/25'
                                                                        }`}
                                                                    >
                                                                        <svg
                                                                            viewBox="0 0 24 24"
                                                                            className="w-[12px] h-[12px]"
                                                                            fill="none"
                                                                            stroke="currentColor"
                                                                            strokeWidth="2"
                                                                            strokeLinecap="round"
                                                                            strokeLinejoin="round"
                                                                        >
                                                                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                                                                            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                                                        </svg>
                                                                    </div>

                                                                    <div className="flex-1 min-w-0 pr-7">
                                                                        <div className="flex items-baseline justify-between gap-2 mb-[3px]">
                                                                            <span
                                                                                className={`text-[13px] font-medium leading-snug truncate ${
                                                                                    m.title === 'Processing...'
                                                                                        ? 'text-blue-400 italic animate-pulse'
                                                                                        : 'text-[#e2e5ed]/90'
                                                                                }`}
                                                                            >
                                                                                {m.title}
                                                                            </span>
                                                                            <span className="text-[10.5px] text-[#e2e5ed]/25 shrink-0 tabular-nums">
                                                                                {formatTime(m.date)}
                                                                            </span>
                                                                        </div>

                                                                        {m.summary && m.title !== 'Processing...' && (
                                                                            <p className="text-[11.5px] text-[#e2e5ed]/33 leading-[1.4] line-clamp-1 mb-[5px]">
                                                                                {m.summary}
                                                                            </p>
                                                                        )}

                                                                        {/* Status row */}
                                                                        {m.active ? (
                                                                            <span className="inline-flex text-[10px] font-semibold px-[6px] py-[2px] rounded-full bg-[rgba(74,222,128,0.10)] text-[#4ade80] border border-[rgba(74,222,128,0.18)] tracking-[0.04em]">
                                                                                LIVE
                                                                            </span>
                                                                        ) : m.title === 'Processing...' ? (
                                                                            <div className="flex items-center gap-1">
                                                                                <svg
                                                                                    className="animate-spin w-[10px] h-[10px] text-blue-400"
                                                                                    viewBox="0 0 24 24"
                                                                                    fill="none"
                                                                                    stroke="currentColor"
                                                                                    strokeWidth="2"
                                                                                >
                                                                                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                                                                </svg>
                                                                                <span className="text-[10px] text-blue-400 font-medium">
                                                                                    Finalizing
                                                                                </span>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-[10.5px] text-[#e2e5ed]/22 tabular-nums">
                                                                                {formatDurationPill(m.duration)}
                                                                            </span>
                                                                        )}
                                                                    </div>

                                                                    {/* Context menu trigger */}
                                                                    <div className="absolute right-2 top-[10px] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                                                        <button
                                                                            className="p-1.5 text-[#e2e5ed]/35 hover:text-[#e2e5ed]/75 rounded-[6px] hover:bg-white/[0.07] transition-all"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setActiveMenuId(
                                                                                    activeMenuId === m.id ? null : m.id
                                                                                );
                                                                            }}
                                                                        >
                                                                            <MoreHorizontal size={13} />
                                                                        </button>
                                                                    </div>

                                                                    {/* Dropdown menu */}
                                                                    <AnimatePresence>
                                                                        {activeMenuId === m.id && (
                                                                            <motion.div
                                                                                initial={{
                                                                                    opacity: 0,
                                                                                    scale: 0.95,
                                                                                    y: -4,
                                                                                }}
                                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                                exit={{
                                                                                    opacity: 0,
                                                                                    scale: 0.95,
                                                                                    y: -2,
                                                                                }}
                                                                                transition={{ duration: 0.1 }}
                                                                                className="absolute right-2 top-8 w-[96px] bg-[#18191f] border border-white/[0.10] rounded-[9px] shadow-2xl z-50 overflow-hidden"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                onMouseEnter={() =>
                                                                                    setMenuEntered(true)
                                                                                }
                                                                                onMouseLeave={() => {
                                                                                    if (menuEntered)
                                                                                        setActiveMenuId(null);
                                                                                }}
                                                                            >
                                                                                <div className="p-1 flex flex-col gap-[2px]">
                                                                                    <button
                                                                                        className="w-full flex items-center gap-2 px-3 py-[7px] text-[12px] text-[#e2e5ed]/65 hover:text-[#e2e5ed] hover:bg-white/[0.06] rounded-[6px] transition-colors text-left"
                                                                                        onClick={async () => {
                                                                                            setActiveMenuId(null);
                                                                                            analytics.trackPdfExported();
                                                                                            if (
                                                                                                window.electronAPI
                                                                                                    ?.getMeetingDetails
                                                                                            ) {
                                                                                                try {
                                                                                                    const full =
                                                                                                        await window.electronAPI.getMeetingDetails(
                                                                                                            m.id
                                                                                                        );
                                                                                                    generateMeetingPDF(
                                                                                                        full ?? m
                                                                                                    );
                                                                                                } catch {
                                                                                                    generateMeetingPDF(
                                                                                                        m
                                                                                                    );
                                                                                                }
                                                                                            } else {
                                                                                                generateMeetingPDF(m);
                                                                                            }
                                                                                        }}
                                                                                    >
                                                                                        <Download size={12} />
                                                                                        Export
                                                                                    </button>
                                                                                    <button
                                                                                        className="w-full flex items-center gap-2 px-3 py-[7px] text-[12px] text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-[6px] transition-colors text-left"
                                                                                        onClick={async () => {
                                                                                            if (
                                                                                                window.electronAPI
                                                                                                    ?.deleteMeeting
                                                                                            ) {
                                                                                                const ok =
                                                                                                    await window.electronAPI.deleteMeeting(
                                                                                                        m.id
                                                                                                    );
                                                                                                if (ok)
                                                                                                    setMeetings(
                                                                                                        (prev) =>
                                                                                                            prev.filter(
                                                                                                                (x) =>
                                                                                                                    x.id !==
                                                                                                                    m.id
                                                                                                            )
                                                                                                    );
                                                                                            }
                                                                                            setActiveMenuId(null);
                                                                                        }}
                                                                                    >
                                                                                        <Trash2 size={12} />
                                                                                        Delete
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
                                            </div>
                                        )}
                                    </div>
                                    {/* end max-w-[760px] inner */}
                                </main>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
            {/* end sidebar+content flex row */}

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
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="absolute inset-0 z-50 flex items-center justify-center bg-black/[0.72] backdrop-blur-sm"
                        onClick={() => setShowLogoutConfirm(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.93, y: 12 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 8 }}
                            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-[320px] rounded-2xl bg-[linear-gradient(150deg,#1a1917_0%,#141413_100%)] border border-white/[0.09] shadow-[0_32px_80px_rgba(0,0,0,0.9)] p-6 flex flex-col gap-4"
                        >
                            {/* Icon */}
                            <div className="w-10 h-10 rounded-xl bg-accent-primary/[0.12] border border-accent-primary/[0.22] flex items-center justify-center">
                                <LogOut size={18} color="#d97757" strokeWidth={1.75} />
                            </div>

                            {/* Text */}
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[15px] font-[640] text-text-primary tracking-[-0.02em]">
                                    Quit LiveLens?
                                </span>
                                <span className="text-[12.5px] text-text-secondary leading-[1.55]">
                                    Any active session will be stopped. Your meeting history and settings will be saved.
                                </span>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-2 mt-1">
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    className="flex-1 h-[38px] rounded-[10px] bg-white/[0.06] border border-white/[0.08] text-text-primary/65 text-[13px] font-[540] cursor-pointer transition-colors hover:bg-white/[0.10]"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => window.electronAPI.quitApp()}
                                    className="flex-1 h-[38px] rounded-[10px] bg-gradient-to-br from-accent-primary to-accent-deep border border-accent-primary/40 text-white text-[13px] font-[640] cursor-pointer transition-opacity hover:opacity-85"
                                >
                                    Quit
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Launcher;
