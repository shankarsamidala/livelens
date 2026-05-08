import React, { useState } from 'react';
import { ArrowUp, Copy, Check, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import MeetingChatOverlay from './MeetingChatOverlay';
import EditableTextBlock from './EditableTextBlock';
import LiveLensLogo from './icon.png';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// ── theme tokens ────────────────────────────────────────────────────────────
const T = {
    bg:        '#0d0f14',
    bgCard:    'rgba(255,255,255,0.03)',
    border:    'rgba(255,255,255,0.07)',
    borderMid: 'rgba(255,255,255,0.10)',
    text:      'rgba(226,229,237,0.88)',
    textDim:   'rgba(226,229,237,0.55)',
    textMute:  'rgba(226,229,237,0.30)',
    accent:    '#d97757',
    accentBg:  'rgba(217,119,87,0.12)',
    accentBorder: 'rgba(217,119,87,0.22)',
    tabActive: 'rgba(255,255,255,0.09)',
    tabBg:     'rgba(255,255,255,0.04)',
};

const formatTime = (ms: number) => {
    const date = new Date(ms);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
};

const cleanMarkdown = (content: string) => {
    if (!content) return '';
    return content.replace(/([^\n])```/g, '$1\n\n```');
};

interface Meeting {
    id: string;
    title: string;
    date: string;
    duration: string;
    summary: string;
    detailedSummary?: {
        overview?: string;
        actionItems: string[];
        keyPoints: string[];
        actionItemsTitle?: string;
        keyPointsTitle?: string;
        sections?: Array<{ title: string; bullets: string[] }>;
    };
    transcript?: Array<{ speaker: string; text: string; timestamp: number }>;
    usage?: Array<{
        type: 'assist' | 'followup' | 'chat' | 'followup_questions';
        timestamp: number;
        question?: string;
        answer?: string;
        items?: string[];
    }>;
}

interface MeetingDetailsProps {
    meeting: Meeting;
    onBack: () => void;
    onOpenSettings: () => void;
}

const MeetingDetails: React.FC<MeetingDetailsProps> = ({ meeting: initialMeeting, onBack }) => {
    const [meeting, setMeeting]           = useState<Meeting>(initialMeeting);
    const [activeTab, setActiveTab]       = useState<'summary' | 'transcript' | 'usage'>('summary');
    const [query, setQuery]               = useState('');
    const [isCopied, setIsCopied]         = useState(false);
    const [isChatOpen, setIsChatOpen]     = useState(false);
    const [submittedQuery, setSubmittedQuery] = useState('');

    const handleSubmitQuestion = () => {
        if (query.trim()) {
            setSubmittedQuery(query);
            if (!isChatOpen) setIsChatOpen(true);
            setQuery('');
        }
    };

    const handleInputKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && query.trim()) { e.preventDefault(); handleSubmitQuestion(); }
    };

    const handleCopy = async () => {
        let text = '';
        if (activeTab === 'summary' && meeting.detailedSummary) {
            text = `Meeting: ${meeting.title}\nDate: ${new Date(meeting.date).toLocaleDateString()}\n\nOVERVIEW:\n${meeting.detailedSummary.overview || ''}\n\nACTION ITEMS:\n${meeting.detailedSummary.actionItems?.map(i => `- ${i}`).join('\n') || 'None'}\n\nKEY POINTS:\n${meeting.detailedSummary.keyPoints?.map(i => `- ${i}`).join('\n') || 'None'}`.trim();
        } else if (activeTab === 'transcript' && meeting.transcript) {
            text = meeting.transcript.map(t => `[${formatTime(t.timestamp)}] ${t.speaker === 'user' ? 'Me' : 'Them'}: ${t.text}`).join('\n');
        } else if (activeTab === 'usage' && meeting.usage) {
            text = meeting.usage.map(u => `Q: ${u.question || ''}\nA: ${u.answer || ''}`).join('\n\n');
        }
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch {}
    };

    const handleTitleSave = async (val: string) => {
        setMeeting(p => ({ ...p, title: val }));
        await window.electronAPI?.updateMeetingTitle?.(meeting.id, val);
    };

    const handleActionItemSave = async (i: number, val: string) => {
        const items = [...(meeting.detailedSummary?.actionItems || [])];
        items[i] = val;
        setMeeting(p => ({ ...p, detailedSummary: { ...p.detailedSummary!, actionItems: items } }));
        await window.electronAPI?.updateMeetingSummary?.(meeting.id, { actionItems: items });
    };

    const handleKeyPointSave = async (i: number, val: string) => {
        const items = [...(meeting.detailedSummary?.keyPoints || [])];
        items[i] = val;
        setMeeting(p => ({ ...p, detailedSummary: { ...p.detailedSummary!, keyPoints: items } }));
        await window.electronAPI?.updateMeetingSummary?.(meeting.id, { keyPoints: items });
    };

    const tabs: Array<'summary' | 'transcript' | 'usage'> = ['summary', 'transcript', 'usage'];

    return (
        <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', background: T.bg, color: T.text, fontFamily: 'inherit', overflow: 'hidden' }}>

            {/* ── Scrollable body ── */}
            <main style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'none' }}>
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ maxWidth: 680, margin: '0 auto', padding: '28px 32px 120px' }}
                >
                    {/* ── Back ── */}
                    <button
                        onClick={onBack}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 20, fontSize: 12, fontWeight: 500, color: T.textMute, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        onMouseEnter={e => (e.currentTarget.style.color = T.textDim)}
                        onMouseLeave={e => (e.currentTarget.style.color = T.textMute)}
                    >
                        <ArrowLeft size={13} /> Back
                    </button>

                    {/* ── Header ── */}
                    <div style={{ marginBottom: 24 }}>
                        {/* Date */}
                        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: T.textMute, marginBottom: 8 }}>
                            {new Date(meeting.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </div>

                        {/* Title — editable, always visible */}
                        <div style={{ color: T.text }}>
                            <EditableTextBlock
                                initialValue={meeting.title}
                                onSave={handleTitleSave}
                                tagName="h1"
                                className="text-[22px] font-[700] leading-[1.25] tracking-[-0.01em] text-[#e2e5ed]"
                                multiline={false}
                            />
                        </div>

                        {/* Duration chip */}
                        {meeting.duration && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, padding: '3px 10px', borderRadius: 20, background: T.accentBg, border: `1px solid ${T.accentBorder}` }}>
                                <span style={{ width: 5, height: 5, borderRadius: '50%', background: T.accent, flexShrink: 0 }} />
                                <span style={{ fontSize: 11, fontWeight: 600, color: T.accent }}>{meeting.duration}</span>
                            </div>
                        )}
                    </div>

                    {/* ── Tabs ── */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, padding: 3, borderRadius: 10, background: T.tabBg, border: `1px solid ${T.border}` }}>
                            {tabs.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    style={{
                                        position: 'relative', padding: '5px 13px', borderRadius: 7, fontSize: 12.5, fontWeight: 500,
                                        background: activeTab === tab ? T.tabActive : 'transparent',
                                        color: activeTab === tab ? T.text : T.textDim,
                                        border: activeTab === tab ? `1px solid ${T.borderMid}` : '1px solid transparent',
                                        cursor: 'pointer', transition: 'all 0.12s',
                                    }}
                                    onMouseEnter={e => { if (activeTab !== tab) e.currentTarget.style.color = T.text; }}
                                    onMouseLeave={e => { if (activeTab !== tab) e.currentTarget.style.color = T.textDim; }}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* Copy */}
                        <button
                            onClick={handleCopy}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 500, color: T.textMute, background: 'none', border: 'none', cursor: 'pointer' }}
                            onMouseEnter={e => (e.currentTarget.style.color = T.textDim)}
                            onMouseLeave={e => (e.currentTarget.style.color = T.textMute)}
                        >
                            {isCopied ? <Check size={13} style={{ color: '#4ade80' }} /> : <Copy size={13} />}
                            {isCopied ? 'Copied' : activeTab === 'summary' ? 'Copy summary' : activeTab === 'transcript' ? 'Copy transcript' : 'Copy usage'}
                        </button>
                    </div>

                    {/* ── Tab content ── */}
                    {activeTab === 'summary' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            {/* Overview */}
                            {meeting.detailedSummary?.overview && (
                                <div style={{ paddingBottom: 20, borderBottom: `1px solid ${T.border}` }}>
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                            h1: ({ node, ...p }) => <p style={{ fontSize: 14, color: T.text, fontWeight: 600, lineHeight: 1.6, marginBottom: 8 }} {...p} />,
                                            h2: ({ node, ...p }) => <p style={{ fontSize: 13.5, color: T.text, fontWeight: 600, lineHeight: 1.6, marginBottom: 6 }} {...p} />,
                                            h3: ({ node, ...p }) => <p style={{ fontSize: 13, color: T.textDim, fontWeight: 600, lineHeight: 1.6, marginBottom: 4 }} {...p} />,
                                            p:  ({ node, ...p }) => <p style={{ fontSize: 13.5, color: T.textDim, lineHeight: 1.7, marginBottom: 8 }} {...p} />,
                                            ul: ({ node, ...p }) => <ul style={{ paddingLeft: 16, marginBottom: 8 }} {...p} />,
                                            ol: ({ node, ...p }) => <ol style={{ paddingLeft: 16, marginBottom: 8 }} {...p} />,
                                            li: ({ node, ...p }) => <li style={{ fontSize: 13.5, color: T.textDim, lineHeight: 1.7, marginBottom: 2 }} {...p} />,
                                            strong: ({ node, ...p }) => <strong style={{ color: T.text, fontWeight: 600 }} {...p} />,
                                            a: ({ node, ...p }: any) => <a style={{ color: '#6a9bcc' }} {...p} />,
                                        }}
                                    >
                                        {meeting.detailedSummary.overview}
                                    </ReactMarkdown>
                                </div>
                            )}

                            {/* Action Items */}
                            {(meeting.detailedSummary?.actionItems?.length ?? 0) > 0 && (
                                <section>
                                    <div style={{ marginBottom: 12 }}>
                                        <EditableTextBlock
                                            initialValue={meeting.detailedSummary?.actionItemsTitle || 'Action Items'}
                                            onSave={val => {
                                                setMeeting(p => ({ ...p, detailedSummary: { ...p.detailedSummary!, actionItemsTitle: val } }));
                                                window.electronAPI?.updateMeetingSummary?.(meeting.id, { actionItemsTitle: val });
                                            }}
                                            tagName="h2"
                                            className="text-[13px] font-[700] tracking-[0.06em] uppercase text-[#d97757]"
                                            multiline={false}
                                        />
                                    </div>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {meeting.detailedSummary!.actionItems.map((item, i) => (
                                            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 8, background: T.bgCard, border: `1px solid ${T.border}` }}>
                                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent, flexShrink: 0, marginTop: 6 }} />
                                                <div style={{ flex: 1, color: T.textDim }}>
                                                    <EditableTextBlock
                                                        initialValue={item}
                                                        onSave={val => handleActionItemSave(i, val)}
                                                        tagName="p"
                                                        className="text-[13.5px] text-[rgba(226,229,237,0.65)] leading-[1.6]"
                                                        placeholder="Action item..."
                                                        onEnter={() => {
                                                            const items = [...(meeting.detailedSummary?.actionItems || [])];
                                                            items.splice(i + 1, 0, '');
                                                            setMeeting(p => ({ ...p, detailedSummary: { ...p.detailedSummary!, actionItems: items } }));
                                                        }}
                                                    />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            {/* Key Points */}
                            {(meeting.detailedSummary?.keyPoints?.length ?? 0) > 0 && (
                                <section>
                                    <div style={{ marginBottom: 12 }}>
                                        <EditableTextBlock
                                            initialValue={meeting.detailedSummary?.keyPointsTitle || 'Key Points'}
                                            onSave={val => {
                                                setMeeting(p => ({ ...p, detailedSummary: { ...p.detailedSummary!, keyPointsTitle: val } }));
                                                window.electronAPI?.updateMeetingSummary?.(meeting.id, { keyPointsTitle: val });
                                            }}
                                            tagName="h2"
                                            className="text-[13px] font-[700] tracking-[0.06em] uppercase text-[#d97757]"
                                            multiline={false}
                                        />
                                    </div>
                                    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {meeting.detailedSummary!.keyPoints.map((item, i) => (
                                            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 8, background: T.bgCard, border: `1px solid ${T.border}` }}>
                                                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(106,155,204,0.7)', flexShrink: 0, marginTop: 6 }} />
                                                <div style={{ flex: 1 }}>
                                                    <EditableTextBlock
                                                        initialValue={item}
                                                        onSave={val => handleKeyPointSave(i, val)}
                                                        tagName="p"
                                                        className="text-[13.5px] text-[rgba(226,229,237,0.65)] leading-[1.6]"
                                                        placeholder="Key point..."
                                                        onEnter={() => {
                                                            const items = [...(meeting.detailedSummary?.keyPoints || [])];
                                                            items.splice(i + 1, 0, '');
                                                            setMeeting(p => ({ ...p, detailedSummary: { ...p.detailedSummary!, keyPoints: items } }));
                                                        }}
                                                    />
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            )}

                            {/* Extra sections */}
                            {meeting.detailedSummary?.sections?.map((section, si) =>
                                section.bullets.length > 0 ? (
                                    <section key={si}>
                                        <h2 style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: T.accent, marginBottom: 12 }}>{section.title}</h2>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            {section.bullets.map((b, bi) => (
                                                <li key={bi} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px', borderRadius: 8, background: T.bgCard, border: `1px solid ${T.border}` }}>
                                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.textMute, flexShrink: 0, marginTop: 6 }} />
                                                    <p style={{ fontSize: 13.5, color: T.textDim, lineHeight: 1.6, margin: 0 }}>{b}</p>
                                                </li>
                                            ))}
                                        </ul>
                                    </section>
                                ) : null
                            )}
                        </motion.div>
                    )}

                    {activeTab === 'transcript' && (
                        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            {(() => {
                                const entries = meeting.transcript?.filter(e => !['system','ai','assistant','model'].includes(e.speaker?.toLowerCase())) || [];
                                if (!entries.length) return <p style={{ fontSize: 13, color: T.textMute }}>No transcript available.</p>;
                                return (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                        {entries.map((e, i) => (
                                            <div key={i} style={{ padding: '12px 14px', borderRadius: 8, background: T.bgCard, border: `1px solid ${T.border}` }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                                                    <span style={{ fontSize: 11.5, fontWeight: 600, color: e.speaker === 'user' ? T.accent : 'rgba(106,155,204,0.85)' }}>
                                                        {e.speaker === 'user' ? 'Me' : 'Them'}
                                                    </span>
                                                    <span style={{ fontSize: 11, color: T.textMute, fontFamily: 'monospace' }}>
                                                        {e.timestamp ? formatTime(e.timestamp) : '—'}
                                                    </span>
                                                </div>
                                                <p style={{ fontSize: 13.5, color: T.textDim, lineHeight: 1.65, margin: 0, userSelect: 'text', cursor: 'text' }}>{e.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </motion.section>
                    )}

                    {activeTab === 'usage' && (
                        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            {!meeting.usage?.length
                                ? <p style={{ fontSize: 13, color: T.textMute }}>No usage history.</p>
                                : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                        {meeting.usage.map((u, i) => (
                                            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                                {u.question && (
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                                        <div style={{ maxWidth: '78%', padding: '9px 14px', borderRadius: 14, borderTopRightRadius: 3, background: T.accentBg, border: `1px solid ${T.accentBorder}`, fontSize: 13.5, color: T.text, lineHeight: 1.55 }}>
                                                            {u.question}
                                                        </div>
                                                    </div>
                                                )}
                                                {u.answer && (
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                                                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: T.bgCard, border: `1px solid ${T.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                                                            <img src={LiveLensLogo} alt="AI" style={{ width: 14, height: 14, opacity: 0.5, objectFit: 'contain' }} />
                                                        </div>
                                                        <div style={{ flex: 1 }}>
                                                            <div style={{ fontSize: 10.5, color: T.textMute, marginBottom: 6 }}>{formatTime(u.timestamp)}</div>
                                                            <div style={{ fontSize: 13.5, color: T.textDim, lineHeight: 1.65 }}>
                                                                <ReactMarkdown
                                                                    remarkPlugins={[remarkGfm]}
                                                                    components={{
                                                                        p:  ({ node, ...p }) => <p style={{ fontSize: 13.5, color: T.textDim, lineHeight: 1.65, marginBottom: 8 }} {...p} />,
                                                                        ul: ({ node, ...p }) => <ul style={{ paddingLeft: 16, marginBottom: 8 }} {...p} />,
                                                                        ol: ({ node, ...p }) => <ol style={{ paddingLeft: 16, marginBottom: 8 }} {...p} />,
                                                                        li: ({ node, ...p }) => <li style={{ fontSize: 13.5, color: T.textDim, lineHeight: 1.65, marginBottom: 2 }} {...p} />,
                                                                        strong: ({ node, ...p }) => <strong style={{ color: T.text, fontWeight: 600 }} {...p} />,
                                                                        a: ({ node, ...p }: any) => <a style={{ color: '#6a9bcc' }} target="_blank" rel="noopener noreferrer" {...p} />,
                                                                        pre: ({ children }: any) => <div style={{ marginBottom: 12 }}>{children}</div>,
                                                                        code: ({ node, inline, className, children, ...p }: any) => {
                                                                            const lang = /language-(\w+)/.exec(className || '')?.[1] || '';
                                                                            return !inline ? (
                                                                                <div style={{ borderRadius: 8, overflow: 'hidden', border: `1px solid ${T.borderMid}`, marginBottom: 12 }}>
                                                                                    <div style={{ background: 'rgba(255,255,255,0.04)', padding: '5px 12px', borderBottom: `1px solid ${T.border}` }}>
                                                                                        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, color: T.textMute }}>{lang || 'CODE'}</span>
                                                                                    </div>
                                                                                    <SyntaxHighlighter language={lang || 'text'} style={vscDarkPlus} customStyle={{ margin: 0, borderRadius: 0, fontSize: 12.5, lineHeight: '1.6', background: 'transparent', padding: 14 }} wrapLongLines showLineNumbers lineNumberStyle={{ minWidth: '2.2em', paddingRight: '1em', color: 'rgba(255,255,255,0.18)', fontSize: 11 }} {...p}>{String(children).replace(/\n$/, '')}</SyntaxHighlighter>
                                                                                </div>
                                                                            ) : (
                                                                                <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 6px', borderRadius: 4, fontSize: 12.5, fontFamily: 'monospace', color: T.text, border: `1px solid ${T.border}` }} {...p}>{children}</code>
                                                                            );
                                                                        }
                                                                    }}
                                                                >
                                                                    {cleanMarkdown(u.answer)}
                                                                </ReactMarkdown>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )
                            }
                        </motion.section>
                    )}
                </motion.div>
            </main>

            {/* ── Floating ask bar ── */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 24px', display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: isChatOpen ? 50 : 20 }}>
                <div style={{ width: '100%', maxWidth: 440, position: 'relative', pointerEvents: 'auto' }}>
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        placeholder="Ask about this meeting..."
                        style={{
                            width: '100%', boxSizing: 'border-box',
                            padding: '10px 44px 10px 18px',
                            background: 'rgba(13,15,20,0.88)',
                            backdropFilter: 'blur(20px)',
                            border: `1px solid ${T.borderMid}`,
                            borderRadius: 999,
                            fontSize: 13, color: T.text,
                            outline: 'none',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        }}
                        onFocus={e => (e.target.style.borderColor = 'rgba(217,119,87,0.40)')}
                        onBlur={e => (e.target.style.borderColor = T.borderMid)}
                    />
                    <button
                        onClick={handleSubmitQuestion}
                        style={{
                            position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                            width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: query.trim() ? T.accent : 'rgba(255,255,255,0.07)',
                            border: 'none', cursor: query.trim() ? 'pointer' : 'default',
                            color: query.trim() ? '#fff' : T.textMute,
                            transition: 'background 0.15s',
                        }}
                    >
                        <ArrowUp size={14} style={{ transform: 'rotate(0deg)' }} />
                    </button>
                </div>
            </div>

            {/* ── Chat overlay ── */}
            <MeetingChatOverlay
                isOpen={isChatOpen}
                onClose={() => { setIsChatOpen(false); setQuery(''); setSubmittedQuery(''); }}
                meetingContext={{ id: meeting.id, title: meeting.title, summary: meeting.detailedSummary?.overview, keyPoints: meeting.detailedSummary?.keyPoints, actionItems: meeting.detailedSummary?.actionItems, transcript: meeting.transcript }}
                initialQuery={submittedQuery}
                onNewQuery={q => setSubmittedQuery(q)}
            />
        </div>
    );
};

export default MeetingDetails;
