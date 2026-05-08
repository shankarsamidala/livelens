import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
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

const PLAN_STARTER_URL = 'https://checkout.dodopayments.com/buy/pdt_0NbFixGmD8CSeawb5qvVl';
const PLAN_PRO_URL     = 'https://checkout.dodopayments.com/buy/pdt_0NcM6Aw0IWdspbsgUeCLA';

// ─── Trial countdown ─────────────────────────────────────────
function TrialCountdown({ expiresAt }: { expiresAt: string }) {
    const [remaining, setRemaining] = useState(() =>
        Math.max(0, new Date(expiresAt).getTime() - Date.now())
    );
    useEffect(() => {
        const id = setInterval(() => setRemaining(Math.max(0, new Date(expiresAt).getTime() - Date.now())), 500);
        return () => clearInterval(id);
    }, [expiresAt]);
    const m = Math.floor(Math.ceil(remaining / 1000) / 60);
    const s = Math.ceil(remaining / 1000) % 60;
    const warn = remaining < 2 * 60 * 1000;
    return (
        <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, fontVariantNumeric: 'tabular-nums', color: warn ? '#fbbf24' : 'rgba(226,229,237,0.40)' }}>
            {remaining === 0 ? 'Ended' : `${m}:${s.toString().padStart(2, '0')}`}
        </span>
    );
}

