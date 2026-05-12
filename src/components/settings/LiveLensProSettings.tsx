import React, { useState, useEffect } from 'react';

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

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden ${className ?? ''}`}>
            {children}
        </div>
    );
}

function CheckIcon() {
    return (
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <circle cx="6.5" cy="6.5" r="6.5" fill="rgba(217,119,87,0.10)" stroke="rgba(217,119,87,0.22)"/>
            <path d="M4 6.5l2 2 3-3" stroke="#d97757" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );
}

function SoonPill() {
    return (
        <span className="text-[9px] font-bold tracking-[0.08em] uppercase px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-text-dim-muted">
            Soon
        </span>
    );
}

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
            <div className="flex justify-center p-10">
                <div className="w-[18px] h-[18px] border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const activateBtnClass = status === 'success'
        ? 'bg-green-400/[0.08] border border-green-400/[0.22] text-green-400'
        : licenseKey.trim()
            ? 'bg-accent-primary border-0 text-white'
            : 'bg-white/[0.04] border border-white/[0.08] text-text-dim-muted';

    return (
        <div className="flex flex-col gap-3.5">

            {/* ── Page heading ── */}
            <div>
                <h3 className="text-[15px] font-semibold text-text-dim-primary tracking-[-0.01em] m-0">LiveLens Pro</h3>
                <p className="text-xs text-text-dim-muted mt-1 leading-[1.5]">
                    Profile Engine, JD Intelligence &amp; Negotiation Coaching
                </p>
            </div>

            {isPremium ? (
                /* ── Active state ── */
                <Card>
                    <div className="flex flex-col items-center text-center px-6 py-8">
                        <div className="w-[52px] h-[52px] rounded-[14px] bg-green-400/[0.08] border border-green-400/[0.20] flex items-center justify-center mb-5">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                        </div>
                        <p className="text-[17px] font-semibold text-text-dim-primary m-0">Pro License Active</p>
                        <p className="text-[12.5px] text-text-dim-sec mt-2 mb-6 leading-[1.6] max-w-[280px]">
                            Your device is fully authorized. Profile Engine, JD Intelligence, Negotiation Coaching and all Pro features are enabled.
                        </p>
                        <button
                            onClick={handleDeactivate}
                            className="px-5 py-2.5 rounded-[10px] bg-red-500/[0.08] border border-red-500/[0.20] text-red-400 text-[13px] font-medium cursor-pointer flex items-center gap-1.5 transition-colors hover:bg-red-500/[0.14]"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            Deactivate License
                        </button>
                        <p className="text-[10.5px] text-text-dim-muted mt-3 leading-[1.5]">
                            Deactivating removes the license from this device so you can use it on another.
                        </p>
                    </div>
                </Card>
            ) : (
                <>
                    {/* ── Feature card ── */}
                    <Card>
                        <div className="px-5 pt-5 pb-[18px]">
                            {/* Header */}
                            <div className="flex flex-col items-center text-center mb-5">
                                <div className="w-11 h-11 rounded-xl bg-accent-primary/10 border border-accent-primary/[0.22] flex items-center justify-center mb-3.5">
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97757" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                                    </svg>
                                </div>
                                <p className="text-[16px] font-bold text-text-dim-primary m-0 tracking-[-0.01em]">Unlock LiveLens Pro</p>
                                <p className="text-[12.5px] text-text-dim-sec mt-1.5 leading-[1.5] max-w-[260px]">
                                    Supercharge your interviews with AI grounded in your real experience.
                                </p>
                            </div>

                            {/* Feature grid */}
                            <div className="bg-white/[0.04] border border-white/[0.08] rounded-[10px] px-4 py-3.5 mb-[18px]">
                                <div className="grid grid-cols-2 gap-x-5 gap-y-3">
                                    {FEATURES.map((f) => (
                                        <div key={f.label} className={`flex items-start gap-2 ${f.ready ? 'opacity-100' : 'opacity-50'}`}>
                                            {f.ready
                                                ? <CheckIcon />
                                                : <div className="w-[13px] h-[13px] rounded-full border border-white/[0.08] shrink-0 mt-[1px]" />
                                            }
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-xs font-semibold text-text-dim-primary leading-[1.3]">{f.label}</span>
                                                    {!f.ready && <SoonPill />}
                                                </div>
                                                <p className="text-[10.5px] text-text-dim-sec m-0 leading-[1.4] mt-0.5">{f.desc}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Purchase buttons */}
                            <div className="grid grid-cols-2 gap-2.5 mb-3.5">
                                <button
                                    onClick={() => open(PURCHASE_LIFETIME_URL)}
                                    className="h-10 rounded-[10px] bg-accent-primary border-0 text-white text-[13px] font-bold cursor-pointer tracking-[-0.01em] transition-opacity hover:opacity-85"
                                >
                                    Buy Lifetime
                                </button>
                                <button
                                    onClick={() => open(PURCHASE_YEARLY_URL)}
                                    className="h-10 rounded-[10px] bg-white/[0.04] border border-white/[0.08] text-text-dim-primary text-[13px] font-semibold cursor-pointer transition-colors hover:bg-white/[0.07]"
                                >
                                    Buy Yearly
                                </button>
                            </div>

                            {/* Discount pill */}
                            <div className="flex justify-center mb-3.5">
                                <span className="text-[11px] font-medium px-3 py-1 rounded-full bg-accent-primary/10 border border-accent-primary/[0.22] text-accent-primary">
                                    Use code <strong>INSIDER25</strong> for 25% off
                                </span>
                            </div>

                            {/* Watch demo */}
                            <div className="border-t border-white/[0.06] pt-3 flex justify-center">
                                <button
                                    onClick={() => open(PRO_DEMO_URL)}
                                    className="bg-transparent border-0 text-text-dim-sec text-xs font-medium cursor-pointer flex items-center gap-1.5 transition-colors hover:text-text-dim-primary"
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                                    Watch it in action
                                </button>
                            </div>
                        </div>
                    </Card>

                    {/* ── License activation ── */}
                    <Card>
                        <div className="px-5 py-[18px]">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-[9px] bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(226,229,237,0.45)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                    </svg>
                                </div>
                                <div>
                                    <p className="text-[13.5px] font-semibold text-text-dim-primary m-0 leading-[1.2]">Already purchased?</p>
                                    <p className="text-[11.5px] text-text-dim-muted m-0 mt-[3px]">Enter your license key to activate this device.</p>
                                </div>
                            </div>

                            <input
                                type="text"
                                value={licenseKey}
                                onChange={e => setLicenseKey(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleActivate()}
                                placeholder="Enter your license key"
                                disabled={status === 'loading' || status === 'success'}
                                className={`w-full box-border px-3 py-[9px] rounded-[9px] bg-white/[0.04] border border-white/[0.08] text-text-dim-primary text-[13px] font-mono outline-none mb-2.5 ${status === 'loading' ? 'opacity-50' : 'opacity-100'}`}
                            />

                            <button
                                onClick={handleActivate}
                                disabled={!licenseKey.trim() || status === 'loading' || status === 'success'}
                                className={`w-full py-[9px] rounded-[9px] text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-opacity ${activateBtnClass} ${status === 'loading' ? 'opacity-70' : 'opacity-100'}`}
                            >
                                {status === 'success' ? (
                                    <>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                                        Activated!
                                    </>
                                ) : status === 'loading' ? (
                                    <>
                                        <div className="w-[13px] h-[13px] border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        Verifying…
                                    </>
                                ) : (
                                    <>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                                        Activate License
                                    </>
                                )}
                            </button>

                            {status === 'error' && errorMsg && (
                                <div className="flex items-center gap-2 mt-2.5 px-3 py-2 rounded-lg bg-red-500/[0.08] border border-red-500/[0.18] text-red-400 text-xs">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                                    {errorMsg}
                                </div>
                            )}

                            <p className="text-[10.5px] text-text-dim-muted mt-2.5 text-center leading-[1.5]">
                                By activating, you agree to our{' '}
                                <span onClick={() => open(TERMS_URL)} className="text-text-dim-sec underline cursor-pointer">Terms &amp; Conditions</span>.
                            </p>
                        </div>
                    </Card>
                </>
            )}

            {/* ── Refund policy ── */}
            <Card>
                <div className="px-5 py-4 flex flex-col gap-2.5">
                    <span className="text-[10.5px] font-bold tracking-[0.08em] uppercase text-text-dim-muted">Refund Policy</span>
                    <p className="text-[11.5px] text-text-dim-sec leading-[1.6] m-0">
                        Not satisfied within 7 days of purchase? Contact us for a full refund — no questions asked.
                        Purchases made with a discount code are final sale. For full details see our{' '}
                        <span onClick={() => open(REFUND_URL)} className="text-text-dim-primary underline cursor-pointer">Refund Policy</span>
                        {' '}or email{' '}
                        <span onClick={() => open(CONTACT_EMAIL)} className="text-text-dim-primary underline cursor-pointer">support@livelens.ai</span>.
                    </p>
                </div>
            </Card>

            {/* ── Hardware ID ── */}
            {hardwareId && (
                <div className="px-0.5">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold tracking-[0.08em] uppercase text-text-dim-muted">Device ID</span>
                        <button
                            onClick={() => { navigator.clipboard.writeText(hardwareId); setCopiedHwid(true); setTimeout(() => setCopiedHwid(false), 2000); }}
                            className={`bg-transparent border-0 text-[11px] font-medium cursor-pointer flex items-center gap-1 ${copiedHwid ? 'text-green-400' : 'text-text-dim-sec'}`}
                        >
                            {copiedHwid
                                ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg>
                                : <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            }
                            {copiedHwid ? 'Copied' : 'Copy ID'}
                        </button>
                    </div>
                    <p className="text-[11px] font-mono text-text-dim-muted m-0 select-all overflow-hidden text-ellipsis whitespace-nowrap">
                        {hardwareId}
                    </p>
                </div>
            )}
        </div>
    );
};
