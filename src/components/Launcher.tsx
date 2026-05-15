import React, { useState, useEffect } from 'react';
import { ArrowRight, MoreHorizontal, Settings, Trash2, Download, DownloadCloud, CheckCircle, AlertCircle, Home, LogOut, LayoutGrid, UserSearch } from 'lucide-react';
import { generateMeetingPDF } from '../utils/pdfGenerator';
import icon from "./icon.png";
import MeetingDetails from './MeetingDetails';
import TopSearchPill from './TopSearchPill';
import GlobalChatOverlay from './GlobalChatOverlay';
import { motion, AnimatePresence } from 'framer-motion';
import { analytics } from '../lib/analytics/analytics.service';
import { useShortcuts } from '../hooks/useShortcuts';
import { isMac } from '../utils/platformUtils';
import WindowControls from './WindowControls';
import { ProfileIntelligenceSettings } from './ProfileIntelligenceSettings';
import SettingsOverlay from './SettingsOverlay';

const ANALYSIS_MODES = [
    { id: 'general',       emoji: '💬', label: 'General',       description: 'Describe and solve whatever is visible on screen.',          color: 'rgba(106,155,204,0.13)', border: 'rgba(106,155,204,0.18)' },
    { id: 'dsa',           emoji: '🧩', label: 'DSA',           description: 'Naive → optimal approach, code, and complexity analysis.',    color: 'rgba(167,139,250,0.13)', border: 'rgba(167,139,250,0.18)' },
    { id: 'system-design', emoji: '🏗️', label: 'System Design', description: 'Architecture, capacity planning, and trade-off discussion.',  color: 'rgba(45,212,191,0.12)',  border: 'rgba(45,212,191,0.17)'  },
    { id: 'debug',         emoji: '🐛', label: 'Debug',         description: 'Find the bug, explain the root cause, and provide a fix.',    color: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.17)' },
    { id: 'behavioral',    emoji: '🎯', label: 'Behavioral',    description: 'STAR-method first-person answer for interview questions.',     color: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.17)'  },
    { id: 'sales',         emoji: '💼', label: 'Sales',         description: 'Objection handling, discovery questions, and deal closing.',   color: 'rgba(74,222,128,0.10)',  border: 'rgba(74,222,128,0.15)'  },
    { id: 'data-science',  emoji: '📊', label: 'Data Science',  description: 'Analysis approach, ML methodology, Python-first answers.',    color: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.17)'  },
    { id: 'devops',        emoji: '⚙️', label: 'DevOps',        description: 'Infrastructure, CI/CD pipelines, and container strategy.',    color: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.14)' },
] as const;

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
    active?: boolean;
    time?: string;
}

interface LauncherProps {
    onStartMeeting: () => void;
    onPageChange?: (isMain: boolean) => void;
    ollamaPullStatus?: 'idle' | 'downloading' | 'complete' | 'failed';
    ollamaPullPercent?: number;
    ollamaPullMessage?: string;
}

