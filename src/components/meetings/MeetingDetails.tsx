import React, { useState } from 'react';
import { ArrowUp, Copy, Check, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import MeetingChatOverlay from './MeetingChatOverlay';
import EditableTextBlock from '../EditableTextBlock';
import LiveLensLogo from '../icon.png';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

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
}

// Shared ReactMarkdown component map used in both Overview and Usage sections
const mdComponents = {
    h1: ({ node, ...p }: any) => <p className="text-[14px] text-text-dim-primary font-semibold leading-[1.6] mb-2" {...p} />,
    h2: ({ node, ...p }: any) => <p className="text-[13.5px] text-text-dim-primary font-semibold leading-[1.6] mb-1.5" {...p} />,
    h3: ({ node, ...p }: any) => <p className="text-[13px] text-[rgba(226,229,237,0.55)] font-semibold leading-[1.6] mb-1" {...p} />,
    p:  ({ node, ...p }: any) => <p className="text-[13.5px] text-[rgba(226,229,237,0.55)] leading-[1.7] mb-2" {...p} />,
    ul: ({ node, ...p }: any) => <ul className="pl-4 mb-2" {...p} />,
    ol: ({ node, ...p }: any) => <ol className="pl-4 mb-2" {...p} />,
    li: ({ node, ...p }: any) => <li className="text-[13.5px] text-[rgba(226,229,237,0.55)] leading-[1.7] mb-0.5" {...p} />,
    strong: ({ node, ...p }: any) => <strong className="text-text-dim-primary font-semibold" {...p} />,
    a: ({ node, ...p }: any) => <a className="text-[#6a9bcc]" target="_blank" rel="noopener noreferrer" {...p} />,
    pre: ({ children }: any) => <div className="mb-3">{children}</div>,
    code: ({ node, inline, className, children, ...p }: any) => {
        const lang = /language-(\w+)/.exec(className || '')?.[1] || '';
        return !inline ? (
            <div className="rounded-lg overflow-hidden border border-white/[0.10] mb-3">
                <div className="bg-white/[0.04] px-3 py-[5px] border-b border-white/[0.07]">
                    <span className="text-[10px] uppercase tracking-[0.08em] font-semibold text-[rgba(226,229,237,0.30)]">{lang || 'CODE'}</span>
                </div>
                <SyntaxHighlighter language={lang || 'text'} style={vscDarkPlus} customStyle={{ margin: 0, borderRadius: 0, fontSize: 12.5, lineHeight: '1.6', background: 'transparent', padding: 14 }} wrapLongLines showLineNumbers lineNumberStyle={{ minWidth: '2.2em', paddingRight: '1em', color: 'rgba(255,255,255,0.18)', fontSize: 11 }} {...p}>{String(children).replace(/\n$/, '')}</SyntaxHighlighter>
            </div>
        ) : (
            <code className="bg-white/[0.07] px-1.5 py-px rounded text-[12.5px] font-mono text-text-dim-primary border border-white/[0.07]" {...p}>{children}</code>
        );
    },
};

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
        <div className="h-full w-full flex flex-col bg-bg-panel text-text-dim-primary overflow-hidden">

            {/* ── Scrollable body ── */}
            <main className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="max-w-[680px] mx-auto px-8 pt-7 pb-[120px]"
                >
                    {/* ── Back ── */}
                    <button
                        onClick={onBack}
                        className="flex items-center gap-[5px] mb-5 text-[12px] font-medium text-[rgba(226,229,237,0.30)] hover:text-[rgba(226,229,237,0.55)] bg-transparent border-0 cursor-pointer p-0 transition-colors duration-150"
                    >
                        <ArrowLeft size={13} /> Back
                    </button>

                    {/* ── Header ── */}
                    <div className="mb-6">
                        <div className="text-[11px] font-semibold tracking-[0.05em] uppercase text-[rgba(226,229,237,0.30)] mb-2">
                            {new Date(meeting.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </div>

                        <div className="text-text-dim-primary">
                            <EditableTextBlock
                                initialValue={meeting.title}
                                onSave={handleTitleSave}
                                tagName="h1"
                                className="text-[22px] font-[700] leading-[1.25] tracking-[-0.01em] text-[#e2e5ed]"
                                multiline={false}
                            />
                        </div>

                        {meeting.duration && (
                            <div className="inline-flex items-center gap-[5px] mt-2.5 px-2.5 py-[3px] rounded-full bg-accent-primary/[0.12] border border-accent-primary/[0.22]">
                                <span className="w-[5px] h-[5px] rounded-full bg-accent-primary shrink-0" />
                                <span className="text-[11px] font-semibold text-accent-primary">{meeting.duration}</span>
                            </div>
                        )}
                    </div>

                    {/* ── Tabs ── */}
                    <div className="flex items-center justify-between mb-6">
                        <div className="inline-flex items-center gap-0.5 p-[3px] rounded-[10px] bg-white/[0.04] border border-white/[0.07]">
                            {tabs.map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`relative px-[13px] py-[5px] rounded-[7px] text-[12.5px] font-medium cursor-pointer transition-all duration-[120ms] border ${activeTab === tab ? 'bg-white/[0.09] text-text-dim-primary border-white/[0.10]' : 'bg-transparent text-[rgba(226,229,237,0.55)] border-transparent hover:text-text-dim-primary'}`}
                                >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleCopy}
                            className="flex items-center gap-1.5 text-[11.5px] font-medium text-[rgba(226,229,237,0.30)] hover:text-[rgba(226,229,237,0.55)] bg-transparent border-0 cursor-pointer transition-colors duration-150"
                        >
                            {isCopied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
                            {isCopied ? 'Copied' : activeTab === 'summary' ? 'Copy summary' : activeTab === 'transcript' ? 'Copy transcript' : 'Copy usage'}
                        </button>
                    </div>

                    {/* ── Tab content ── */}
                    {activeTab === 'summary' && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-6">
                            {meeting.detailedSummary?.overview && (
                                <div className="pb-5 border-b border-white/[0.07]">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                                        {meeting.detailedSummary.overview}
                                    </ReactMarkdown>
                                </div>
                            )}

                            {(meeting.detailedSummary?.actionItems?.length ?? 0) > 0 && (
                                <section>
                                    <div className="mb-3">
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
                                    <ul className="list-none p-0 m-0 flex flex-col gap-2">
                                        {meeting.detailedSummary!.actionItems.map((item, i) => (
                                            <li key={i} className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.07]">
                                                <span className="w-1.5 h-1.5 rounded-full bg-accent-primary shrink-0 mt-1.5" />
                                                <div className="flex-1">
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

                            {(meeting.detailedSummary?.keyPoints?.length ?? 0) > 0 && (
                                <section>
                                    <div className="mb-3">
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
                                    <ul className="list-none p-0 m-0 flex flex-col gap-2">
                                        {meeting.detailedSummary!.keyPoints.map((item, i) => (
                                            <li key={i} className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.07]">
                                                <span className="w-1.5 h-1.5 rounded-full bg-[rgba(106,155,204,0.7)] shrink-0 mt-1.5" />
                                                <div className="flex-1">
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

                            {meeting.detailedSummary?.sections?.map((section, si) =>
                                section.bullets.length > 0 ? (
                                    <section key={si}>
                                        <h2 className="text-[13px] font-bold tracking-[0.06em] uppercase text-accent-primary mb-3">{section.title}</h2>
                                        <ul className="list-none p-0 m-0 flex flex-col gap-2">
                                            {section.bullets.map((b, bi) => (
                                                <li key={bi} className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-white/[0.03] border border-white/[0.07]">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[rgba(226,229,237,0.30)] shrink-0 mt-1.5" />
                                                    <p className="text-[13.5px] text-[rgba(226,229,237,0.55)] leading-[1.6] m-0">{b}</p>
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
                                if (!entries.length) return <p className="text-[13px] text-[rgba(226,229,237,0.30)]">No transcript available.</p>;
                                return (
                                    <div className="flex flex-col gap-4">
                                        {entries.map((e, i) => (
                                            <div key={i} className="px-3.5 py-3 rounded-lg bg-white/[0.03] border border-white/[0.07]">
                                                <div className="flex items-center gap-2 mb-[5px]">
                                                    <span className={`text-[11.5px] font-semibold ${e.speaker === 'user' ? 'text-accent-primary' : 'text-[rgba(106,155,204,0.85)]'}`}>
                                                        {e.speaker === 'user' ? 'Me' : 'Them'}
                                                    </span>
                                                    <span className="text-[11px] text-[rgba(226,229,237,0.30)] font-mono">
                                                        {e.timestamp ? formatTime(e.timestamp) : '—'}
                                                    </span>
                                                </div>
                                                <p className="text-[13.5px] text-[rgba(226,229,237,0.55)] leading-[1.65] m-0 select-text cursor-text">{e.text}</p>
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
                                ? <p className="text-[13px] text-[rgba(226,229,237,0.30)]">No usage history.</p>
                                : (
                                    <div className="flex flex-col gap-5">
                                        {meeting.usage.map((u, i) => (
                                            <div key={i} className="flex flex-col gap-2.5">
                                                {u.question && (
                                                    <div className="flex justify-end">
                                                        <div className="max-w-[78%] px-3.5 py-[9px] rounded-[14px] rounded-tr-[3px] bg-accent-primary/[0.12] border border-accent-primary/[0.22] text-[13.5px] text-text-dim-primary leading-[1.55]">
                                                            {u.question}
                                                        </div>
                                                    </div>
                                                )}
                                                {u.answer && (
                                                    <div className="flex items-start gap-2.5">
                                                        <div className="w-6 h-6 rounded-full bg-white/[0.03] border border-white/[0.07] shrink-0 flex items-center justify-center mt-0.5">
                                                            <img src={LiveLensLogo} alt="AI" className="w-3.5 h-3.5 opacity-50 object-contain" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="text-[10.5px] text-[rgba(226,229,237,0.30)] mb-1.5">{formatTime(u.timestamp)}</div>
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                                                                {cleanMarkdown(u.answer)}
                                                            </ReactMarkdown>
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
            <div className={`absolute bottom-0 left-0 right-0 px-6 py-4 flex justify-center pointer-events-none ${isChatOpen ? 'z-50' : 'z-20'}`}>
                <div className="w-full max-w-[440px] relative pointer-events-auto">
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleInputKeyDown}
                        placeholder="Ask about this meeting..."
                        className="w-full box-border py-[10px] pl-[18px] pr-11 bg-[rgba(13,15,20,0.88)] backdrop-blur-[20px] border border-white/[0.10] rounded-full text-[13px] text-text-dim-primary outline-none shadow-[0_8px_32px_rgba(0,0,0,0.4)] focus:border-accent-primary/40 transition-colors duration-150"
                    />
                    <button
                        onClick={handleSubmitQuestion}
                        className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center border-0 transition-colors duration-150 ${query.trim() ? 'bg-accent-primary text-white cursor-pointer' : 'bg-white/[0.07] text-[rgba(226,229,237,0.30)] cursor-default'}`}
                    >
                        <ArrowUp size={14} />
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
