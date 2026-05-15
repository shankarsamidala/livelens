import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Check, Loader2, Plus, Settings2 } from 'lucide-react';
import { useResolvedTheme } from '../hooks/useResolvedTheme';

interface UserMode {
    id: string;
    name: string;
    templateType: string;
    isActive: boolean;
}

// Mirrors electron/services/ModesManager.ts MODE_TEMPLATES.
const MODE_TEMPLATES: Array<{ type: string; label: string }> = [
    { type: 'general',              label: 'General' },
    { type: 'sales',                label: 'Sales' },
    { type: 'recruiting',           label: 'Recruiting' },
    { type: 'team-meet',            label: 'Team Meet' },
    { type: 'looking-for-work',     label: 'Looking for work' },
    { type: 'technical-interview',  label: 'Technical Interview' },
    { type: 'lecture',              label: 'Lecture' },
];

const ModeSelectorWindow = () => {
    const isLight = useResolvedTheme() === 'light';
    const [userModes, setUserModes] = useState<UserMode[]>(() => {
        try {
            const cached = localStorage.getItem('cached-modes');
            return cached ? JSON.parse(cached) : [];
        } catch { return []; }
    });
    const [isLoading, setIsLoading] = useState<boolean>(() => userModes.length === 0);

    useEffect(() => {
        const loadModes = async () => {
            try {
                if (userModes.length === 0) setIsLoading(true);
                const all = await window.electronAPI?.modesGetAll?.();
                if (Array.isArray(all)) {
                    setUserModes(all as UserMode[]);
                    localStorage.setItem('cached-modes', JSON.stringify(all));
                }
            } catch (err) {
                console.error('Failed to load modes:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadModes();
        window.addEventListener('focus', loadModes);

        const unsubscribe = window.electronAPI?.onModeChanged?.(() => loadModes());
        return () => {
            unsubscribe?.();
            window.removeEventListener('focus', loadModes);
        };
    }, []);

    const panelRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (!panelRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const rect = entry.target.getBoundingClientRect();
                try {
                    window.electronAPI?.updateContentDimensions?.({
                        width: Math.ceil(rect.width),
                        height: Math.ceil(rect.height),
                    });
                } catch (e) { console.warn('ModeSelector resize failed', e); }
            }
        });
        observer.observe(panelRef.current);
        return () => observer.disconnect();
    }, []);

    const handleActivate = async (id: string) => {
        try { await window.electronAPI?.modesSetActive?.(id); } catch { /* no-op */ }
        window.electronAPI?.modeSelectorCloseIfOpen?.();
    };

    const handleCreateFromTemplate = async (templateType: string, label: string) => {
        try {
            const res = await window.electronAPI?.modesCreate?.({ name: label, templateType });
            if (res?.success && res.mode?.id) {
                await window.electronAPI?.modesSetActive?.(res.mode.id);
            }
        } catch { /* no-op */ }
        window.electronAPI?.modeSelectorCloseIfOpen?.();
    };

    // Light / dark tokens — exact LiveLens model-selector palette.
    const panelBg          = isLight ? '#F3F4F6'              : '#0d0f14';
    const panelBorder      = isLight ? 'rgba(0,0,0,0.10)'     : 'rgba(255,255,255,0.09)';
    const sectionHeader    = isLight ? 'rgba(0,0,0,0.30)'     : 'rgba(226,229,237,0.25)';
    const rowName          = isLight ? 'rgba(0,0,0,0.55)'     : 'rgba(226,229,237,0.65)';
    const rowNameActive    = isLight ? '#111'                 : '#e2e5ed';
    const rowHoverBg       = isLight ? 'rgba(0,0,0,0.04)'     : 'rgba(255,255,255,0.06)';
    const rowActiveBg      = isLight ? 'rgba(0,0,0,0.07)'     : 'rgba(255,255,255,0.09)';
    const rowActiveBorder  = isLight ? 'rgba(0,0,0,0.08)'     : 'rgba(255,255,255,0.08)';
    const dividerColor     = isLight ? 'rgba(0,0,0,0.07)'     : 'rgba(255,255,255,0.06)';
    const loadingColor     = isLight ? 'rgba(0,0,0,0.35)'     : 'rgba(226,229,237,0.40)';
    const emptyColor       = isLight ? 'rgba(0,0,0,0.35)'     : 'rgba(226,229,237,0.35)';
    const checkColor       = isLight ? 'rgba(0,0,0,0.50)'     : 'rgba(226,229,237,0.65)';
    const chipBg           = isLight ? 'rgba(0,0,0,0.05)'     : 'rgba(255,255,255,0.06)';
    const accent           = '#d97757';

    const headerStyle: React.CSSProperties = {
        padding: '4px 10px 2px',
        fontSize: 9.5,
        fontWeight: 700,
        letterSpacing: '0.09em',
        textTransform: 'uppercase',
        color: sectionHeader,
    };

    const renderModeRow = (m: UserMode) => (
        <button
            key={m.id}
            onClick={() => handleActivate(m.id)}
            style={{
                width: '100%',
                textAlign: 'left',
                padding: '7px 10px',
                borderRadius: 9,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                background: m.isActive ? rowActiveBg : 'transparent',
                border: m.isActive ? `1px solid ${rowActiveBorder}` : '1px solid transparent',
                cursor: 'pointer',
                transition: 'background 0.12s',
            }}
            onMouseEnter={e => { if (!m.isActive) (e.currentTarget as HTMLButtonElement).style.background = rowHoverBg; }}
            onMouseLeave={e => { if (!m.isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1 }}>
                {m.isActive
                    ? <Check style={{ width: 12, height: 12, flexShrink: 0, color: accent }} />
                    : <span style={{ width: 12, height: 12, flexShrink: 0, display: 'inline-block' }} />}
                <span style={{
                    fontSize: 12,
                    fontWeight: 500,
                    color: m.isActive ? rowNameActive : rowName,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                }}>
                    {m.name}
                </span>
            </span>
            <span style={{
                fontSize: 9,
                fontWeight: 500,
                padding: '2px 5px',
                borderRadius: 4,
                flexShrink: 0,
                background: chipBg,
                color: rowName,
            }}>
                {m.templateType.replace(/-/g, ' ')}
            </span>
        </button>
    );

    const renderTemplateRow = (t: { type: string; label: string }) => (
        <button
            key={t.type}
            onClick={() => handleCreateFromTemplate(t.type, t.label)}
            style={{
                width: '100%',
                textAlign: 'left',
                padding: '7px 10px',
                borderRadius: 9,
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                background: 'transparent',
                border: '1px solid transparent',
                cursor: 'pointer',
                transition: 'background 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = rowHoverBg; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
        >
            <Plus style={{ width: 12, height: 12, flexShrink: 0, color: rowName }} />
            <span style={{
                fontSize: 12,
                fontWeight: 500,
                color: rowName,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
            }}>
                {t.label}
            </span>
        </button>
    );

    return (
        <div style={{ background: 'transparent' }}>
            <div
                ref={panelRef}
                style={{
                    width: 224,
                    maxHeight: 400,
                    borderRadius: 14,
                    overflow: 'hidden',
                    backgroundColor: panelBg,
                    border: `1px solid ${panelBorder}`,
                    boxShadow: 'none',
                    padding: 6,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                }}
            >
                {isLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px 0', color: loadingColor, gap: 6 }}>
                        <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
                        <span style={{ fontSize: 12 }}>Loading…</span>
                    </div>
                ) : (
                    <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {/* Your modes */}
                        <div style={headerStyle}>Your modes</div>
                        {userModes.length === 0 ? (
                            <div style={{ padding: '8px 10px', fontSize: 11, color: emptyColor, lineHeight: 1.5 }}>
                                No saved modes yet. Pick a template below.
                            </div>
                        ) : (
                            userModes.map(renderModeRow)
                        )}

                        {/* Divider */}
                        <div style={{ height: 1, background: dividerColor, margin: '3px 6px' }} />

                        {/* New from template */}
                        <div style={headerStyle}>New from template</div>
                        {MODE_TEMPLATES.map(renderTemplateRow)}

                        {/* Divider */}
                        <div style={{ height: 1, background: dividerColor, margin: '3px 6px' }} />

                        {/* Manage modes */}
                        <button
                            onClick={() => {
                                window.electronAPI?.openSettingsTab?.('modes');
                                window.electronAPI?.modeSelectorCloseIfOpen?.();
                            }}
                            style={{
                                width: '100%',
                                textAlign: 'left',
                                padding: '7px 10px',
                                borderRadius: 9,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 7,
                                background: 'transparent',
                                border: '1px solid transparent',
                                cursor: 'pointer',
                                transition: 'background 0.12s',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = rowHoverBg; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                        >
                            <Settings2 style={{ width: 12, height: 12, flexShrink: 0, color: rowName }} />
                            <span style={{ fontSize: 12, fontWeight: 500, color: rowName }}>Manage modes…</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ModeSelectorWindow;
