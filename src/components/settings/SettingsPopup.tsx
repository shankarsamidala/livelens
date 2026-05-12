import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Camera, Zap, Heart, User, Link } from 'lucide-react';
import { useShortcuts } from '../../hooks/useShortcuts';

// ── Toggle ────────────────────────────────────────────────────────────────────
interface ToggleProps {
    on: boolean;
    onColor: string;
    onShadow?: string;
    onClick: () => void;
    disabled?: boolean;
}
const Toggle = ({ on, onColor, onShadow, onClick, disabled }: ToggleProps) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center flex-shrink-0 w-[30px] h-[18px] p-[1.5px] rounded-full border-0 transition-colors duration-[250ms] ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        style={{
            background: on ? onColor : 'rgba(255,255,255,0.14)',
            boxShadow: on && onShadow ? onShadow : 'none',
        }}
    >
        <div
            className="w-[15px] h-[15px] rounded-full flex-shrink-0 bg-[#e2e5ed] transition-transform duration-[250ms] shadow-[0_1px_3px_rgba(0,0,0,0.4)]"
            style={{
                transform: on ? 'translateX(12px)' : 'translateX(0)',
                transitionTimingFunction: 'cubic-bezier(0.34,1.56,0.64,1)',
            }}
        />
    </button>
);

// ── Row ───────────────────────────────────────────────────────────────────────
interface RowProps {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    hoverBg?: string;
    title?: string;
}
const Row = ({ children, onClick, disabled, hoverBg, title }: RowProps) => {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onClick={disabled ? undefined : onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            title={title}
            className={`flex items-center justify-between rounded-[9px] gap-2 py-[7px] px-[10px] transition-colors duration-[120ms] ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-default'}`}
            style={{ background: hovered && !disabled ? (hoverBg ?? 'rgba(255,255,255,0.05)') : 'transparent' }}
        >
            {children}
        </div>
    );
};

// ── Section header ────────────────────────────────────────────────────────────
const SectionHeader = ({ label }: { label: string }) => (
    <div className="px-[10px] pt-[6px] pb-[3px] text-[9.5px] font-bold tracking-[0.09em] uppercase text-slate-200/25">
        {label}
    </div>
);

// ── Divider ───────────────────────────────────────────────────────────────────
const Divider = () => (
    <div className="h-px bg-white/[0.06] mx-[6px] my-[3px]" />
);

// ── Shortcut keys ─────────────────────────────────────────────────────────────
const ShortcutKeys = ({ keys }: { keys: string[] }) => (
    <div className="flex gap-[3px] flex-shrink-0 opacity-55">
        {keys.map((k, i) => (
            <span
                key={i}
                className="px-[5px] py-[1px] rounded-[5px] border border-white/[0.09] bg-white/[0.06] text-[10px] font-medium text-slate-200/45 min-w-[20px] text-center"
            >
                {k}
            </span>
        ))}
    </div>
);

// ── Label ─────────────────────────────────────────────────────────────────────
const Label = ({ active, children }: { active: boolean; children: React.ReactNode }) => (
    <span
        className={`text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis ${
            active ? 'text-[#e2e5ed]' : 'text-slate-200/60'
        }`}
    >
        {children}
    </span>
);

// ── Ghost icon ────────────────────────────────────────────────────────────────
const GhostIcon = ({ active }: { active: boolean }) => (
    <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'}
        stroke={active ? 'none' : 'currentColor'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`flex-shrink-0 ${active ? 'text-[#e2e5ed]' : 'text-slate-200/35'}`}
    >
        <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
        <path
            d="M9 10h.01 M15 10h.01"
            stroke={active ? '#0d0f14' : 'rgba(226,229,237,0.6)'}
            strokeWidth="2.5"
            fill="none"
        />
    </svg>
);

// ─────────────────────────────────────────────────────────────────────────────