const getGroupLabel = (dateStr: string) => {
    if (dateStr === "Today") return "Today";

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

const formatTime = (dateStr: string) => {
    if (dateStr === "Today") return "Just now";
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
        <div className="pointer-events-none absolute left-[calc(100%+10px)] top-1/2 -translate-y-1/2 opacity-0 group-hover/navbtn:opacity-100 transition-opacity duration-100 z-[500]">
            <div className="bg-[rgba(13,15,20,0.95)] border border-white/[0.10] text-[#e2e5ed]/85 text-[11px] font-medium px-[9px] py-[4px] rounded-[6px] whitespace-nowrap">
                {label}
            </div>
        </div>
    </div>
);

const Launcher: React.FC<LauncherProps> = ({
    onStartMeeting,
    onPageChange,
    ollamaPullStatus = 'idle',
    ollamaPullPercent = 0,
    ollamaPullMessage = '',
}) => {
    const [activeView, setActiveView] = useState<'home' | 'modes' | 'profile' | 'settings'>('home');
    const [settingsTab, setSettingsTab] = useState<string>('general');
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [isMeetingActive, setIsMeetingActive] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
    const [forwardMeeting, setForwardMeeting] = useState<Meeting | null>(null);
    const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);
    const [submittedGlobalQuery, setSubmittedGlobalQuery] = useState('');
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [menuEntered, setMenuEntered] = useState(false);
    const [currentMode, setCurrentMode] = useState<string>('general');

    const { isShortcutPressed } = useShortcuts();

    useEffect(() => {
        onPageChange?.(activeView === 'home' && !selectedMeeting && !isGlobalChatOpen);
    }, [activeView, selectedMeeting, isGlobalChatOpen, onPageChange]);

    useEffect(() => {
        setMenuEntered(false);
    }, [activeMenuId]);

    useEffect(() => {
        const handleClickOutside = () => setActiveMenuId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    // Listen for open-settings requests from App.tsx toasters and IPC events
    useEffect(() => {
        const handleOpenSettings = (e: Event) => {
            const tab = (e as CustomEvent<{ tab: string }>).detail?.tab || 'general';
            setSettingsTab(tab);
            setActiveView('settings');
        };
        window.addEventListener('natively:open-settings', handleOpenSettings);
        return () => window.removeEventListener('natively:open-settings', handleOpenSettings);
    }, []);

    const fetchMeetings = () => {
        if (window.electronAPI && window.electronAPI.getRecentMeetings) {
            window.electronAPI.getRecentMeetings().then(setMeetings).catch(err => console.error("Failed to fetch meetings:", err));
        }
    };

    useEffect(() => {
        let mounted = true;

        if (window.electronAPI && window.electronAPI.seedDemo) {
            window.electronAPI.seedDemo().catch(err => console.error("Failed to seed demo:", err));
        }

        fetchMeetings();

        window.electronAPI?.getAnalysisMode?.()
            .then((m: string) => { if (m && mounted) setCurrentMode(m); })
            .catch(() => {});

        if (window.electronAPI?.getMeetingActive) {
            window.electronAPI.getMeetingActive()
                .then((active) => { if (mounted) setIsMeetingActive(active); })
                .catch(() => {});
        }

        let removeMeetingStateListener: (() => void) | undefined;
        if (window.electronAPI?.onMeetingStateChanged) {
            removeMeetingStateListener = window.electronAPI.onMeetingStateChanged(({ isActive }) => {
                setIsMeetingActive(isActive);
            });
        }

        const removeMeetingsListener = window.electronAPI.onMeetingsUpdated(() => {
            fetchMeetings();
        });

        return () => {
            mounted = false;
            if (removeMeetingsListener) removeMeetingsListener();
            if (removeMeetingStateListener) removeMeetingStateListener();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isShortcutPressed]);

    if (!window.electronAPI) {
        return <div className="text-white p-10">Error: Electron API not initialized. Check preload script.</div>;
    }

    const groupedMeetings = meetings.reduce((acc, meeting) => {
        const label = getGroupLabel(meeting.date);
        if (!acc[label]) acc[label] = [];
        acc[label].push(meeting);
        return acc;
    }, {} as Record<string, Meeting[]>);

    const sortedGroups = Object.keys(groupedMeetings).sort((a, b) => {
        if (a === 'Today') return -1;
        if (b === 'Today') return 1;
        if (a === 'Yesterday') return -1;
        if (b === 'Yesterday') return 1;
        return new Date(b).getTime() - new Date(a).getTime();
    });

    const handleOpenMeeting = async (meeting: Meeting) => {
        setForwardMeeting(null);
        analytics.trackCommandExecuted('open_meeting_details');

        if (window.electronAPI && window.electronAPI.getMeetingDetails) {
            try {
                const fullMeeting = await window.electronAPI.getMeetingDetails(meeting.id);
                if (fullMeeting) {
                    setSelectedMeeting(fullMeeting);
                    return;
                }
            } catch (err) {
                console.error("[Launcher] Failed to fetch meeting details:", err);
            }
        }
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

    const formatDurationPill = (durationStr: string) => {
        if (!durationStr) return "00:00";

        if (durationStr.includes(':')) {
            const parts = durationStr.split(':');
            const mins = parts[0];
            const secs = parts[1] || "00";
            const formattedMins = mins.length >= 3 ? mins : mins.padStart(2, '0');
            return `${formattedMins}:${secs}`;
        }

        const minutes = parseInt(durationStr.replace('min', '').trim()) || 0;
        const mm = minutes.toString().padStart(2, '0');
        return `${mm}:00`;
    };

    return (
        <div className="h-full w-full flex flex-col bg-[#080a0e] text-[#e2e5ed] font-sans overflow-hidden selection:bg-[rgba(217,119,87,0.3)]">
            {/* Header */}
            <header className="relative w-full h-[48px] shrink-0 flex items-center justify-between pl-0 drag-region select-none bg-[#0d0f14] border-b border-white/[0.07] z-[200]">
                <div className="flex items-center no-drag">
                    {isMac && <div className="w-[72px]" />}
                </div>

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
                        const meeting = meetings.find(m => m.id === meetingId);
                        if (meeting) {
                            handleOpenMeeting(meeting);
                            analytics.trackCommandExecuted('open_meeting_from_search');
                        }
                    }}
                />

                <div className={`flex items-center no-drag shrink-0 gap-1 ${isMac ? 'mr-2' : ''}`}>
                    {!isMac && <WindowControls />}
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden min-h-0">
                {/* Icon Sidebar */}
                <div className="flex flex-col items-center py-3 gap-1 border-r shrink-0 w-[52px] bg-[#0d0f14] border-white/[0.07]">
                    {/* Logo */}
                    <div className="w-[30px] h-[30px] rounded-[9px] mb-3 overflow-hidden shrink-0 flex items-center justify-center bg-gradient-to-br from-[#d97757] to-[#b05530]">
                        <img src={icon} alt="Natively" className="w-[18px] h-[18px] object-contain brightness-0 invert opacity-90" draggable="false" />
                    </div>

                    <NavBtn label="Home" active={activeView === 'home' && !selectedMeeting} onClick={() => { setActiveView('home'); setSelectedMeeting(null); }}>
                        <Home size={16} />
                    </NavBtn>

                    <NavBtn label="Profile" active={activeView === 'profile'} onClick={() => setActiveView('profile')}>
                        <UserSearch size={16} />
                    </NavBtn>

                    <NavBtn label="Modes" active={activeView === 'modes'} onClick={() => setActiveView('modes')}>
                        <LayoutGrid size={16} />
                    </NavBtn>

                    <div className="flex-1" />

                    <NavBtn label="Settings" active={activeView === 'settings'} onClick={() => setActiveView('settings')}>
                        <Settings size={16} />
                    </NavBtn>

                    <NavBtn label="Quit" active={false} onClick={() => setShowLogoutConfirm(true)}>
                        <LogOut size={16} />
                    </NavBtn>
                </div>

                <div className="relative flex-1 flex flex-col overflow-hidden min-h-0">

                    {/* Settings — inline (matches LiveLens pattern) */}
                    {activeView === 'settings' && (
                        <SettingsOverlay
                            onClose={() => setActiveView('home')}
                            initialTab={settingsTab}
                        />
                    )}

                    {/* Modes — inline grid */}
                    {activeView === 'modes' && (
                        <motion.div
                            key="modes"
                            className="flex-1 flex flex-col overflow-hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                                <div style={{ width: '100%', maxWidth: 760, margin: '0 auto', padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
                                    {/* Section header */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(226,229,237,0.25)' }}>Analysis Mode</span>
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', borderRadius: 999, background: 'rgba(217,119,87,0.10)', border: '1px solid rgba(217,119,87,0.22)' }}>
                                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#d97757', boxShadow: '0 0 5px rgba(217,119,87,0.7)', flexShrink: 0, display: 'inline-block' }} />
                                            <span style={{ fontSize: 10.5, fontWeight: 600, color: '#d97757', whiteSpace: 'nowrap' }}>
                                                {ANALYSIS_MODES.find(m => m.id === currentMode)?.label ?? 'General'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* 2-col card grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        {ANALYSIS_MODES.map((mode) => {
                                            const isActive = currentMode === mode.id;
                                            return (
                                                <button
                                                    key={mode.id}
                                                    onClick={async () => {
                                                        setCurrentMode(mode.id);
                                                        await window.electronAPI?.setAnalysisMode?.(mode.id).catch(() => {});
                                                    }}
                                                    className="group/modecard"
                                                    style={{
                                                        position: 'relative',
                                                        width: '100%',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        gap: 10,
                                                        padding: '14px 14px 13px',
                                                        borderRadius: 12,
                                                        cursor: 'pointer',
                                                        textAlign: 'left',
                                                        transition: 'background 0.12s, border-color 0.12s, transform 0.1s',
                                                        background: isActive ? 'rgba(217,119,87,0.08)' : 'rgba(255,255,255,0.03)',
                                                        border: isActive ? '1px solid rgba(217,119,87,0.22)' : '1px solid rgba(255,255,255,0.07)',
                                                    }}
                                                    onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'; } }}
                                                    onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; } }}
                                                    onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.985)'; }}
                                                    onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = ''; }}
                                                >
                                                    {isActive && (
                                                        <span style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 2.5, borderRadius: '0 2px 2px 0', background: '#d97757' }} />
                                                    )}
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
                                                        <div
                                                            className="group-hover/modecard:scale-[1.06]"
                                                            style={{
                                                                width: 36, height: 36, borderRadius: 9,
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: 17, flexShrink: 0,
                                                                transition: 'transform 0.12s',
                                                                background: mode.color, border: `1px solid ${mode.border}`,
                                                            }}
                                                        >
                                                            {mode.emoji}
                                                        </div>
                                                        <div style={{
                                                            width: 18, height: 18, borderRadius: '50%',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            flexShrink: 0, marginTop: 1, marginLeft: 'auto',
                                                            transition: 'all 0.15s',
                                                            background: isActive ? '#d97757' : 'transparent',
                                                            border: isActive ? '1.5px solid #d97757' : '1.5px solid rgba(255,255,255,0.12)',
                                                            boxShadow: isActive ? '0 0 10px rgba(217,119,87,0.4)' : 'none',
                                                        }}>
                                                            {isActive && (
                                                                <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                                                                    <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                                                                </svg>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div style={{
                                                            fontSize: 13, fontWeight: 590, letterSpacing: '-0.01em',
                                                            marginBottom: 3, transition: 'color 0.12s',
                                                            color: isActive ? 'rgba(240,241,244,1)' : 'rgba(226,229,237,0.65)',
                                                        }}>
                                                            {mode.label}
                                                        </div>
                                                        <div style={{
                                                            fontSize: 11, lineHeight: 1.45,
                                                            transition: 'color 0.12s',
                                                            color: isActive ? 'rgba(226,229,237,0.40)' : 'rgba(226,229,237,0.25)',
                                                        }}>
                                                            {mode.description}
                                                        </div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Footer hint */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 4 }}>
                                        <svg style={{ width: 13, height: 13, flexShrink: 0, color: 'rgba(226,229,237,0.20)' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                                            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                                        </svg>
                                        <p style={{ fontSize: 10.5, color: 'rgba(226,229,237,0.22)', lineHeight: 1.4 }}>
                                            Applies instantly. <span style={{ color: 'rgba(226,229,237,0.40)', fontWeight: 580 }}>What to answer?</span> and <span style={{ color: 'rgba(226,229,237,0.40)', fontWeight: 580 }}>Solve</span> will use this context.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Profile — inline view (premium gate bypassed for testing) */}
                    {activeView === 'profile' && (
                        <motion.div
                            key="profile"
                            className="flex-1 overflow-hidden"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                        >
                            <ProfileIntelligenceSettings
                                onClose={() => setActiveView('home')}
                                bypassPremium={true}
                            />
                        </motion.div>
                    )}

                    <AnimatePresence mode="wait">
                        {activeView === 'home' && selectedMeeting ? (
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
                                    onOpenSettings={() => setActiveView('settings')}
                                />
                            </motion.div>
                        ) : activeView === 'home' ? (
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
                                                    <span className="flex-1 text-[13px] font-medium">Session in progress</span>
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

                                        {/* Primary CTA */}
                                        <button
                                            onClick={() => {
                                                onStartMeeting();
                                                analytics.trackCommandExecuted('start_natively_cta');
                                            }}
                                            disabled={isMeetingActive}
                                            className="w-full flex items-center justify-between px-3 py-[14px] rounded-[12px] text-left transition-all duration-100 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
                                            style={{ background: 'rgba(217,119,87,0.08)', border: '1px solid rgba(217,119,87,0.18)' }}
                                            onMouseEnter={e => { if (!isMeetingActive) e.currentTarget.style.background = 'rgba(217,119,87,0.13)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(217,119,87,0.08)'; }}
                                        >
                                            <div className="flex items-center gap-[11px]">
                                                <div className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center shrink-0 bg-gradient-to-br from-[#d97757] to-[#b05530]">
                                                    <svg viewBox="0 0 24 24" className="w-[12px] h-[12px] fill-white shrink-0"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                                                </div>
                                                <div className="flex flex-col gap-[2px]">
                                                    <span className="text-[14px] font-[600] text-[#e2e5ed]/92 tracking-[-0.01em]">Start Natively</span>
                                                    <span className="text-[11.5px] text-[#e2e5ed]/35">Begin recording &amp; analysis</span>
                                                </div>
                                            </div>
                                            <div className="w-[24px] h-[24px] rounded-[7px] flex items-center justify-center shrink-0" style={{ background: 'rgba(217,119,87,0.15)' }}>
                                                <ArrowRight size={12} className="text-[#d97757]" />
                                            </div>
                                        </button>

                                        {/* Stats row */}
                                        {meetings.length > 0 && (() => {
                                            const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
                                            const thisWeek = meetings.filter(m => new Date(m.date).getTime() > weekAgo).length;
                                            const totalMins = meetings.reduce((acc, m) => {
                                                if (!m.duration) return acc;
                                                const parts = m.duration.split(':');
                                                return acc + (parseInt(parts[0]) || 0);
                                            }, 0);
                                            const avgMin = meetings.length ? Math.round(totalMins / meetings.length) : 0;
                                            return (
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[
                                                        { label: 'Sessions', value: String(meetings.length), sub: 'All time' },
                                                        { label: 'This week', value: String(thisWeek), sub: 'Last 7 days' },
                                                        { label: 'Avg length', value: avgMin ? `${avgMin}m` : '—', sub: 'Per session' },
                                                    ].map(s => (
                                                        <div key={s.label} className="flex flex-col gap-[4px] px-[13px] py-[11px] rounded-[10px]"
                                                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                                            <span className="text-[10px] font-[700] tracking-[0.06em] uppercase text-[#e2e5ed]/25">{s.label}</span>
                                                            <span className="text-[20px] font-[650] text-[#e2e5ed]/88 tracking-[-0.03em] leading-none">{s.value}</span>
                                                            <span className="text-[10.5px] text-[#e2e5ed]/28">{s.sub}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}

                                        {/* Sessions list */}
                                        {meetings.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                                                <div className="w-12 h-12 rounded-[14px] bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                                                    <svg viewBox="0 0 24 24" className="w-[20px] h-[20px] text-[#e2e5ed]/20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                                                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                                        <line x1="12" y1="19" x2="12" y2="23"/>
                                                        <line x1="8" y1="23" x2="16" y2="23"/>
                                                    </svg>
                                                </div>
                                                <div>
                                                    <p className="text-[13px] font-medium text-[#e2e5ed]/45 mb-1.5">No sessions yet</p>
                                                    <p className="text-[11.5px] text-[#e2e5ed]/25 leading-relaxed max-w-[190px]">
                                                        Press Start Natively to record and analyse your first conversation.
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-0">
                                                <div className="flex items-center justify-between mb-3">
                                                    <span className="text-[10.5px] font-[700] tracking-[0.08em] uppercase text-[#e2e5ed]/25">Sessions</span>
                                                    <span className="text-[10.5px] text-[#e2e5ed]/20 tabular-nums">{meetings.length}</span>
                                                </div>

                                                {sortedGroups.map((label) => (
                                                    <div key={label} className="mb-4">
                                                        <div className="text-[10px] font-[600] tracking-[0.07em] uppercase text-[#e2e5ed]/20 mb-1.5 px-[2px]">{label}</div>
                                                        <div className="flex flex-col gap-[2px]">
                                                            {groupedMeetings[label].map((m) => (
                                                                <div
                                                                    key={m.id}
                                                                    className="group relative flex items-start gap-3 px-[10px] py-[9px] rounded-[10px] cursor-pointer hover:bg-white/[0.04] active:bg-white/[0.06] transition-colors"
                                                                    onClick={() => handleOpenMeeting(m)}
                                                                >
                                                                    <div className={`w-[30px] h-[30px] rounded-[8px] flex items-center justify-center shrink-0 border mt-[1px] ${
                                                                        m.active
                                                                            ? 'bg-[rgba(74,222,128,0.10)] border-[rgba(74,222,128,0.18)] text-[#4ade80]'
                                                                            : 'bg-white/[0.04] border-white/[0.08] text-[#e2e5ed]/25'
                                                                    }`}>
                                                                        <svg viewBox="0 0 24 24" className="w-[12px] h-[12px]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                                                                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                                                        </svg>
                                                                    </div>

                                                                    <div className="flex-1 min-w-0 pr-7">
                                                                        <div className="flex items-baseline justify-between gap-2 mb-[3px]">
                                                                            <span className={`text-[13px] font-medium leading-snug truncate ${
                                                                                m.title === 'Processing...' ? 'text-blue-400 italic animate-pulse' : 'text-[#e2e5ed]/90'
                                                                            }`}>
                                                                                {m.title}
                                                                            </span>
                                                                            <span className="text-[10.5px] text-[#e2e5ed]/25 shrink-0 tabular-nums">{formatTime(m.date)}</span>
                                                                        </div>

                                                                        {m.summary && m.title !== 'Processing...' && (
                                                                            <p className="text-[11.5px] text-[#e2e5ed]/33 leading-[1.4] line-clamp-1 mb-[5px]">
                                                                                {m.summary}
                                                                            </p>
                                                                        )}

                                                                        {m.active ? (
                                                                            <span className="inline-flex text-[10px] font-semibold px-[6px] py-[2px] rounded-full bg-[rgba(74,222,128,0.10)] text-[#4ade80] border border-[rgba(74,222,128,0.18)] tracking-[0.04em]">LIVE</span>
                                                                        ) : m.title === 'Processing...' ? (
                                                                            <div className="flex items-center gap-1">
                                                                                <svg className="animate-spin w-[10px] h-[10px] text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                                                                                <span className="text-[10px] text-blue-400 font-medium">Finalizing</span>
                                                                            </div>
                                                                        ) : (
                                                                            <span className="text-[10.5px] text-[#e2e5ed]/22 tabular-nums">{formatDurationPill(m.duration)}</span>
                                                                        )}
                                                                    </div>

                                                                    {/* Context menu trigger */}
                                                                    <div className="absolute right-2 top-[10px] opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                                                                        <button
                                                                            className="p-1.5 text-[#e2e5ed]/35 hover:text-[#e2e5ed]/75 rounded-[6px] hover:bg-white/[0.07] transition-all"
                                                                            onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === m.id ? null : m.id); }}
                                                                        >
                                                                            <MoreHorizontal size={13} />
                                                                        </button>
                                                                    </div>

                                                                    {/* Dropdown menu */}
                                                                    <AnimatePresence>
                                                                        {activeMenuId === m.id && (
                                                                            <motion.div
                                                                                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                                exit={{ opacity: 0, scale: 0.95, y: -2 }}
                                                                                transition={{ duration: 0.1 }}
                                                                                className="absolute right-2 top-8 w-[96px] bg-[#18191f] border border-white/[0.10] rounded-[9px] shadow-2xl z-50 overflow-hidden"
                                                                                onClick={(e) => e.stopPropagation()}
                                                                                onMouseEnter={() => setMenuEntered(true)}
                                                                                onMouseLeave={() => { if (menuEntered) setActiveMenuId(null); }}
                                                                            >
                                                                                <div className="p-1 flex flex-col gap-[2px]">
                                                                                    <button
                                                                                        className="w-full flex items-center gap-2 px-3 py-[7px] text-[12px] text-[#e2e5ed]/65 hover:text-[#e2e5ed] hover:bg-white/[0.06] rounded-[6px] transition-colors text-left"
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
                                                                                        className="w-full flex items-center gap-2 px-3 py-[7px] text-[12px] text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-[6px] transition-colors text-left"
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
                                            </div>
                                        )}
                                    </div>
                                </main>
                            </motion.div>
                        ) : null}
                    </AnimatePresence>
                </div>
            </div>

            {/* Global Chat Overlay */}
            <GlobalChatOverlay
                isOpen={isGlobalChatOpen}
                onClose={() => {
                    setIsGlobalChatOpen(false);
                    setSubmittedGlobalQuery('');
                }}
                initialQuery={submittedGlobalQuery}
            />

            {/* Quit confirmation dialog */}
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
                            <div style={{
                                width: 40, height: 40, borderRadius: 12,
                                background: 'rgba(217,119,87,0.12)', border: '1px solid rgba(217,119,87,0.22)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <LogOut size={18} color="#d97757" strokeWidth={1.75} />
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                <span style={{ fontSize: 15, fontWeight: 640, color: '#faf9f5', letterSpacing: '-0.02em' }}>
                                    Quit Natively?
                                </span>
                                <span style={{ fontSize: 12.5, color: 'rgba(250,249,245,0.45)', lineHeight: 1.55 }}>
                                    Any active session will be stopped. Your meeting history and settings will be saved.
                                </span>
                            </div>

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
        </div>
    );
};

export default Launcher;
