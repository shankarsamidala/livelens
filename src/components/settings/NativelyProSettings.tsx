import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    CheckCircle, AlertCircle,
    Mic, Brain, Search, Shield, Loader2,
    RefreshCw, Trash2, ArrowUpRight, Info,
    Zap, Clock, Key, Activity, ChevronRight,
    Lock, Check, Copy, X, PlayCircle, Sparkles,
} from 'lucide-react';
import { NativelyLogoMark } from '../NativelyLogoMark';
import { FreeTrialModal } from '../trial/FreeTrialModal';

// ─── Types ───────────────────────────────────────────────────
interface QuotaBucket { used: number; limit: number; remaining: number; }
interface UsageData {
    plan: string;
    member_since: string;
    quota: {
        transcription: QuotaBucket;
        ai:            QuotaBucket;
        search:        QuotaBucket;
        resets_at:     string;
    };
}

// ─── Purchase URLs ─────────────────────────────────────────────
const PLAN_BASIC_URL        = 'https://checkout.dodopayments.com/buy/pdt_0NbFixGmD8CSeawb5qvVl';
const PLAN_PREMIUM_URL      = 'https://checkout.dodopayments.com/buy/pdt_0NcM6Aw0IWdspbsgUeCLA';
const PURCHASE_LIFETIME_URL = 'https://checkout.dodopayments.com/buy/pdt_0NbHo6EnXlNPqNcZ14OTi';
const PURCHASE_YEARLY_URL   = 'https://checkout.dodopayments.com/buy/pdt_0NcM4QBwy0CDcPV9CXaNP';

// ─── Plans ─────────────────────────────────────────────────────
const PLANS = [
    {
        id: 'basic',
        name: 'Basic',
        price: '₹399',
        period: '/mo',
        url: PLAN_BASIC_URL,
        tagline: 'Get started',
        accent: '#64748b',
        features: [
            { text: '5 hrs transcription / mo', highlight: false },
            { text: '200 AI requests',          highlight: false },
            { text: 'Unlimited sessions',       highlight: false },
            { text: 'PDF export',               highlight: false },
        ],
    },
    {
        id: 'premium',
        name: 'Premium',
        price: '₹999',
        period: '/mo',
        url: PLAN_PREMIUM_URL,
        tagline: 'API + Pro bundled',
        accent: '#d97757',
        popular: true,
        features: [
            { text: '50 hrs transcription / mo',  highlight: true  },
            { text: 'Unlimited AI requests',       highlight: true  },
            { text: 'Includes Pro desktop licence', highlight: true  },
            { text: 'PDF · Notion · Slack export', highlight: false },
        ],
    },
    {
        id: 'lifetime',
        name: 'Lifetime',
        price: 'One-time',
        period: 'pay once',
        url: PURCHASE_LIFETIME_URL,
        tagline: 'Own it forever',
        accent: '#a78bfa',
        features: [
            { text: 'All Pro desktop features',   highlight: true  },
            { text: 'Modes · Resume · JD intel',  highlight: true  },
            { text: 'Company Research',           highlight: false },
            { text: 'Bring your own AI keys',     highlight: false },
        ],
    },
] as const;

const FEATURES_ACTIVE = [
    'Modes Manager', 'Resume Intelligence', 'JD Intelligence',
    'Company Research', 'Context Intelligence', 'Negotiation Coaching',
];

