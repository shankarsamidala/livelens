import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Camera, Zap, Heart, User, Link } from 'lucide-react';
import { useShortcuts } from '../hooks/useShortcuts';
import { useResolvedTheme } from '../hooks/useResolvedTheme';

// ── Inline-style design tokens (LiveLens overlay-settings palette) ──────────
const D = {
    panelBgDark:       '#0d0f14',
    panelBgLight:      '#F3F4F6',
    borderDark:        'rgba(255,255,255,0.09)',
    borderLight:       'rgba(0,0,0,0.10)',
    sectionColorDark:  'rgba(226,229,237,0.25)',
    sectionColorLight: 'rgba(0,0,0,0.30)',
    rowNameDark:       'rgba(226,229,237,0.60)',
    rowNameLight:      'rgba(0,0,0,0.55)',
    rowNameActiveDark: '#e2e5ed',
    rowNameActiveLight:'#111',
    rowHoverDark:      'rgba(255,255,255,0.05)',
    rowHoverLight:     'rgba(0,0,0,0.04)',
    dividerDark:       'rgba(255,255,255,0.06)',
    dividerLight:      'rgba(0,0,0,0.07)',
    keyBorderDark:     'rgba(255,255,255,0.09)',
    keyBorderLight:    'rgba(0,0,0,0.10)',
    keyBgDark:         'rgba(255,255,255,0.06)',
    keyBgLight:        'rgba(0,0,0,0.04)',
    keyTextDark:       'rgba(226,229,237,0.45)',
    keyTextLight:      'rgba(0,0,0,0.45)',
    iconDimDark:       'rgba(226,229,237,0.35)',
    iconDimLight:      'rgba(0,0,0,0.30)',
    trackOff:          'rgba(255,255,255,0.14)',
    trackOffLight:     'rgba(0,0,0,0.18)',
    knobDark:          '#e2e5ed',
    knobLight:         '#ffffff',
};

// ── Toggle ──────────────────────────────────────────────────────────────────
interface ToggleProps {
    on: boolean;
    onColor: string;
    onShadow?: string;
    isLight: boolean;
    onClick: () => void;
    disabled?: boolean;
}
const Toggle = ({ on, onColor, onShadow, isLight, onClick, disabled }: ToggleProps) => (
    <button
        onClick={onClick}
        disabled={disabled}
        style={{
            width: 30, height: 18,
            borderRadius: 99,
            padding: 1.5,
            flexShrink: 0,
            background: on ? onColor : (isLight ? D.trackOffLight : D.trackOff),
            boxShadow: on && onShadow ? onShadow : 'none',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'background 0.25s',
        }}
    >
        <div style={{
            width: 15, height: 15,
            borderRadius: '50%',
            background: isLight ? D.knobLight : D.knobDark,
            transform: on ? 'translateX(12px)' : 'translateX(0)',
            transition: 'transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
            flexShrink: 0,
            boxShadow: isLight ? '0 1px 4px rgba(0,0,0,0.18)' : '0 1px 3px rgba(0,0,0,0.4)',
        }} />
    </button>
);

// ── Row ─────────────────────────────────────────────────────────────────────
interface RowProps {
    isLight: boolean;
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    hoverBgOverride?: string;
    title?: string;
}
const Row = ({ isLight, children, onClick, disabled, hoverBgOverride, title }: RowProps) => {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onClick={disabled ? undefined : onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            title={title}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 10px',
                borderRadius: 9,
                gap: 8,
                background: hovered && !disabled
                    ? (hoverBgOverride ?? (isLight ? D.rowHoverLight : D.rowHoverDark))
                    : 'transparent',
                cursor: disabled ? 'not-allowed' : 'default',
                opacity: disabled ? 0.5 : 1,
                transition: 'background 0.12s',
            }}
        >
            {children}
        </div>
    );
};

// ── Section header ──────────────────────────────────────────────────────────
const SectionHeader = ({ label, isLight }: { label: string; isLight: boolean }) => (
    <div style={{
        padding: '6px 10px 3px',
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.09em',
        textTransform: 'uppercase' as const,
        color: isLight ? D.sectionColorLight : D.sectionColorDark,
    }}>
        {label}
    </div>
);

// ── Divider ─────────────────────────────────────────────────────────────────
const Divider = ({ isLight }: { isLight: boolean }) => (
    <div style={{ height: 1, background: isLight ? D.dividerLight : D.dividerDark, margin: '3px 6px' }} />
);

// ── Shortcut keys ───────────────────────────────────────────────────────────
const ShortcutKeys = ({ keys, isLight }: { keys: string[]; isLight: boolean }) => (
    <div style={{ display: 'flex', gap: 3, flexShrink: 0, opacity: 0.55 }}>
        {keys.map((k, i) => (
            <span key={i} style={{
                padding: '1px 5px',
                borderRadius: 5,
                border: `1px solid ${isLight ? D.keyBorderLight : D.keyBorderDark}`,
                background: isLight ? D.keyBgLight : D.keyBgDark,
                fontSize: 10,
                fontWeight: 500,
                color: isLight ? D.keyTextLight : D.keyTextDark,
                minWidth: 20,
                textAlign: 'center' as const,
            }}>
                {k}
            </span>
        ))}
    </div>
);

