import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { categorizeSttError, type SttErrorCategory } from '../../lib/sttErrorMapper';
import ChannelCard from './ChannelCard';

interface ChannelStatus {
    status: 'connected' | 'reconnecting' | 'failed';
    error?: string;
    provider?: string;
}

interface RollingTranscriptProps {
    text: string;
    isActive?: boolean;

    surfaceStyle?: React.CSSProperties;
    interviewerChannel?: ChannelStatus;
    microphoneChannel?: ChannelStatus;
    onCopyDiagnostics?: () => void;
}

// Split transcript into context (muted) + last word (bright).
function splitLastWord(text: string): [string, string] {
    if (!text) return ['', ''];
    const trimmed = text.trimEnd();
    const lastSpace = trimmed.lastIndexOf(' ');
    if (lastSpace === -1) return ['', trimmed];
    return [trimmed.slice(0, lastSpace + 1), trimmed.slice(lastSpace + 1)];
}

const RollingTranscript: React.FC<RollingTranscriptProps> = ({
    text, isActive = true, surfaceStyle,
    interviewerChannel, microphoneChannel,
    onCopyDiagnostics,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);
    const [expanded, setExpanded] = useState(false);

    const intStatus = interviewerChannel?.status ?? 'connected';
    const micStatus = microphoneChannel?.status ?? 'connected';
    const intError = interviewerChannel?.error;
    const micError = microphoneChannel?.error;
    const intProvider = interviewerChannel?.provider;
    const micProvider = microphoneChannel?.provider;

    const anyFailed = intStatus === 'failed' || micStatus === 'failed';
    const anyReconnecting = intStatus === 'reconnecting' || micStatus === 'reconnecting';
    const isNormal = !anyFailed && !anyReconnecting;

    const intErrorCategory: SttErrorCategory | null = (intStatus === 'failed' && intError)
        ? categorizeSttError(intError) : null;
    const micErrorCategory: SttErrorCategory | null = (micStatus === 'failed' && micError)
        ? categorizeSttError(micError) : null;

    useEffect(() => {
        if (intStatus === 'connected' && micStatus === 'connected') setExpanded(false);
    }, [intStatus, micStatus]);

    // Auto-scroll transcript to the right end whenever text updates.
    useEffect(() => {
        if (containerRef.current && isNormal && text) {
            containerRef.current.scrollLeft = containerRef.current.scrollWidth;
        }
    }, [text, isNormal]);

    const handleCopy = () => {
        if (onCopyDiagnostics) {
            onCopyDiagnostics();
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Dot color based on status.
    const dotColor = anyFailed ? '#f87171' : anyReconnecting ? '#fbbf24' : '#10b981';

    const [contextText, lastWord] = splitLastWord(text);

    return (
        <div className="relative w-full">
            {/* ── Normal / listening bar ── */}
            {isNormal && (
                <div
                    className="flex items-center gap-3 px-4 py-2 no-drag"
                    style={{
                        background: 'rgba(250,249,245,0.025)',
                        borderTop: '1px solid rgba(250,249,245,0.06)',
                        borderBottom: '1px solid rgba(250,249,245,0.06)',
                        ...surfaceStyle,
                    }}
                >
                    {/* Bouncing listen dots */}
                    <div className="flex items-center gap-[3px] shrink-0">
                        {[0, 150, 300].map((delay) => (
                            <span
                                key={delay}
                                className="w-1.5 h-1.5 rounded-full"
                                style={{
                                    background: dotColor,
                                    animation: 'rt-bounce 1.2s ease-in-out infinite',
                                    animationDelay: `${delay}ms`,
                                }}
                            />
                        ))}
                    </div>

                    {/* Scrolling transcript — masked on both edges */}
                    <div
                        className="flex-1 min-w-0 overflow-hidden whitespace-nowrap"
                        style={{
                            maskImage: 'linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 8%, black 92%, transparent 100%)',
                        }}
                    >
                        <div
                            ref={containerRef}
                            className="overflow-hidden whitespace-nowrap"
                        >
                            <span className="text-[12px]" style={{ color: 'rgba(250,249,245,0.55)' }}>
                                {text
                                    ? (
                                        <>
                                            {contextText}
                                            <span style={{ color: 'rgba(250,249,245,0.95)', fontWeight: 500 }}>
                                                {lastWord}
                                            </span>
                                            {isActive && (
                                                <span
                                                    className="inline-block w-[2px] h-[12px] ml-0.5 align-middle rounded-sm"
                                                    style={{ background: 'rgba(250,249,245,0.7)', animation: 'rt-pulse 1.4s ease-in-out infinite' }}
                                                />
                                            )}
                                        </>
                                    )
                                    : <span style={{ color: 'rgba(250,249,245,0.35)', fontStyle: 'italic' }}>Listening…</span>
                                }
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Reconnecting / error bar ── */}
            {!isNormal && (
                <div
                    className="relative w-full overflow-hidden"
                    style={{
                        background: anyFailed
                            ? 'linear-gradient(180deg, rgba(220,38,38,0.12) 0%, rgba(220,38,38,0.04) 50%, transparent 100%)'
                            : 'linear-gradient(180deg, rgba(202,138,4,0.10) 0%, rgba(202,138,4,0.025) 50%, transparent 100%)',
                        maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
                    }}
                >
                    {anyFailed && <div className="absolute inset-0 bg-red-500/10 stt-pulse-red" />}
                    {anyReconnecting && !anyFailed && <div className="absolute inset-0 bg-amber-500/10 stt-pulse-amber" />}

                    <div className="w-[90%] mx-auto pt-2">
                        <div
                            className="overflow-hidden whitespace-nowrap scroll-smooth overlay-transcript-surface transition-all duration-500 text-right"
                            style={{ maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)' }}
                        >
                            {anyReconnecting && !anyFailed && (
                                <span className="flex items-center justify-center w-full text-[12px] leading-7 stt-state-enter">
                                    <span className="text-amber-400/70 font-medium tracking-wide">Reconnecting</span>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Error chips */}
                    {(anyFailed || anyReconnecting) && (
                        <div className="relative w-[90%] mx-auto">
                            <span className="flex items-center justify-center w-full text-[12px] leading-7 pl-3 stt-state-enter gap-3">
                                {intStatus === 'failed' && intErrorCategory && (
                                    <span className="flex items-center gap-1.5 text-red-400 font-medium tracking-wide truncate max-w-[44%]">
                                        <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                                            <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
                                        </svg>
                                        System: {intErrorCategory.title}
                                    </span>
                                )}
                                {intStatus === 'failed' && micStatus === 'failed' && (
                                    <span className="text-red-400/40 font-light">/</span>
                                )}
                                {micStatus === 'failed' && micErrorCategory && (
                                    <span className="flex items-center gap-1.5 text-red-400 font-medium tracking-wide truncate max-w-[44%]">
                                        <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                            <line x1="12" y1="19" x2="12" y2="22"/>
                                        </svg>
                                        Mic: {micErrorCategory.title}
                                    </span>
                                )}
                                <button
                                    aria-label={expanded ? 'Collapse error details' : 'Expand error details'}
                                    onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded); } }}
                                    className="absolute right-1 flex items-center justify-center w-6 h-6 rounded-md text-red-400/70 hover:text-red-400 hover:bg-red-500/[0.12] transition-all duration-200 flex-shrink-0"
                                >
                                    <svg className={`w-3 h-3 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="6 9 12 15 18 9" />
                                    </svg>
                                </button>
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Expanded diagnostics panel — unchanged */}
            {expanded && (
                <motion.div
                    initial={{ opacity: 0, height: 0, scale: 0.98 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.98 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="mt-4 mb-6 w-[92%] mx-auto overflow-hidden"
                >
                    <div className="relative rounded-2xl overflow-hidden backdrop-blur-xl border border-white/10 shadow-lg shadow-black/10">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/3 via-transparent to-white/2 pointer-events-none" />
                        <div className="relative p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="relative flex items-center justify-center w-5 h-5">
                                        <div className={`absolute inset-0 rounded-full ${anyFailed ? 'bg-red-500/20 animate-pulse' : anyReconnecting ? 'bg-amber-500/20' : 'bg-sky-500/20'}`} />
                                        <div className={`w-2 h-2 rounded-full ${anyFailed ? 'bg-red-400' : anyReconnecting ? 'bg-amber-400' : 'bg-sky-400'}`} />
                                    </div>
                                    <span className="text-[11px] font-semibold tracking-[0.08em] uppercase overlay-text-muted">Audio Diagnostics</span>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full ${anyFailed ? 'bg-red-500/20 text-red-400/80' : anyReconnecting ? 'bg-amber-500/20 text-amber-400/80' : 'bg-sky-500/20 text-sky-400/80'}`}>
                                    {anyFailed ? 'Issues Detected' : anyReconnecting ? 'Reconnecting' : 'Healthy'}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5">
                                <ChannelCard name="System Audio" status={intStatus} provider={intProvider} error={intError} errorCategory={intErrorCategory}
                                    iconConnected={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>}
                                    iconReconnecting={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
                                    iconFailed={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>}
                                />
                                <ChannelCard name="Microphone" status={micStatus} provider={micProvider} error={micError} errorCategory={micErrorCategory}
                                    iconConnected={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                                    iconReconnecting={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>}
                                    iconFailed={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="8" y1="23" x2="16" y2="23"/></svg>}
                                />
                            </div>
                            {onCopyDiagnostics && (
                                <div className="flex items-center justify-center pt-2 border-t border-white/5">
                                    <button
                                        onClick={handleCopy}
                                        aria-label="Copy STT error details"
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold tracking-wide transition-all duration-200 interaction-press ${copied ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 hover:bg-white/10 overlay-text-secondary hover:overlay-text-primary border border-white/5 hover:border-white/15'}`}
                                    >
                                        {copied ? (
                                            <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Copied</span></>
                                        ) : (
                                            <><svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg><span>Copy Report</span></>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Keyframe animations injected once */}
            <style>{`
                @keyframes rt-bounce {
                    0%, 80%, 100% { transform: scale(0.6); opacity: 0.45; }
                    40% { transform: scale(1); opacity: 1; }
                }
                @keyframes rt-pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.35; }
                }
            `}</style>
        </div>
    );
};

export default RollingTranscript;
