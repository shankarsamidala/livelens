import React, { useState, useEffect, useRef, useLayoutEffect, useMemo, useCallback, startTransition as reactStartTransition } from 'react';
import {
    Pencil,
    MessageSquare,
    RefreshCw,
    ArrowRight,
    HelpCircle,
    ChevronDown,
    Lightbulb,
    Mic,
    Image,
    X,
    Zap,
    SlidersHorizontal,
    Code,
    Copy,
    Check,
    PointerOff,
    EyeOff,
    ChevronsDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight, vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import RollingTranscript from './ui/RollingTranscript';
import { NegotiationCoachingCard } from '../premium';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { analytics, detectProviderType } from '../lib/analytics/analytics.service';
import { useShortcuts } from '../hooks/useShortcuts';
import { useResolvedTheme } from '../hooks/useResolvedTheme';
import { getOverlayAppearance, OVERLAY_OPACITY_DEFAULT } from '../lib/overlayAppearance';
import icon from './icon.png';

interface Message {
    id: string;
    role: 'user' | 'system' | 'interviewer';
    text: string;
    isStreaming?: boolean;
    hasScreenshot?: boolean;
    screenshotPreview?: string;
    isCode?: boolean;
    intent?: string;
    isNegotiationCoaching?: boolean;
    negotiationCoachingData?: {
        tacticalNote: string;
        exactScript: string;
        showSilenceTimer: boolean;
        phase: string;
        theirOffer: number | null;
        yourTarget: number | null;
        currency: string;
    };
}

const CopyBtn: React.FC<{ code: string }> = ({ code }) => {
    const [copied, setCopied] = React.useState(false);
    return (
        <button
            onClick={() => { navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
            className="opacity-40 hover:opacity-100 transition-opacity p-0.5 rounded"
            title="Copy code"
        >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
        </button>
    );
};

const ANALYSIS_MODES = [
    { id: 'general',       icon: '💬', label: 'General',       description: 'Describe and solve whatever is visible' },
    { id: 'dsa',           icon: '🧩', label: 'DSA',           description: 'Naive → optimal, code, complexity' },
    { id: 'system-design', icon: '🏗️', label: 'System Design', description: 'Architecture, capacity, trade-offs' },
    { id: 'debug',         icon: '🐛', label: 'Debug',         description: 'Find bug, explain it, fix it' },
    { id: 'behavioral',    icon: '🎯', label: 'Behavioral',    description: 'STAR-method first-person answer' },
    { id: 'sales',         icon: '💼', label: 'Sales',         description: 'Objections, discovery, closing' },
    { id: 'data-science',  icon: '📊', label: 'Data Science',  description: 'Analysis, ML approach, Python-first' },
    { id: 'devops',        icon: '⚙️', label: 'DevOps',        description: 'Infrastructure, CI/CD, containers' },
] as const;

interface LiveLensInterfaceProps {
    onEndMeeting?: () => void;
    overlayOpacity?: number;
}

const LiveLensInterface: React.FC<LiveLensInterfaceProps> = ({ onEndMeeting, overlayOpacity = OVERLAY_OPACITY_DEFAULT }) => {
    const isLightTheme = useResolvedTheme() === 'light';
    const [isExpanded, setIsExpanded] = useState(true);
    const [inputValue, setInputValue] = useState('');
    const { shortcuts, isShortcutPressed } = useShortcuts();
    const [messages, setMessages] = useState<Message[]>([]);
    const [sttInterviewerStatus, setSttInterviewerStatus] = useState<'connected' | 'reconnecting' | 'failed'>('connected');
    const [sttInterviewerError, setSttInterviewerError] = useState<string>('');
    const [sttInterviewerProvider, setSttInterviewerProvider] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isInterviewerCapturing, setIsInterviewerCapturing] = useState(true);
    const isInterviewerCapturingRef = useRef(true);
    useEffect(() => { isInterviewerCapturingRef.current = isInterviewerCapturing; }, [isInterviewerCapturing]);
    const [conversationContext, setConversationContext] = useState<string>('');
    // Analytics State
    const requestStartTimeRef = useRef<number | null>(null);

    const [rollingTranscript, setRollingTranscript] = useState('');
    const rollingTranscriptRef = useRef('');   // mirrors state — avoids stale closure in useEffect
    const partialAccRef = useRef('');          // accumulates live delta tokens between finals
    const [isInterviewerSpeaking, setIsInterviewerSpeaking] = useState(false);
    const userTypedRef = useRef(false); // true when user manually typed — prevents transcript from overwriting
    const textInputRef = useRef<HTMLInputElement>(null); // Ref for input focus
    const isStealthRef = useRef<boolean>(false); // Tracks if the next expansion should be stealthy
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    // Captures data from onCaptureAndProcess before the React state flush so
    // handleWhatToSay() can access it even in React 18 concurrent mode (where
    // a plain setTimeout(0) may fire before setAttachedContext flushes).
    const pendingCaptureRef = useRef<{ path: string; preview: string } | null>(null);

    // Latent Context State (Screenshots attached but not sent)
    const [attachedContext, setAttachedContext] = useState<Array<{ path: string, preview: string }>>([]);

    // Settings State with Persistence
    const [isUndetectable, setIsUndetectable] = useState(false);
    const storedHideChatHidesWidget = localStorage.getItem('natively_hideChatHidesWidget');
    const hideChatHidesWidget = storedHideChatHidesWidget ? storedHideChatHidesWidget === 'true' : true;

    const [autoScroll, setAutoScroll] = useState(() =>
        localStorage.getItem('liveLens_auto_scroll') !== 'false'
    );


    // Analysis mode + opacity slider
    const [analysisMode, setAnalysisModeState] = useState('general');
    const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
    const modeDropdownRef = useRef<HTMLDivElement>(null);
    const [localOpacity, setLocalOpacity] = useState(overlayOpacity ?? 0.9);
    const [opacityText, setOpacityText] = useState(String(Math.round((overlayOpacity ?? 0.9) * 100)));

    // Model Selection State
    const [currentModel, setCurrentModel] = useState<string>('gemini-3-flash-preview');
    // Dynamic Action Button Mode (Recap vs Brainstorm)
    const [actionButtonMode, setActionButtonMode] = useState<'recap' | 'brainstorm'>('recap');

    // Model selector ref (for positioning the popup)
    const modelSelectorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load persisted mode
        window.electronAPI?.getActionButtonMode?.()?.then((mode: 'recap' | 'brainstorm') => {
            if (mode) setActionButtonMode(mode);
        }).catch(() => {});

        // Listen for live changes from SettingsPopup / IPC
        const unsubscribe = window.electronAPI?.onActionButtonModeChanged?.((mode: 'recap' | 'brainstorm') => {
            setActionButtonMode(mode);
        });
        return () => { unsubscribe?.(); };
    }, []);

    // Sync local opacity when parent prop changes (e.g. from Settings)
    useEffect(() => {
        const v = overlayOpacity ?? OVERLAY_OPACITY_DEFAULT;
        setLocalOpacity(v);
        setOpacityText(String(Math.round(v * 100)));
    }, [overlayOpacity]);

    // Load analysis mode on mount
    useEffect(() => {
        window.electronAPI.getAnalysisMode().then(m => { if (m) setAnalysisModeState(m); }).catch(() => {});
    }, []);

    // Close mode dropdown on outside click
    useEffect(() => {
        if (!modeDropdownOpen) return;
        const handle = (e: MouseEvent) => {
            if (modeDropdownRef.current && !modeDropdownRef.current.contains(e.target as Node))
                setModeDropdownOpen(false);
        };
        document.addEventListener('mousedown', handle);
        return () => document.removeEventListener('mousedown', handle);
    }, [modeDropdownOpen]);

    const codeTheme = isLightTheme ? oneLight : vscDarkPlus;
    const codeLineNumberColor = isLightTheme ? 'rgba(15,23,42,0.35)' : 'rgba(255,255,255,0.2)';
    const appearance = useMemo(
        () => getOverlayAppearance(localOpacity, 'dark'),
        [localOpacity]
    );
    const overlayPanelClass = 'overlay-text-primary';
    const subtleSurfaceClass = 'overlay-subtle-surface';
    const codeBlockClass = 'overlay-code-block-surface';
    const codeHeaderClass = 'overlay-code-header-surface';
    const codeHeaderTextClass = 'overlay-text-muted';
    const quickActionClass = 'overlay-chip-surface overlay-text-interactive';
    const inputClass = `${isLightTheme ? 'focus:ring-black/10' : 'focus:ring-white/10'} overlay-input-surface overlay-input-text`;
    const controlSurfaceClass = 'overlay-control-surface overlay-text-interactive';

    useEffect(() => {
        // Load the persisted default model (not the runtime model)
        // Each new meeting starts with the default from settings
        if (window.electronAPI?.getDefaultModel) {
            window.electronAPI.getDefaultModel()
                .then((result: any) => {
                    if (result && result.model) {
                        setCurrentModel(result.model);
                        // Also set the runtime model to the default
                        window.electronAPI.setModel(result.model).catch(() => { });
                    }
                })
                .catch((err: any) => console.error("Failed to fetch default model:", err));
        }
    }, []);

    const handleModeSelect = async (modeId: string) => {
        setAnalysisModeState(modeId);
        setModeDropdownOpen(false);
        await window.electronAPI.setAnalysisMode(modeId).catch(() => {});
    };

    const handleOpacityChange = (value: number) => {
        setLocalOpacity(value);
        // Persist for next session — visual effect comes from CSS opacity on the panel directly
        window.electronAPI.setOverlayOpacity(value).catch(() => {});
    };

    const handleSolve = async () => {
        if (attachedContext.length === 0 || isProcessing) return;
        const currentAttachments = [...attachedContext];
        setAttachedContext([]);
        const modeLabel = ANALYSIS_MODES.find(m => m.id === analysisMode)?.label ?? 'General';
        const now = Date.now();
        setMessages(prev => [...prev,
            { id: String(now),     role: 'user',   text: `✨ Solve · ${modeLabel}`, hasScreenshot: true, screenshotPreview: currentAttachments[0]?.preview },
            { id: String(now + 1), role: 'system', text: '', isStreaming: true }
        ]);
        setIsExpanded(true);
        setIsProcessing(true);
        requestStartTimeRef.current = Date.now();
        try {
            await window.electronAPI.streamGeminiChat(
                'Analyze and solve the problem in this screenshot.',
                currentAttachments.map(s => s.path),
                conversationContext
            );
        } catch (err) {
            setIsProcessing(false);
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.isStreaming) return [...prev.slice(0, -1), { id: String(Date.now()), role: 'system', text: `❌ Error: ${err}` }];
                return prev;
            });
        }
    };

    // Listen for default model changes from Settings
    useEffect(() => {
        if (!window.electronAPI?.onModelChanged) return;
        const unsubscribe = window.electronAPI.onModelChanged((modelId: string) => {
            setCurrentModel(prev => prev === modelId ? prev : modelId);
        });
        return () => unsubscribe();
    }, []);

    // Global State Sync
    useEffect(() => {
        // Fetch initial state
        if (window.electronAPI?.getUndetectable) {
            window.electronAPI.getUndetectable().then(setIsUndetectable);
        }

        if (window.electronAPI?.onUndetectableChanged) {
            const unsubscribe = window.electronAPI.onUndetectableChanged((state) => {
                setIsUndetectable(state);
            });
            return () => unsubscribe();
        }
    }, []);

    // Persist Settings
    useEffect(() => {
        localStorage.setItem('natively_undetectable', String(isUndetectable));
        localStorage.setItem('natively_hideChatHidesWidget', String(hideChatHidesWidget));
    }, [isUndetectable, hideChatHidesWidget]);

    // Mouse Passthrough State
    const [isMousePassthrough, setIsMousePassthrough] = useState(false);
    useEffect(() => {
        window.electronAPI?.getOverlayMousePassthrough?.().then(setIsMousePassthrough).catch(() => {});
        const unsub = window.electronAPI?.onOverlayMousePassthroughChanged?.((v) => setIsMousePassthrough(v));
        return () => unsub?.();
    }, []);

    // Screen Recording Permission Warning Banner
    const [systemAudioWarning, setSystemAudioWarning] = useState<string | null>(null);
    useEffect(() => {
        const unsub = window.electronAPI?.onSystemAudioPermissionDenied?.((message: string) => {
            setSystemAudioWarning(message);
            setIsExpanded(true); // Force overlay open so user sees the warning
        });
        return () => unsub?.();
    }, []);

    // PR #173: STT not configured warning — shown when provider is 'none' during a meeting
    const [sttNotConfigured, setSttNotConfigured] = useState(false);
    useEffect(() => {
        let mounted = true;
        // Check current STT config on mount
        window.electronAPI?.getSttProvider?.().then((provider: string) => {
            if (mounted) setSttNotConfigured(provider === 'none');
        }).catch(() => {});

        // Listen for live config changes (e.g. user saves a key in Settings while meeting is active)
        const unsub = window.electronAPI?.onSttConfigChanged?.((data: { configured: boolean; provider: string }) => {
            if (mounted) setSttNotConfigured(!data.configured);
        });
        return () => {
            mounted = false;
            unsub?.();
        };
    }, []);

    // Auto-resize Window
    useLayoutEffect(() => {
        if (!contentRef.current) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // Use getBoundingClientRect to get the exact rendered size including padding
                const rect = entry.target.getBoundingClientRect();

                // Send exact dimensions to Electron
                // Removed buffer to ensure tight fit
                console.log('[LiveLensInterface] ResizeObserver:', Math.ceil(rect.width), Math.ceil(rect.height));
                window.electronAPI?.updateContentDimensions({
                    width: Math.ceil(rect.width),
                    height: Math.ceil(rect.height)
                });
            }
        });

        observer.observe(contentRef.current);
        return () => observer.disconnect();
    }, []);

    // Force resize when attachedContext changes (screenshots added/removed)
    useEffect(() => {
        if (!contentRef.current) return;
        // Let the DOM settle, then measure and push new dimensions
        requestAnimationFrame(() => {
            if (!contentRef.current) return;
            const rect = contentRef.current.getBoundingClientRect();
            window.electronAPI?.updateContentDimensions({
                width: Math.ceil(rect.width),
                height: Math.ceil(rect.height)
            });
        });
    }, [attachedContext]);

    // Force initial sizing safety check
    useEffect(() => {
        const timer = setTimeout(() => {
            if (contentRef.current) {
                const rect = contentRef.current.getBoundingClientRect();
                window.electronAPI?.updateContentDimensions({
                    width: Math.ceil(rect.width),
                    height: Math.ceil(rect.height)
                });
            }
        }, 600);
        return () => clearTimeout(timer);
    }, []);

    // Build conversation context from messages
    useEffect(() => {
        const context = messages
            .filter(m => m.role !== 'user' || !m.hasScreenshot)
            .map(m => `${m.role === 'interviewer' ? 'Interviewer' : m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
            .slice(-20)
            .join('\n');
        setConversationContext(context);
    }, [messages]);

    // Listen for settings window visibility changes
    useEffect(() => {
        if (!window.electronAPI?.onSettingsVisibilityChange) return;
        const unsubscribe = window.electronAPI.onSettingsVisibilityChange((isVisible) => {
            setIsSettingsOpen(isVisible);
        });
        return () => unsubscribe();
    }, []);

    // Sync Window Visibility with Expanded State
    useEffect(() => {
        if (isExpanded) {
            window.electronAPI.showWindow(isStealthRef.current);
            isStealthRef.current = false; // Reset back to default
        } else {
            // Slight delay to allow animation to clean up if needed, though immediate is safer for click-through
            // Using setTimeout to ensure the render cycle completes first
            // Increased to 400ms to allow "contract to bottom" exit animation to finish
            setTimeout(() => window.electronAPI.hideWindow(), 400);
        }
    }, [isExpanded]);

    // Keyboard shortcut to toggle expanded state (via Main Process)
    useEffect(() => {
        if (!window.electronAPI?.onToggleExpand) return;
        const unsubscribe = window.electronAPI.onToggleExpand(() => {
            setIsExpanded(prev => !prev);
        });
        return () => unsubscribe();
    }, []);

    // Ensure overlay is expanded when requested by main process (e.g. after switching to overlay mode).
    // IMPORTANT: set isStealthRef before setIsExpanded so that if isExpanded was false, the
    // isExpanded effect fires showWindow(true) instead of showWindow(false). Without this,
    // ensure-expanded on a collapsed overlay would trigger show()+focus(), breaking stealth.
    useEffect(() => {
        if (!window.electronAPI?.onEnsureExpanded) return;
        const unsubscribe = window.electronAPI.onEnsureExpanded(() => {
            isStealthRef.current = true;
            setIsExpanded(true);
        });
        return () => unsubscribe();
    }, []);

    // Session Reset Listener - Clears UI when a NEW meeting starts
    useEffect(() => {
        if (!window.electronAPI?.onSessionReset) return;
        const unsubscribe = window.electronAPI.onSessionReset(() => {
            console.log('[LiveLensInterface] Resetting session state...');
            setMessages([]);
            setInputValue('');
            setAttachedContext([]);
            setIsProcessing(false);
            // Optionally reset connection status if needed, but connection persists

            // Track new conversation/session if applicable?
            // Actually 'app_opened' is global, 'assistant_started' is overlay.
            // Maybe 'conversation_started' event?
            analytics.trackConversationStarted();
        });
        return () => unsubscribe();
    }, []);


    const handleScreenshotAttach = (data: { path: string; preview: string }) => {
        setIsExpanded(true);
        setAttachedContext(prev => {
            // Prevent duplicates and cap at 5
            if (prev.some(s => s.path === data.path)) return prev;
            const updated = [...prev, data];
            return updated.slice(-5); // Keep last 5
        });
    };

    // STT Status listener — must survive isExpanded changes.
    // If registered inside the [isExpanded] effect, events are dropped during cleanup.
    useEffect(() => {
        return window.electronAPI.onSttStatusChanged((data) => {
            if (data.channel === 'interviewer') {
                setSttInterviewerStatus(data.state);
                setSttInterviewerProvider(data.provider);
                if (data.error) setSttInterviewerError(data.error);
                if (data.state === 'connected') setSttInterviewerError('');
            }
        });
    }, []);

    // Connect to Native Audio Backend
    useEffect(() => {
        const cleanups: (() => void)[] = [];

        // Real-time Transcripts
        cleanups.push(window.electronAPI.onNativeAudioTranscript((transcript) => {
            // Only interviewer (system audio) transcripts are processed
            if (transcript.speaker === 'user') return;

            // Interviewer capture toggle — drop transcripts when paused
            if (!isInterviewerCapturingRef.current) return;

            // Only show interviewer (system audio) transcripts in rolling bar
            if (transcript.speaker !== 'interviewer') {
                return;  // Safety check for any other speaker types
            }

            if (transcript.final) {
                // Commit: store only the latest finalized sentence, not the full history
                partialAccRef.current = '';
                rollingTranscriptRef.current = transcript.text;
                setRollingTranscript(transcript.text);
                if (!userTypedRef.current) {
                    setInputValue(transcript.text);
                }
                setIsInterviewerSpeaking(false);
            } else {
                // Live delta: show only the current partial — no historical accumulation
                partialAccRef.current += transcript.text;
                setIsInterviewerSpeaking(true);
                if (!userTypedRef.current) {
                    setInputValue(partialAccRef.current);
                }
            }
        }));

        // AI Suggestions from native audio (legacy)
        cleanups.push(window.electronAPI.onSuggestionProcessingStart(() => {
            setIsProcessing(true);
            setIsExpanded(true);
        }));

        cleanups.push(window.electronAPI.onSuggestionGenerated((data) => {
            setIsProcessing(false);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'system',
                text: data.suggestion
            }]);
        }));

        cleanups.push(window.electronAPI.onSuggestionError((err) => {
            setIsProcessing(false);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'system',
                text: `Error: ${err.error}`
            }]);
        }));



        cleanups.push(window.electronAPI.onIntelligenceSuggestedAnswerToken((data) => {
            // Progressive update for 'what_to_answer' mode — wrapped in startTransition
            // so streaming token updates are interruptible and don't block user input.
            reactStartTransition(() => setMessages(prev => {
                const lastMsg = prev[prev.length - 1];

                // If we already have a streaming message for this intent, append
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'what_to_answer') {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: lastMsg.text + data.token
                    };
                    return updated;
                }

                // Otherwise, start a new one (First token)
                return [...prev, {
                    id: Date.now().toString(),
                    role: 'system',
                    text: data.token,
                    intent: 'what_to_answer',
                    isStreaming: true,
                }];
            }));
        }));

        cleanups.push(window.electronAPI.onIntelligenceSuggestedAnswer((data) => {
            setIsProcessing(false);
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];

                // If we were streaming, finalize it
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'what_to_answer') {
                    // Start new array to avoid mutation
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: data.answer, // Ensure final consistency
                        isStreaming: false
                    };
                    return updated;
                }

                // If we missed the stream (or not streaming), append fresh
                return [...prev, {
                    id: Date.now().toString(),
                    role: 'system',
                    text: data.answer,  // Plain text, no markdown - ready to speak
                    intent: 'what_to_answer'
                }];
            });
        }));

        // STREAMING: Refinement
        cleanups.push(window.electronAPI.onIntelligenceRefinedAnswerToken((data) => {
            reactStartTransition(() => setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === data.intent) {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: lastMsg.text + data.token
                    };
                    return updated;
                }
                // New stream start (e.g. user clicked Shorten)
                return [...prev, {
                    id: Date.now().toString(),
                    role: 'system',
                    text: data.token,
                    intent: data.intent,
                    isStreaming: true
                }];
            }));
        }));

        cleanups.push(window.electronAPI.onIntelligenceRefinedAnswer((data) => {
            setIsProcessing(false);
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === data.intent) {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: data.answer,
                        isStreaming: false
                    };
                    return updated;
                }
                return [...prev, {
                    id: Date.now().toString(),
                    role: 'system',
                    text: data.answer,
                    intent: data.intent
                }];
            });
        }));

        // STREAMING: Recap
        cleanups.push(window.electronAPI.onIntelligenceRecapToken((data) => {
            reactStartTransition(() => setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'recap') {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: lastMsg.text + data.token
                    };
                    return updated;
                }
                return [...prev, {
                    id: Date.now().toString(),
                    role: 'system',
                    text: data.token,
                    intent: 'recap',
                    isStreaming: true
                }];
            }));
        }));

        cleanups.push(window.electronAPI.onIntelligenceRecap((data) => {
            setIsProcessing(false);
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'recap') {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: data.summary,
                        isStreaming: false
                    };
                    return updated;
                }
                return [...prev, {
                    id: Date.now().toString(),
                    role: 'system',
                    text: data.summary,
                    intent: 'recap'
                }];
            });
        }));

        // STREAMING: Follow-Up Questions (Rendered as message? Or specific UI?)
        // Currently interface typically renders follow-up Qs as a message or button update.
        // Let's assume message for now based on existing 'follow_up_questions_update' handling
        // But wait, existing handle just sets state?
        // Let's check how 'follow_up_questions_update' was handled.
        // It was handled separate locally in this component maybe?
        // Ah, I need to see the existing listener for 'onIntelligenceFollowUpQuestionsUpdate'

        // Let's implemented token streaming for it anyway, likely it updates a message bubble 
        // OR it might update a specialized "Suggested Questions" area.
        // Assuming it's a message for consistency with "Copilot" approach.

        cleanups.push(window.electronAPI.onIntelligenceFollowUpQuestionsToken((data) => {
            reactStartTransition(() => setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'follow_up_questions') {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: lastMsg.text + data.token
                    };
                    return updated;
                }
                return [...prev, {
                    id: Date.now().toString(),
                    role: 'system',
                    text: data.token,
                    intent: 'follow_up_questions',
                    isStreaming: true,
                }];
            }));
        }));

        cleanups.push(window.electronAPI.onIntelligenceFollowUpQuestionsUpdate((data) => {
            // This event name is slightly different ('update' vs 'answer')
            setIsProcessing(false);
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'follow_up_questions') {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: data.questions,
                        isStreaming: false
                    };
                    return updated;
                }
                return [...prev, {
                    id: Date.now().toString(),
                    role: 'system',
                    text: data.questions,
                    intent: 'follow_up_questions'
                }];
            });
        }));

        cleanups.push(window.electronAPI.onIntelligenceManualResult((data) => {
            setIsProcessing(false);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'system',
                text: `🎯 **Answer:**\n\n${data.answer}`
            }]);
        }));

        cleanups.push(window.electronAPI.onIntelligenceError((data) => {
            setIsProcessing(false);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'system',
                text: `❌ Error (${data.mode}): ${data.error}`
            }]);
        }));
        return () => cleanups.forEach(fn => fn());
    }, [isExpanded]);

    // Stable mount-only effect for screenshot listeners.
    // These MUST NOT be inside the [isExpanded] effect — when a screenshot is
    // taken, `switchToOverlay` fires `ensure-expanded` which can flip isExpanded
    // from false→true, triggering the [isExpanded] effect cleanup. If `screenshot-taken`
    // arrives during that teardown gap the event is silently dropped (same issue
    // as clarify streaming listeners below). handleScreenshotAttach only uses stable
    // useState setters so a mount-only closure is safe here.
    useEffect(() => {
        const cleanupTaken = window.electronAPI.onScreenshotTaken(handleScreenshotAttach);
        const cleanupAttached = window.electronAPI.onScreenshotAttached?.(handleScreenshotAttach);
        return () => {
            cleanupTaken?.();
            cleanupAttached?.();
        };
    }, []);

    // Stable mount-only effect for clarify streaming listeners.
    // These MUST NOT be inside the [isExpanded] effect — if the user
    // expands/collapses the panel while a clarify stream is in-flight,
    // the [isExpanded] effect would tear down and re-register listeners,
    // orphaning the final 'clarify' event and leaving isProcessing=true forever.
    useEffect(() => {
        const cleanupToken = window.electronAPI.onIntelligenceClarifyToken((data) => {
            reactStartTransition(() => setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'clarify') {
                    const updated = [...prev];
                    updated[prev.length - 1] = { ...lastMsg, text: lastMsg.text + data.token };
                    return updated;
                }
                return [...prev, {
                    id: Date.now().toString(),
                    role: 'system' as const,
                    text: data.token,
                    intent: 'clarify',
                    isStreaming: true,
                }];
            }));
        });

        const cleanupFinal = window.electronAPI.onIntelligenceClarify((data) => {
            setIsProcessing(false);
            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.intent === 'clarify') {
                    const updated = [...prev];
                    updated[prev.length - 1] = { ...lastMsg, text: data.clarification, isStreaming: false };
                    return updated;
                }
                return [...prev, {
                    id: Date.now().toString(),
                    role: 'system' as const,
                    text: data.clarification,
                    intent: 'clarify'
                }];
            });
        });

        return () => {
            cleanupToken();
            cleanupFinal();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // intentionally empty — these listeners must survive isExpanded changes

    // Quick Actions - Updated to use new Intelligence APIs

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
        analytics.trackCopyAnswer();
    };

const handleQuickAction = async (action: 'example' | 'shorter' | 'deeper' | 'star') => {
        const prompts: Record<typeof action, string> = {
            example: 'Give me a real-world example of that',
            shorter: 'Give me a shorter version I can say in 30 seconds',
            deeper: 'Go deeper on the technical details',
            star: 'Reformat that as a STAR story (Situation, Task, Action, Result)',
        };
        const prompt = prompts[action];

        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'user',
            text: prompt,
        }]);

        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'system',
            text: '',
            isStreaming: true,
        }]);

        setIsExpanded(true);
        setIsProcessing(true);

        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);

        try {
            await window.electronAPI.streamGeminiChat(prompt, undefined, conversationContext);
        } catch (err) {
            setIsProcessing(false);
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.isStreaming && last.text === '') {
                    return prev.slice(0, -1).concat({ id: Date.now().toString(), role: 'system', text: `❌ Error: ${err}` });
                }
                return [...prev, { id: Date.now().toString(), role: 'system', text: `❌ Error: ${err}` }];
            });
        }
    };

    const handleWhatToSay = async () => {
        setIsExpanded(true);
        setIsProcessing(true);
        analytics.trackCommandExecuted('what_to_say');

        // Snapshot question, clear rolling transcript, partial acc, and input box
        const q = inputValue.trim() || rollingTranscriptRef.current.trim();
        rollingTranscriptRef.current = '';
        partialAccRef.current = '';
        setRollingTranscript('');
        setInputValue('');
        if (q) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'interviewer',
                text: q,
            }]);
        }

        // Capture and clear attached image context.
        // Also merge in any screenshot from the capture-and-process shortcut that
        // arrived via pendingCaptureRef before the React state flush (React 18 fix).
        const pending = pendingCaptureRef.current;
        let currentAttachments = attachedContext;
        if (pending && !currentAttachments.some(s => s.path === pending.path)) {
            currentAttachments = [...currentAttachments, pending].slice(-5);
        }

        if (currentAttachments.length > 0) {
            setAttachedContext([]);
            // Show the attached image in chat
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'user',
                text: 'What should I say about this?',
                hasScreenshot: true,
                screenshotPreview: currentAttachments[0].preview
            }]);
            // Scroll to bottom when user sends message
            setTimeout(() => {
            	messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 50);
        }

        try {
            // Pass imagePath if attached
            await window.electronAPI.generateWhatToSay(undefined, currentAttachments.length > 0 ? currentAttachments.map(s => s.path) : undefined);
        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'system',
                text: `Error: ${err}`
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFollowUp = async (intent: string = 'rephrase') => {
        setIsExpanded(true);
        setIsProcessing(true);
        analytics.trackCommandExecuted('follow_up_' + intent);

        try {
            await window.electronAPI.generateFollowUp(intent);
        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'system',
                text: `Error: ${err}`
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRecap = async () => {
        setIsExpanded(true);
        setIsProcessing(true);
        analytics.trackCommandExecuted('recap');

        try {
            await window.electronAPI.generateRecap();
        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'system',
                text: `Error: ${err}`
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFollowUpQuestions = async () => {
        setIsExpanded(true);
        setIsProcessing(true);
        analytics.trackCommandExecuted('suggest_questions');
        const qFU = inputValue.trim() || rollingTranscriptRef.current.trim();
        rollingTranscriptRef.current = '';
        partialAccRef.current = '';
        setRollingTranscript('');
        setInputValue('');
        if (qFU) setMessages(prev => [...prev, { id: Date.now().toString(), role: 'interviewer', text: qFU }]);

        try {
            await window.electronAPI.generateFollowUpQuestions();
        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'system',
                text: `Error: ${err}`
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClarify = async () => {
        setIsExpanded(true);
        setIsProcessing(true);
        analytics.trackCommandExecuted('clarify');
        const qCl = inputValue.trim() || rollingTranscriptRef.current.trim();
        rollingTranscriptRef.current = '';
        partialAccRef.current = '';
        setRollingTranscript('');
        setInputValue('');
        if (qCl) setMessages(prev => [...prev, { id: Date.now().toString(), role: 'interviewer', text: qCl }]);

        try {
            await window.electronAPI.generateClarify();
        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'system',
                text: `Error: ${err}`
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCodeHint = async () => {
        setIsExpanded(true);
        setIsProcessing(true);
        analytics.trackCommandExecuted('code_hint');

        const currentAttachments = attachedContext;
        if (currentAttachments.length > 0) {
            setAttachedContext([]);
            // Show the attached image in chat
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'user',
                text: 'Give me a code hint for this',
                hasScreenshot: true,
                screenshotPreview: currentAttachments[0].preview
            }]);
        	// Scroll to bottom when user sends message
        	setTimeout(() => {
        		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        	}, 50);
        }

        try {
            await window.electronAPI.generateCodeHint(currentAttachments.length > 0 ? currentAttachments.map(s => s.path) : undefined);
        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'system',
                text: `Error: ${err}`
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBrainstorm = async () => {
        setIsExpanded(true);
        setIsProcessing(true);
        analytics.trackCommandExecuted('brainstorm');
        const qBr = inputValue.trim() || rollingTranscriptRef.current.trim();
        rollingTranscriptRef.current = '';
        partialAccRef.current = '';
        setRollingTranscript('');
        setInputValue('');
        if (qBr) setMessages(prev => [...prev, { id: Date.now().toString(), role: 'interviewer', text: qBr }]);

        const currentAttachments = attachedContext;
        if (currentAttachments.length > 0) {
            setAttachedContext([]);
            // Show the attached image in chat
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'user',
                text: 'Brainstorm with this context',
                hasScreenshot: true,
                screenshotPreview: currentAttachments[0].preview
            }]);
        	// Scroll to bottom when user sends message
        	setTimeout(() => {
        		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        	}, 50);
        }

        try {
            await window.electronAPI.generateBrainstorm(currentAttachments.length > 0 ? currentAttachments.map(s => s.path) : undefined);
        } catch (err) {
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'system',
                text: `Error: ${err}`
            }]);
        } finally {
            setIsProcessing(false);
        }
    };


    // Setup Streaming Listeners
    useEffect(() => {
        const cleanups: (() => void)[] = [];

        // Stream Token
        cleanups.push(window.electronAPI.onGeminiStreamToken((token) => {
            // Guard: if this token is the negotiation coaching JSON sentinel, accumulate it
            // silently. The JSON is always emitted as a single complete `yield JSON.stringify(...)`
            // call, so one parse attempt is sufficient. The onGeminiStreamDone handler will
            // detect the accumulated JSON and render the proper card UI — we just prevent the
            // raw JSON characters from ever appearing in the chat bubble.
            try {
                const parsed = JSON.parse(token);
                if (parsed?.__negotiationCoaching) {
                    // Store the raw JSON text (Done handler needs it) but don't show it.
                    setMessages(prev => {
                        const lastMsg = prev[prev.length - 1];
                        if (lastMsg && lastMsg.isStreaming && lastMsg.role === 'system') {
                            const updated = [...prev];
                            updated[prev.length - 1] = { ...lastMsg, text: token };
                            return updated;
                        }
                        return prev;
                    });
                    return; // Skip the normal append below
                }
            } catch {
                // Not JSON — normal text token, fall through to the standard append.
            }

            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.role === 'system') {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        text: lastMsg.text + token,
                        // re-check code status on every token? Expensive but needed for progressive highlighting
                        isCode: (lastMsg.text + token).includes('```') || (lastMsg.text + token).includes('def ') || (lastMsg.text + token).includes('function ')
                    };
                    return updated;
                }
                return prev;
            });
        }));

        // Stream Done
        cleanups.push(window.electronAPI.onGeminiStreamDone(() => {
            setIsProcessing(false);

            // Calculate latency if we have a start time
            let latency = 0;
            if (requestStartTimeRef.current) {
                latency = Date.now() - requestStartTimeRef.current;
                requestStartTimeRef.current = null;
            }

            // Track Usage
            analytics.trackModelUsed({
                model_name: currentModel,
                provider_type: detectProviderType(currentModel),
                latency_ms: latency
            });

            setMessages(prev => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming && lastMsg.role === 'system') {
                    // Detect negotiation coaching response
                    try {
                        const parsed = JSON.parse(lastMsg.text);
                        if (parsed?.__negotiationCoaching) {
                            const coaching = parsed.__negotiationCoaching;
                            return [...prev.slice(0, -1), {
                                ...lastMsg,
                                isStreaming: false,
                                isNegotiationCoaching: true,
                                negotiationCoachingData: coaching,
                                text: '',
                            }];
                        }
                    } catch {}
                    // Normal completion
                    return [...prev.slice(0, -1), { ...lastMsg, isStreaming: false }];
                }
                return prev;
            });
        }));

        // Stream Error
        cleanups.push(window.electronAPI.onGeminiStreamError((error) => {
            setIsProcessing(false);
            requestStartTimeRef.current = null; // Clear timer on error
            setMessages(prev => {
                // Append error to the current message or add new one?
                // Let's add a new error block if the previous one confusing,
                // or just update status.
                // Ideally we want to show the partial response AND the error.
                const lastMsg = prev[prev.length - 1];
                if (lastMsg && lastMsg.isStreaming) {
                    const updated = [...prev];
                    updated[prev.length - 1] = {
                        ...lastMsg,
                        isStreaming: false,
                        text: lastMsg.text + `\n\n[Error: ${error}]`
                    };
                    return updated;
                }
                return [...prev, {
                    id: Date.now().toString(),
                    role: 'system',
                    text: `❌ Error: ${error}`
                }];
            });
        }));

        // JIT RAG Stream listeners (for live meeting RAG responses)
        if (window.electronAPI.onRAGStreamChunk) {
            cleanups.push(window.electronAPI.onRAGStreamChunk((data: { chunk: string }) => {
                // Same guard as onGeminiStreamToken: suppress raw JSON if this chunk is
                // the negotiation coaching sentinel. The onRAGStreamComplete handler will
                // convert it to the proper card UI.
                try {
                    const parsed = JSON.parse(data.chunk);
                    if (parsed?.__negotiationCoaching) {
                        setMessages(prev => {
                            const lastMsg = prev[prev.length - 1];
                            if (lastMsg && lastMsg.isStreaming && lastMsg.role === 'system') {
                                const updated = [...prev];
                                updated[prev.length - 1] = { ...lastMsg, text: data.chunk };
                                return updated;
                            }
                            return prev;
                        });
                        return; // Skip normal append
                    }
                } catch {
                    // Normal text chunk — fall through.
                }

                setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.isStreaming && lastMsg.role === 'system') {
                        const updated = [...prev];
                        updated[prev.length - 1] = {
                            ...lastMsg,
                            text: lastMsg.text + data.chunk,
                            isCode: (lastMsg.text + data.chunk).includes('```')
                        };
                        return updated;
                    }
                    return prev;
                });
            }));
        }

        if (window.electronAPI.onRAGStreamComplete) {
            cleanups.push(window.electronAPI.onRAGStreamComplete(() => {
                setIsProcessing(false);
                requestStartTimeRef.current = null;
                setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.isStreaming && lastMsg.role === 'system') {
                        // Detect negotiation coaching response
                        try {
                            const parsed = JSON.parse(lastMsg.text);
                            if (parsed?.__negotiationCoaching) {
                                const coaching = parsed.__negotiationCoaching;
                                return [...prev.slice(0, -1), {
                                    ...lastMsg,
                                    isStreaming: false,
                                    isNegotiationCoaching: true,
                                    negotiationCoachingData: coaching,
                                    text: '',
                                }];
                            }
                        } catch {}
                        // Normal completion
                        return [...prev.slice(0, -1), { ...lastMsg, isStreaming: false }];
                    }
                    if (lastMsg && lastMsg.isStreaming) {
                        const updated = [...prev];
                        updated[prev.length - 1] = { ...lastMsg, isStreaming: false };
                        return updated;
                    }
                    return prev;
                });
            }));
        }

        if (window.electronAPI.onRAGStreamError) {
            cleanups.push(window.electronAPI.onRAGStreamError((data: { error: string }) => {
                setIsProcessing(false);
                requestStartTimeRef.current = null;
                setMessages(prev => {
                    const lastMsg = prev[prev.length - 1];
                    if (lastMsg && lastMsg.isStreaming) {
                        const updated = [...prev];
                        updated[prev.length - 1] = {
                            ...lastMsg,
                            isStreaming: false,
                            text: lastMsg.text + `\n\n[RAG Error: ${data.error}]`
                        };
                        return updated;
                    }
                    return prev;
                });
            }));
        }

        return () => cleanups.forEach(fn => fn());
    }, [currentModel]); // Ensure tracking captures correct model


    const handleManualSubmit = async () => {
        if (!inputValue.trim() && attachedContext.length === 0) return;

        const userText = inputValue;
        const currentAttachments = attachedContext;

        // Clear inputs immediately
        userTypedRef.current = false;
        setInputValue('');
        setRollingTranscript('');
        rollingTranscriptRef.current = '';
        partialAccRef.current = '';
        setAttachedContext([]);

        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'user',
            text: userText || (currentAttachments.length > 0 ? 'Analyze this screenshot' : ''),
            hasScreenshot: currentAttachments.length > 0,
            screenshotPreview: currentAttachments[0]?.preview
        }]);

        // Scroll to bottom when user sends message
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);

        // Add placeholder for streaming response
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'system',
            text: '',
            isStreaming: true
        }]);

        setIsExpanded(true);
        setIsProcessing(true);

        try {
            // JIT RAG pre-flight: try to use indexed meeting context first
            if (currentAttachments.length === 0) {
                const ragResult = await window.electronAPI.ragQueryLive?.(userText || '');
                if (ragResult?.success) {
                    // JIT RAG handled it — response streamed via rag:stream-chunk events
                    return;
                }
            }

            // Pass imagePath if attached, AND conversation context
            requestStartTimeRef.current = Date.now();
            await window.electronAPI.streamGeminiChat(
                userText || 'Analyze this screenshot',
                currentAttachments.length > 0 ? currentAttachments.map(s => s.path) : undefined,
                conversationContext // Pass context so "answer this" works
            );
        } catch (err) {
            setIsProcessing(false);
            setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last && last.isStreaming && last.text === '') {
                    // remove the empty placeholder
                    return prev.slice(0, -1).concat({
                        id: Date.now().toString(),
                        role: 'system',
                        text: `❌ Error starting stream: ${err}`
                    });
                }
                return [...prev, {
                    id: Date.now().toString(),
                    role: 'system',
                    text: `❌ Error: ${err}`
                }];
            });
        }
    };

    const renderMessageText = (msg: Message) => {
        // Negotiation coaching card takes priority
        if (msg.isNegotiationCoaching && msg.negotiationCoachingData) {
            return (
                <NegotiationCoachingCard
                    {...msg.negotiationCoachingData}
                    phase={msg.negotiationCoachingData.phase as any}
                    onSilenceTimerEnd={() => {
                        setMessages(prev => prev.map(m =>
                            m.id === msg.id
                                ? { ...m, negotiationCoachingData: m.negotiationCoachingData ? { ...m.negotiationCoachingData, showSilenceTimer: false } : undefined }
                                : m
                        ));
                    }}
                />
            );
        }

        // Code-containing messages get special styling
        // We split by code blocks to keep the "Code Solution" UI intact for the code parts
        // But use ReactMarkdown for the text parts around it
        if (msg.isCode || (msg.role === 'system' && msg.text.includes('```'))) {
            const parts = msg.text.split(/(```[\s\S]*?```)/g);
            return (
                <div className={`rounded-lg p-3 my-1 border ${subtleSurfaceClass}`} style={appearance.subtleStyle}>
                    <div className={`flex items-center gap-2 mb-2 font-semibold text-xs uppercase tracking-wide ${isLightTheme ? 'text-[#c4623e]' : 'text-[#e8a882]'}`}>
                        <Code className="w-3.5 h-3.5" />
                        <span>Code Solution</span>
                    </div>
                    <div className={`space-y-2 text-[13px] leading-relaxed ${isLightTheme ? 'text-slate-800' : 'overlay-text-primary'}`}>
                        {parts.map((part, i) => {
                            if (part.startsWith('```')) {
                                const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
                                if (match) {
                                    const lang = match[1] || 'python';
                                    const code = match[2].trim();
                                    return (
                                        <div key={i} className={`my-3 rounded-xl overflow-hidden border shadow-lg ${codeBlockClass}`} style={appearance.codeBlockStyle}>
                                            {/* Minimalist Apple Header */}
                                            <div className={`flex items-center justify-between px-3 py-1.5 border-b ${codeHeaderClass}`} style={appearance.codeHeaderStyle}>
                                                <span className={`text-[10px] uppercase tracking-widest font-semibold font-mono ${codeHeaderTextClass}`}>
                                                    {lang || 'CODE'}
                                                </span>
                                                <CopyBtn code={code} />
                                            </div>
                                            <div className="bg-transparent">
                                                <SyntaxHighlighter
                                                    language={lang}
                                                    style={codeTheme}
                                                    customStyle={{
                                                        margin: 0,
                                                        borderRadius: 0,
                                                        fontSize: '13px',
                                                        lineHeight: '1.6',
                                                        background: 'transparent',
                                                        padding: '16px',
                                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
                                                    }}
                                                    wrapLongLines={true}
                                                    showLineNumbers={true}
                                                    lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1.2em', color: codeLineNumberColor, textAlign: 'right', fontSize: '11px' }}
                                                >
                                                    {code}
                                                </SyntaxHighlighter>
                                            </div>
                                        </div>
                                    );
                                }
                            }
                            // Regular text - Render with Markdown
                            return (
                                <div key={i} className="markdown-content">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={{
                                            p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0 whitespace-pre-wrap" {...props} />,
                                            strong: ({ node, ...props }: any) => <strong className="font-bold overlay-text-strong" {...props} />,
                                            em: ({ node, ...props }: any) => <em className="italic overlay-text-secondary" {...props} />,
                                            ul: ({ node, ...props }: any) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
                                            ol: ({ node, ...props }: any) => <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />,
                                            li: ({ node, ...props }: any) => <li className="pl-1" {...props} />,
                                            h1: ({ node, ...props }: any) => <h1 className="text-lg font-bold mb-2 mt-3 overlay-text-strong" {...props} />,
                                            h2: ({ node, ...props }: any) => <h2 className="text-base font-bold mb-2 mt-3 overlay-text-strong" {...props} />,
                                            h3: ({ node, ...props }: any) => <h3 className="text-sm font-bold mb-1 mt-2 overlay-text-primary" {...props} />,
                                            code: ({ node, ...props }: any) => <code className={`overlay-inline-code-surface rounded px-1 py-0.5 text-xs font-mono whitespace-pre-wrap ${isLightTheme ? 'text-[#c4623e]' : 'text-[#e8a882]'}`} {...props} />,
                                            blockquote: ({ node, ...props }: any) => <blockquote className={`border-l-2 pl-3 italic my-2 ${isLightTheme ? 'border-[#d97757]/30 text-slate-600' : 'border-[rgba(217,119,87,0.30)] overlay-text-secondary'}`} {...props} />,
                                            a: ({ node, ...props }: any) => <a className={`hover:underline ${isLightTheme ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`} target="_blank" rel="noopener noreferrer" {...props} />,
                                        }}
                                    >
                                        {part}
                                    </ReactMarkdown>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // Custom Styled Labels (Shorten, Recap, Follow-up) - also use Markdown for content
        if (msg.intent === 'shorten') {
            return (
                <div className={`rounded-lg p-3 my-1 border ${subtleSurfaceClass}`} style={appearance.subtleStyle}>
                    <div className={`flex items-center gap-2 mb-2 font-semibold text-xs uppercase tracking-wide ${isLightTheme ? 'text-cyan-700' : 'text-cyan-300'}`}>
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Shortened</span>
                    </div>
                    <div className={`text-[13px] leading-relaxed markdown-content ${isLightTheme ? 'text-slate-800' : 'overlay-text-primary'}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{
                            p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0" {...props} />,
                            strong: ({ node, ...props }: any) => <strong className={`font-bold ${isLightTheme ? 'text-cyan-800' : 'text-cyan-100'}`} {...props} />,
                            ul: ({ node, ...props }: any) => <ul className="list-disc ml-4 mb-2" {...props} />,
                            li: ({ node, ...props }: any) => <li className="pl-1" {...props} />,
                        }}>
                            {msg.text}
                        </ReactMarkdown>
                    </div>
                </div>
            );
        }

        if (msg.intent === 'recap') {
            return (
                <div className={`rounded-lg p-3 my-1 border ${subtleSurfaceClass}`} style={appearance.subtleStyle}>
                    <div className={`flex items-center gap-2 mb-2 font-semibold text-xs uppercase tracking-wide ${isLightTheme ? 'text-[#c4623e]' : 'text-[#e8a882]'}`}>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Recap</span>
                    </div>
                    <div className={`text-[13px] leading-relaxed markdown-content ${isLightTheme ? 'text-slate-800' : 'overlay-text-primary'}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{
                            p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0" {...props} />,
                            strong: ({ node, ...props }: any) => <strong className={`font-bold ${isLightTheme ? 'text-[#b05530]' : 'text-[#faf9f5]'}`} {...props} />,
                            ul: ({ node, ...props }: any) => <ul className="list-disc ml-4 mb-2" {...props} />,
                            li: ({ node, ...props }: any) => <li className="pl-1" {...props} />,
                        }}>
                            {msg.text}
                        </ReactMarkdown>
                    </div>
                </div>
            );
        }

        if (msg.intent === 'follow_up_questions') {
            return (
                <div className={`rounded-lg p-3 my-1 border ${subtleSurfaceClass}`} style={appearance.subtleStyle}>
                    <div className={`flex items-center gap-2 mb-2 font-semibold text-xs uppercase tracking-wide ${isLightTheme ? 'text-amber-700' : 'text-[#FFD60A]'}`}>
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Follow-Up Questions</span>
                    </div>
                    <div className={`text-[13px] leading-relaxed markdown-content ${isLightTheme ? 'text-slate-800' : 'overlay-text-primary'}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]} components={{
                            p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0" {...props} />,
                            strong: ({ node, ...props }: any) => <strong className={`font-bold ${isLightTheme ? 'text-amber-800' : 'text-[#FFF9C4]'}`} {...props} />,
                            ul: ({ node, ...props }: any) => <ul className="list-disc ml-4 mb-2" {...props} />,
                            li: ({ node, ...props }: any) => <li className="pl-1" {...props} />,
                        }}>
                            {msg.text}
                        </ReactMarkdown>
                    </div>
                </div>
            );
        }

        if (msg.intent === 'what_to_answer') {
            // Split text by code blocks (Handle unclosed blocks at EOF)
            const parts = msg.text.split(/(```[\s\S]*?(?:```|$))/g);

            return (
                <div className={`rounded-lg p-3 my-1 border ${subtleSurfaceClass}`} style={appearance.subtleStyle}>
                    <div className="flex items-center gap-2 mb-2 text-emerald-400 font-semibold text-xs uppercase tracking-wide">
                        <span>Say this</span>
                    </div>
                    <div className="text-[14px] leading-relaxed overlay-text-primary">
                        {parts.map((part, i) => {
                            if (part.startsWith('```')) {
                                // Robust matching: handles unclosed blocks for streaming (```...$)
                                const match = part.match(/```(\w*)\s+([\s\S]*?)(?:```|$)/);

                                // Fallback logic: if it starts with ticks, treat as code (even if unclosed)
                                if (match || part.startsWith('```')) {
                                    const lang = (match && match[1]) ? match[1] : 'python';
                                    let code = '';

                                    if (match && match[2]) {
                                        code = match[2].trim();
                                    } else {
                                        // Manual strip if regex failed
                                        code = part.replace(/^```\w*\s*/, '').replace(/```$/, '').trim();
                                    }

                                    return (
                                        <div key={i} className={`my-3 rounded-xl overflow-hidden border shadow-lg ${codeBlockClass}`} style={appearance.codeBlockStyle}>
                                            {/* Minimalist Apple Header */}
                                            <div className={`flex items-center justify-between px-3 py-1.5 border-b ${codeHeaderClass}`} style={appearance.codeHeaderStyle}>
                                                <span className={`text-[10px] uppercase tracking-widest font-semibold font-mono ${codeHeaderTextClass}`}>
                                                    {lang || 'CODE'}
                                                </span>
                                                <CopyBtn code={code} />
                                            </div>

                                            <div className="bg-transparent">
                                                <SyntaxHighlighter
                                                    language={lang}
                                                    style={codeTheme}
                                                    customStyle={{
                                                        margin: 0,
                                                        borderRadius: 0,
                                                        fontSize: '13px',
                                                        lineHeight: '1.6',
                                                        background: 'transparent',
                                                        padding: '16px',
                                                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
                                                    }}
                                                    wrapLongLines={true}
                                                    showLineNumbers={true}
                                                    lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1.2em', color: codeLineNumberColor, textAlign: 'right', fontSize: '11px' }}
                                                >
                                                    {code}
                                                </SyntaxHighlighter>
                                            </div>
                                        </div>
                                    );
                                }
                            }
                            // Regular text - Render Markdown
                            return (
                                <div key={i} className="markdown-content">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm, remarkMath]}
                                        rehypePlugins={[rehypeKatex]}
                                        components={{
                                            p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0" {...props} />,
                                            strong: ({ node, ...props }: any) => <strong className={`font-bold ${isLightTheme ? 'text-emerald-700' : 'text-emerald-100'}`} {...props} />,
                                            em: ({ node, ...props }: any) => <em className={`italic ${isLightTheme ? 'text-emerald-700/80' : 'text-emerald-200/80'}`} {...props} />,
                                            ul: ({ node, ...props }: any) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
                                            ol: ({ node, ...props }: any) => <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />,
                                            li: ({ node, ...props }: any) => <li className="pl-1" {...props} />,
                                        }}
                                    >
                                        {part}
                                    </ReactMarkdown>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        }

        // Standard Text Messages (e.g. from User or Interviewer)
        // We still want basic markdown support here too
        return (
            <div className="markdown-content">
                <ReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeKatex]}
                    components={{
                        p: ({ node, ...props }: any) => <p className="mb-2 last:mb-0 whitespace-pre-wrap" {...props} />,
                        strong: ({ node, ...props }: any) => <strong className="font-bold opacity-100 overlay-text-strong" {...props} />,
                        em: ({ node, ...props }: any) => <em className="italic opacity-90 overlay-text-secondary" {...props} />,
                        ul: ({ node, ...props }: any) => <ul className="list-disc ml-4 mb-2 space-y-1" {...props} />,
                        ol: ({ node, ...props }: any) => <ol className="list-decimal ml-4 mb-2 space-y-1" {...props} />,
                        li: ({ node, ...props }: any) => <li className="pl-1" {...props} />,
                        code: ({ node, ...props }: any) => <code className={`overlay-inline-code-surface rounded px-1 py-0.5 text-xs font-mono ${isLightTheme ? 'text-slate-800' : ''}`} {...props} />,
                        a: ({ node, ...props }: any) => <a className="underline hover:opacity-80" target="_blank" rel="noopener noreferrer" {...props} />,
                    }}
                >
                    {msg.text}
                </ReactMarkdown>
            </div>
        );
    };


    // Persist auto-scroll preference and scroll to bottom on new messages when enabled
    useEffect(() => {
        localStorage.setItem('liveLens_auto_scroll', String(autoScroll));
    }, [autoScroll]);

    useEffect(() => {
        if (!autoScroll) return;
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [messages, autoScroll]);

    // We use a ref to hold the latest handlers to avoid re-binding the event listener on every render
    const handlersRef = useRef({
        handleWhatToSay,
        handleFollowUp,
        handleFollowUpQuestions,
        handleRecap,
        handleClarify,
        handleCodeHint,
        handleBrainstorm
    });

    // Update ref on every render so the event listener always access latest state/props
    handlersRef.current = {
        handleWhatToSay,
        handleFollowUp,
        handleFollowUpQuestions,
        handleRecap,
        handleClarify,
        handleCodeHint,
        handleBrainstorm
    };

    useEffect(() => {
        // Frame-rate-independent momentum scroll.
        // Velocity ramps to TERMINAL while key is held, decays exponentially on release.
        // Sub-pixel motion preserved via fractional accumulator; scrollTop written directly
        // to bypass any browser scroll-behavior smoothing that would fight the loop.
        const TERMINAL_VELOCITY = 1400;  // px/s at full hold
        const ACCEL_SECONDS     = 0.18;  // time to reach terminal from rest
        const DECAY_HALF_LIFE   = 0.09;  // seconds for velocity to halve after release
        const DECAY_K           = Math.LN2 / DECAY_HALF_LIFE;
        const MIN_VELOCITY      = 6;     // px/s — snap to 0 below this
        const MAX_FRAME_DT      = 0.05;  // clamp to absorb tab-throttle hiccups

        let direction: -1 | 0 | 1 = 0;
        let upHeld    = false;
        let downHeld  = false;
        let velocity  = 0;
        let fraction  = 0;
        let lastTs    = 0;
        let rafId: number | null = null;

        const recomputeDirection = () => {
            direction = upHeld === downHeld ? 0 : upHeld ? -1 : 1;
        };

        const tick = (ts: number) => {
            const container = scrollContainerRef.current;
            if (!container) { rafId = null; lastTs = 0; return; }
            if (lastTs === 0) lastTs = ts;
            const dt = Math.min((ts - lastTs) / 1000, MAX_FRAME_DT);
            lastTs = ts;

            if (direction !== 0) {
                const target = direction * TERMINAL_VELOCITY;
                const step   = (TERMINAL_VELOCITY / ACCEL_SECONDS) * dt;
                velocity = Math.abs(target - velocity) <= step
                    ? target
                    : velocity + Math.sign(target - velocity) * step;
            } else {
                velocity *= Math.exp(-DECAY_K * dt);
                if (Math.abs(velocity) < MIN_VELOCITY) velocity = 0;
            }

            const maxScroll = container.scrollHeight - container.clientHeight;
            const move    = velocity * dt + fraction;
            const intMove = Math.trunc(move);
            fraction = move - intMove;

            if (intMove !== 0) {
                let next = container.scrollTop + intMove;
                if (next <= 0)          { next = 0;         if (velocity < 0) { velocity = 0; fraction = 0; } }
                else if (next >= maxScroll) { next = maxScroll; if (velocity > 0) { velocity = 0; fraction = 0; } }
                if (next !== container.scrollTop) container.scrollTop = next;
            }

            if (direction !== 0 || velocity !== 0) {
                rafId = requestAnimationFrame(tick);
            } else {
                rafId = null; lastTs = 0; fraction = 0;
            }
        };

        const startLoop  = () => { if (rafId === null) rafId = requestAnimationFrame(tick); };
        const releaseAll = () => { upHeld = false; downHeld = false; recomputeDirection(); };

        const handleKeyDown = (e: KeyboardEvent) => {
            const { handleWhatToSay, handleFollowUpQuestions, handleRecap, handleClarify, handleCodeHint, handleBrainstorm } = handlersRef.current;

            if (isShortcutPressed(e, 'whatToAnswer')) {
                e.preventDefault(); handleWhatToSay();
            } else if (isShortcutPressed(e, 'clarify')) {
                e.preventDefault(); handleClarify();
            } else if (isShortcutPressed(e, 'followUp')) {
                e.preventDefault(); handleFollowUpQuestions();
            } else if (isShortcutPressed(e, 'dynamicAction4')) {
                e.preventDefault();
                if (actionButtonMode === 'brainstorm') handleBrainstorm(); else handleRecap();
            } else if (isShortcutPressed(e, 'codeHint')) {
                e.preventDefault(); handleCodeHint();
            } else if (isShortcutPressed(e, 'brainstorm')) {
                e.preventDefault(); handleBrainstorm();
            } else if (isShortcutPressed(e, 'scrollUp')) {
                e.preventDefault();
                upHeld = true; recomputeDirection(); startLoop();
            } else if (isShortcutPressed(e, 'scrollDown')) {
                e.preventDefault();
                downHeld = true; recomputeDirection(); startLoop();
            } else if (isShortcutPressed(e, 'moveWindowUp') || isShortcutPressed(e, 'moveWindowDown')) {
                e.preventDefault();
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp')                          { upHeld   = false; recomputeDirection(); }
            else if (e.key === 'ArrowDown')                   { downHeld = false; recomputeDirection(); }
            else if (e.key === 'Meta' || e.key === 'Control') { releaseAll(); }
        };

        // Window blur swallows keyup — reset to avoid stuck scrolling
        const handleBlur = () => releaseAll();

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        window.addEventListener('blur', handleBlur);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
            window.removeEventListener('blur', handleBlur);
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    }, [isShortcutPressed]);

    // General Global Shortcuts (Rebindable)
    // We listen here to handle them when the window is focused (renderer side)
    // Global shortcuts (when window blurred) are handled by Main process -> GlobalShortcuts
    // But Main process events might not reach here if we don't listen, or we want unified handling.
    // Actually, KeybindManager registers global shortcuts. If they are registered as global, 
    // Electron might consume them before they reach here?
    // 'toggle-app' is Global.
    // 'toggle-visibility' is NOT Global in default config (isGlobal: false), so it depends on focus.
    // So we MUST listen for them here.

    const generalHandlersRef = useRef({
        toggleVisibility: () => window.electronAPI.toggleWindow(),
        processScreenshots: handleWhatToSay,
        resetCancel: async () => {
            if (isProcessing) {
                setIsProcessing(false);
            } else {
                await window.electronAPI.resetIntelligence();
                setMessages([]);
                setAttachedContext([]);
                setInputValue('');
            }
        },
        toggleMousePassthrough: () => {
            const newState = !isMousePassthrough;
            setIsMousePassthrough(newState);
            window.electronAPI?.setOverlayMousePassthrough?.(newState);
        },
        takeScreenshot: async () => {
            try {
                const data = await window.electronAPI.takeScreenshot();
                if (data && data.path) {
                    handleScreenshotAttach(data as { path: string; preview: string });
                }
            } catch (err) {
                console.error("Error triggering screenshot:", err);
            }
        },
        selectiveScreenshot: async () => {
            try {
                const data = await window.electronAPI.takeSelectiveScreenshot();
                if (data && !data.cancelled && data.path) {
                    handleScreenshotAttach(data as { path: string; preview: string });
                }
            } catch (err) {
                console.error("Error triggering selective screenshot:", err);
            }
        }
    });

    // Update ref
    generalHandlersRef.current = {
        toggleVisibility: () => window.electronAPI.toggleWindow(),
        processScreenshots: handleWhatToSay,
        resetCancel: async () => {
            if (isProcessing) {
                setIsProcessing(false);
            } else {
                await window.electronAPI.resetIntelligence();
                setMessages([]);
                setAttachedContext([]);
                setInputValue('');
            }
        },
        toggleMousePassthrough: () => {
            const newState = !isMousePassthrough;
            setIsMousePassthrough(newState);
            window.electronAPI?.setOverlayMousePassthrough?.(newState);
        },
        takeScreenshot: async () => {
            try {
                const data = await window.electronAPI.takeScreenshot();
                if (data && data.path) {
                    handleScreenshotAttach(data as { path: string; preview: string });
                }
            } catch (err) {
                console.error("Error triggering screenshot:", err);
            }
        },
        selectiveScreenshot: async () => {
            try {
                const data = await window.electronAPI.takeSelectiveScreenshot();
                if (data && !data.cancelled && data.path) {
                    handleScreenshotAttach(data as { path: string; preview: string });
                }
            } catch (err) {
                console.error("Error triggering selective screenshot:", err);
            }
        }
    };

    useEffect(() => {
        const handleGeneralKeyDown = (e: KeyboardEvent) => {
            const handlers = generalHandlersRef.current;
            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

            if (isShortcutPressed(e, 'toggleVisibility')) {
                // Always allow toggling visibility
                e.preventDefault();
                handlers.toggleVisibility();
            } else if (isShortcutPressed(e, 'processScreenshots')) {
                if (!isInput) {
                    e.preventDefault();
                    handlers.processScreenshots();
                }
                // If input focused, let default behavior (Enter) happen or handle it via onKeyDown in Input
            } else if (isShortcutPressed(e, 'resetCancel')) {
                e.preventDefault();
                handlers.resetCancel();
            } else if (isShortcutPressed(e, 'takeScreenshot')) {
                e.preventDefault();
                handlers.takeScreenshot();
            } else if (isShortcutPressed(e, 'selectiveScreenshot')) {
                e.preventDefault();
                handlers.selectiveScreenshot();
            } else if (isShortcutPressed(e, 'toggleMousePassthrough')) {
                e.preventDefault();
                handlers.toggleMousePassthrough();
            }
        };

        window.addEventListener('keydown', handleGeneralKeyDown);
        return () => window.removeEventListener('keydown', handleGeneralKeyDown);
    }, [isShortcutPressed]);

    // Global "Capture & Process" shortcut handler (issue #90)
    // Registered separately so it always has the latest handlersRef via stable ref access.
    // Main process takes the screenshot and sends "capture-and-process" with path+preview;
    // we attach the screenshot to context and immediately trigger AI analysis.
    useEffect(() => {
        if (!window.electronAPI.onCaptureAndProcess) return;
        const unsubscribe = window.electronAPI.onCaptureAndProcess((data) => {
            setIsExpanded(true);

            // Store screenshot in a stable ref BEFORE updating React state.
            // This fixes the React 18 concurrent mode timing race where setTimeout(0)
            // could fire before setAttachedContext had flushed, leaving handleWhatToSay
            // with an empty attachedContext and causing silent failures.
            pendingCaptureRef.current = data;

            setAttachedContext(prev => {
                if (prev.some(s => s.path === data.path)) return prev;
                return [...prev, data].slice(-5);
            });

            // Use requestAnimationFrame so we wait for at least one paint cycle —
            // more reliable than setTimeout(0) under React 18 concurrent scheduling.
            // The ref guarantees handleWhatToSay has the screenshot regardless of
            // whether the state update has flushed yet.
            requestAnimationFrame(() => {
                try {
                    handlersRef.current.handleWhatToSay();
                } finally {
                    pendingCaptureRef.current = null;
                }
            });
        });
        return unsubscribe;
    }, []);

    // Stealth Global Shortcuts Handler
    // Listens for shortcuts triggered when the app is in the background
    useEffect(() => {
        if (!window.electronAPI.onGlobalShortcut) return;
        const unsubscribe = window.electronAPI.onGlobalShortcut(({ action }) => {
            const handlers = handlersRef.current;
            const generalHandlers = generalHandlersRef.current;

            isStealthRef.current = true;

            if (action === 'whatToAnswer') handlers.handleWhatToSay();
            else if (action === 'shorten') handlers.handleFollowUp('shorten');
            else if (action === 'followUp') handlers.handleFollowUpQuestions();
            else if (action === 'recap') handlers.handleRecap();
            else if (action === 'dynamicAction4') {
                if (actionButtonMode === 'brainstorm') handlers.handleBrainstorm();
                else handlers.handleRecap();
            }
            else if (action === 'clarify') handlers.handleClarify();
            else if (action === 'codeHint') handlers.handleCodeHint();
            else if (action === 'brainstorm') handlers.handleBrainstorm();
            else if (action === 'scrollUp') scrollContainerRef.current?.scrollBy({ top: -100, behavior: 'smooth' });
            else if (action === 'scrollDown') scrollContainerRef.current?.scrollBy({ top: 100, behavior: 'smooth' });
            else if (action === 'processScreenshots') generalHandlers.processScreenshots();
            else if (action === 'resetCancel') generalHandlers.resetCancel();
            else if (action === 'takeScreenshot') generalHandlers.takeScreenshot();
            else if (action === 'selectiveScreenshot') generalHandlers.selectiveScreenshot();
            
            // Safety reset if it didn't trigger an expansion
            setTimeout(() => { isStealthRef.current = false; }, 500);
        });
        return unsubscribe;
    }, []);

    // ── Derived STT status for the rolling transcript indicator (interviewer channel) ──
    const interviewerSttIndicatorStatus = sttInterviewerStatus;
    // Strip consecutive error count from display — show only in expanded diagnostics
    const interviewerSttIndicatorError = sttInterviewerError?.replace(/\s*\(\d+ consecutive errors\):?/gi, '');

    const copyDiagnostics = async () => {
        const version = import.meta.env.VITE_APP_VERSION || 'unknown';
        const [arch, osVersion] = await Promise.all([
            window.electronAPI?.getArch?.().catch(() => 'unknown'),
            window.electronAPI?.getOsVersion?.().catch(() => 'unknown'),
        ]);
        const { categorizeSttError } = await import('../lib/sttErrorMapper');
        const interviewerCat = sttInterviewerError ? categorizeSttError(sttInterviewerError) : null;
        const report = [
            '## STT Diagnostic Report',
            `App Version: ${version}`,
            `Platform: ${osVersion} (${arch})`,
            `---`,
            `System Audio Provider: ${sttInterviewerProvider}`,
            `System Audio Status: ${sttInterviewerStatus}`,
            interviewerCat ? `System Audio Category: ${interviewerCat.title} [${interviewerCat.category}]` : '',
            `System Audio Error: ${sttInterviewerError || 'N/A'}`,
            `Timestamp: ${new Date().toISOString()}`,
        ].filter(Boolean).join('\n');
        try {
            await navigator.clipboard.writeText(report);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = report;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
    };

    return (
        <div data-theme="dark" ref={contentRef} className="terminal-scope flex flex-col items-center w-fit mx-auto h-fit min-h-0 bg-transparent p-0 rounded-[20px] font-sans overlay-text-primary">

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="flex flex-col items-center w-full"
                    >
                        <div
                            className={`relative w-[680px] max-w-full backdrop-blur-2xl border rounded-[20px] overflow-hidden flex flex-col draggable-area overlay-shell-surface ${overlayPanelClass}`}
                            style={{ ...appearance.shellStyle, opacity: localOpacity }}
                        >

                            {/* ── TOP BAR ───────────────────────────────────────────── */}
                            <div className="flex items-center justify-between px-3 py-2.5 shrink-0 draggable-area" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                                {/* Left: Logo + Model selector */}
                                <div className="flex items-center gap-2 no-drag">
                                    <button
                                        onClick={() => window.electronAPI?.setWindowMode?.('launcher')}
                                        className="w-7 h-7 rounded-full overlay-icon-surface overlay-icon-surface-hover flex items-center justify-center interaction-base interaction-press"
                                        style={appearance.iconStyle}
                                        title="LiveLens home"
                                    >
                                        <img src={icon} alt="LiveLens" className="w-[18px] h-[18px] object-contain force-black-icon" draggable="false" onDragStart={(e) => e.preventDefault()} />
                                    </button>
                                    <div ref={modelSelectorRef}>
                                        <button
                                            onClick={() => {
                                                if (!contentRef.current) return;
                                                const contentRect = contentRef.current.getBoundingClientRect();
                                                window.electronAPI?.toggleModelSelector?.({
                                                    offsetX: 0,
                                                    offsetY: contentRect.bottom + 8,
                                                });
                                            }}
                                            className={`flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-[11px] font-medium max-w-[130px] interaction-base interaction-press ${controlSurfaceClass}`}
                                            style={appearance.controlStyle}
                                        >
                                            <span className="truncate min-w-0 flex-1">
                                                {(() => {
                                                    const m = currentModel;
                                                    if (m.startsWith('ollama-')) return m.replace('ollama-', '');
                                                    if (m === 'gemini-3.1-flash-lite-preview') return 'Gemini 3.1 Flash';
                                                    if (m === 'gemini-3.1-pro-preview') return 'Gemini 3.1 Pro';
                                                    if (m === 'llama-3.3-70b-versatile') return 'Groq Llama 3.3';
                                                    if (m === 'gpt-5.4') return 'GPT 5.4';
                                                    if (m === 'claude-sonnet-4-6') return 'Sonnet 4.6';
                                                    return m;
                                                })()}
                                            </span>
                                            <ChevronDown size={12} className="shrink-0 opacity-50" />
                                        </button>
                                    </div>
                                </div>

                                {/* Right: Opacity, Settings, Mouse, Mic, divider, Hide, Stop */}
                                <div className="flex items-center gap-0.5 no-drag">
                                    {/* Opacity control — matches model selector style */}
                                    <div className={`flex items-center gap-1 px-2 py-1 border rounded-lg ${controlSurfaceClass}`} style={appearance.controlStyle} title="Opacity (↑↓ to adjust)">
                                        <svg className="w-3 h-3 shrink-0 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                                        </svg>
                                        <input
                                            type="number" min={10} max={100} step={1}
                                            value={opacityText}
                                            onChange={e => setOpacityText(e.target.value)}
                                            onBlur={e => {
                                                const v = Math.min(100, Math.max(10, Number(e.target.value) || 10));
                                                setOpacityText(String(v));
                                                handleOpacityChange(v / 100);
                                            }}
                                            onKeyDown={e => {
                                                e.stopPropagation();
                                                if (e.key === 'Enter') {
                                                    const v = Math.min(100, Math.max(10, Number((e.target as HTMLInputElement).value) || 10));
                                                    setOpacityText(String(v));
                                                    handleOpacityChange(v / 100);
                                                    (e.target as HTMLInputElement).blur();
                                                }
                                            }}
                                            className="w-7 text-center text-[11px] bg-transparent border-0 outline-none overlay-text-interactive tabular-nums [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    <div className="w-px h-3.5 mx-0.5 shrink-0" style={appearance.dividerStyle} />
                                    <button
                                        onClick={() => setIsInterviewerCapturing(v => !v)}
                                        className={`w-7 h-7 flex items-center justify-center rounded-lg interaction-base interaction-press ${isInterviewerCapturing ? 'bg-[#d97757] text-white' : 'overlay-icon-surface overlay-icon-surface-hover overlay-text-muted'}`}
                                        style={isInterviewerCapturing ? undefined : appearance.iconStyle}
                                        title={isInterviewerCapturing ? 'Interviewer capture ON — click to pause' : 'Interviewer capture OFF — click to resume'}
                                    >
                                        <Mic className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setAutoScroll(v => !v)}
                                        className={`w-7 h-7 flex items-center justify-center rounded-lg interaction-base interaction-press ${autoScroll ? 'bg-[#d97757] text-white' : 'overlay-icon-surface overlay-icon-surface-hover overlay-text-interactive'}`}
                                        style={autoScroll ? undefined : appearance.iconStyle}
                                        title="Toggle auto-scroll"
                                    >
                                        <ChevronsDown className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (isSettingsOpen) { window.electronAPI?.toggleSettingsWindow?.(); return; }
                                            if (!contentRef.current) return;
                                            const contentRect = contentRef.current.getBoundingClientRect();
                                            window.electronAPI?.toggleSettingsWindow?.({
                                                offsetX: contentRect.right - 220,
                                                offsetY: contentRect.bottom + 8,
                                            });
                                        }}
                                        className={`w-7 h-7 flex items-center justify-center rounded-lg interaction-base interaction-press overlay-icon-surface overlay-icon-surface-hover ${isSettingsOpen ? 'overlay-text-primary' : 'overlay-text-interactive'}`}
                                        style={appearance.iconStyle}
                                        title="Settings"
                                    >
                                        <SlidersHorizontal className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="w-px h-3.5 mx-1.5 shrink-0" style={appearance.dividerStyle} />
                                    <button
                                        onClick={() => { const s = !isMousePassthrough; setIsMousePassthrough(s); window.electronAPI?.setOverlayMousePassthrough?.(s); }}
                                        className={`w-7 h-7 flex items-center justify-center rounded-lg interaction-base interaction-press ${isMousePassthrough ? 'bg-[#d97757] text-white' : 'overlay-icon-surface overlay-icon-surface-hover overlay-text-interactive'}`}
                                        style={isMousePassthrough ? undefined : appearance.iconStyle}
                                        title="Mouse passthrough"
                                    >
                                        <PointerOff className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => setIsExpanded(false)}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg overlay-icon-surface overlay-icon-surface-hover overlay-text-interactive interaction-base interaction-press"
                                        style={appearance.iconStyle}
                                        title="Hide"
                                    >
                                        <EyeOff className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                        onClick={() => onEndMeeting ? onEndMeeting() : window.electronAPI.quitApp()}
                                        className="w-7 h-7 flex items-center justify-center rounded-lg overlay-icon-surface overlay-text-primary interaction-base interaction-press hover:bg-red-500/10 hover:text-red-400"
                                        style={appearance.iconStyle}
                                        title="End session"
                                    >
                                        <div className="w-2.5 h-2.5 rounded-[2px] bg-current opacity-80" />
                                    </button>
                                </div>
                            </div>

                            {/* ── QUICK ACTIONS ROW ─────────────────────────────────── */}
                            <div className="flex flex-nowrap items-center gap-1.5 px-3 py-2 overflow-x-auto no-drag scrollbar-hide shrink-0" style={{ borderBottom: 'none' }}>
                                <button onClick={handleWhatToSay} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all active:scale-95 duration-200 interaction-base interaction-press whitespace-nowrap shrink-0 ${quickActionClass}`} style={appearance.chipStyle}>
                                    <Pencil className="w-3 h-3 opacity-70" /> What to answer?
                                </button>
                                <button onClick={handleClarify} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all active:scale-95 duration-200 interaction-base interaction-press whitespace-nowrap shrink-0 ${quickActionClass}`} style={appearance.chipStyle}>
                                    <MessageSquare className="w-3 h-3 opacity-70" /> Clarify
                                </button>
                                <button onClick={actionButtonMode === 'brainstorm' ? handleBrainstorm : handleRecap} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all active:scale-95 duration-200 interaction-base interaction-press whitespace-nowrap shrink-0 ${quickActionClass}`} style={appearance.chipStyle}>
                                    {actionButtonMode === 'brainstorm' ? <><Lightbulb className="w-3 h-3 opacity-70" /> Brainstorm</> : <><RefreshCw className="w-3 h-3 opacity-70" /> Recap</>}
                                </button>
                                <button onClick={handleFollowUpQuestions} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all active:scale-95 duration-200 interaction-base interaction-press whitespace-nowrap shrink-0 ${quickActionClass}`} style={appearance.chipStyle}>
                                    <HelpCircle className="w-3 h-3 opacity-70" /> Follow Up
                                </button>
                            </div>

                            {/* System Audio Permission Warning Banner */}
                            {systemAudioWarning && (
                                <div className="flex items-center justify-between mx-4 mt-3 mb-1 px-3.5 py-2.5 bg-yellow-500/10 border border-yellow-500/20 rounded-[12px] shadow-sm relative no-drag group/warning">
                                    <div className="flex flex-col gap-1 pr-3">
                                        <div className="flex items-center gap-2 text-[12.5px] text-yellow-600 dark:text-yellow-400/90 font-medium leading-tight">
                                            <div className="shrink-0 p-1 bg-yellow-500/20 rounded-full">
                                                <svg className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                </svg>
                                            </div>
                                            <span>Screen Recording Permission Denied</span>
                                        </div>
                                        <p className="text-[11px] text-yellow-600/70 dark:text-yellow-400/60 leading-snug pl-[26px]">
                                            {systemAudioWarning}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button 
                                            onClick={() => { window.electronAPI.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'); }}
                                            className="px-3 py-1.5 rounded-lg bg-yellow-500/15 hover:bg-yellow-500/25 text-yellow-700 dark:text-yellow-500 text-[11px] font-semibold transition-all active:scale-95 border border-yellow-500/20 shadow-sm"
                                        >
                                            Open Settings
                                        </button>
                                        <button 
                                            onClick={() => setSystemAudioWarning(null)}
                                            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-yellow-600/50 hover:text-yellow-700 dark:text-yellow-500/50 dark:hover:text-yellow-400 transition-colors absolute top-1 right-1 opacity-0 group-hover/warning:opacity-100"
                                            title="Dismiss"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* PR #173: STT Not Configured Warning Banner */}
                            {sttNotConfigured && (
                                <div className="flex items-center justify-between mx-4 mt-3 mb-1 px-3.5 py-2.5 bg-orange-500/10 border border-orange-500/20 rounded-[12px] shadow-sm relative no-drag group/stt-warning">
                                    <div className="flex flex-col gap-1 pr-3">
                                        <div className="flex items-center gap-2 text-[12.5px] text-orange-600 dark:text-orange-400/90 font-medium leading-tight">
                                            <div className="shrink-0 p-1 bg-orange-500/20 rounded-full">
                                                <svg className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                                                </svg>
                                            </div>
                                            <span>Transcription Not Configured</span>
                                        </div>
                                        <p className="text-[11px] text-orange-600/70 dark:text-orange-400/60 leading-snug pl-[26px]">
                                            No STT provider selected. Open Settings → Audio to pick one.
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => { window.electronAPI?.openSettingsTab?.('audio'); }}
                                            className="px-3 py-1.5 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-700 dark:text-orange-500 text-[11px] font-semibold transition-all active:scale-95 border border-orange-500/20 shadow-sm"
                                        >
                                            Open Settings
                                        </button>
                                        <button
                                            onClick={() => setSttNotConfigured(false)}
                                            className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-orange-600/50 hover:text-orange-700 dark:text-orange-500/50 dark:hover:text-orange-400 transition-colors absolute top-1 right-1 opacity-0 group-hover/stt-warning:opacity-100"
                                            title="Dismiss"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STT error indicator only */}
                            {interviewerSttIndicatorStatus !== 'connected' && (
                                <RollingTranscript
                                    text=""
                                    isActive={false}
                                    interviewerChannel={{
                                        status: interviewerSttIndicatorStatus,
                                        error: interviewerSttIndicatorError,
                                        provider: sttInterviewerProvider,
                                    }}
                                    onCopyDiagnostics={copyDiagnostics}
                                />
                            )}

                            {/* Chat History + live transcript */}
                            {(messages.length > 0 || isProcessing) && (
                                <>
                                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[clamp(300px,35vh,450px)] no-drag" style={{ scrollbarWidth: 'none' }}>
                                    {messages.map((msg) => {
                                        // Negotiation coaching — full-width card, no bubble
                                        if (msg.isNegotiationCoaching && msg.negotiationCoachingData) {
                                            return (
                                                <div key={msg.id} className="animate-fade-in-up">
                                                    {renderMessageText(msg)}
                                                </div>
                                            );
                                        }

                                        // User message — RIGHT, Q style
                                        if (msg.role === 'user') {
                                            return (
                                                <div key={msg.id} className="flex justify-end animate-fade-in-up">
                                                    <div className="flex flex-col items-end gap-[5px] max-w-[84%]">
                                                        <div className="flex items-center gap-[5px] pr-[1px]">
                                                            <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: '#d97757' }}>You</span>
                                                            <svg className="w-[11px] h-[11px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="#d97757" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                                                <circle cx="12" cy="7" r="4"/>
                                                            </svg>
                                                        </div>
                                                        <div className="px-3 py-2 text-[13px] leading-[1.55]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '12px 4px 12px 12px', color: 'rgba(226,229,237,0.78)' }}>
                                                            {msg.hasScreenshot && (
                                                                <div className="flex items-center gap-1 text-[10px] mb-1.5 pb-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', color: 'rgba(226,229,237,0.40)' }}>
                                                                    <Image className="w-2.5 h-2.5" />
                                                                    <span>Screenshot attached</span>
                                                                </div>
                                                            )}
                                                            {renderMessageText(msg)}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Interviewer Q — RIGHT, orange brand label
                                        if (msg.role === 'interviewer') {
                                            return (
                                                <div key={msg.id} className="flex justify-end animate-fade-in-up">
                                                    <div className="flex flex-col items-end gap-[5px] max-w-[84%]">
                                                        <div className="flex items-center gap-[5px] pr-[1px]">
                                                            <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: '#d97757' }}>Interviewer</span>
                                                            <svg className="w-[11px] h-[11px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="#d97757" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                                                                <circle cx="12" cy="7" r="4"/>
                                                            </svg>
                                                            {msg.isStreaming && <span className="w-[5px] h-[5px] rounded-full animate-pulse" style={{ background: '#d97757' }} />}
                                                        </div>
                                                        <div className="px-3 py-2 text-[13px] leading-[1.55]" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '12px 4px 12px 12px', color: 'rgba(226,229,237,0.78)' }}>
                                                            {msg.text}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // System / AI — LEFT, LiveLens label + actions
                                        const hasOwnCard =
                                            msg.isCode ||
                                            (msg.text && msg.text.includes('```')) ||
                                            msg.intent === 'shorten' ||
                                            msg.intent === 'recap' ||
                                            msg.intent === 'follow_up_questions' ||
                                            msg.intent === 'what_to_answer';

                                        return (
                                            <div key={msg.id} className="flex justify-start animate-fade-in-up">
                                                <div className="flex flex-col items-start gap-[5px] max-w-[88%]">
                                                    <div className="flex items-center gap-[5px] pl-[1px]">
                                                        <span style={{ color: 'rgba(106,155,204,0.70)', fontSize: '10px', lineHeight: 1 }}>●</span>
                                                        <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: 'rgba(106,155,204,0.70)' }}>LiveLens</span>
                                                        {msg.isStreaming && <span className="w-[5px] h-[5px] rounded-full animate-pulse" style={{ background: '#6a9bcc' }} />}
                                                    </div>
                                                    {hasOwnCard ? (
                                                        <div className="text-left w-full">
                                                            {renderMessageText(msg)}
                                                        </div>
                                                    ) : (
                                                        <div className="text-left text-[13px] leading-relaxed px-[14px] py-[10px] w-full" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '4px 12px 12px 12px' }}>
                                                            {renderMessageText(msg)}
                                                        </div>
                                                    )}
                                                    {!msg.isStreaming && (
                                                        <div className="flex items-center gap-1.5 flex-wrap">
                                                            <button onClick={() => handleQuickAction('example')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all active:scale-95 duration-200 interaction-base interaction-press whitespace-nowrap shrink-0 ${quickActionClass}`} style={appearance.chipStyle}>
                                                                <Lightbulb className="w-3 h-3 opacity-70" /> Example
                                                            </button>
                                                            <button onClick={() => handleQuickAction('shorter')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all active:scale-95 duration-200 interaction-base interaction-press whitespace-nowrap shrink-0 ${quickActionClass}`} style={appearance.chipStyle}>
                                                                <ChevronsDown className="w-3 h-3 opacity-70" /> Shorter
                                                            </button>
                                                            <button onClick={() => handleQuickAction('deeper')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all active:scale-95 duration-200 interaction-base interaction-press whitespace-nowrap shrink-0 ${quickActionClass}`} style={appearance.chipStyle}>
                                                                <Zap className="w-3 h-3 opacity-70" /> Deeper
                                                            </button>
                                                            <button onClick={() => handleQuickAction('star')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all active:scale-95 duration-200 interaction-base interaction-press whitespace-nowrap shrink-0 ${quickActionClass}`} style={appearance.chipStyle}>
                                                                <ArrowRight className="w-3 h-3 opacity-70" /> STAR
                                                            </button>
                                                            <button onClick={() => handleCopy(msg.text)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all active:scale-95 duration-200 interaction-base interaction-press whitespace-nowrap shrink-0 ${quickActionClass}`} style={appearance.chipStyle}>
                                                                <Copy className="w-3 h-3 opacity-70" /> Copy
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {isProcessing && !messages.some(m => m.isStreaming) && (
                                        <div className="flex justify-start">
                                            <div className="flex flex-col items-start gap-[5px]">
                                                <div className="flex items-center gap-[5px] pl-[1px]">
                                                    <span style={{ color: 'rgba(106,155,204,0.45)', fontSize: '10px', lineHeight: 1 }}>●</span>
                                                    <span className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: 'rgba(106,155,204,0.45)' }}>LiveLens</span>
                                                </div>
                                                <div className="flex items-center gap-[4px] px-[14px] py-[10px]" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '4px 12px 12px 12px' }}>
                                                    <div className="w-[3px] h-[10px] rounded-full animate-[listening_1.1s_ease-in-out_infinite]" style={{ background: 'rgba(106,155,204,0.45)', animationDelay: '0ms' }} />
                                                    <div className="w-[3px] h-[10px] rounded-full animate-[listening_1.1s_ease-in-out_infinite]" style={{ background: 'rgba(106,155,204,0.45)', animationDelay: '180ms' }} />
                                                    <div className="w-[3px] h-[10px] rounded-full animate-[listening_1.1s_ease-in-out_infinite]" style={{ background: 'rgba(106,155,204,0.45)', animationDelay: '360ms' }} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>
                                </>
                            )}


                            {/* ── INPUT ─────────────────────────────────────────────── */}
                            <div className="px-3 py-2.5 no-drag shrink-0">
                                {/* Attached Screenshots Preview */}
                                {attachedContext.length > 0 && (
                                    <div className={`mb-2 rounded-lg p-2 transition-all duration-200 border ${subtleSurfaceClass}`} style={appearance.subtleStyle}>
                                        {/* Header: count + mode selector + solve + clear */}
                                        <div className="flex items-center gap-1.5 mb-1.5">
                                            <span className="text-[11px] font-medium overlay-text-primary flex-1">
                                                {attachedContext.length} screenshot{attachedContext.length > 1 ? 's' : ''}
                                            </span>
                                            {/* Mode dropdown */}
                                            <div ref={modeDropdownRef} className="relative">
                                                {modeDropdownOpen && (
                                                    <div className={`absolute bottom-full right-0 mb-1.5 w-52 rounded-xl border overflow-hidden z-50 shadow-2xl overlay-shell-surface`} style={appearance.shellStyle}>
                                                        {ANALYSIS_MODES.map(m => (
                                                            <button key={m.id} onClick={() => handleModeSelect(m.id)}
                                                                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors overlay-text-primary overlay-icon-surface-hover ${analysisMode === m.id ? 'overlay-subtle-surface' : ''}`}
                                                                style={analysisMode === m.id ? appearance.subtleStyle : undefined}>
                                                                <span className="text-xs shrink-0">{m.icon}</span>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-[11px] font-medium overlay-text-primary">{m.label}</div>
                                                                    <div className="text-[9px] overlay-text-muted truncate">{m.description}</div>
                                                                </div>
                                                                {analysisMode === m.id && (
                                                                    <svg className="w-2.5 h-2.5 overlay-text-interactive shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"/>
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                                <button onClick={() => setModeDropdownOpen(o => !o)}
                                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] border transition-colors ${controlSurfaceClass}`}
                                                    style={appearance.controlStyle}>
                                                    <span>{ANALYSIS_MODES.find(m => m.id === analysisMode)?.icon ?? '💬'}</span>
                                                    <span>{ANALYSIS_MODES.find(m => m.id === analysisMode)?.label ?? 'General'}</span>
                                                    <ChevronDown className={`w-2.5 h-2.5 transition-transform opacity-50 ${modeDropdownOpen ? 'rotate-180' : ''}`} />
                                                </button>
                                            </div>
                                            {/* Solve */}
                                            <button onClick={handleSolve} disabled={isProcessing}
                                                className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#007AFF]/90 hover:bg-[#007AFF] text-white text-[10px] font-medium transition-colors disabled:opacity-50 shrink-0">
                                                <Zap className="w-2.5 h-2.5" /> Solve
                                            </button>
                                            {/* Clear */}
                                            <button onClick={() => setAttachedContext([])}
                                                className="p-1 rounded-full transition-colors overlay-icon-surface overlay-icon-surface-hover overlay-text-interactive"
                                                title="Remove all" style={appearance.iconStyle}>
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                        {/* Thumbnails */}
                                        <div className="flex gap-1.5 overflow-x-auto max-w-full pb-1">
                                            {attachedContext.map((ctx, idx) => (
                                                <div key={ctx.path} className="relative group/thumb flex-shrink-0">
                                                    <img src={ctx.preview} alt={`Screenshot ${idx + 1}`}
                                                        className={`h-10 w-auto rounded border ${isLightTheme ? 'border-black/15' : 'border-white/20'}`}/>
                                                    <button onClick={() => setAttachedContext(prev => prev.filter((_, i) => i !== idx))}
                                                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500/80 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity"
                                                        title="Remove">
                                                        <X className="w-2.5 h-2.5 text-white"/>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="relative">
                                    <input
                                        ref={textInputRef}
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => { userTypedRef.current = true; setInputValue(e.target.value); }}
                                        onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                                        className={`w-full border rounded-xl pl-3 pr-[60px] py-2 focus:outline-none transition-all duration-200 ease-sculpted text-[13px] leading-relaxed ${inputClass} ${isInterviewerSpeaking ? 'ring-1 ring-[#d97757]/60' : 'focus:ring-1'}`}
                                        style={appearance.inputStyle}
                                    />
                                    {!inputValue && (
                                        <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none text-[13px] overlay-text-muted">
                                            <span>Ask anything, or</span>
                                            <div className="flex items-center gap-1 opacity-80">
                                                {(shortcuts.selectiveScreenshot || ['⌘', 'Shift', 'H']).map((key, i) => (
                                                    <React.Fragment key={i}>
                                                        {i > 0 && <span className="text-[10px]">+</span>}
                                                        <kbd className="px-1.5 py-0.5 rounded border text-[10px] font-sans min-w-[20px] text-center overlay-control-surface overlay-text-secondary" style={appearance.controlStyle}>{key}</kbd>
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                            <span>for screenshot</span>
                                        </div>
                                    )}
                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                        <button
                                            onClick={handleManualSubmit}
                                            disabled={!inputValue.trim() && attachedContext.length === 0}
                                            className={`w-6 h-6 rounded-md flex items-center justify-center interaction-base interaction-press ${inputValue.trim() || attachedContext.length > 0 ? 'bg-[#007AFF] text-white shadow-lg shadow-blue-500/20 hover:bg-[#0071E3]' : 'overlay-icon-surface overlay-text-muted cursor-not-allowed'}`}
                                            style={inputValue.trim() || attachedContext.length > 0 ? undefined : appearance.iconStyle}
                                        >
                                            <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                                {isInterviewerSpeaking && (
                                    <div className="flex items-center gap-[5px] mt-[5px] pl-[2px]">
                                        <span className="w-[5px] h-[5px] rounded-full animate-pulse shrink-0" style={{ background: '#d97757' }} />
                                        <span className="text-[10px]" style={{ color: 'rgba(217,119,87,0.65)' }}>Interviewer speaking — edit if needed</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LiveLensInterface;
