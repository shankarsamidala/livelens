import React, { useCallback, useEffect, useState } from 'react';
import { Smartphone, Wifi, Lock, RefreshCw, Copy, Check, ShieldAlert } from 'lucide-react';
import type { PhoneMirrorInfo } from '../../types/electron.d';

const EMPTY_INFO: PhoneMirrorInfo = {
    running: false,
    enabled: false,
    exposeOnLan: false,
    port: 0,
    loopbackUrl: null,
    primaryUrl: null,
    lanUrls: [],
    token: null,
    qrDataUrl: null,
    clients: 0,
};

const isWindows = navigator.userAgent.includes('Windows');

export const LiveLensPhoneMirrorSettings: React.FC = () => {
    const [info, setInfo] = useState<PhoneMirrorInfo>(EMPTY_INFO);
    const [busy, setBusy] = useState<null | 'enable' | 'disable' | 'lan' | 'rotate'>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const refresh = useCallback(async () => {
        try {
            const next = await window.electronAPI.phoneMirrorGetInfo();
            if (next && typeof next === 'object') setInfo(next as PhoneMirrorInfo);
        } catch (e: any) {
            setError(e?.message || 'Failed to load phone mirror status');
        }
    }, []);

    useEffect(() => {
        refresh();
        const off = window.electronAPI.onPhoneMirrorStatus((next) => {
            if (next && typeof next === 'object') setInfo(next as PhoneMirrorInfo);
        });
        return () => { off?.(); };
    }, [refresh]);

    const apply = useCallback(async (key: 'enable' | 'disable' | 'lan' | 'rotate', fn: () => Promise<any>) => {
        setBusy(key);
        setError(null);
        try {
            const result = await fn();
            if (result && typeof result === 'object' && 'error' in result && result.error) {
                setError(String(result.error));
            } else if (result && typeof result === 'object' && 'running' in result) {
                setInfo(result as PhoneMirrorInfo);
            } else {
                await refresh();
            }
        } catch (e: any) {
            setError(e?.message || 'Action failed');
        } finally {
            setBusy(null);
        }
    }, [refresh]);

    const onToggleEnable = useCallback(async () => {
        if (info.running) {
            await apply('disable', () => window.electronAPI.phoneMirrorDisable());
        } else {
            await apply('enable', () => window.electronAPI.phoneMirrorEnable(info.exposeOnLan));
        }
    }, [apply, info.running, info.exposeOnLan]);

    const onToggleLan = useCallback(async () => {
        await apply('lan', () => window.electronAPI.phoneMirrorSetLan(!info.exposeOnLan));
    }, [apply, info.exposeOnLan]);

    const onRotate = useCallback(async () => {
        await apply('rotate', () => window.electronAPI.phoneMirrorRotateToken());
    }, [apply]);

    const onCopy = useCallback(async () => {
        if (!info.primaryUrl) return;
        try {
            await navigator.clipboard.writeText(info.primaryUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1200);
        } catch (_) { /* noop */ }
    }, [info.primaryUrl]);

    const lanWarning = info.running && info.exposeOnLan;
    const showQr = info.running && info.qrDataUrl;
    const lanRequestedButMissing = info.running && info.exposeOnLan && info.lanUrls.length === 0;

    return (
        <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-start gap-3">
                <div className="rounded-[10px] bg-white/[0.03] border border-white/[0.06] p-2.5 flex items-center justify-center shrink-0">
                    <Smartphone size={20} className="text-text-dim-primary" />
                </div>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="m-0 text-text-dim-primary text-[17px] font-semibold tracking-[-0.3px]">
                            Phone Mirror
                        </h3>
                        <span className="inline-flex items-center px-[7px] py-[2px] rounded-full text-[10px] font-bold uppercase tracking-[0.08em] bg-amber-400/[0.12] text-amber-400 border border-amber-400/[0.30]">
                            Beta
                        </span>
                    </div>
                    <p className="m-0 mt-1 text-text-dim-sec text-[13px] leading-[1.6]">
                        Stream live AI responses from your desktop to a phone browser on the same network.
                        Useful when you're sharing your screen and want the AI output kept off the shared display.
                    </p>
                </div>
            </div>

            {/* Master toggle */}
            <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] px-[18px] py-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <div className="text-text-dim-primary font-medium text-[13px]">Enable Phone Mirror</div>
                    <div className="text-text-dim-sec text-[11px] mt-1">
                        {info.running
                            ? `Running on port ${info.port} · ${info.clients} ${info.clients === 1 ? 'phone' : 'phones'} connected`
                            : 'Off — no listener, no exposure.'}
                    </div>
                </div>
                <button
                    type="button"
                    role="switch"
                    aria-checked={info.running}
                    disabled={busy !== null}
                    onClick={onToggleEnable}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-0 p-0 transition-colors duration-200 ${info.running ? 'bg-blue-500' : 'bg-white/[0.10]'} ${busy !== null ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                >
                    <span
                        className="inline-block h-5 w-5 rounded-full bg-white transition-transform duration-200"
                        style={{ transform: info.running ? 'translateX(22px)' : 'translateX(2px)' }}
                    />
                </button>
            </div>

            {/* LAN switch */}
            <div className={`bg-white/[0.03] rounded-xl px-[18px] py-4 border transition-colors duration-200 ${lanWarning ? 'border-amber-400/[0.30]' : 'border-white/[0.06]'}`}>
                <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <div className="text-text-dim-primary font-medium text-[13px] flex items-center gap-1.5">
                            <Wifi size={14} className="text-text-dim-sec" />
                            Allow LAN access
                        </div>
                        <div className="text-text-dim-sec text-[11px] mt-1">
                            {info.exposeOnLan
                                ? 'Phones on the same WiFi can connect with the pairing token.'
                                : 'Loopback only — only this computer can connect.'}
                        </div>
                    </div>
                    <button
                        type="button"
                        role="switch"
                        aria-checked={info.exposeOnLan}
                        disabled={busy !== null}
                        onClick={onToggleLan}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-0 p-0 transition-colors duration-200 ${info.exposeOnLan ? 'bg-amber-500' : 'bg-white/[0.10]'} ${busy !== null ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
                    >
                        <span
                            className="inline-block h-5 w-5 rounded-full bg-white transition-transform duration-200"
                            style={{ transform: info.exposeOnLan ? 'translateX(22px)' : 'translateX(2px)' }}
                        />
                    </button>
                </div>
                {lanWarning && (
                    <div className="mt-3 flex items-start gap-2 text-amber-400/85 text-[11px] leading-[1.6]">
                        <ShieldAlert size={14} className="mt-[1px] shrink-0" />
                        <span>
                            Anyone on this network with the pairing URL can read your AI responses. Use only on trusted networks.
                            Rotate the token below if you suspect the URL was shared.
                        </span>
                    </div>
                )}
            </div>

            {/* No-LAN-IP warning */}
            {lanRequestedButMissing && (
                <div className="rounded-xl border border-amber-400/[0.30] bg-amber-400/[0.08] px-4 py-3.5 text-amber-300 text-[11px] leading-[1.6] flex items-start gap-2">
                    <ShieldAlert size={14} className="mt-[1px] shrink-0" />
                    <span>
                        LAN access is on, but no Wi-Fi or Ethernet IP was detected.{' '}
                        {isWindows ? (
                            <>Connect to the same Wi-Fi as your phone. If you've connected, check that Windows Firewall allowed LiveLens — a hidden{' '}
                            <strong>Windows Security Alert</strong> dialog may have appeared behind this window when you first enabled LAN access.</>
                        ) : (
                            <>Connect this Mac to the same Wi-Fi as your phone (VPN tunnels and virtual interfaces don't count). If you've connected, confirm{' '}
                            <strong>System Settings → Network → Firewall</strong> is allowing incoming connections for this app.</>
                        )}
                    </span>
                </div>
            )}

            {/* Pairing card */}
            {info.running ? (
                <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-[18px] flex flex-col gap-4">
                    <div className="flex items-start gap-5">
                        {/* QR code */}
                        {showQr ? (
                            <div className="shrink-0 rounded-lg bg-white p-2">
                                <img
                                    src={info.qrDataUrl!}
                                    alt="Pairing QR code"
                                    className="block w-36 h-36"
                                    draggable={false}
                                />
                            </div>
                        ) : (
                            <div className="shrink-0 w-36 h-36 rounded-lg border border-dashed border-white/[0.06] grid place-items-center text-text-dim-muted text-[11px]">
                                generating QR…
                            </div>
                        )}

                        {/* Instructions + URL */}
                        <div className="flex-1 min-w-0 flex flex-col gap-3">
                            <div>
                                <div className="text-text-dim-muted text-[10px] uppercase tracking-[0.07em] mb-1.5">
                                    Scan with your phone
                                </div>
                                <div className="text-text-dim-primary text-[13px] font-medium">
                                    {info.exposeOnLan
                                        ? 'Open the camera app and point at the code.'
                                        : 'LAN access is off. Turn it on, or open the URL on this computer.'}
                                </div>
                            </div>
                            <div>
                                <div className="text-text-dim-muted text-[10px] uppercase tracking-[0.07em] mb-1.5">
                                    Pairing URL
                                </div>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap font-mono text-[11px] px-2.5 py-[7px] rounded-[7px] bg-black/25 border border-white/[0.06] text-text-dim-primary">
                                        {info.primaryUrl || '—'}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={onCopy}
                                        disabled={!info.primaryUrl}
                                        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-[7px] rounded-[7px] border border-white/[0.06] bg-white/[0.05] text-text-dim-primary text-[11px] font-medium transition-opacity ${info.primaryUrl ? 'opacity-100 cursor-pointer' : 'opacity-40 cursor-default'}`}
                                    >
                                        {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                                    </button>
                                </div>
                            </div>
                            {info.exposeOnLan && info.lanUrls.length > 1 && (
                                <details className="text-[11px]">
                                    <summary className="text-text-dim-sec cursor-pointer">
                                        Other LAN addresses ({info.lanUrls.length - 1})
                                    </summary>
                                    <ul className="mt-2 pl-0 list-none flex flex-col gap-1 font-mono text-text-dim-sec">
                                        {info.lanUrls.slice(1).map((u) => (
                                            <li key={u} className="overflow-hidden text-ellipsis whitespace-nowrap">{u}</li>
                                        ))}
                                    </ul>
                                </details>
                            )}
                        </div>
                    </div>

                    {/* Footer: security note + rotate token */}
                    <div className="flex items-center justify-between pt-3.5 border-t border-white/[0.06]">
                        <div className="flex items-center gap-1.5 text-text-dim-sec text-[11px]">
                            <Lock size={12} /> Pairing token gates every connection.
                        </div>
                        <button
                            type="button"
                            onClick={onRotate}
                            disabled={busy !== null}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-white/[0.06] bg-transparent text-text-dim-sec text-[11px] font-medium transition-opacity ${busy !== null ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:opacity-80'}`}
                        >
                            <RefreshCw size={12} className={busy === 'rotate' ? 'animate-spin' : ''} />
                            Rotate token
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white/[0.015] rounded-xl border border-dashed border-white/[0.06] px-5 py-7 text-center text-text-dim-sec text-[13px]">
                    Turn on Phone Mirror to generate a pairing URL and QR code.
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="rounded-lg border border-red-500/[0.30] bg-red-500/[0.08] px-3.5 py-2.5 text-xs text-red-300/90">
                    {error}
                </div>
            )}

            {/* Privacy note */}
            <div className="text-text-dim-muted text-[11px] leading-[1.7]">
                Phone Mirror runs entirely on your local network. No traffic leaves your machine — the bridge
                serves an HTML page and a WebSocket directly to your phone, gated by a per-session pairing token.
            </div>
        </div>
    );
};