// ─── Live trial countdown ──────────────────────────────────────
function TrialCountdown({ expiresAt }: { expiresAt: string }) {
    const [remaining, setRemaining] = useState(() =>
        Math.max(0, new Date(expiresAt).getTime() - Date.now())
    );
    useEffect(() => {
        const id = setInterval(() =>
            setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now())), 500);
        return () => clearInterval(id);
    }, [expiresAt]);
    const totalSec  = Math.ceil(remaining / 1000);
    const m         = Math.floor(totalSec / 60);
    const s         = totalSec % 60;
    const isWarning = remaining < 2 * 60 * 1000;
    return (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold tabular-nums ${
            isWarning
                ? 'bg-amber-500/10 border border-amber-500/25 text-amber-400'
                : 'bg-white/[0.05] border border-white/[0.08] text-text-secondary'
        }`}>
            <Clock size={10} strokeWidth={2.5} />
            {remaining === 0 ? 'Ended' : `${m}:${s.toString().padStart(2, '0')}`}
        </div>
    );
}

// ─── Trial usage row ──────────────────────────────────────────
function TrialMeter({ icon: Icon, used, limit, label, unit }: {
    icon: React.ElementType; used: number; limit: number; label: string; unit: string;
}) {
    const pct    = Math.min(100, limit > 0 ? (used / limit) * 100 : 0);
    const isHigh = pct >= 80;
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <Icon size={10} strokeWidth={2} className={isHigh ? 'text-amber-400' : 'text-text-tertiary'} />
                    <span className="text-[10.5px] text-text-secondary font-medium">{label}</span>
                </div>
                <span className={`text-[10.5px] tabular-nums font-semibold ${isHigh ? 'text-amber-400' : 'text-text-primary'}`}>
                    {used}<span className="font-normal text-text-tertiary">/{limit}{unit}</span>
                </span>
            </div>
            <div className="h-[2px] w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div
                    className={`h-full rounded-full transition-all duration-500 ${isHigh ? 'bg-amber-400' : 'bg-[var(--accent-primary)]'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

// ─── Usage stat cell ──────────────────────────────────────────
function UsageStat({ icon: Icon, label, bucket, color, barColor }: {
    icon: React.ElementType; label: string; bucket: QuotaBucket; color: string; barColor: string;
}) {
    const pct    = bucket.limit > 0 ? Math.min(100, (bucket.used / bucket.limit) * 100) : 0;
    const isHigh = pct >= 80;
    return (
        <div className="flex flex-col gap-3 px-4 py-4">
            <div className="flex items-center gap-1.5">
                <Icon size={11} strokeWidth={2} className="text-text-tertiary" />
                <span className="text-[10px] font-semibold text-text-tertiary uppercase tracking-[0.08em]">{label}</span>
            </div>
            <div>
                <div className="flex items-end gap-1.5 mb-2.5">
                    <span className={`text-[28px] font-bold tabular-nums tracking-tight leading-none ${isHigh ? 'text-amber-400' : color}`}>
                        {bucket.used.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-text-tertiary/50 mb-1 font-medium">
                        / {bucket.limit.toLocaleString()}
                    </span>
                </div>
                <div className="h-[2px] w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${isHigh ? 'bg-amber-400' : barColor}`}
                        style={{ width: `${pct}%` }}
                    />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                    <span className={`text-[10px] tabular-nums font-medium ${isHigh ? 'text-amber-400' : 'text-text-tertiary'}`}>
                        {Math.round(pct)}% used
                    </span>
                    {isHigh && (
                        <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Near limit</span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Section header ───────────────────────────────────────────
function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.12em]">
                {children}
            </span>
            {action}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
//   NATIVELY PRO — Combined settings page
// ═══════════════════════════════════════════════════════════════
export const NativelyProSettings: React.FC = () => {
    // ── API key state ────────────────────────────────────────
    const [apiKey,         setApiKey]         = useState('');
    const [isApiSaved,     setIsApiSaved]     = useState(false);
    const [isLoadingApi,   setIsLoadingApi]   = useState(true);
    const [isSavingApi,    setIsSavingApi]    = useState(false);
    const [apiError,       setApiError]       = useState<string | null>(null);
    const [justSavedApi,   setJustSavedApi]   = useState(false);

    // ── Usage state ──────────────────────────────────────────
    const [usageData,      setUsageData]      = useState<UsageData | null>(null);
    const [usageError,     setUsageError]     = useState<string | null>(null);
    const [isLoadingUsage, setIsLoadingUsage] = useState(false);

    // ── License state ────────────────────────────────────────
    const [licenseKey,     setLicenseKey]     = useState('');
    const [hardwareId,     setHardwareId]     = useState('');
    const [licStatus,      setLicStatus]      = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [licError,       setLicError]       = useState('');
    const [copiedHwid,     setCopiedHwid]     = useState(false);
    const [isPremium,      setIsPremium]      = useState<boolean | null>(null);

    // ── Trial state ──────────────────────────────────────────
    const [trialState, setTrialState] = useState<{
        active:    boolean;
        expired:   boolean;
        expiresAt: string;
        startedAt: string;
        usage:     { ai: number; stt_seconds: number; search: number };
    } | null>(null);
    const [isCheckingTrial, setIsCheckingTrial] = useState(true);
    const [trialLoading,    setTrialLoading]    = useState(false);
    const [trialError,      setTrialError]      = useState<string | null>(null);
    const [showTrialModal,  setShowTrialModal]  = useState(false);
    const trialPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // ── Init: API key ────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const creds = await window.electronAPI.getStoredCredentials();
                if (creds.hasNativelyKey) { setApiKey('•'.repeat(24)); setIsApiSaved(true); }
            } catch (e) { console.error('[NativelyPro]', e); }
            finally { setIsLoadingApi(false); }
        })();
    }, []);

    // ── Init: License ────────────────────────────────────────
    const refreshLicense = useCallback(async () => {
        try {
            const details = await window.electronAPI?.licenseGetDetails?.();
            setIsPremium(details?.isPremium ?? false);
        } catch {
            const check = window.electronAPI?.licenseCheckPremiumAsync ?? window.electronAPI?.licenseCheckPremium;
            setIsPremium(check ? await check() : false);
        }
    }, []);

    useEffect(() => {
        window.electronAPI?.licenseGetHardwareId?.().then(setHardwareId).catch(() => setHardwareId('unavailable'));
        refreshLicense();
        // @ts-ignore
        window.electronAPI?.onLicenseStatusChanged?.(refreshLicense);
    }, [refreshLicense]);

    // ── Usage fetch ──────────────────────────────────────────
    const fetchUsage = useCallback(async () => {
        setIsLoadingUsage(true);
        setUsageError(null);
        try {
            const r = await window.electronAPI.getNativelyUsage();
            if (r.ok && r.quota) {
                setUsageData(r as UsageData);
            } else {
                setUsageError(
                    r.error === 'subscription_inactive' ? 'Subscription inactive — renew to restore access.'
                    : r.error === 'key_not_found'       ? 'Key not recognised by server.'
                    : r.error === 'invalid_key_format'  ? 'Invalid key format.'
                    : r.error === 'network_error' || r.error?.includes('fetch')
                                                        ? 'Could not reach server.'
                    : `Server error: ${r.error ?? 'unknown'}`
                );
            }
        } catch { setUsageError('Failed to load usage.'); }
        finally  { setIsLoadingUsage(false); }
    }, []);

    useEffect(() => { if (isApiSaved && !isLoadingApi) fetchUsage(); }, [isApiSaved, isLoadingApi, fetchUsage]);

    // ── Trial ────────────────────────────────────────────────
    const refreshTrial = useCallback(async () => {
        const res = await window.electronAPI?.getTrialStatus?.();
        if (!res?.ok) return;
        localStorage.setItem('natively_trial_claimed', 'true');
        setTrialState({
            active:    !(res.expired ?? false),
            expired:   res.expired   ?? false,
            expiresAt: res.expires_at ?? '',
            startedAt: res.started_at ?? '',
            usage:     res.usage      ?? { ai: 0, stt_seconds: 0, search: 0 },
        });
        if (res.expired) {
            setShowTrialModal(true);
            if (trialPollRef.current) { clearInterval(trialPollRef.current); trialPollRef.current = null; }
        }
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const local = await window.electronAPI?.getLocalTrial?.();
                if (!local?.hasToken) {
                    if (local?.trialClaimed) localStorage.setItem('natively_trial_claimed', 'true');
                    return;
                }
                localStorage.setItem('natively_trial_claimed', 'true');
                if (local.expired) {
                    setTrialState({ active: false, expired: true, expiresAt: local.expiresAt ?? '', startedAt: local.startedAt ?? '', usage: { ai: 0, stt_seconds: 0, search: 0 } });
                    setShowTrialModal(true);
                    refreshTrial();
                    return;
                }
                setTrialState({ active: true, expired: false, expiresAt: local.expiresAt ?? '', startedAt: local.startedAt ?? '', usage: { ai: 0, stt_seconds: 0, search: 0 } });
                refreshTrial();
                trialPollRef.current = setInterval(refreshTrial, 15_000);
            } finally {
                setIsCheckingTrial(false);
            }
        })();
        return () => { if (trialPollRef.current) clearInterval(trialPollRef.current); };
    }, [refreshTrial]);

    const handleStartTrial = async () => {
        setTrialLoading(true);
        setTrialError(null);
        try {
            const res = await window.electronAPI?.startTrial?.();
            if (!res?.ok) {
                if (res?.error === 'trial_ip_limit' || res?.error === 'trial_start_rate_limited') {
                    localStorage.setItem('natively_trial_claimed', 'true');
                    setTrialState({ active: false, expired: true, expiresAt: '', startedAt: '', usage: { ai: 0, stt_seconds: 0, search: 0 } });
                    return;
                }
                setTrialError(res?.error === 'invalid_hwid'
                    ? 'Could not read device ID. Restart the app and try again.'
                    : res?.error || 'Could not start trial. Try again.');
                return;
            }
            localStorage.setItem('natively_trial_claimed', 'true');
            if (res.already_used && res.expired) {
                setTrialState({ active: false, expired: true, expiresAt: '', startedAt: '', usage: { ai: 0, stt_seconds: 0, search: 0 } });
                return;
            }
            setTrialState({
                active:    !(res.expired ?? false),
                expired:   res.expired   ?? false,
                expiresAt: res.expires_at ?? '',
                startedAt: res.started_at ?? '',
                usage:     res.usage      ?? { ai: 0, stt_seconds: 0, search: 0 },
            });
            if (!res.expired) trialPollRef.current = setInterval(refreshTrial, 30_000);
        } catch (e: any) {
            setTrialError(e.message || 'Network error');
        } finally {
            setTrialLoading(false);
        }
    };

    const handleByok    = async () => { await window.electronAPI?.endTrialByok?.(); };
    const handleTrialDone = () => { setTrialState(null); setShowTrialModal(false); };

    // ── API key handlers ─────────────────────────────────────
    const handleSaveApiKey = async () => {
        if (!apiKey.trim() || apiKey.includes('•')) return;
        setIsSavingApi(true); setApiError(null);
        try {
            const r = await window.electronAPI.setNativelyApiKey(apiKey.trim());
            if (r.success) {
                setApiKey('•'.repeat(24)); setIsApiSaved(true); setJustSavedApi(true);
                setTimeout(() => setJustSavedApi(false), 2500);
                // @ts-ignore
                window.electronAPI?.setDefaultModel?.('natively').catch(console.error);
                // @ts-ignore
                window.electronAPI?.setSttProvider?.('natively').catch(console.error);
            } else { setApiError(r.error || 'Failed to save API key'); }
        } catch (e: any) { setApiError(e.message || 'Unexpected error'); }
        finally { setIsSavingApi(false); }
    };

    const handleClearApiKey = () => {
        setApiKey(''); setIsApiSaved(false); setApiError(null); setUsageData(null); setUsageError(null);
        window.electronAPI.setNativelyApiKey('').catch(() => {});
    };

    // ── License handlers ─────────────────────────────────────
    const handleActivateLicense = async () => {
        if (!licenseKey.trim()) return;
        setLicStatus('loading'); setLicError('');
        try {
            const result = await window.electronAPI?.licenseActivate?.(licenseKey.trim());
            if (result?.success) {
                setLicStatus('success'); setLicenseKey('');
                setTimeout(() => { refreshLicense(); setLicStatus('idle'); }, 1200);
            } else {
                setLicStatus('error');
                setLicError(result?.error || 'Activation failed. Please try again.');
            }
        } catch (e: any) {
            setLicStatus('error');
            setLicError(e.message || 'Activation failed.');
        }
    };

    const handleDeactivateLicense = async () => {
        try { await window.electronAPI?.licenseDeactivate?.(); refreshLicense(); }
        catch (e: any) { setLicError(e.message || 'Deactivation failed.'); }
    };

    const copyHardwareId = () => {
        navigator.clipboard.writeText(hardwareId);
        setCopiedHwid(true);
        setTimeout(() => setCopiedHwid(false), 2000);
    };

    const openExternal = (url: string) => { (window.electronAPI as any)?.openExternal?.(url); };

    // ── Derived ──────────────────────────────────────────────
    const isApiDirty   = apiKey.length > 0 && !apiKey.includes('•') && !isApiSaved;
    const planLabel    = usageData?.plan ? usageData.plan.charAt(0).toUpperCase() + usageData.plan.slice(1) : null;
    const fmtDate      = (iso: string) => { try { return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch { return iso; } };
    const showTrialBanner = trialState?.active === true;
    const showOnboardingHero = !isLoadingApi && !isApiSaved && !isCheckingTrial
        && (!trialState || (trialState.expired && !trialState.active))
        && localStorage.getItem('natively_trial_claimed') !== 'true';

    // Initial loading shim (license still resolving)
    if (isPremium === null) {
        return (
            <div className="p-8 flex justify-center">
                <div className="w-5 h-5 border-2 border-[var(--accent-primary)] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-7">

            {showTrialModal && trialState && (
                <FreeTrialModal
                    usage={trialState.usage}
                    onByok={handleByok}
                    onDone={handleTrialDone}
                />
            )}

            {/* ═══════════════════════════════════════════════════
                HERO — Status overview
            ═══════════════════════════════════════════════════ */}
            <div className="space-y-2.5">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-[18px] font-bold text-text-primary tracking-[-0.025em] leading-tight">
                            Natively Pro
                        </h2>
                        <p className="text-[12px] text-text-tertiary mt-0.5 leading-snug">
                            Managed AI, transcription, and your desktop license — in one place.
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        {isApiSaved && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                                <span className="text-[10px] font-bold text-emerald-500 tracking-wide">
                                    {planLabel ?? 'API Connected'}
                                </span>
                            </div>
                        )}
                        {isPremium && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/10 border border-amber-400/20">
                                <Sparkles size={9} className="text-amber-400" strokeWidth={2.5} />
                                <span className="text-[10px] font-bold text-amber-400 tracking-wide">Pro Active</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Hero stat ribbon (when api connected) */}
                {isApiSaved && usageData && (
                    <div
                        className="rounded-2xl overflow-hidden relative"
                        style={{ background: '#0d0f14', border: '1px solid rgba(255,255,255,0.07)' }}
                    >
                        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, var(--accent-primary), transparent 65%)' }} />
                        <div className="flex items-center justify-between px-5 pt-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="flex items-center gap-2">
                                <Activity size={13} className="text-text-tertiary" strokeWidth={1.75} />
                                <span className="text-[12px] font-semibold text-text-primary">Usage this month</span>
                                <span className="text-[10.5px] text-text-tertiary">
                                    · resets {fmtDate(usageData.quota.resets_at)}
                                </span>
                            </div>
                            <button
                                onClick={fetchUsage}
                                disabled={isLoadingUsage}
                                className="flex items-center gap-1 text-[10.5px] text-text-tertiary hover:text-text-secondary transition-colors disabled:opacity-40 cursor-pointer"
                            >
                                <RefreshCw size={10} className={isLoadingUsage ? 'animate-spin' : ''} strokeWidth={2} />
                                Refresh
                            </button>
                        </div>
                        <div className="grid grid-cols-3 divide-x" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                            <UsageStat icon={Mic}    label="STT mins"  bucket={usageData.quota.transcription} color="text-blue-400"    barColor="bg-blue-500"    />
                            <UsageStat icon={Brain}  label="AI calls"  bucket={usageData.quota.ai}            color="text-violet-400"  barColor="bg-violet-500"  />
                            <UsageStat icon={Search} label="Searches"  bucket={usageData.quota.search}        color="text-emerald-400" barColor="bg-emerald-500" />
                        </div>
                    </div>
                )}

                {/* Loading skeleton for hero stats */}
                {isApiSaved && isLoadingUsage && !usageData && (
                    <div className="rounded-2xl overflow-hidden" style={{ background: '#0d0f14', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="grid grid-cols-3 divide-x" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                            {[0, 1, 2].map(i => (
                                <div key={i} className="px-4 py-4 space-y-3">
                                    <div className="h-2 w-12 rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.08)' }} />
                                    <div className="h-7 w-16 rounded-lg animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
                                    <div className="h-[2px] w-full rounded-full animate-pulse" style={{ background: 'rgba(255,255,255,0.06)' }} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Usage error */}
                {isApiSaved && usageError && !usageData && (
                    <div
                        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[12px] text-red-400"
                        style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}
                    >
                        <AlertCircle size={13} className="shrink-0" /> {usageError}
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════
                ACTIVE TRIAL BANNER
            ═══════════════════════════════════════════════════ */}
            {showTrialBanner && (() => {
                const sttMin = Math.round(trialState!.usage.stt_seconds / 60);
                return (
                    <div className="rounded-2xl overflow-hidden" style={{ background: '#0d0f14', border: '1px solid var(--accent-border)' }}>
                        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, var(--accent-primary), transparent)' }} />
                        <div className="px-5 pt-4 pb-5 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent-border)' }}>
                                        <NativelyLogoMark size={14} className="text-accent-primary" />
                                    </div>
                                    <div>
                                        <p className="text-[13px] font-bold text-text-primary tracking-tight">Free Trial Active</p>
                                        <p className="text-[10px] text-text-tertiary mt-0.5">
                                            {trialState!.usage.ai} AI · {sttMin}m STT · {trialState!.usage.search} searches used
                                        </p>
                                    </div>
                                </div>
                                <TrialCountdown expiresAt={trialState!.expiresAt} />
                            </div>
                            <div className="space-y-2.5 px-1">
                                <TrialMeter icon={Zap}    used={trialState!.usage.ai}    limit={10} label="AI requests"     unit=""  />
                                <TrialMeter icon={Mic}    used={sttMin}                  limit={10} label="Transcription"   unit="m" />
                                <TrialMeter icon={Search} used={trialState!.usage.search} limit={2}  label="Web searches"    unit=""  />
                            </div>
                            <button
                                onClick={() => setShowTrialModal(true)}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12.5px] font-bold text-white transition-opacity duration-150 hover:opacity-90 active:scale-[0.98] cursor-pointer"
                                style={{ background: 'var(--accent-primary)' }}
                            >
                                Choose a plan — keep going
                                <ChevronRight size={13} strokeWidth={2.5} />
                            </button>
                        </div>
                    </div>
                );
            })()}

            {/* ═══════════════════════════════════════════════════
                ONBOARDING HERO (no key, no trial claimed)
            ═══════════════════════════════════════════════════ */}
            {showOnboardingHero && (
                <div
                    className="rounded-2xl overflow-hidden relative"
                    style={{ background: 'rgba(217,119,87,0.06)', border: '1px solid rgba(217,119,87,0.18)' }}
                >
                    <div style={{
                        position: 'absolute', top: -50, right: -50,
                        width: 220, height: 220, borderRadius: '50%',
                        background: 'radial-gradient(circle, rgba(217,119,87,0.16) 0%, transparent 70%)',
                        pointerEvents: 'none',
                    }} />
                    <div className="relative px-5 pt-5 pb-5 flex flex-col gap-4">
                        <div className="flex items-center gap-2 w-fit">
                            <span
                                className="w-[5px] h-[5px] rounded-full shrink-0"
                                style={{ background: '#d97757', boxShadow: '0 0 6px rgba(217,119,87,0.9)' }}
                            />
                            <span className="text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color: '#d97757' }}>
                                Free Trial
                            </span>
                        </div>
                        <div>
                            <h3 className="text-[20px] font-bold tracking-[-0.03em] leading-[1.2] text-text-primary">
                                Managed transcription,<br />
                                <span style={{
                                    background: 'linear-gradient(90deg, #d97757 0%, #e8956a 50%, #d97757 100%)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                }}>
                                    AI &amp; search.
                                </span>
                            </h3>
                            <p className="text-[12px] mt-2 leading-[1.65]" style={{ color: 'rgba(226,229,237,0.40)', maxWidth: 340 }}>
                                Real-time transcription that follows every word. AI that understands context. Web search that surfaces what matters — available instantly. No account needed.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                            {[
                                { text: 'Real-time transcription', accent: true  },
                                { text: 'No account · No card',    accent: false },
                                { text: 'AI summaries & replies',  accent: true  },
                                { text: 'Web search integration',  accent: true  },
                            ].map(({ text, accent }) => (
                                <div key={text} className="flex items-center gap-2">
                                    <svg width="10" height="10" fill="none"
                                        stroke={accent ? 'rgba(217,119,87,0.75)' : 'rgba(226,229,237,0.25)'}
                                        strokeWidth="2.2" viewBox="0 0 24 24">
                                        <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    <span className="text-[11px]" style={{ color: accent ? 'rgba(226,229,237,0.72)' : 'rgba(226,229,237,0.38)' }}>
                                        {text}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center gap-2.5">
                            <button
                                onClick={handleStartTrial}
                                disabled={trialLoading}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-semibold text-white transition-opacity hover:opacity-85 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg, #d97757, #b05530)', border: '1px solid rgba(217,119,87,0.40)' }}
                            >
                                {trialLoading
                                    ? <><Loader2 size={12} className="animate-spin" /> Starting…</>
                                    : <>Try it free <ArrowUpRight size={11} strokeWidth={2.5} /></>
                                }
                            </button>
                            <button
                                onClick={() => openExternal('https://natively.software/api')}
                                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-medium transition-all cursor-pointer"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(226,229,237,0.55)' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'rgba(226,229,237,0.85)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(226,229,237,0.55)'; }}
                            >
                                View docs
                            </button>
                        </div>
                        {trialError && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11.5px] text-red-400" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)' }}>
                                <AlertCircle size={12} className="shrink-0" strokeWidth={2} />
                                {trialError}
                            </div>
                        )}
                        <div className="grid grid-cols-4 gap-2 pt-1" style={{ borderTop: '1px solid rgba(217,119,87,0.10)' }}>
                            {[
                                { value: '30',  unit: 'min',      label: 'window'   },
                                { value: '10',  unit: 'requests', label: 'AI'       },
                                { value: '10',  unit: 'min',      label: 'speech'   },
                                { value: '2',   unit: '',         label: 'searches' },
                            ].map(({ value, unit, label }) => (
                                <div
                                    key={label}
                                    className="flex flex-col items-center py-2.5 rounded-xl gap-0.5"
                                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
                                >
                                    <span className="text-[15px] font-bold leading-none" style={{ color: 'rgba(226,229,237,0.88)', letterSpacing: '-0.02em' }}>
                                        {value}<span className="text-[10px] font-medium ml-0.5" style={{ color: 'rgba(226,229,237,0.38)' }}>{unit}</span>
                                    </span>
                                    <span className="text-[9.5px] font-medium uppercase tracking-[0.07em]" style={{ color: 'rgba(226,229,237,0.28)' }}>
                                        {label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════
                LICENSE
            ═══════════════════════════════════════════════════ */}
            <div>
                <SectionLabel>License</SectionLabel>

                {isPremium ? (
                    <div className="rounded-2xl overflow-hidden" style={{ background: '#0d0f14', border: '1px solid rgba(52,211,153,0.20)' }}>
                        <div className="h-[2px]" style={{ background: 'linear-gradient(90deg, #34d399, transparent)' }} />
                        <div className="px-5 pt-5 pb-5 space-y-5">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0"
                                    style={{ background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.20)' }}
                                >
                                    <CheckCircle size={20} className="text-emerald-400" strokeWidth={1.75} />
                                </div>
                                <div>
                                    <p className="text-[13.5px] font-bold text-text-primary tracking-tight">Pro license active</p>
                                    <p className="text-[10.5px] text-text-tertiary mt-0.5">This device is fully authorised</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                                {FEATURES_ACTIVE.map((f) => (
                                    <div key={f} className="flex items-center gap-2">
                                        <svg width="10" height="10" fill="none" stroke="rgba(52,211,153,0.70)" strokeWidth="2.2" viewBox="0 0 24 24">
                                            <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        <span className="text-[11px]" style={{ color: 'rgba(226,229,237,0.60)' }}>{f}</span>
                                    </div>
                                ))}
                            </div>
                            <button
                                onClick={handleDeactivateLicense}
                                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12.5px] font-semibold transition-opacity hover:opacity-90 active:scale-[0.98] cursor-pointer"
                                style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.18)', color: '#f87171' }}
                            >
                                <X size={13} strokeWidth={2.5} />
                                Deactivate this device
                            </button>
                            <p className="text-[10.5px] text-text-tertiary text-center leading-relaxed -mt-2">
                                Deactivating frees this device so you can activate the license elsewhere.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-2xl overflow-hidden" style={{ background: '#0d0f14', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex items-center justify-between px-5 pt-4 pb-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="flex items-center gap-2">
                                <Lock size={12} className="text-text-tertiary" strokeWidth={2} />
                                <span className="text-[12px] font-semibold text-text-primary">License Key</span>
                            </div>
                            <span className="text-[10.5px] text-text-tertiary">From your purchase email</span>
                        </div>
                        <div className="px-5 pt-4 pb-5 space-y-3">
                            <input
                                type="text"
                                value={licenseKey}
                                onChange={e => { setLicenseKey(e.target.value); setLicError(''); }}
                                onKeyDown={e => e.key === 'Enter' && handleActivateLicense()}
                                placeholder="NK-XXXX-XXXX-XXXX-XXXX"
                                disabled={licStatus === 'loading' || licStatus === 'success'}
                                spellCheck={false}
                                autoComplete="off"
                                className="w-full rounded-xl px-3.5 py-2.5 text-[13px] font-mono text-text-primary
                                    placeholder:text-text-tertiary/40 placeholder:font-sans
                                    focus:outline-none transition-all duration-150
                                    shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]
                                    focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-bg)]
                                    disabled:opacity-50"
                                style={{ background: '#111419', border: '1px solid rgba(255,255,255,0.08)' }}
                            />
                            {licStatus === 'error' && licError && (
                                <div
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-red-400"
                                    style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}
                                >
                                    <AlertCircle size={13} className="shrink-0" strokeWidth={2} />
                                    {licError}
                                </div>
                            )}
                            <button
                                onClick={handleActivateLicense}
                                disabled={!licenseKey.trim() || licStatus === 'loading' || licStatus === 'success'}
                                className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                                style={
                                    licStatus === 'success'
                                        ? { background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.20)', color: '#34d399' }
                                        : !licenseKey.trim() || licStatus === 'loading'
                                        ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(226,229,237,0.35)', cursor: licStatus === 'loading' ? 'wait' : 'default' }
                                        : { background: 'var(--accent-primary)', border: '1px solid transparent', color: '#fff' }
                                }
                            >
                                {licStatus === 'loading'  ? <><Loader2 size={13} className="animate-spin" /> Verifying…</>
                                : licStatus === 'success' ? <><CheckCircle size={13} /> Activated!</>
                                :                          <><Lock size={13} strokeWidth={2} /> Activate license</>}
                            </button>
                            <p className="text-[10.5px] text-text-tertiary text-center leading-relaxed">
                                Don't have a license?{' '}
                                <span
                                    onClick={() => openExternal(PURCHASE_LIFETIME_URL)}
                                    className="text-accent-primary hover:text-accent-hover cursor-pointer transition-colors"
                                >
                                    Get Pro
                                </span>
                                {' '}· By activating, you agree to the{' '}
                                <span
                                    onClick={() => openExternal('https://natively.software/nativelypro/t&c')}
                                    className="text-text-secondary hover:text-text-primary underline underline-offset-2 cursor-pointer transition-colors"
                                    style={{ textDecorationColor: 'rgba(255,255,255,0.12)' }}
                                >
                                    Terms
                                </span>
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════
                API KEY
            ═══════════════════════════════════════════════════ */}
            <div>
                <SectionLabel>API Key</SectionLabel>
                <div className="rounded-2xl overflow-hidden" style={{ background: '#0d0f14', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center justify-between px-5 pt-4 pb-3.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center gap-2">
                            <Key size={12} className="text-text-tertiary" strokeWidth={2} />
                            <span className="text-[12px] font-semibold text-text-primary">Natively API Key</span>
                        </div>
                        {isApiSaved ? (
                            <button
                                onClick={handleClearApiKey}
                                className="flex items-center gap-1 text-[11px] text-red-400/70 hover:text-red-400 transition-colors cursor-pointer"
                            >
                                <Trash2 size={11} strokeWidth={2} />
                                Remove
                            </button>
                        ) : (
                            <span className="text-[10.5px] text-text-tertiary">From your subscription email</span>
                        )}
                    </div>
                    <div className="px-5 pt-4 pb-5 space-y-3">
                        <input
                            type="text"
                            value={apiKey}
                            onChange={e => { setApiKey(e.target.value); setIsApiSaved(false); setApiError(null); }}
                            onKeyDown={e => e.key === 'Enter' && handleSaveApiKey()}
                            placeholder="natively_api_..."
                            spellCheck={false}
                            autoComplete="off"
                            className={`w-full rounded-xl px-3.5 py-2.5 text-[13px] font-mono text-text-primary
                                placeholder:text-text-tertiary/40 placeholder:font-sans
                                focus:outline-none transition-all duration-150
                                shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)]
                                ${apiError
                                    ? 'border-red-500/40 focus:border-red-500/60 focus:ring-1 focus:ring-red-500/15'
                                    : 'focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-bg)]'
                                }`}
                            style={{
                                background: '#111419',
                                border: apiError ? '1px solid rgba(248,113,113,0.35)' : '1px solid rgba(255,255,255,0.08)',
                            }}
                        />
                        {apiError && (
                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] text-red-400" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)' }}>
                                <AlertCircle size={13} className="shrink-0" /> {apiError}
                            </div>
                        )}
                        <button
                            onClick={handleSaveApiKey}
                            disabled={isSavingApi || !isApiDirty}
                            className={`w-full py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]
                                ${isSavingApi    ? 'opacity-50 cursor-wait'
                                : justSavedApi   ? ''
                                : !isApiDirty    ? 'cursor-default opacity-40'
                                :                  'hover:opacity-90'
                                }`}
                            style={
                                justSavedApi
                                    ? { background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.20)', color: '#34d399' }
                                    : !isApiDirty || isSavingApi
                                    ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(226,229,237,0.35)' }
                                    : { background: 'var(--accent-primary)', border: '1px solid transparent', color: '#fff' }
                            }
                        >
                            {isSavingApi  ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                            : justSavedApi ? <><CheckCircle size={13} /> Saved</>
                            :                'Save key'}
                        </button>
                        <p className="text-[10.5px] text-text-tertiary text-center leading-relaxed">
                            Don't have a key?{' '}
                            <span
                                onClick={() => openExternal(PLAN_BASIC_URL)}
                                className="text-accent-primary hover:text-accent-hover cursor-pointer transition-colors"
                            >
                                Subscribe to get one
                            </span>
                            {' '}· By saving, you agree to our{' '}
                            <span
                                onClick={() => openExternal('https://natively.software/nativelyapi/t&c')}
                                className="text-text-secondary hover:text-text-primary underline underline-offset-2 cursor-pointer transition-colors"
                                style={{ textDecorationColor: 'rgba(255,255,255,0.12)' }}
                            >
                                Terms
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                PLANS
            ═══════════════════════════════════════════════════ */}
            <div>
                <SectionLabel
                    action={
                        <div
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md"
                            style={{ background: 'rgba(217,119,87,0.08)', border: '1px solid rgba(217,119,87,0.18)' }}
                        >
                            <span className="text-[10px] font-medium" style={{ color: 'rgba(217,119,87,0.92)' }}>
                                Use <strong className="font-bold">INSIDER25</strong> for 25% off
                            </span>
                        </div>
                    }
                >
                    Plans
                </SectionLabel>

                <div className="grid grid-cols-3 gap-2.5">
                    {PLANS.map((plan) => {
                        const currentPlan = usageData?.plan?.toLowerCase();
                        const isApiActive = currentPlan === plan.name.toLowerCase();
                        const isLifetimeActive = plan.id === 'lifetime' && isPremium;
                        const isActive    = isApiActive || isLifetimeActive;
                        const isPopular   = (plan as any).popular === true;

                        return (
                            <div
                                key={plan.name}
                                className="rounded-xl overflow-hidden flex flex-col relative"
                                style={{
                                    background: isPopular ? 'rgba(217,119,87,0.06)' : '#111419',
                                    border: isPopular
                                        ? '1px solid rgba(217,119,87,0.28)'
                                        : '1px solid rgba(255,255,255,0.07)',
                                }}
                            >
                                <div className="h-[2px] w-full" style={{ background: plan.accent }} />

                                <div className="px-4 pt-3.5 pb-4 flex flex-col flex-1 gap-3">
                                    {isPopular && (
                                        <div className="flex justify-center">
                                            <span
                                                className="text-[8.5px] font-bold uppercase tracking-[0.09em] px-2.5 py-1 rounded-md"
                                                style={{ background: 'rgba(217,119,87,0.12)', border: '1px solid rgba(217,119,87,0.22)', color: '#d97757' }}
                                            >
                                                Most popular
                                            </span>
                                        </div>
                                    )}

                                    <div>
                                        <p
                                            className="text-[11px] font-bold mb-2"
                                            style={{ color: plan.accent, letterSpacing: '0.02em' }}
                                        >
                                            {plan.name}
                                        </p>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-[22px] font-bold tracking-tight leading-none text-text-primary">
                                                {plan.price}
                                            </span>
                                            <span className="text-[10px] text-text-tertiary">{plan.period}</span>
                                        </div>
                                        <p className="text-[10px] text-text-tertiary mt-1">{plan.tagline}</p>
                                    </div>

                                    <div
                                        className="h-px"
                                        style={{ background: isPopular ? 'rgba(217,119,87,0.15)' : 'rgba(255,255,255,0.06)' }}
                                    />

                                    <div className="space-y-1.5 flex-1">
                                        {plan.features.map((f) => (
                                            <div key={f.text} className="flex items-start gap-2">
                                                <svg width="10" height="10" fill="none"
                                                    stroke={f.highlight ? plan.accent : 'rgba(226,229,237,0.28)'}
                                                    strokeWidth="2" viewBox="0 0 24 24"
                                                    className="mt-[3px] shrink-0"
                                                >
                                                    <polyline points="20 6 9 17 4 12" />
                                                </svg>
                                                <span
                                                    className="text-[11px] leading-snug"
                                                    style={{ color: f.highlight ? 'rgba(226,229,237,0.78)' : 'rgba(226,229,237,0.45)' }}
                                                >
                                                    {f.text}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {isActive ? (
                                        <div
                                            className="w-full py-2 rounded-lg text-[11.5px] font-bold text-center"
                                            style={{ background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.20)', color: '#34d399' }}
                                        >
                                            ✓ Active
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => openExternal(plan.url)}
                                            className="w-full py-2 rounded-lg text-[11.5px] font-bold flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90 active:scale-[0.98] cursor-pointer"
                                            style={isPopular
                                                ? { background: 'linear-gradient(135deg, #d97757, #b05530)', border: '1px solid rgba(217,119,87,0.40)', color: '#fff' }
                                                : { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(226,229,237,0.72)' }
                                            }
                                        >
                                            Get {plan.name} <ArrowUpRight size={10} strokeWidth={2.5} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Secondary CTAs */}
                <div className="flex items-center justify-between mt-3">
                    <button
                        onClick={() => openExternal(PURCHASE_YEARLY_URL)}
                        className="text-[11px] font-medium transition-colors cursor-pointer"
                        style={{ color: 'rgba(226,229,237,0.50)', background: 'none', border: 'none' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(226,229,237,0.85)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(226,229,237,0.50)'; }}
                    >
                        Prefer yearly? →
                    </button>
                    <button
                        onClick={() => openExternal('https://natively.software/pro')}
                        className="flex items-center gap-1.5 text-[11px] font-medium transition-colors cursor-pointer"
                        style={{ color: 'rgba(226,229,237,0.50)', background: 'none', border: 'none' }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'rgba(226,229,237,0.85)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(226,229,237,0.50)'; }}
                    >
                        <PlayCircle size={11} strokeWidth={2} />
                        Watch demo
                    </button>
                </div>

                <div className="flex items-start gap-2 mt-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Info size={10} className="text-text-tertiary shrink-0 mt-[1px]" strokeWidth={2} />
                    <p className="text-[10.5px] text-text-tertiary leading-relaxed">
                        AI requests include chat replies, meeting summaries, and embeddings. Premium bundles the Pro desktop licence; Lifetime is a one-time purchase that lasts forever.
                    </p>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════
                REFUND + DEVICE ID — footer
            ═══════════════════════════════════════════════════ */}
            <div className="space-y-4 pt-1">
                <div className="h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />

                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Shield size={11} className="text-text-tertiary shrink-0" strokeWidth={1.75} />
                        <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-[0.12em]">Refund Policy</span>
                    </div>
                    <p className="text-[11px] text-text-tertiary leading-relaxed">
                        24-hour refund window from purchase or activation. Voucher and discount-code purchases (including{' '}
                        <code
                            className="text-[10px] font-mono px-1 py-0.5 rounded"
                            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                            INSIDER25
                        </code>
                        ) are final sale. Questions?{' '}
                        <span
                            onClick={() => openExternal('mailto:natively.contact@gmail.com')}
                            className="text-text-secondary hover:text-text-primary underline underline-offset-2 cursor-pointer transition-colors"
                            style={{ textDecorationColor: 'rgba(255,255,255,0.12)' }}
                        >
                            Email us
                        </span>
                        {' '}or read the full{' '}
                        <span
                            onClick={() => openExternal('https://natively.software/refundpolicy')}
                            className="text-text-secondary hover:text-text-primary underline underline-offset-2 cursor-pointer transition-colors"
                            style={{ textDecorationColor: 'rgba(255,255,255,0.12)' }}
                        >
                            Refund Policy
                        </span>
                        .
                    </p>
                </div>

                {hardwareId && (
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-[0.12em] font-bold text-text-tertiary">Device ID</span>
                        <div className="flex items-center gap-3">
                            <span className="text-[10.5px] font-mono truncate max-w-[180px]" style={{ color: 'rgba(226,229,237,0.32)' }}>
                                {hardwareId}
                            </span>
                            <button
                                onClick={copyHardwareId}
                                className="flex items-center gap-1 text-[10.5px] font-medium transition-colors text-text-secondary hover:text-text-primary cursor-pointer"
                            >
                                {copiedHwid
                                    ? <Check size={10} className="text-emerald-500" />
                                    : <Copy size={10} />
                                }
                                {copiedHwid ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
};
