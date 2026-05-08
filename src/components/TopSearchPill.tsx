import React, { useState, useEffect, useRef, useCallback, useMemo, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Sparkles, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// Types
// ============================================

type PillState = 'idle' | 'focused' | 'typing' | 'results';

interface Meeting {
    id: string;
    title: string;
    date: string;
    summary?: string;
}

interface SearchResult {
    id: string;
    type: 'meeting';
    title: string;
    subtitle?: string;
    meetingId: string;
}

interface TopSearchPillProps {
    meetings: Meeting[];
    onAIQuery: (query: string) => void;
    onLiteralSearch: (query: string) => void;
    onOpenMeeting: (meetingId: string) => void;
    onExpansionChange?: (isExpanded: boolean) => void;
    onHeightChange?: (height: number) => void;
}

// ============================================
// Fuzzy Search Helper
// ============================================

function fuzzyMatch(text: string, query: string): boolean {
    const normalizedText = text.toLowerCase();
    const normalizedQuery = query.toLowerCase();

    // Simple contains match for now
    if (normalizedText.includes(normalizedQuery)) return true;

    // Fuzzy character match
    // Fuzzy match removed for stricter accuracy
    // Only return true if exact substring match (already checked above)
    return false;
}

function searchMeetings(meetings: Meeting[], query: string): SearchResult[] {
    if (!query.trim()) return [];

    const results: SearchResult[] = [];
    const seen = new Set<string>();

    for (const meeting of meetings) {
        if (seen.has(meeting.id)) continue;

        // Match against title and summary
        const titleMatch = fuzzyMatch(meeting.title, query);
        const summaryMatch = meeting.summary && fuzzyMatch(meeting.summary, query);

        if (titleMatch || summaryMatch) {
            seen.add(meeting.id);
            results.push({
                id: meeting.id,
                type: 'meeting',
                title: meeting.title,
                subtitle: new Date(meeting.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric'
                }),
                meetingId: meeting.id
            });
        }

        if (results.length >= 5) break;
    }

    return results;
}

// ============================================
// Main Component
// ============================================