// ── Ghost icon ──────────────────────────────────────────────────────────────
const GhostIcon = ({ active, isLight }: { active: boolean; isLight: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'}
        stroke={active ? 'none' : 'currentColor'}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        style={{ color: active ? (isLight ? '#111' : '#e2e5ed') : (isLight ? D.iconDimLight : D.iconDimDark), flexShrink: 0 }}
    >
        <path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z" />
        <path d="M9 10h.01 M15 10h.01"
            stroke={active ? (isLight ? 'white' : '#0d0f14') : (isLight ? '#334155' : 'rgba(226,229,237,0.6)')}
            strokeWidth="2.5" fill="none"
        />
    </svg>
);

// ── Row label ───────────────────────────────────────────────────────────────
const Label = ({ active, isLight, children }: { active: boolean; isLight: boolean; children: React.ReactNode }) => (
    <span style={{
        fontSize: 12,
        fontWeight: 500,
        color: active ? (isLight ? D.rowNameActiveLight : D.rowNameActiveDark) : (isLight ? D.rowNameLight : D.rowNameDark),
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    }}>
        {children}
    </span>
);

// ── Icon style helper ───────────────────────────────────────────────────────
const Ic = ({ color, isLight }: { color?: string; isLight: boolean }): React.CSSProperties => ({
    width: 14, height: 14, flexShrink: 0,
    color: color ?? (isLight ? D.iconDimLight : D.iconDimDark),
});

// ─────────────────────────────────────────────────────────────────────────────

const SettingsPopup = () => {
    const { shortcuts } = useShortcuts();
    const isLight = useResolvedTheme() === 'light';

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
            // @ts-ignore
            const creds = await window.electronAPI?.getStoredCredentials?.();
            if (creds) {
                setHasStoredKey({
                    gemini:   !!creds.hasGeminiKey,
                    groq:     !!creds.hasGroqKey,
                    openai:   !!creds.hasOpenaiKey,
                    claude:   !!creds.hasClaudeKey,
                    natively: !!creds.hasNativelyKey,
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
                // @ts-ignore
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
            try { // @ts-ignore
                window.electronAPI?.invoke('set-groq-fast-text-mode', useGroqFastText);
            } catch (e) { console.error(e); }
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
        // @ts-ignore
        if (!window.electronAPI?.onActionButtonModeChanged) return;
        // @ts-ignore
        const unsub = window.electronAPI.onActionButtonModeChanged((mode: 'recap' | 'brainstorm') => {
            setActionButtonModeState(mode);
        });
        return () => unsub();
    }, []);

    // Auto-fit the BrowserWindow to the rendered panel.
    useLayoutEffect(() => {
        if (!contentRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const rect = entry.target.getBoundingClientRect();
                try { // @ts-ignore
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
        <div style={{ background: 'transparent' }}>
            <div
                ref={contentRef}
                style={{
                    width: 220,
                    maxHeight: 320,
                    borderRadius: 14,
                    overflow: 'hidden',
                    backgroundColor: isLight ? D.panelBgLight : D.panelBgDark,
                    border: `1px solid ${isLight ? D.borderLight : D.borderDark}`,
                    boxShadow: 'none',
                    padding: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                }}
            >
                {/* ── Options ── */}
                <SectionHeader label="Options" isLight={isLight} />

                {/* Undetectable */}
                <Row isLight={isLight}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
                        <GhostIcon active={isUndetectable} isLight={isLight} />
                        <Label active={isUndetectable} isLight={isLight}>
                            {isUndetectable ? 'Undetectable' : 'Detectable'}
                        </Label>
                    </div>
                    <Toggle
                        on={isUndetectable}
                        onColor={isLight ? '#1e293b' : '#ffffff'}
                        onShadow={isLight ? '0 2px 8px rgba(15,23,42,0.18)' : '0 2px 8px rgba(255,255,255,0.20)'}
                        isLight={isLight}
                        onClick={() => {
                            const next = !isUndetectable;
                            setIsUndetectable(next);
                            localStorage.setItem('natively_undetectable', String(next));
                            window.electronAPI?.setUndetectable(next);
                        }}
                    />
                </Row>

                {/* Fast Response */}
                <Row isLight={isLight} disabled={!fastTextEnabled} title={!fastTextEnabled ? 'Requires Groq or Natively API key' : ''}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
                        <Zap style={Ic({ color: useGroqFastText ? '#f97316' : undefined, isLight })} fill={useGroqFastText ? 'currentColor' : 'none'} />
                        <Label active={useGroqFastText} isLight={isLight}>Fast Response</Label>
                    </div>
                    <Toggle
                        on={useGroqFastText}
                        onColor="#f97316"
                        onShadow="0 2px 10px rgba(249,115,22,0.30)"
                        isLight={isLight}
                        disabled={!fastTextEnabled}
                        onClick={() => { if (fastTextEnabled) setUseGroqFastText(v => !v); }}
                    />
                </Row>

                {/* Transcript */}
                <Row isLight={isLight}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24"
                            fill={showTranscript ? '#34d399' : 'none'}
                            stroke={showTranscript ? 'none' : (isLight ? D.iconDimLight : D.iconDimDark)}
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                            style={{ flexShrink: 0 }}
                        >
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        <Label active={showTranscript} isLight={isLight}>Transcript</Label>
                    </div>
                    <Toggle
                        on={showTranscript}
                        onColor="#10b981"
                        onShadow="0 2px 10px rgba(16,185,129,0.30)"
                        isLight={isLight}
                        onClick={() => {
                            const next = !showTranscript;
                            setShowTranscript(next);
                            localStorage.setItem('natively_interviewer_transcript', String(next));
                            window.dispatchEvent(new Event('storage'));
                        }}
                    />
                </Row>

                {/* Interview Mode */}
                <Row isLight={isLight}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round"
                            style={{ flexShrink: 0, color: actionButtonMode === 'brainstorm' ? '#a78bfa' : (isLight ? D.iconDimLight : D.iconDimDark) }}
                        >
                            <line x1="6" y1="3" x2="6" y2="15" />
                            <circle cx="18" cy="6" r="3" />
                            <circle cx="6" cy="18" r="3" />
                            <path d="M18 9a9 9 0 0 1-9 9" />
                        </svg>
                        <Label active={actionButtonMode === 'brainstorm'} isLight={isLight}>Interview Mode</Label>
                    </div>
                    <Toggle
                        on={actionButtonMode === 'brainstorm'}
                        onColor="#8b5cf6"
                        onShadow="0 2px 10px rgba(139,92,246,0.30)"
                        isLight={isLight}
                        onClick={async () => {
                            const next: 'recap' | 'brainstorm' = actionButtonMode === 'brainstorm' ? 'recap' : 'brainstorm';
                            setActionButtonModeState(next);
                            try { // @ts-ignore
                                await window.electronAPI?.setActionButtonMode?.(next);
                            } catch (e) { console.error(e); }
                        }}
                    />
                </Row>

                {/* Profile Mode (only if user has a profile) */}
                {hasProfile && (
                    <Row isLight={isLight} disabled={!isPremium} title={!isPremium ? 'Requires Pro license to be active' : ''}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
                            <User style={Ic({ color: profileActive ? '#d97757' : undefined, isLight })} fill={profileActive ? 'currentColor' : 'none'} />
                            <Label active={profileActive} isLight={isLight}>Profile Mode</Label>
                        </div>
                        <Toggle
                            on={profileActive}
                            onColor="#d97757"
                            onShadow="0 2px 10px rgba(217,119,87,0.30)"
                            isLight={isLight}
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

                <Divider isLight={isLight} />

                {/* ── Shortcuts ── */}
                <SectionHeader label="Shortcuts" isLight={isLight} />

                {/* Show / Hide */}
                <Row isLight={isLight}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24"
                            fill="none" stroke="currentColor" strokeWidth="2"
                            strokeLinecap="round" strokeLinejoin="round"
                            style={{ flexShrink: 0, color: isLight ? D.iconDimLight : D.iconDimDark }}
                        >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <line x1="3" y1="9" x2="21" y2="9" />
                        </svg>
                        <Label active={false} isLight={isLight}>Show / Hide</Label>
                    </div>
                    <ShortcutKeys keys={shortcuts.toggleVisibility || ['⌘', 'B']} isLight={isLight} />
                </Row>

                {/* Screenshot */}
                <Row isLight={isLight}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
                        <Camera style={Ic({ isLight })} />
                        <Label active={false} isLight={isLight}>Screenshot</Label>
                    </div>
                    <ShortcutKeys keys={shortcuts.takeScreenshot || ['⌘', 'H']} isLight={isLight} />
                </Row>

                <Divider isLight={isLight} />

                {/* Donate */}
                <Row
                    isLight={isLight}
                    hoverBgOverride="rgba(244,114,182,0.08)"
                    onClick={() => {
                        // @ts-ignore
                        window.electronAPI?.openExternal('https://buymeacoffee.com/evinjohnn');
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 }}>
                        <Heart style={{ ...Ic({ isLight }), color: '#f472b6' }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(244,114,182,0.70)' }}>
                            Donate
                        </span>
                    </div>
                    <Link style={{ width: 12, height: 12, flexShrink: 0, color: isLight ? D.iconDimLight : D.iconDimDark }} />
                </Row>
            </div>
        </div>
    );
};

export default SettingsPopup;