const SettingsPopup = () => {
    const { shortcuts } = useShortcuts();

    const [isUndetectable, setIsUndetectable] = useState(false);
    const [useGroqFastText, setUseGroqFastText] = useState(() =>
        localStorage.getItem('natively_groq_fast_text') === 'true'
    );
    const [profileMode, setProfileMode] = useState(false);
    const [hasProfile, setHasProfile] = useState(false);
    const [isPremium, setIsPremium] = useState(false);
    const [hasStoredKey, setHasStoredKey] = useState<Record<string, boolean>>({});
    const [actionButtonMode, setActionButtonModeState] = useState<'recap' | 'brainstorm'>('recap');
    const [showTranscript, setShowTranscript] = useState(() =>
        localStorage.getItem('natively_interviewer_transcript') !== 'false'
    );

    const isFirstRender = useRef(true);
    const contentRef = useRef<HTMLDivElement>(null);

    const loadCredentials = async () => {
        try {
            const creds = await window.electronAPI?.getStoredCredentials?.();
            if (creds) {
                setHasStoredKey({
                    gemini:   !!creds.hasGeminiKey,
                    groq:     !!creds.hasGroqKey,
                    openai:   !!creds.hasOpenaiKey,
                    claude:   !!creds.hasClaudeKey,
                    natively: !!creds.hasLiveLensKey,
                });
            }
        } catch (e) { console.error("Failed to load settings:", e); }
    };

    useEffect(() => {
        loadCredentials();
        const handleFocus = () => loadCredentials();
        window.addEventListener('focus', handleFocus);

        const loadProfile = async () => {
            try {
                const status = await window.electronAPI?.profileGetStatus?.();
                if (status) { setHasProfile(status.hasProfile); setProfileMode(status.profileMode); }
                const premium = await window.electronAPI?.licenseCheckPremium?.();
                setIsPremium(!!premium);
            } catch (e) { console.warn('[SettingsPopup] Failed to load profile/premium status:', e); }
        };
        loadProfile();
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    useEffect(() => {
        if (window.electronAPI?.getUndetectable) {
            window.electronAPI.getUndetectable().then((state: boolean) => setIsUndetectable(state));
        }
    }, []);

    useEffect(() => {
        if (!window.electronAPI?.onUndetectableChanged) return;
        const unsub = window.electronAPI.onUndetectableChanged((s: boolean) => {
            setIsUndetectable(s);
            localStorage.setItem('natively_undetectable', String(s));
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!window.electronAPI?.onGroqFastTextChanged) return;
        const unsub = window.electronAPI.onGroqFastTextChanged((enabled: boolean) => {
            setUseGroqFastText(enabled);
            localStorage.setItem('natively_groq_fast_text', String(enabled));
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        localStorage.setItem('natively_groq_fast_text', String(useGroqFastText));
        try { // @ts-ignore
            window.electronAPI?.invoke('set-groq-fast-text-mode', useGroqFastText);
        } catch (e) { console.error(e); }
    }, [useGroqFastText]);

    useEffect(() => {
        const handle = () => setShowTranscript(localStorage.getItem('natively_interviewer_transcript') !== 'false');
        window.addEventListener('storage', handle);
        return () => window.removeEventListener('storage', handle);
    }, []);

    useEffect(() => {
        // @ts-ignore
        window.electronAPI?.getActionButtonMode?.()?.then((mode: 'recap' | 'brainstorm') => {
            setActionButtonModeState(mode ?? 'recap');
        }).catch(() => {});
        if (!window.electronAPI?.onActionButtonModeChanged) return;
        const unsub = window.electronAPI.onActionButtonModeChanged((mode: 'recap' | 'brainstorm') => {
            setActionButtonModeState(mode);
        });
        return () => unsub();
    }, []);

    useLayoutEffect(() => {
        if (!contentRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const rect = entry.target.getBoundingClientRect();
                try {
                    window.electronAPI?.updateContentDimensions({
                        width: Math.ceil(rect.width),
                        height: Math.ceil(rect.height),
                    });
                } catch (e) { console.warn("Failed to update dimensions", e); }
            }
        });
        observer.observe(contentRef.current);
        return () => observer.disconnect();
    }, []);

    const fastTextEnabled = hasStoredKey.groq || hasStoredKey.natively;
    const profileActive   = profileMode && isPremium;

    return (
        <div className="bg-transparent">
            <div
                ref={contentRef}
                className="w-[220px] max-h-[320px] rounded-[14px] overflow-hidden bg-[#0d0f14] border border-white/[0.09] p-[6px] flex flex-col gap-[1px]"
            >
                <SectionHeader label="Options" />

                {/* Undetectable */}
                <Row>
                    <div className="flex items-center gap-[9px] flex-1 min-w-0">
                        <GhostIcon active={isUndetectable} />
                        <Label active={isUndetectable}>
                            {isUndetectable ? 'Undetectable' : 'Detectable'}
                        </Label>
                    </div>
                    <Toggle
                        on={isUndetectable}
                        onColor="#ffffff"
                        onShadow="0 2px 8px rgba(255,255,255,0.20)"
                        onClick={() => {
                            const next = !isUndetectable;
                            setIsUndetectable(next);
                            localStorage.setItem('natively_undetectable', String(next));
                            window.electronAPI?.setUndetectable(next);
                        }}
                    />
                </Row>

                {/* Fast Response */}
                <Row
                    disabled={!fastTextEnabled}
                    title={!fastTextEnabled ? 'Requires Groq or LiveLens API key' : ''}
                >
                    <div className="flex items-center gap-[9px] flex-1 min-w-0">
                        <Zap
                            size={14}
                            className={`flex-shrink-0 ${useGroqFastText ? 'text-orange-500' : 'text-[#e2e5ed]/35'}`}
                        />
                        <Label active={useGroqFastText}>Fast Response</Label>
                    </div>
                    <Toggle
                        on={useGroqFastText}
                        onColor="#f97316"
                        onShadow="0 2px 10px rgba(249,115,22,0.30)"
                        disabled={!fastTextEnabled}
                        onClick={() => { if (fastTextEnabled) setUseGroqFastText(v => !v); }}
                    />
                </Row>

                {/* Transcript */}
                <Row>
                    <div className="flex items-center gap-[9px] flex-1 min-w-0">
                        <svg
                            width="14" height="14" viewBox="0 0 24 24"
                            fill={showTranscript ? '#34d399' : 'none'}
                            stroke={showTranscript ? 'none' : 'rgba(226,229,237,0.35)'}
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            className="flex-shrink-0"
                        >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <Label active={showTranscript}>Transcript</Label>
                    </div>
                    <Toggle
                        on={showTranscript}
                        onColor="#10b981"
                        onShadow="0 2px 10px rgba(16,185,129,0.30)"
                        onClick={() => {
                            const next = !showTranscript;
                            setShowTranscript(next);
                            localStorage.setItem('natively_interviewer_transcript', String(next));
                            window.dispatchEvent(new Event('storage'));
                        }}
                    />
                </Row>

                {/* Interview Mode */}
                <Row>
                    <div className="flex items-center gap-[9px] flex-1 min-w-0">
                        <svg
                            width="14" height="14" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round"
                            className={`flex-shrink-0 ${actionButtonMode === 'brainstorm' ? 'text-violet-400' : 'text-[#e2e5ed]/35'}`}
                        >
                            <line x1="6" y1="3" x2="6" y2="15" />
                            <circle cx="18" cy="6" r="3" />
                            <circle cx="6" cy="18" r="3" />
                            <path d="M18 9a9 9 0 0 1-9 9" />
                        </svg>
                        <Label active={actionButtonMode === 'brainstorm'}>Interview Mode</Label>
                    </div>
                    <Toggle
                        on={actionButtonMode === 'brainstorm'}
                        onColor="#8b5cf6"
                        onShadow="0 2px 10px rgba(139,92,246,0.30)"
                        onClick={async () => {
                            const next: 'recap' | 'brainstorm' = actionButtonMode === 'brainstorm' ? 'recap' : 'brainstorm';
                            setActionButtonModeState(next);
                            try { // @ts-ignore
                                await window.electronAPI?.setActionButtonMode?.(next);
                            } catch (e) { console.error(e); }
                        }}
                    />
                </Row>

                {/* Profile Mode */}
                {hasProfile && (
                    <Row disabled={!isPremium}>
                        <div className="flex items-center gap-[9px] flex-1 min-w-0">
                            <User
                                size={14}
                                className={`flex-shrink-0 ${profileActive ? 'text-accent-primary' : 'text-[#e2e5ed]/35'}`}
                            />
                            <Label active={profileActive}>Profile Mode</Label>
                        </div>
                        <Toggle
                            on={profileActive}
                            onColor="#d97757"
                            onShadow="0 2px 10px rgba(217,119,87,0.30)"
                            disabled={!isPremium}
                            onClick={async () => {
                                if (!isPremium) return;
                                const next = !profileMode;
                                setProfileMode(next);
                                try { // @ts-ignore
                                    await window.electronAPI?.profileSetMode?.(next);
                                } catch (e) { console.error(e); }
                            }}
                        />
                    </Row>
                )}

                <Divider />

                <SectionHeader label="Shortcuts" />

                {/* Show / Hide */}
                <Row>
                    <div className="flex items-center gap-[9px] flex-1 min-w-0">
                        <svg
                            width="14" height="14" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round"
                            className="flex-shrink-0 text-slate-200/35"
                        >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <line x1="3" y1="9" x2="21" y2="9" />
                        </svg>
                        <Label active={false}>Show / Hide</Label>
                    </div>
                    <ShortcutKeys keys={shortcuts.toggleVisibility || ['⌘', 'B']} />
                </Row>

                {/* Screenshot */}
                <Row>
                    <div className="flex items-center gap-[9px] flex-1 min-w-0">
                        <Camera size={14} className="flex-shrink-0 text-slate-200/35" />
                        <Label active={false}>Screenshot</Label>
                    </div>
                    <ShortcutKeys keys={shortcuts.takeScreenshot || ['⌘', 'H']} />
                </Row>

                <Divider />

                {/* Donate */}
                <Row
                    hoverBg="rgba(244,114,182,0.08)"
                    onClick={() => {
                        window.electronAPI?.openExternal('https://buymeacoffee.com/evinjohnn');
                    }}
                >
                    <div className="flex items-center gap-[9px] flex-1 min-w-0">
                        <Heart size={14} className="flex-shrink-0 text-[#f472b6]" />
                        <span className="text-xs font-medium text-[rgba(244,114,182,0.70)]">Donate</span>
                    </div>
                    <Link size={12} className="flex-shrink-0 text-slate-200/35" />
                </Row>
            </div>
        </div>
    );
};

export default SettingsPopup;