const TopSearchPill: React.FC<TopSearchPillProps> = ({
    meetings,
    onAIQuery,
    onLiteralSearch,
    onOpenMeeting,
    onExpansionChange,
    onHeightChange,
}) => {
    const [state, setState] = useState<PillState>('idle');
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const pillRef = useRef<HTMLDivElement>(null);

    // Report pill height to parent (used by compact mode to resize the Electron window)
    useLayoutEffect(() => {
        if (!onHeightChange || !pillRef.current) return;
        const ro = new ResizeObserver(() => {
            if (pillRef.current) onHeightChange(pillRef.current.offsetHeight + 14);
        });
        ro.observe(pillRef.current);
        return () => ro.disconnect();
    }, [onHeightChange]);

    // Notify parent of expansion changes
    useEffect(() => {
        onExpansionChange?.(state !== 'idle');
    }, [state, onExpansionChange]);

    // Compute results
    const sessionResults = useMemo(() => {
        if (state !== 'results' || !query.trim()) return [];
        return searchMeetings(meetings, query);
    }, [meetings, query, state]);

    // Total selectable items: 2 (Explore section) + sessions
    const totalItems = 2 + sessionResults.length;

    // State transitions
    const open = useCallback(() => {
        setState('focused');
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    const close = useCallback(() => {
        setState('idle');
        // Delay clearing query to allow exit animation to complete
        setTimeout(() => {
            setQuery('');
            setSelectedIndex(-1);
        }, 150);
        inputRef.current?.blur();
    }, []);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setQuery(value);
        setSelectedIndex(-1);

        if (value.trim()) {
            setState('results');
        } else {
            setState('focused');
        }
    }, []);

    const handleSelect = useCallback((index: number) => {
        if (index === 0) {
            // AI Query
            onAIQuery(query);
            close();
        } else if (index === 1) {
            // Literal search
            onLiteralSearch(query);
            close();
        } else {
            // Session result
            const sessionIndex = index - 2;
            const result = sessionResults[sessionIndex];
            if (result) {
                onOpenMeeting(result.meetingId);
                close();
            }
        }
    }, [query, sessionResults, onAIQuery, onLiteralSearch, onOpenMeeting, close]);

    // Keyboard handling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // ⌘K to open
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                if (state === 'idle') {
                    open();
                } else {
                    close();
                }
                return;
            }

            if (state === 'idle') return;

            // ESC to close
            if (e.key === 'Escape') {
                e.preventDefault();
                close();
                return;
            }

            // Arrow navigation
            if (state === 'results') {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(prev => Math.min(prev + 1, totalItems - 1));
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev => Math.max(prev - 1, -1));
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSelect(selectedIndex);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [state, open, close, selectedIndex, totalItems, handleSelect]);

    // Click outside to close
    useEffect(() => {
        if (state === 'idle') return;

        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                close();
            }
        };

        // Delay to prevent immediate close on open click
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timer);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [state, close]);

    const isExpanded = state !== 'idle';
    const showResults = state === 'results' && query.trim();

    return (
        <>
            {/* Backdrop blur overlay */}
            {createPortal(
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="fixed inset-0 bg-black/30 backdrop-blur-[8px] z-[90]"
                            onClick={close}
                        />
                    )}
                </AnimatePresence>,
                document.body
            )}

            {/* Search Pill Container */}
            <div
                ref={containerRef}
                className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 no-drag z-40"
            >
                <div className="relative">
                    <motion.div
                        initial={false}
                        animate={{
                            width: isExpanded ? 480 : 340,
                        }}
                        transition={{
                            type: "spring",
                            stiffness: 150,
                            damping: 25
                        }}
                        className="relative transform-gpu"
                    >
                        {/* Main Pill */}
                        <div className="relative" ref={pillRef}>
                            <div
                                className="relative overflow-hidden rounded-[12px]"
                                style={{
                                    background: 'rgba(13,15,20,0.92)',
                                    border: '1px solid rgba(255,255,255,0.09)',
                                    backdropFilter: 'blur(20px)',
                                    boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                                }}
                            >
                                {/* Input Row */}
                                <div
                                    className="relative flex items-center"
                                    onClick={() => state === 'idle' && open()}
                                >
                                    <div className="absolute left-3 flex items-center pointer-events-none">
                                        <Search size={13} style={{ color: 'rgba(226,229,237,0.30)' }} />
                                    </div>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={query}
                                        onChange={handleInputChange}
                                        onFocus={() => state === 'idle' && setState('focused')}
                                        className="w-full bg-transparent pl-[34px] pr-4 py-[7px] text-[13px] focus:outline-none"
                                        style={{
                                            color: 'rgba(226,229,237,0.85)',
                                            caretColor: '#d97757',
                                        }}
                                        placeholder="Search or ask anything…"
                                    />
                                </div>

                                {/* Results Panel */}
                                <AnimatePresence>
                                    {showResults && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ type: 'spring', stiffness: 150, damping: 25, opacity: { duration: 0.2 } }}
                                            className="overflow-hidden"
                                        >
                                            <div className="w-[480px]">
                                                <div className="py-2" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                                                    {/* Explore Section */}
                                                    <div className="px-2 pb-1">
                                                        <div className="px-2 pb-1 text-[10px] font-[700] tracking-[0.08em] uppercase" style={{ color: 'rgba(226,229,237,0.22)' }}>
                                                            Explore
                                                        </div>
                                                        {/* AI Query */}
                                                        <motion.button
                                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}
                                                            className="w-full flex items-center gap-3 px-2 py-[7px] rounded-[8px] text-left transition-colors duration-100"
                                                            style={{ background: selectedIndex === 0 ? 'rgba(255,255,255,0.07)' : 'transparent' }}
                                                            onClick={() => handleSelect(0)}
                                                            onMouseEnter={() => setSelectedIndex(0)}
                                                            onMouseLeave={() => setSelectedIndex(-1)}
                                                        >
                                                            <div className="w-6 h-6 rounded-[6px] bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                                                                <Sparkles size={11} className="text-white" />
                                                            </div>
                                                            <span className="text-[12.5px] truncate" style={{ color: 'rgba(226,229,237,0.80)' }}>{query}</span>
                                                        </motion.button>
                                                        {/* Literal Search */}
                                                        <motion.button
                                                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15, delay: 0.04 }}
                                                            className="w-full flex items-center gap-3 px-2 py-[7px] rounded-[8px] text-left transition-colors duration-100"
                                                            style={{ background: selectedIndex === 1 ? 'rgba(255,255,255,0.07)' : 'transparent' }}
                                                            onClick={() => handleSelect(1)}
                                                            onMouseEnter={() => setSelectedIndex(1)}
                                                            onMouseLeave={() => setSelectedIndex(-1)}
                                                        >
                                                            <div className="w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }}>
                                                                <Search size={11} style={{ color: 'rgba(226,229,237,0.45)' }} />
                                                            </div>
                                                            <span className="text-[12.5px]" style={{ color: 'rgba(226,229,237,0.45)' }}>
                                                                Search for <span style={{ color: 'rgba(226,229,237,0.80)' }}>"{query}"</span>
                                                            </span>
                                                        </motion.button>
                                                    </div>

                                                    {/* Sessions Section */}
                                                    {sessionResults.length > 0 && (
                                                        <div className="px-2 pt-1">
                                                            <div className="px-2 pb-1 text-[10px] font-[700] tracking-[0.08em] uppercase" style={{ color: 'rgba(226,229,237,0.22)' }}>
                                                                Sessions
                                                            </div>
                                                            <AnimatePresence initial={false} mode="popLayout">
                                                                {sessionResults.map((result, index) => (
                                                                    <motion.button
                                                                        layout="position"
                                                                        key={result.id}
                                                                        initial={{ opacity: 0, height: 0 }}
                                                                        animate={{ opacity: 1, height: 'auto' }}
                                                                        exit={{ opacity: 0, height: 0 }}
                                                                        transition={{ duration: 0.15 }}
                                                                        className="w-full flex items-center gap-3 px-2 py-[7px] rounded-[8px] text-left transition-colors duration-100"
                                                                        style={{ background: selectedIndex === index + 2 ? 'rgba(255,255,255,0.07)' : 'transparent' }}
                                                                        onClick={() => handleSelect(index + 2)}
                                                                        onMouseEnter={() => setSelectedIndex(index + 2)}
                                                                        onMouseLeave={() => setSelectedIndex(-1)}
                                                                    >
                                                                        <div className="w-6 h-6 rounded-[6px] flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }}>
                                                                            <FileText size={11} style={{ color: 'rgba(226,229,237,0.45)' }} />
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="text-[12.5px] truncate" style={{ color: 'rgba(226,229,237,0.80)' }}>{result.title}</div>
                                                                            {result.subtitle && (
                                                                                <div className="text-[11px]" style={{ color: 'rgba(226,229,237,0.30)' }}>{result.subtitle}</div>
                                                                            )}
                                                                        </div>
                                                                    </motion.button>
                                                                ))}
                                                            </AnimatePresence>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                </div >
            </div >
        </>
    );
};

export default TopSearchPill;
