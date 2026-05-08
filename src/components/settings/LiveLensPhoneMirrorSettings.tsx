import React, { useCallback, useEffect, useState } from 'react';
import { Smartphone, Wifi, Lock, RefreshCw, Copy, Check, ShieldAlert } from 'lucide-react';
import type { PhoneMirrorInfo } from '../../types/electron.d';

const ACCENT = '#d97757';
const ACCENT_AMBER = 'rgba(251,191,36,0.85)';
const CARD_BG = 'rgba(255,255,255,0.03)';
const CARD_BG_HALF = 'rgba(255,255,255,0.015)';
const BORDER = 'rgba(255,255,255,0.06)';
const BORDER_AMBER = 'rgba(251,191,36,0.30)';
const TEXT_PRIMARY = 'rgba(226,229,237,0.88)';
const TEXT_SECONDARY = 'rgba(226,229,237,0.45)';
const TEXT_MUTED = 'rgba(226,229,237,0.30)';
const BG_INPUT = 'rgba(0,0,0,0.25)';
const TOGGLE_ACTIVE_BLUE = '#3b82f6';
const TOGGLE_ACTIVE_AMBER = '#f59e0b';
const TOGGLE_TRACK_OFF = 'rgba(255,255,255,0.10)';

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{
                    borderRadius: 10,
                    background: CARD_BG,
                    border: `1px solid ${BORDER}`,
                    padding: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                }}>
                    <Smartphone size={20} style={{ color: TEXT_PRIMARY }} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ margin: 0, color: TEXT_PRIMARY, fontSize: 17, fontWeight: 600, letterSpacing: '-0.3px' }}>
                            Phone Mirror
                        </h3>
                        <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '2px 7px',
                            borderRadius: 99,
                            fontSize: 10,
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            background: 'rgba(251,191,36,0.12)',
                            color: '#fbbf24',
                            border: '1px solid rgba(251,191,36,0.30)',
                        }}>
                            Beta
                        </span>
                    </div>
                    <p style={{ margin: '4px 0 0', color: TEXT_SECONDARY, fontSize: 13, lineHeight: 1.6 }}>
                        Stream live AI responses from your desktop to a phone browser on the same network.
                        Useful when you're sharing your screen and want the AI output kept off the shared display.
                    </p>
                </div>
            </div>

            {/* Master toggle */}
            <div style={{
                background: CARD_BG,
                borderRadius: 12,
                border: `1px solid ${BORDER}`,
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
            }}>
                <div style={{ minWidth: 0 }}>
                    <div style={{ color: TEXT_PRIMARY, fontWeight: 500, fontSize: 13 }}>Enable Phone Mirror</div>
                    <div style={{ color: TEXT_SECONDARY, fontSize: 11, marginTop: 4 }}>
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
                    style={{
                        position: 'relative',
                        display: 'inline-flex',
                        height: 24,
                        width: 44,
                        flexShrink: 0,
                        alignItems: 'center',
                        borderRadius: 99,
                        border: 'none',
                        cursor: busy !== null ? 'wait' : 'pointer',
                        opacity: busy !== null ? 0.6 : 1,
                        background: info.running ? TOGGLE_ACTIVE_BLUE : TOGGLE_TRACK_OFF,
                        transition: 'background 0.2s',
                        padding: 0,
                    }}
                >
                    <span style={{
                        display: 'inline-block',
                        height: 20,
                        width: 20,
                        borderRadius: '50%',
                        background: '#fff',
                        transform: info.running ? 'translateX(22px)' : 'translateX(2px)',
                        transition: 'transform 0.2s',
                    }} />
                </button>
            </div>

            {/* LAN switch */}
            <div style={{
                background: CARD_BG,
                borderRadius: 12,
                border: `1px solid ${lanWarning ? BORDER_AMBER : BORDER}`,
                padding: '16px 18px',
                transition: 'border-color 0.2s',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ color: TEXT_PRIMARY, fontWeight: 500, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Wifi size={14} style={{ color: TEXT_SECONDARY }} />
                            Allow LAN access
                        </div>
                        <div style={{ color: TEXT_SECONDARY, fontSize: 11, marginTop: 4 }}>
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
                        style={{
                            position: 'relative',
                            display: 'inline-flex',
                            height: 24,
                            width: 44,
                            flexShrink: 0,
                            alignItems: 'center',
                            borderRadius: 99,
                            border: 'none',
                            cursor: busy !== null ? 'wait' : 'pointer',
                            opacity: busy !== null ? 0.6 : 1,
                            background: info.exposeOnLan ? TOGGLE_ACTIVE_AMBER : TOGGLE_TRACK_OFF,
                            transition: 'background 0.2s',
                            padding: 0,
                        }}
                    >
                        <span style={{
                            display: 'inline-block',
                            height: 20,
                            width: 20,
                            borderRadius: '50%',
                            background: '#fff',
                            transform: info.exposeOnLan ? 'translateX(22px)' : 'translateX(2px)',
                            transition: 'transform 0.2s',
                        }} />
                    </button>
                </div>
                {lanWarning && (
                    <div style={{
                        marginTop: 12,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        color: ACCENT_AMBER,
                        fontSize: 11,
                        lineHeight: 1.6,
                    }}>
                        <ShieldAlert size={14} style={{ marginTop: 1, flexShrink: 0 }} />
                        <span>
                            Anyone on this network with the pairing URL can read your AI responses. Use only on trusted networks.
                            Rotate the token below if you suspect the URL was shared.
                        </span>
                    </div>
                )}
            </div>

            {/* No-LAN-IP warning */}
            {lanRequestedButMissing && (
                <div style={{
                    borderRadius: 12,
                    border: BORDER_AMBER,
                    background: 'rgba(251,191,36,0.08)',
                    padding: '14px 16px',
                    color: '#fcd34d',
                    fontSize: 11,
                    lineHeight: 1.6,
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                }}>
                    <ShieldAlert size={14} style={{ marginTop: 1, flexShrink: 0 }} />
                    <span>
                        LAN access is on, but no Wi-Fi or Ethernet IP was detected. Connect this Mac to the same Wi-Fi
                        as your phone (VPN tunnels and virtual interfaces don't count). If you've connected, confirm{' '}
                        <strong>System Settings → Network → Firewall</strong> is allowing incoming connections for this app.
                    </span>
                </div>
            )}

            {/* Pairing card */}
            {info.running ? (
                <div style={{
                    background: CARD_BG,
                    borderRadius: 12,
                    border: `1px solid ${BORDER}`,
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                        {/* QR code */}
                        {showQr ? (
                            <div style={{
                                flexShrink: 0,
                                borderRadius: 8,
                                background: '#fff',
                                padding: 8,
                            }}>
                                <img
                                    src={info.qrDataUrl!}
                                    alt="Pairing QR code"
                                    style={{ display: 'block', width: 144, height: 144 }}
                                    draggable={false}
                                />
                            </div>
                        ) : (
                            <div style={{
                                flexShrink: 0,
                                width: 144,
                                height: 144,
                                borderRadius: 8,
                                border: `1px dashed ${BORDER}`,
                                display: 'grid',
                                placeItems: 'center',
                                color: TEXT_MUTED,
                                fontSize: 11,
                            }}>
                                generating QR…
                            </div>
                        )}

                        {/* Instructions + URL */}
                        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <div style={{ color: TEXT_MUTED, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                                    Scan with your phone
                                </div>
                                <div style={{ color: TEXT_PRIMARY, fontSize: 13, fontWeight: 500 }}>
                                    {info.exposeOnLan
                                        ? 'Open the camera app and point at the code.'
                                        : 'LAN access is off. Turn it on, or open the URL on this computer.'}
                                </div>
                            </div>
                            <div>
                                <div style={{ color: TEXT_MUTED, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>
                                    Pairing URL
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <code style={{
                                        flex: 1,
                                        minWidth: 0,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        fontFamily: 'monospace',
                                        fontSize: 11,
                                        padding: '7px 10px',
                                        borderRadius: 7,
                                        background: BG_INPUT,
                                        border: `1px solid ${BORDER}`,
                                        color: TEXT_PRIMARY,
                                    }}>
                                        {info.primaryUrl || '—'}
                                    </code>
                                    <button
                                        type="button"
                                        onClick={onCopy}
                                        disabled={!info.primaryUrl}
                                        style={{
                                            flexShrink: 0,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '7px 12px',
                                            borderRadius: 7,
                                            border: `1px solid ${BORDER}`,
                                            background: 'rgba(255,255,255,0.05)',
                                            color: TEXT_PRIMARY,
                                            fontSize: 11,
                                            fontWeight: 500,
                                            cursor: info.primaryUrl ? 'pointer' : 'default',
                                            opacity: info.primaryUrl ? 1 : 0.4,
                                        }}
                                    >
                                        {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                                    </button>
                                </div>
                            </div>
                            {info.exposeOnLan && info.lanUrls.length > 1 && (
                                <details style={{ fontSize: 11 }}>
                                    <summary style={{ color: TEXT_SECONDARY, cursor: 'pointer' }}>
                                        Other LAN addresses ({info.lanUrls.length - 1})
                                    </summary>
                                    <ul style={{ marginTop: 8, paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4, fontFamily: 'monospace', color: TEXT_SECONDARY }}>
                                        {info.lanUrls.slice(1).map((u) => (
                                            <li key={u} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u}</li>
                                        ))}
                                    </ul>
                                </details>
                            )}
                        </div>
                    </div>

                    {/* Footer: security note + rotate token */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: 14,
                        borderTop: `1px solid ${BORDER}`,
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: TEXT_SECONDARY, fontSize: 11 }}>
                            <Lock size={12} /> Pairing token gates every connection.
                        </div>
                        <button
                            type="button"
                            onClick={onRotate}
                            disabled={busy !== null}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 6,
                                padding: '6px 12px',
                                borderRadius: 7,
                                border: `1px solid ${BORDER}`,
                                background: 'transparent',
                                color: TEXT_SECONDARY,
                                fontSize: 11,
                                fontWeight: 500,
                                cursor: busy !== null ? 'wait' : 'pointer',
                                opacity: busy !== null ? 0.5 : 1,
                            }}
                        >
                            <RefreshCw size={12} style={{ animation: busy === 'rotate' ? 'spin 1s linear infinite' : undefined }} />
                            Rotate token
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{
                    background: CARD_BG_HALF,
                    borderRadius: 12,
                    border: `1px dashed ${BORDER}`,
                    padding: '28px 20px',
                    textAlign: 'center',
                    color: TEXT_SECONDARY,
                    fontSize: 13,
                }}>
                    Turn on Phone Mirror to generate a pairing URL and QR code.
                </div>
            )}

            {/* Error */}
            {error && (
                <div style={{
                    borderRadius: 8,
                    border: '1px solid rgba(239,68,68,0.30)',
                    background: 'rgba(239,68,68,0.08)',
                    padding: '10px 14px',
                    fontSize: 12,
                    color: 'rgba(252,165,165,0.90)',
                }}>
                    {error}
                </div>
            )}

            {/* Privacy note */}
            <div style={{ color: TEXT_MUTED, fontSize: 11, lineHeight: 1.7 }}>
                Phone Mirror runs entirely on your local network. No traffic leaves your machine — the bridge
                serves an HTML page and a WebSocket directly to your phone, gated by a per-session pairing token.
            </div>
        </div>
    );
};