// ─── Component ───────────────────────────────────────────────
export const LiveLensApiSettings: React.FC = () => {
    const [isSaved,        setIsSaved]        = useState(false);
    const [isLoading,      setIsLoading]      = useState(true);
    const [usageData,      setUsageData]      = useState<UsageData | null>(null);
    const [usageError,     setUsageError]     = useState<string | null>(null);
    const [isLoadingUsage, setIsLoadingUsage] = useState(false);

    const [trialState, setTrialState] = useState<{
        active: boolean; expired: boolean; expiresAt: string; startedAt: string;
        usage: { ai: number; stt_seconds: number; search: number };
    } | null>(null);
    const [isCheckingTrial, setIsCheckingTrial] = useState(true);
    const [trialLoading,    setTrialLoading]    = useState(false);
    const [trialError,      setTrialError]      = useState<string | null>(null);
    const [showTrialModal,  setShowTrialModal]  = useState(false);
    const trialPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const creds = await window.electronAPI.getStoredCredentials();
                if (creds.hasLiveLensKey) { setIsSaved(true); }
            } catch (e) { console.error('[LiveLensApi]', e); }
            finally { setIsLoading(false); }
        })();
    }, []);

    const fetchUsage = useCallback(async () => {
        setIsLoadingUsage(true); setUsageError(null);
        try {
            const r = await window.electronAPI.getLiveLensUsage();
            if (r.ok && r.quota) { setUsageData(r as UsageData); }
            else {
                setUsageError(
                    r.error === 'subscription_inactive' ? 'Subscription inactive — renew to restore access.'
                    : r.error === 'key_not_found'       ? 'Key not recognised by server.'
                    : r.error === 'invalid_key_format'  ? 'Invalid key format.'
                    : r.error === 'network_error' || r.error?.includes('fetch') ? 'Could not reach server.'
                    : `Server error: ${r.error ?? 'unknown'}`
                );
            }
        } catch { setUsageError('Failed to load usage.'); }
        finally  { setIsLoadingUsage(false); }
    }, []);

    useEffect(() => { if (isSaved && !isLoading) fetchUsage(); }, [isSaved, isLoading, fetchUsage]);

    const refreshTrial = useCallback(async () => {
        const res = await window.electronAPI?.getTrialStatus?.();
        if (!res?.ok) return;
        localStorage.setItem('natively_trial_claimed', 'true');
        setTrialState({ active: !(res.expired ?? false), expired: res.expired ?? false, expiresAt: res.expires_at ?? '', startedAt: res.started_at ?? '', usage: res.usage ?? { ai: 0, stt_seconds: 0, search: 0 } });
        if (res.expired) { setShowTrialModal(true); if (trialPollRef.current) { clearInterval(trialPollRef.current); trialPollRef.current = null; } }
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const local = await window.electronAPI?.getLocalTrial?.();
                if (!local?.hasToken) { if (local?.trialClaimed) localStorage.setItem('natively_trial_claimed', 'true'); return; }
                localStorage.setItem('natively_trial_claimed', 'true');
                if (local.expired) {
                    setTrialState({ active: false, expired: true, expiresAt: local.expiresAt ?? '', startedAt: local.startedAt ?? '', usage: { ai: 0, stt_seconds: 0, search: 0 } });
                    setShowTrialModal(true); refreshTrial(); return;
                }
                setTrialState({ active: true, expired: false, expiresAt: local.expiresAt ?? '', startedAt: local.startedAt ?? '', usage: { ai: 0, stt_seconds: 0, search: 0 } });
                refreshTrial();
                trialPollRef.current = setInterval(refreshTrial, 15_000);
            } finally { setIsCheckingTrial(false); }
        })();
        return () => { if (trialPollRef.current) clearInterval(trialPollRef.current); };
    }, [refreshTrial]);

    const handleStartTrial = async () => {
        setTrialLoading(true); setTrialError(null);
        try {
            const res = await window.electronAPI?.startTrial?.();
            if (!res?.ok) {
                if (res?.error === 'trial_ip_limit' || res?.error === 'trial_start_rate_limited') {
                    localStorage.setItem('natively_trial_claimed', 'true');
                    setTrialState({ active: false, expired: true, expiresAt: '', startedAt: '', usage: { ai: 0, stt_seconds: 0, search: 0 } }); return;
                }
                setTrialError(res?.error === 'invalid_hwid' ? 'Could not read device ID. Restart the app and try again.' : res?.error || 'Could not start trial. Try again.'); return;
            }
            localStorage.setItem('natively_trial_claimed', 'true');
            if (res.already_used && res.expired) { setTrialState({ active: false, expired: true, expiresAt: '', startedAt: '', usage: { ai: 0, stt_seconds: 0, search: 0 } }); return; }
            setTrialState({ active: !(res.expired ?? false), expired: res.expired ?? false, expiresAt: res.expires_at ?? '', startedAt: res.started_at ?? '', usage: res.usage ?? { ai: 0, stt_seconds: 0, search: 0 } });
            if (!res.expired) trialPollRef.current = setInterval(refreshTrial, 30_000);
        } catch (e: any) { setTrialError(e.message || 'Network error'); }
        finally { setTrialLoading(false); }
    };

    const handleByok      = async () => { await window.electronAPI?.endTrialByok?.(); };
    const handleTrialDone = () => { setTrialState(null); setShowTrialModal(false); };

    const openExternal = (url: string) => { (window.electronAPI as any)?.openExternal?.(url); };

    const planLabel = usageData?.plan ? usageData.plan.charAt(0).toUpperCase() + usageData.plan.slice(1) : null;
    const isClaimed = trialState?.expired === true || localStorage.getItem('natively_trial_claimed') === 'true';
    const showTrialBox = !isLoading && !isSaved && !isCheckingTrial && !isClaimed;
    const showActiveTrialBox = trialState?.active === true;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Free Trial Modal ─────────────────────────────── */}
            {showTrialModal && trialState && (
                <FreeTrialModal usage={trialState.usage} onByok={handleByok} onDone={handleTrialDone} />
            )}

            {/* ── Hero card ────────────────────────────────────── */}
            <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', padding: '22px 22px 20px', background: 'rgba(217,119,87,0.06)', border: '1px solid rgba(217,119,87,0.16)', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* radial glow */}
                <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(217,119,87,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

                {/* tag */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase' as const, color: '#d97757', width: 'fit-content' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#d97757', boxShadow: '0 0 6px rgba(217,119,87,0.8)', flexShrink: 0, display: 'inline-block' }} />
                    LiveLens API
                    {!isLoading && isSaved && (
                        <span style={{ marginLeft: 6, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: 'rgba(74,222,128,0.09)', border: '1px solid rgba(74,222,128,0.18)', fontSize: 10, color: '#4ade80' }}>
                            <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#4ade80', display: 'inline-block' }} />
                            {planLabel ?? 'Connected'}
                        </span>
                    )}
                </div>

                {/* heading */}
                <div>
                    <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: 'rgba(240,241,244,0.95)', lineHeight: 1.15 }}>
                        Managed transcription,<br />
                        <span style={{ background: 'linear-gradient(90deg, #d97757 0%, #e8956a 50%, #d97757 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>AI &amp; search.</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'rgba(226,229,237,0.40)', lineHeight: 1.55, maxWidth: 360, marginTop: 8 }}>
                        Real-time transcription, AI summaries, and semantic search — available instantly on premium plans. No setup needed.
                    </div>
                </div>

                {/* actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                        onClick={handleStartTrial}
                        disabled={trialLoading || isClaimed || isSaved}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, background: 'linear-gradient(135deg, #d97757, #b05530)', border: '1px solid rgba(217,119,87,0.40)', color: '#fff', cursor: (trialLoading || isClaimed || isSaved) ? 'default' : 'pointer', transition: 'opacity 0.1s', opacity: (isClaimed || isSaved) ? 0.4 : 1 }}
                        onMouseEnter={e => { if (!isClaimed && !isSaved) e.currentTarget.style.opacity = '0.85'; }}
                        onMouseLeave={e => { if (!isClaimed && !isSaved) e.currentTarget.style.opacity = '1'; }}
                    >
                        {trialLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                        {isSaved ? 'Active plan' : isClaimed ? 'Trial used' : 'Try it free'}
                        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </button>
                    <button
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 8, fontSize: 12.5, fontWeight: 580, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(226,229,237,0.60)', cursor: 'pointer', transition: 'all 0.1s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.color = 'rgba(226,229,237,0.90)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(226,229,237,0.60)'; }}
                    >
                        View docs
                    </button>
                </div>

                {/* features */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, paddingTop: 2 }}>
                    {['Real-time transcription', 'AI summaries & action items', 'Semantic search'].map(feat => (
                        <div key={feat} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'rgba(226,229,237,0.35)' }}>
                            <svg width="11" height="11" fill="none" stroke="rgba(217,119,87,0.70)" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                            {feat}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Choose a Plan ────────────────────────────────── */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'rgba(226,229,237,0.25)' }}>Choose a Plan</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>

                    {/* Starter */}
                    <button
                        onClick={() => { if (planLabel?.toLowerCase() !== 'starter') openExternal(PLAN_STARTER_URL); }}
                        style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 12, cursor: 'pointer', textAlign: 'left', width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', transition: 'border-color 0.12s, background 0.12s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.11)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; }}
                    >
                        <div>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'rgba(226,229,237,0.55)', letterSpacing: '0.02em', marginBottom: 8 }}>Starter</div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                                <span style={{ fontSize: 28, fontWeight: 700, color: 'rgba(240,241,244,0.92)', letterSpacing: '-0.04em', lineHeight: 1 }}>₹399</span>
                                <span style={{ fontSize: 11, color: 'rgba(226,229,237,0.30)' }}>/mo</span>
                            </div>
                        </div>
                        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                            {[['5 hrs STT / mo'], ['200 AI requests'], ['Unlimited sessions'], ['PDF export']].map(([v]) => (
                                <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <svg width="10" height="10" fill="none" stroke="rgba(226,229,237,0.28)" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span style={{ fontSize: 11, color: 'rgba(226,229,237,0.45)' }}>{v}</span>
                                </div>
                            ))}
                        </div>
                        {planLabel?.toLowerCase() === 'starter' ? (
                            <div style={{ width: '100%', padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, textAlign: 'center' as const, background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.20)', color: '#4ade80' }}>Active</div>
                        ) : (
                            <div style={{ width: '100%', padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, textAlign: 'center' as const, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(226,229,237,0.55)' }}>Get Starter</div>
                        )}
                    </button>

                    {/* Pro — featured */}
                    <button
                        onClick={() => { if (planLabel?.toLowerCase() !== 'pro') openExternal(PLAN_PRO_URL); }}
                        style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 12, padding: 16, borderRadius: 12, cursor: 'pointer', textAlign: 'left', width: '100%', background: 'rgba(217,119,87,0.07)', border: '1px solid rgba(217,119,87,0.28)', transition: 'border-color 0.12s, background 0.12s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(217,119,87,0.10)'; e.currentTarget.style.borderColor = 'rgba(217,119,87,0.40)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(217,119,87,0.07)'; e.currentTarget.style.borderColor = 'rgba(217,119,87,0.28)'; }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' as const, color: '#d97757', background: 'rgba(217,119,87,0.12)', border: '1px solid rgba(217,119,87,0.22)', padding: '3px 10px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                                Most popular
                            </span>
                        </div>
                        <div>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: '#d97757', letterSpacing: '0.02em', marginBottom: 8 }}>Pro</div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                                <span style={{ fontSize: 28, fontWeight: 700, color: 'rgba(240,241,244,0.92)', letterSpacing: '-0.04em', lineHeight: 1 }}>₹999</span>
                                <span style={{ fontSize: 11, color: 'rgba(226,229,237,0.30)' }}>/mo</span>
                            </div>
                        </div>
                        <div style={{ height: 1, background: 'rgba(217,119,87,0.15)' }} />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                            {[['50 hrs STT / mo', true], ['Unlimited AI requests', true], ['Unlimited sessions', false], ['PDF + Notion + Slack export', true]].map(([v, hl]) => (
                                <div key={v as string} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                    <svg width="10" height="10" fill="none" stroke={hl ? 'rgba(217,119,87,0.70)' : 'rgba(226,229,237,0.28)'} strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span style={{ fontSize: 11, color: hl ? 'rgba(226,229,237,0.75)' : 'rgba(226,229,237,0.45)' }}>{v as string}</span>
                                </div>
                            ))}
                        </div>
                        <div style={{ height: 1, background: 'rgba(217,119,87,0.15)' }} />
                        {planLabel?.toLowerCase() === 'pro' ? (
                            <div style={{ width: '100%', padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, textAlign: 'center' as const, background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.20)', color: '#4ade80' }}>Active</div>
                        ) : (
                            <div style={{ width: '100%', padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600, textAlign: 'center' as const, background: 'linear-gradient(135deg, #d97757, #b05530)', border: '1px solid rgba(217,119,87,0.40)', color: '#fff' }}>Get Pro</div>
                        )}
                    </button>

                </div>
            </div>

            {/* ── Trial box ────────────────────────────────────── */}
            {(showTrialBox || showActiveTrialBox) && (
                <div style={{ borderRadius: 12, overflow: 'hidden', background: 'rgba(255,255,255,0.03)', border: showActiveTrialBox ? '1px solid rgba(217,119,87,0.22)' : '1px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

                        {/* 4-stat row */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 6 }}>
                            {showActiveTrialBox ? (
                                // Live usage stats
                                [
                                    { val: String(trialState!.usage.ai), unit: 'reqs', label: 'AI used' },
                                    { val: String(Math.round(trialState!.usage.stt_seconds / 60)), unit: 'm', label: 'STT used' },
                                    { val: String(trialState!.usage.search), unit: '', label: 'Searches' },
                                    { val: '', unit: '', label: 'Time left', custom: <TrialCountdown expiresAt={trialState!.expiresAt} /> },
                                ].map(s => (
                                    <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' as const }}>
                                        <div style={{ fontSize: 17, fontWeight: 700, color: 'rgba(240,241,244,0.92)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                                            {s.custom ?? <>{s.val}{s.unit && <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(226,229,237,0.40)' }}>{s.unit}</span>}</>}
                                        </div>
                                        <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' as const, color: 'rgba(226,229,237,0.28)' }}>{s.label}</div>
                                    </div>
                                ))
                            ) : (
                                // Static limits
                                [
                                    { val: '10', unit: 'min', label: 'Duration' },
                                    { val: '10', unit: 'reqs', label: 'Requests' },
                                    { val: '10', unit: 'm',   label: 'STT' },
                                    { val: '2',  unit: '',    label: 'Searches' },
                                ].map(s => (
                                    <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', textAlign: 'center' as const }}>
                                        <div style={{ fontSize: 17, fontWeight: 700, color: 'rgba(240,241,244,0.92)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                                            {s.val}{s.unit && <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(226,229,237,0.40)' }}>{s.unit}</span>}
                                        </div>
                                        <div style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' as const, color: 'rgba(226,229,237,0.28)' }}>{s.label}</div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* CTA */}
                        <button
                            onClick={showActiveTrialBox ? () => setShowTrialModal(true) : handleStartTrial}
                            disabled={trialLoading}
                            style={{ width: '100%', padding: '11px 0', borderRadius: 10, fontSize: 13, fontWeight: 640, cursor: trialLoading ? 'wait' : 'pointer', transition: 'opacity 0.1s', border: '1px solid rgba(217,119,87,0.40)', textAlign: 'center' as const, background: 'linear-gradient(135deg, #d97757, #b05530)', color: '#fff', letterSpacing: '-0.01em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: trialLoading ? 0.6 : 1 }}
                            onMouseEnter={e => { if (!trialLoading) e.currentTarget.style.opacity = '0.88'; }}
                            onMouseLeave={e => { e.currentTarget.style.opacity = trialLoading ? '0.6' : '1'; }}
                        >
                            {trialLoading
                                ? <><Loader2 size={13} className="animate-spin" /> Starting trial…</>
                                : showActiveTrialBox ? 'Keep the momentum going →' : 'Start 10-Minute Free Trial'}
                        </button>

                        {trialError && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.20)', borderRadius: 8 }}>
                                <AlertCircle size={13} style={{ color: 'rgba(248,113,113,0.90)', flexShrink: 0 }} />
                                <span style={{ fontSize: 11.5, color: 'rgba(248,113,113,0.90)' }}>{trialError}</span>
                            </div>
                        )}

                        {!showActiveTrialBox && (
                            <p style={{ fontSize: 10.5, color: 'rgba(226,229,237,0.28)', textAlign: 'center' as const, lineHeight: 1.5 }}>
                                No account needed — bound to this device.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* ── Usage ────────────────────────────────────────── */}
            {isSaved && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'rgba(226,229,237,0.25)' }}>Usage</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {usageData && <span style={{ fontSize: 10.5, color: 'rgba(226,229,237,0.22)' }}>Resets {(() => { try { return new Date(usageData.quota.resets_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch { return ''; } })()}</span>}
                            <button
                                onClick={fetchUsage} disabled={isLoadingUsage}
                                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, fontSize: 10.5, fontWeight: 580, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(226,229,237,0.38)', cursor: isLoadingUsage ? 'wait' : 'pointer', opacity: isLoadingUsage ? 0.5 : 1, transition: 'all 0.1s' }}
                                onMouseEnter={e => { if (!isLoadingUsage) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(226,229,237,0.70)'; } }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(226,229,237,0.38)'; }}
                            >
                                <RefreshCw size={9} style={{ animation: isLoadingUsage ? 'spin 1s linear infinite' : 'none' }} />
                                Refresh
                            </button>
                            {usageData && (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px', borderRadius: 999, background: 'rgba(74,222,128,0.09)', border: '1px solid rgba(74,222,128,0.18)', fontSize: 10.5, fontWeight: 600, color: '#4ade80' }}>
                                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 5px rgba(74,222,128,0.6)', display: 'inline-block' }} />
                                    Active
                                </div>
                            )}
                        </div>
                    </div>

                    {usageError && !usageData && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.15)', borderRadius: 10 }}>
                            <AlertCircle size={13} style={{ color: 'rgba(248,113,113,0.90)', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: 'rgba(248,113,113,0.90)' }}>{usageError}</span>
                        </div>
                    )}

                    {/* 3-col stat grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        {[
                            { label: 'STT mins',  value: usageData?.quota.transcription.used, sub: usageData ? `of ${usageData.quota.transcription.limit}` : '…' },
                            { label: 'AI calls',  value: usageData?.quota.ai.used,            sub: usageData ? `of ${usageData.quota.ai.limit}`            : '…' },
                            { label: 'Searches',  value: usageData?.quota.search.used,         sub: usageData ? `of ${usageData.quota.search.limit}`         : '…' },
                        ].map(s => (
                            <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'rgba(226,229,237,0.25)' }}>{s.label}</span>
                                <span style={{ fontSize: 22, fontWeight: 650, color: 'rgba(226,229,237,0.90)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                                    {isLoadingUsage && s.value === undefined ? <Loader2 size={14} className="animate-spin" style={{ color: 'rgba(226,229,237,0.25)', marginTop: 4 }} /> : (s.value?.toLocaleString() ?? '—')}
                                </span>
                                <span style={{ fontSize: 10.5, color: 'rgba(226,229,237,0.28)' }}>{s.sub}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Refund Policy ────────────────────────────────── */}
            <div style={{ borderRadius: 12, padding: '14px 16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'rgba(226,229,237,0.25)' }}>Refund Policy</span>
                <p style={{ fontSize: 11.5, color: 'rgba(226,229,237,0.35)', lineHeight: 1.6, margin: 0 }}>
                    Not satisfied within 7 days of purchase? Contact us for a full refund — no questions asked. Refunds are processed within 3–5 business days.
                </p>
            </div>

        </div>
    );
};
