import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { FreeTrialModal } from '../trial/FreeTrialModal';

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
        <span className={`text-[11px] font-mono font-semibold tabular-nums ${warn ? 'text-amber-400' : 'text-[#e2e5ed]/40'}`}>
            {remaining === 0 ? 'Ended' : `${m}:${s.toString().padStart(2, '0')}`}
        </span>
    );
}

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
    const openExternal    = (url: string) => { (window.electronAPI as any)?.openExternal?.(url); };

    const planLabel = usageData?.plan ? usageData.plan.charAt(0).toUpperCase() + usageData.plan.slice(1) : null;
    const isClaimed = trialState?.expired === true || localStorage.getItem('natively_trial_claimed') === 'true';
    const showTrialBox = !isLoading && !isSaved && !isCheckingTrial && !isClaimed;
    const showActiveTrialBox = trialState?.active === true;

    return (
        <div className="flex flex-col gap-5">

            {showTrialModal && trialState && (
                <FreeTrialModal usage={trialState.usage} onByok={handleByok} onDone={handleTrialDone} />
            )}

            {/* ── Hero card ── */}
            <div className="relative rounded-[14px] overflow-hidden px-[22px] pt-[22px] pb-5 bg-accent-primary/[0.06] border border-accent-primary/[0.16] flex flex-col gap-3.5">
                {/* radial glow — kept as inline style (arbitrary radial gradient) */}
                <div className="absolute -top-[60px] -right-[60px] w-[220px] h-[220px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(217,119,87,0.12) 0%, transparent 70%)' }} />

                {/* tag */}
                <div className="inline-flex items-center gap-[5px] text-[10px] font-bold tracking-[0.10em] uppercase text-accent-primary w-fit">
                    <span className="w-[5px] h-[5px] rounded-full bg-accent-primary shrink-0 inline-block" style={{ boxShadow: '0 0 6px rgba(217,119,87,0.8)' }} />
                    LiveLens API
                    {!isLoading && isSaved && (
                        <span className="ml-1.5 inline-flex items-center gap-1 px-2 py-[2px] rounded-full bg-green-400/[0.09] border border-green-400/[0.18] text-[10px] text-green-400">
                            <span className="w-1 h-1 rounded-full bg-green-400 inline-block" />
                            {planLabel ?? 'Connected'}
                        </span>
                    )}
                </div>

                {/* heading */}
                <div>
                    <div className="text-[22px] font-bold tracking-[-0.03em] text-[rgba(240,241,244,0.95)] leading-[1.15]">
                        Managed transcription,<br />
                        {/* gradient text — kept inline (arbitrary 3-stop gradient) */}
                        <span style={{ background: 'linear-gradient(90deg, #d97757 0%, #e8956a 50%, #d97757 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>AI &amp; search.</span>
                    </div>
                    <div className="text-[12.5px] text-[#e2e5ed]/40 leading-[1.55] max-w-[360px] mt-2">
                        Real-time transcription, AI summaries, and semantic search — available instantly on premium plans. No setup needed.
                    </div>
                </div>

                {/* actions */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleStartTrial}
                        disabled={trialLoading || isClaimed || isSaved}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-semibold bg-gradient-to-br from-accent-primary to-accent-deep border border-accent-primary/40 text-white transition-opacity ${(isClaimed || isSaved) ? 'opacity-40 cursor-default' : 'cursor-pointer hover:opacity-85'}`}
                    >
                        {trialLoading ? <Loader2 size={12} className="animate-spin" /> : null}
                        {isSaved ? 'Active plan' : isClaimed ? 'Trial used' : 'Try it free'}
                        <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                    </button>
                    <button className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12.5px] font-medium bg-white/[0.05] border border-white/[0.09] text-[#e2e5ed]/60 cursor-pointer transition-all hover:bg-white/[0.09] hover:text-[#e2e5ed]/90">
                        View docs
                    </button>
                </div>

                {/* feature list */}
                <div className="flex items-center gap-3.5 pt-[2px]">
                    {['Real-time transcription', 'AI summaries & action items', 'Semantic search'].map(feat => (
                        <div key={feat} className="flex items-center gap-[5px] text-[11px] text-[#e2e5ed]/35">
                            <svg width="11" height="11" fill="none" stroke="rgba(217,119,87,0.70)" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                            {feat}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Choose a Plan ── */}
            <div>
                <div className="flex items-center justify-between mb-2.5">
                    <span className="text-[10.5px] font-bold tracking-[0.08em] uppercase text-[#e2e5ed]/25">Choose a Plan</span>
                </div>
                <div className="grid grid-cols-2 gap-2">

                    {/* Starter */}
                    <button
                        onClick={() => { if (planLabel?.toLowerCase() !== 'starter') openExternal(PLAN_STARTER_URL); }}
                        className="relative flex flex-col gap-3 p-4 rounded-xl cursor-pointer text-left w-full bg-white/[0.03] border border-white/[0.07] transition-all hover:bg-white/[0.05] hover:border-white/[0.11]"
                    >
                        <div>
                            <div className="text-[11.5px] font-bold text-[#e2e5ed]/55 tracking-[0.02em] mb-2">Starter</div>
                            <div className="flex items-baseline gap-[3px]">
                                <span className="text-[28px] font-bold text-[rgba(240,241,244,0.92)] tracking-[-0.04em] leading-none">₹399</span>
                                <span className="text-[11px] text-[#e2e5ed]/30">/mo</span>
                            </div>
                        </div>
                        <div className="h-px bg-white/[0.06]" />
                        <div className="flex flex-col gap-1.5 flex-1">
                            {[['5 hrs STT / mo'], ['200 AI requests'], ['Unlimited sessions'], ['PDF export']].map(([v]) => (
                                <div key={v} className="flex items-center gap-[7px]">
                                    <svg width="10" height="10" fill="none" stroke="rgba(226,229,237,0.28)" strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span className="text-[11px] text-[#e2e5ed]/45">{v}</span>
                                </div>
                            ))}
                        </div>
                        {planLabel?.toLowerCase() === 'starter' ? (
                            <div className="w-full py-2 rounded-lg text-xs font-semibold text-center bg-green-400/10 border border-green-400/20 text-green-400">Active</div>
                        ) : (
                            <div className="w-full py-2 rounded-lg text-xs font-semibold text-center bg-white/[0.05] border border-white/[0.09] text-[#e2e5ed]/55">Get Starter</div>
                        )}
                    </button>

                    {/* Pro — featured */}
                    <button
                        onClick={() => { if (planLabel?.toLowerCase() !== 'pro') openExternal(PLAN_PRO_URL); }}
                        className="relative flex flex-col gap-3 p-4 rounded-xl cursor-pointer text-left w-full bg-accent-primary/[0.07] border border-accent-primary/[0.28] transition-all hover:bg-accent-primary/10 hover:border-accent-primary/40"
                    >
                        <div className="flex justify-center">
                            <span className="text-[9px] font-bold tracking-[0.09em] uppercase text-accent-primary bg-accent-primary/[0.12] border border-accent-primary/[0.22] px-2.5 py-[3px] rounded-[6px] whitespace-nowrap">
                                Most popular
                            </span>
                        </div>
                        <div>
                            <div className="text-[11.5px] font-bold text-accent-primary tracking-[0.02em] mb-2">Pro</div>
                            <div className="flex items-baseline gap-[3px]">
                                <span className="text-[28px] font-bold text-[rgba(240,241,244,0.92)] tracking-[-0.04em] leading-none">₹999</span>
                                <span className="text-[11px] text-[#e2e5ed]/30">/mo</span>
                            </div>
                        </div>
                        <div className="h-px bg-accent-primary/15" />
                        <div className="flex flex-col gap-1.5 flex-1">
                            {[['50 hrs STT / mo', true], ['Unlimited AI requests', true], ['Unlimited sessions', false], ['PDF + Notion + Slack export', true]].map(([v, hl]) => (
                                <div key={v as string} className="flex items-center gap-[7px]">
                                    <svg width="10" height="10" fill="none" stroke={hl ? 'rgba(217,119,87,0.70)' : 'rgba(226,229,237,0.28)'} strokeWidth="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                                    <span className={`text-[11px] ${hl ? 'text-[#e2e5ed]/75' : 'text-[#e2e5ed]/45'}`}>{v as string}</span>
                                </div>
                            ))}
                        </div>
                        <div className="h-px bg-accent-primary/15" />
                        {planLabel?.toLowerCase() === 'pro' ? (
                            <div className="w-full py-2 rounded-lg text-xs font-semibold text-center bg-green-400/10 border border-green-400/20 text-green-400">Active</div>
                        ) : (
                            <div className="w-full py-2 rounded-lg text-xs font-semibold text-center bg-gradient-to-br from-accent-primary to-accent-deep border border-accent-primary/40 text-white">Get Pro</div>
                        )}
                    </button>

                </div>
            </div>

            {/* ── Trial box ── */}
            {(showTrialBox || showActiveTrialBox) && (
                <div className={`rounded-xl overflow-hidden bg-white/[0.03] border ${showActiveTrialBox ? 'border-accent-primary/[0.22]' : 'border-white/[0.07]'}`}>
                    <div className="px-[18px] pt-[18px] pb-4 flex flex-col gap-3.5">

                        {/* 4-stat row */}
                        <div className="grid grid-cols-4 gap-1.5">
                            {showActiveTrialBox ? (
                                [
                                    { val: String(trialState!.usage.ai), unit: 'reqs', label: 'AI used' },
                                    { val: String(Math.round(trialState!.usage.stt_seconds / 60)), unit: 'm', label: 'STT used' },
                                    { val: String(trialState!.usage.search), unit: '', label: 'Searches' },
                                    { val: '', unit: '', label: 'Time left', custom: <TrialCountdown expiresAt={trialState!.expiresAt} /> },
                                ].map(s => (
                                    <div key={s.label} className="flex flex-col items-center gap-[3px] px-2 py-2.5 rounded-[10px] bg-white/[0.03] border border-white/[0.07] text-center">
                                        <div className="text-[17px] font-bold text-[rgba(240,241,244,0.92)] tracking-[-0.03em] leading-none">
                                            {s.custom ?? <>{s.val}{s.unit && <span className="text-[11px] font-medium text-[#e2e5ed]/40">{s.unit}</span>}</>}
                                        </div>
                                        <div className="text-[9.5px] font-semibold tracking-[0.04em] uppercase text-[#e2e5ed]/28">{s.label}</div>
                                    </div>
                                ))
                            ) : (
                                [
                                    { val: '10', unit: 'min', label: 'Duration' },
                                    { val: '10', unit: 'reqs', label: 'Requests' },
                                    { val: '10', unit: 'm',   label: 'STT' },
                                    { val: '2',  unit: '',    label: 'Searches' },
                                ].map(s => (
                                    <div key={s.label} className="flex flex-col items-center gap-[3px] px-2 py-2.5 rounded-[10px] bg-white/[0.03] border border-white/[0.07] text-center">
                                        <div className="text-[17px] font-bold text-[rgba(240,241,244,0.92)] tracking-[-0.03em] leading-none">
                                            {s.val}{s.unit && <span className="text-[11px] font-medium text-[#e2e5ed]/40">{s.unit}</span>}
                                        </div>
                                        <div className="text-[9.5px] font-semibold tracking-[0.04em] uppercase text-[#e2e5ed]/28">{s.label}</div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* CTA */}
                        <button
                            onClick={showActiveTrialBox ? () => setShowTrialModal(true) : handleStartTrial}
                            disabled={trialLoading}
                            className={`w-full py-[11px] rounded-[10px] text-[13px] font-[640] border border-accent-primary/40 text-center bg-gradient-to-br from-accent-primary to-accent-deep text-white tracking-[-0.01em] flex items-center justify-center gap-1.5 transition-opacity ${trialLoading ? 'opacity-60 cursor-wait' : 'cursor-pointer hover:opacity-88'}`}
                        >
                            {trialLoading
                                ? <><Loader2 size={13} className="animate-spin" /> Starting trial…</>
                                : showActiveTrialBox ? 'Keep the momentum going →' : 'Start 10-Minute Free Trial'}
                        </button>

                        {trialError && (
                            <div className="flex items-center gap-1.5 px-3 py-2 bg-red-400/10 border border-red-400/20 rounded-lg">
                                <AlertCircle size={13} className="text-red-400/90 shrink-0" />
                                <span className="text-[11.5px] text-red-400/90">{trialError}</span>
                            </div>
                        )}

                        {!showActiveTrialBox && (
                            <p className="text-[10.5px] text-[#e2e5ed]/28 text-center leading-[1.5]">
                                No account needed — bound to this device.
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* ── Usage ── */}
            {isSaved && (
                <div className="flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-bold tracking-[0.08em] uppercase text-[#e2e5ed]/25">Usage</span>
                        <div className="flex items-center gap-2">
                            {usageData && (
                                <span className="text-[10.5px] text-[#e2e5ed]/22">
                                    Resets {(() => { try { return new Date(usageData.quota.resets_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch { return ''; } })()}
                                </span>
                            )}
                            <button
                                onClick={fetchUsage}
                                disabled={isLoadingUsage}
                                className={`inline-flex items-center gap-1 px-2 py-[3px] rounded-[6px] text-[10.5px] font-medium bg-white/[0.04] border border-white/[0.08] text-[#e2e5ed]/38 transition-all hover:bg-white/[0.08] hover:text-[#e2e5ed]/70 ${isLoadingUsage ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                            >
                                <RefreshCw size={9} className={isLoadingUsage ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                            {usageData && (
                                <div className="inline-flex items-center gap-[5px] px-[9px] py-[3px] rounded-full bg-green-400/[0.09] border border-green-400/[0.18] text-[10.5px] font-semibold text-green-400">
                                    <span className="w-[5px] h-[5px] rounded-full bg-green-400 inline-block" style={{ boxShadow: '0 0 5px rgba(74,222,128,0.6)' }} />
                                    Active
                                </div>
                            )}
                        </div>
                    </div>

                    {usageError && !usageData && (
                        <div className="flex items-center gap-1.5 px-3 py-2.5 bg-red-400/[0.08] border border-red-400/[0.15] rounded-[10px]">
                            <AlertCircle size={13} className="text-red-400/90 shrink-0" />
                            <span className="text-xs text-red-400/90">{usageError}</span>
                        </div>
                    )}

                    {/* 3-col stat grid */}
                    <div className="grid grid-cols-3 gap-2">
                        {[
                            { label: 'STT mins',  value: usageData?.quota.transcription.used, sub: usageData ? `of ${usageData.quota.transcription.limit}` : '…' },
                            { label: 'AI calls',  value: usageData?.quota.ai.used,            sub: usageData ? `of ${usageData.quota.ai.limit}`            : '…' },
                            { label: 'Searches',  value: usageData?.quota.search.used,         sub: usageData ? `of ${usageData.quota.search.limit}`         : '…' },
                        ].map(s => (
                            <div key={s.label} className="bg-white/[0.03] border border-white/[0.06] rounded-[10px] px-[13px] py-3 flex flex-col gap-1">
                                <span className="text-[10px] font-bold tracking-[0.06em] uppercase text-[#e2e5ed]/25">{s.label}</span>
                                <span className="text-[22px] font-[650] text-[#e2e5ed]/90 tracking-[-0.03em] leading-none">
                                    {isLoadingUsage && s.value === undefined
                                        ? <Loader2 size={14} className="animate-spin text-[#e2e5ed]/25 mt-1" />
                                        : (s.value?.toLocaleString() ?? '—')}
                                </span>
                                <span className="text-[10.5px] text-[#e2e5ed]/28">{s.sub}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Refund Policy ── */}
            <div className="rounded-xl px-4 py-3.5 bg-white/[0.02] border border-white/[0.06] flex flex-col gap-1.5">
                <span className="text-[10.5px] font-bold tracking-[0.08em] uppercase text-[#e2e5ed]/25">Refund Policy</span>
                <p className="text-[11.5px] text-[#e2e5ed]/35 leading-[1.6] m-0">
                    Not satisfied within 7 days of purchase? Contact us for a full refund — no questions asked. Refunds are processed within 3–5 business days.
                </p>
            </div>

        </div>
    );
};
