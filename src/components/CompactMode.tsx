import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { Search, Sparkles, FileText, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Meeting {
    id: string;
    title: string;
    date: string;
    summary?: string;
}

interface SearchResult {
    id: string;
    title: string;
    subtitle: string;
    meetingId: string;
}

function searchMeetings(meetings: Meeting[], query: string): SearchResult[] {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: SearchResult[] = [];
    for (const m of meetings) {
        if (results.length >= 5) break;
        if (m.title.toLowerCase().includes(q) || m.summary?.toLowerCase().includes(q)) {
            results.push({
                id: m.id,
                title: m.title,
                subtitle: new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                meetingId: m.id,
            });
        }
    }
    return results;
}

const CompactMode: React.FC = () => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [meetings, setMeetings] = useState<Meeting[]>([]);

    const inputRef = useRef<HTMLInputElement>(null);
    const pillRef = useRef<HTMLDivElement>(null);

    // Load meetings
    useEffect(() => {
        window.electronAPI?.getRecentMeetings?.()
            .then(setMeetings)
            .catch(() => {});
    }, []);

    // Report pill height → resize Electron window
    useLayoutEffect(() => {
        if (!pillRef.current) return;
        const ro = new ResizeObserver(() => {
            if (pillRef.current) {
                window.electronAPI?.setLauncherCompactHeight?.(pillRef.current.offsetHeight + 8);
            }
        });
        ro.observe(pillRef.current);
        return () => ro.disconnect();
    }, []);

    const sessionResults = useMemo(
        () => (isOpen && query.trim() ? searchMeetings(meetings, query) : []),
        [meetings, query, isOpen]
    );

    const totalItems = 2 + sessionResults.length;

    const open = useCallback(() => {
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 20);
    }, []);

    const close = useCallback(() => {
        setIsOpen(false);
        setSelectedIndex(-1);
        setTimeout(() => {
            setQuery('');
        }, 150);
        inputRef.current?.blur();
    }, []);

    const handleSelect = useCallback((index: number) => {
        if (index === 0) {
            window.electronAPI?.setCompactMode?.(false);
            // parent launcher will open GlobalChat with query
        } else if (index === 1) {
            window.electronAPI?.setCompactMode?.(false);
        } else {
            const result = sessionResults[index - 2];
            if (result) {
                window.electronAPI?.setCompactMode?.(false);
            }
        }
        close();
    }, [sessionResults, close]);

    // Keyboard
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                if (isOpen) close(); else open();
                return;
            }
            if (e.key === 'Escape') { e.preventDefault(); close(); return; }
            if (!isOpen) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(p => Math.min(p + 1, totalItems - 1)); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(p => Math.max(p - 1, -1)); }
            else if (e.key === 'Enter') { e.preventDefault(); handleSelect(selectedIndex); }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, open, close, selectedIndex, totalItems, handleSelect]);

    const showResults = isOpen && query.trim().length > 0;

    return (
        <div className="w-full h-full bg-transparent flex items-start justify-center pt-[4px]">
            <div
                ref={pillRef}
                className="w-full mx-[4px] rounded-[14px] overflow-hidden border border-white/[0.10] backdrop-blur-[24px] bg-[rgba(13,15,20,0.94)]"
                style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.70), 0 2px 8px rgba(0,0,0,0.40), 0 0 0 0.5px rgba(255,255,255,0.04)' }}
            >
                {/* Search row */}
                <div
                    className="flex items-center gap-2 px-3 h-[40px] drag-region"
                    onClick={() => !isOpen && open()}
                >
                    <Search size={13} className="shrink-0 text-[rgba(226,229,237,0.28)]" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={e => {
                            setQuery(e.target.value);
                            setSelectedIndex(-1);
                            if (!isOpen) setIsOpen(true);
                        }}
                        onFocus={() => !isOpen && setIsOpen(true)}
                        placeholder="Search or ask anything…"
                        className="flex-1 bg-transparent border-none outline-none text-[13px] no-drag text-[rgba(226,229,237,0.85)]"
                        style={{ caretColor: '#d97757' }}
                        autoComplete="off"
                        spellCheck={false}
                    />
                    {/* ⌘K hint */}
                    {!isOpen && (
                        <div className="flex items-center gap-[3px] shrink-0 no-drag">
                            {['⌘', 'K'].map(k => (
                                <span key={k} className="text-[10px] px-[5px] py-[1px] rounded text-[rgba(226,229,237,0.35)] bg-white/[0.06] border border-white/[0.08]">
                                    {k}
                                </span>
                            ))}
                        </div>
                    )}
                    {/* Expand to full */}
                    <button
                        onClick={(e) => { e.stopPropagation(); window.electronAPI?.setCompactMode?.(false); }}
                        className="w-[24px] h-[24px] flex items-center justify-center rounded-[6px] border border-transparent no-drag transition-all duration-100 text-[rgba(226,229,237,0.28)] hover:bg-white/[0.07] hover:border-white/[0.09] hover:text-[rgba(226,229,237,0.70)]"
                        title="Open full launcher"
                    >
                        <Maximize2 size={11} />
                    </button>
                </div>

                {/* Results panel */}
                <AnimatePresence>
                    {showResults && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 160, damping: 26, opacity: { duration: 0.18 } }}
                            className="overflow-hidden"
                        >
                            <div className="border-t border-white/[0.07] py-2">
                                {/* Explore */}
                                <div className="px-2 pb-1">
                                    <div className="px-2 pb-1 text-[10px] font-[700] tracking-[0.08em] uppercase text-[rgba(226,229,237,0.22)]">Explore</div>

                                    {/* AI Query */}
                                    <button
                                        className={`w-full flex items-center gap-3 px-2 py-[7px] rounded-[8px] text-left ${selectedIndex === 0 ? 'bg-white/[0.07]' : 'bg-transparent'}`}
                                        onClick={() => handleSelect(0)}
                                        onMouseEnter={() => setSelectedIndex(0)}
                                        onMouseLeave={() => setSelectedIndex(-1)}
                                    >
                                        <div className="w-6 h-6 rounded-[6px] bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                                            <Sparkles size={11} className="text-white" />
                                        </div>
                                        <span className="text-[12.5px] truncate text-[rgba(226,229,237,0.80)]">{query}</span>
                                    </button>

                                    {/* Literal Search */}
                                    <button
                                        className={`w-full flex items-center gap-3 px-2 py-[7px] rounded-[8px] text-left ${selectedIndex === 1 ? 'bg-white/[0.07]' : 'bg-transparent'}`}
                                        onClick={() => handleSelect(1)}
                                        onMouseEnter={() => setSelectedIndex(1)}
                                        onMouseLeave={() => setSelectedIndex(-1)}
                                    >
                                        <div className="w-6 h-6 rounded-[6px] bg-white/[0.07] flex items-center justify-center shrink-0">
                                            <Search size={11} className="text-[rgba(226,229,237,0.45)]" />
                                        </div>
                                        <span className="text-[12.5px] text-[rgba(226,229,237,0.45)]">
                                            Search for <span className="text-[rgba(226,229,237,0.80)]">"{query}"</span>
                                        </span>
                                    </button>
                                </div>

                                {/* Sessions */}
                                {sessionResults.length > 0 && (
                                    <div className="px-2 pt-1 border-t border-white/[0.06]">
                                        <div className="px-2 pb-1 text-[10px] font-[700] tracking-[0.08em] uppercase text-[rgba(226,229,237,0.22)]">Sessions</div>
                                        <AnimatePresence initial={false} mode="popLayout">
                                            {sessionResults.map((r, i) => (
                                                <motion.button
                                                    layout="position"
                                                    key={r.id}
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.12 }}
                                                    className={`w-full flex items-center gap-3 px-2 py-[7px] rounded-[8px] text-left ${selectedIndex === i + 2 ? 'bg-white/[0.07]' : 'bg-transparent'}`}
                                                    onClick={() => handleSelect(i + 2)}
                                                    onMouseEnter={() => setSelectedIndex(i + 2)}
                                                    onMouseLeave={() => setSelectedIndex(-1)}
                                                >
                                                    <div className="w-6 h-6 rounded-[6px] bg-white/[0.07] flex items-center justify-center shrink-0">
                                                        <FileText size={11} className="text-[rgba(226,229,237,0.45)]" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-[12.5px] truncate text-[rgba(226,229,237,0.80)]">{r.title}</div>
                                                        <div className="text-[11px] text-[rgba(226,229,237,0.30)]">{r.subtitle}</div>
                                                    </div>
                                                </motion.button>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default CompactMode;
