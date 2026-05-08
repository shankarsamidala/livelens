import React, { useState, useEffect } from 'react';

const ACCENT        = '#d97757';
const ACCENT_BG     = 'rgba(217,119,87,0.10)';
const ACCENT_BORDER = 'rgba(217,119,87,0.22)';
const CARD_BG       = 'rgba(255,255,255,0.03)';
const CARD_BORDER   = 'rgba(255,255,255,0.06)';
const TEXT_PRIMARY  = 'rgba(226,229,237,0.88)';
const TEXT_SEC      = 'rgba(226,229,237,0.45)';
const TEXT_MUTED    = 'rgba(226,229,237,0.25)';
const INPUT_BG      = 'rgba(255,255,255,0.04)';
const INPUT_BORDER  = 'rgba(255,255,255,0.08)';

const PURCHASE_LIFETIME_URL = 'https://checkout.dodopayments.com/buy/pdt_0NbHo6EnXlNPqNcZ14OTi';
const PURCHASE_YEARLY_URL   = 'https://checkout.dodopayments.com/buy/pdt_0NcM4QBwy0CDcPV9CXaNP';
const PRO_DEMO_URL          = 'https://livelens.ai/pro';
const TERMS_URL             = 'https://livelens.ai/terms';
const REFUND_URL            = 'https://livelens.ai/refund';
const CONTACT_EMAIL         = 'mailto:support@livelens.ai';

const FEATURES = [
    { label: 'Profile Engine',       desc: 'AI grounded in your resume & experience',   ready: true  },
    { label: 'JD Intelligence',      desc: 'Gap-analysis against any job description',  ready: true  },
    { label: 'Negotiation Coaching', desc: 'Live market-band strategy in real time',    ready: true  },
    { label: 'Modes (7 personas)',   desc: 'Technical, Sales, Leadership & more',       ready: true  },
    { label: 'Company Research',     desc: 'Real-time intel on culture & positioning',  ready: true  },
    { label: 'Context Intelligence', desc: 'Ground AI in your own files & docs',        ready: true  },
    { label: 'System Design',        desc: 'Architecture diagrams + OCR extraction',    ready: false },
    { label: 'Mock Interviews',      desc: 'Hiring-manager persona with live coaching', ready: false },
];

// ─── small helpers ────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
    return (
        <div style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, borderRadius: 12, overflow: 'hidden', ...style }}>
            {children}
        </div>
    );
}

function CheckIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="6.5" cy="6.5" r="6.5" fill={ACCENT_BG} stroke={ACCENT_BORDER}/>
            <path d="M4 6.5l2 2 3-3" stroke={ACCENT} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

function SoonPill() {
    return (
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, color: TEXT_MUTED }}>
            Soon
        </span>
    );
}

// ─── main component ───────────────────────────────────────────

export const LiveLensProSettings: React.FC = () => {
    const [licenseKey,  setLicenseKey]  = useState('');
    const [hardwareId,  setHardwareId]  = useState('');
    const [isPremium,   setIsPremium]   = useState<boolean | null>(null);
    const [status,      setStatus]      = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg,    setErrorMsg]    = useState('');
    const [copiedHwid,  setCopiedHwid]  = useState(false);

    const refresh = async () => {
        try {
            const d = await window.electronAPI?.licenseGetDetails?.();
            setIsPremium(d?.isPremium ?? false);
        } catch {
            const check = window.electronAPI?.licenseCheckPremiumAsync ?? window.electronAPI?.licenseCheckPremium;
            setIsPremium(check ? await check() : false);
        }
    };

    useEffect(() => {
        window.electronAPI?.licenseGetHardwareId?.().then(setHardwareId).catch(() => setHardwareId('unavailable'));
        refresh();
        // @ts-ignore
        window.electronAPI?.onLicenseStatusChanged?.(refresh);
    }, []);

    const handleActivate = async () => {
        if (!licenseKey.trim()) return;
        setStatus('loading'); setErrorMsg('');
        try {
            const r = await window.electronAPI?.licenseActivate?.(licenseKey.trim());
            if (r?.success) {
                setStatus('success'); setLicenseKey('');
                setTimeout(() => { refresh(); setStatus('idle'); }, 1200);
            } else {
                setStatus('error'); setErrorMsg(r?.error || 'Activation failed. Please try again.');
            }
        } catch (e: any) {
            setStatus('error'); setErrorMsg(e.message || 'Activation failed.');
        }
    };

    const handleDeactivate = async () => {
        try { await window.electronAPI?.licenseDeactivate?.(); refresh(); }
        catch (e: any) { setErrorMsg(e.message || 'Deactivation failed.'); }
    };

    const open = (url: string) => (window.electronAPI as any)?.openExternal?.(url);

    if (isPremium === null) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <div style={{ width: 18, height: 18, border: `2px solid ${ACCENT}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* ── Page heading ── */}
            <div>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: TEXT_PRIMARY, letterSpacing: '-0.01em', margin: 0 }}>LiveLens Pro</h3>
                <p style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 4, lineHeight: 1.5 }}>
                    Profile Engine, JD Intelligence &amp; Negotiation Coaching
                </p>
            </div>

            {isPremium ? (
                /* ── Active state ── */
                <Card>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px 24px' }}>
                        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                        </div>
                        <p style={{ fontSize: 17, fontWeight: 600, color: TEXT_PRIMARY, margin: 0 }}>Pro License Active</p>
                        <p style={{ fontSize: 12.5, color: TEXT_SEC, marginTop: 8, marginBottom: 24, lineHeight: 1.6, maxWidth: 280 }}>
                            Your device is fully authorized. Profile Engine, JD Intelligence, Negotiation Coaching and all Pro features are enabled.
                        </p>
                        <button
                            onClick={handleDeactivate}
                            style={{ padding: '10px 20px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#f87171', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'background 0.15s' }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            Deactivate License
                        </button>
                        <p style={{ fontSize: 10.5, color: TEXT_MUTED, marginTop: 12, lineHeight: 1.5 }}>
                            Deactivating removes the license from this device so you can use it on another.
                        </p>
                    </div>
                </Card>
            ) : (
                <>
                    {/* ── Feature card ── */}
                    <Card>
                        <div style={{ padding: '20px 20px 18px' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 20 }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                    </svg>
                                </div>
                                <p style={{ fontSize: 16, fontWeight: 700, color: TEXT_PRIMARY, margin: 0, letterSpacing: '-0.01em' }}>Unlock LiveLens Pro</p>
                                <p style={{ fontSize: 12.5, color: TEXT_SEC, marginTop: 6, lineHeight: 1.5, maxWidth: 260 }}>
                                    Supercharge your interviews with AI grounded in your real experience.
                                </p>
                            </div>

                            {/* Feature grid */}
                            <div style={{ background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, borderRadius: 10, padding: '14px 16px', marginBottom: 18 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
                                    {FEATURES.map((f) => (
                                        <div key={f.label} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, opacity: f.ready ? 1 : 0.5 }}>
                                            {f.ready
                                                ? <CheckIcon />
                                                : <div style={{ width: 13, height: 13, borderRadius: '50%', border: `1px solid ${INPUT_BORDER}`, flexShrink: 0, marginTop: 1 }} />
                                            }
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                                    <span style={{ fontSize: 12, fontWeight: 600, color: TEXT_PRIMARY, lineHeight: 1.3 }}>{f.label}</span>
                                                    {!f.ready && <SoonPill />}
                                                </div>
                                                <p style={{ fontSize: 10.5, color: TEXT_SEC, margin: 0, lineHeight: 1.4, marginTop: 2 }}>{f.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Purchase buttons */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                                <button
                                    onClick={() => open(PURCHASE_LIFETIME_URL)}
                                    style={{ height: 40, borderRadius: 10, background: ACCENT, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', letterSpacing: '-0.01em', transition: 'opacity 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                                    onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                                >
                                    Buy Lifetime
                                </button>
                                <button
                                    onClick={() => open(PURCHASE_YEARLY_URL)}
                                    style={{ height: 40, borderRadius: 10, background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, color: TEXT_PRIMARY, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.07)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = INPUT_BG)}
                                >
                                    Buy Yearly
                                </button>
                            </div>

                            {/* Discount pill */}
                            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
                                <span style={{ fontSize: 11, fontWeight: 500, padding: '4px 12px', borderRadius: 999, background: ACCENT_BG, border: `1px solid ${ACCENT_BORDER}`, color: ACCENT }}>
                                    Use code <strong>INSIDER25</strong> for 25% off
                                </span>
                            </div>

                            {/* Watch demo */}
                            <div style={{ borderTop: `1px solid ${CARD_BORDER}`, paddingTop: 12, display: 'flex', justifyContent: 'center' }}>
                                <button
                                    onClick={() => open(PRO_DEMO_URL)}
                                    style={{ background: 'none', border: 'none', color: TEXT_SEC, fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, transition: 'color 0.15s' }}
                                    onMouseEnter={e => (e.currentTarget.style.color = TEXT_PRIMARY)}
                                    onMouseLeave={e => (e.currentTarget.style.color = TEXT_SEC)}
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                                    Watch it in action
                                </button>
                            </div>
                        </div>
                    </Card>

                    {/* ── License activation ── */}
                    <Card>
                        <div style={{ padding: '18px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                <div style={{ width: 32, height: 32, borderRadius: 9, background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={TEXT_SEC} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                </div>
                                <div>
                                    <p style={{ fontSize: 13.5, fontWeight: 600, color: TEXT_PRIMARY, margin: 0, lineHeight: 1.2 }}>Already purchased?</p>
                                    <p style={{ fontSize: 11.5, color: TEXT_MUTED, margin: 0, marginTop: 3 }}>Enter your license key to activate this device.</p>
                                </div>
                            </div>

                            {/* Input */}
                            <input
                                type="text"
                                value={licenseKey}
                                onChange={e => setLicenseKey(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleActivate()}
                                placeholder="Enter your license key"
                                disabled={status === 'loading' || status === 'success'}
                                style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 9, background: INPUT_BG, border: `1px solid ${INPUT_BORDER}`, color: TEXT_PRIMARY, fontSize: 13, fontFamily: 'monospace', outline: 'none', marginBottom: 10, opacity: status === 'loading' ? 0.5 : 1 }}
                            />

                            {/* Activate button */}
                            <button
                                onClick={handleActivate}
                                disabled={!licenseKey.trim() || status === 'loading' || status === 'success'}
                                style={{
                                    width: '100%', padding: '9px 0', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: licenseKey.trim() && status === 'idle' ? 'pointer' : 'default',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'opacity 0.15s',
                                    background: status === 'success' ? 'rgba(74,222,128,0.08)' : licenseKey.trim() ? ACCENT : INPUT_BG,
                                    border: status === 'success' ? '1px solid rgba(74,222,128,0.22)' : licenseKey.trim() ? 'none' : `1px solid ${INPUT_BORDER}`,
                                    color: status === 'success' ? '#4ade80' : licenseKey.trim() ? '#fff' : TEXT_MUTED,
                                    opacity: status === 'loading' ? 0.7 : 1,
                                }}
                            >
                                {status === 'success' ? (
                                    <>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                                        Activated!
                                    </>
                                ) : status === 'loading' ? (
                                    <>
                                        <div style={{ width: 13, height: 13, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                        Verifying…
                                    </>
                                ) : (
                                    <>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                        Activate License
                                    </>
                                )}
                            </button>

                            {/* Error */}
                            {status === 'error' && errorMsg && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', color: '#f87171', fontSize: 12 }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                    {errorMsg}
                                </div>
                            )}

                            <p style={{ fontSize: 10.5, color: TEXT_MUTED, marginTop: 10, textAlign: 'center', lineHeight: 1.5 }}>
                                By activating, you agree to our{' '}
                                <span onClick={() => open(TERMS_URL)} style={{ color: TEXT_SEC, textDecoration: 'underline', cursor: 'pointer' }}>Terms &amp; Conditions</span>.
                            </p>
                        </div>
                    </Card>
                </>
            )}

            {/* ── Refund policy ── */}
            <Card>
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TEXT_MUTED }}>Refund Policy</span>
                    <p style={{ fontSize: 11.5, color: TEXT_SEC, lineHeight: 1.6, margin: 0 }}>
                        Not satisfied within 7 days of purchase? Contact us for a full refund — no questions asked.
                        Purchases made with a discount code are final sale. For full details see our{' '}
                        <span onClick={() => open(REFUND_URL)} style={{ color: TEXT_PRIMARY, textDecoration: 'underline', cursor: 'pointer' }}>Refund Policy</span>
                        {' '}or email{' '}
                        <span onClick={() => open(CONTACT_EMAIL)} style={{ color: TEXT_PRIMARY, textDecoration: 'underline', cursor: 'pointer' }}>support@livelens.ai</span>.
                    </p>
                </div>
            </Card>

            {/* ── Hardware ID ── */}
            {hardwareId && (
                <div style={{ padding: '0 2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TEXT_MUTED }}>Device ID</span>
                        <button
                            onClick={() => { navigator.clipboard.writeText(hardwareId); setCopiedHwid(true); setTimeout(() => setCopiedHwid(false), 2000); }}
                            style={{ background: 'none', border: 'none', color: copiedHwid ? '#4ade80' : TEXT_SEC, fontSize: 11, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                            {copiedHwid
                                ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                                : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            }
                            {copiedHwid ? 'Copied' : 'Copy ID'}
                        </button>
                    </div>
                    <p style={{ fontSize: 11, fontFamily: 'monospace', color: TEXT_MUTED, margin: 0, userSelect: 'all', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {hardwareId}
                    </p>
                </div>
            )}
        </div>
    );
};
