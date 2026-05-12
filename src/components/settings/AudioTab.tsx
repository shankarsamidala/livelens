import React, { useState, useEffect, useRef } from 'react';
import {
    Mic,
    Speaker,
    Globe,
    MapPin,
    ChevronDown,
    Check,
    Upload,
    RefreshCw,
    ExternalLink,
    Trash2,
    Info,
    FlaskConical,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useResolvedTheme } from '../../hooks/useResolvedTheme';

// ---------------------------------------------------------------------------
// CustomSelect — device picker
// ---------------------------------------------------------------------------
interface CustomSelectProps {
    label: string;
    icon: React.ReactNode;
    value: string;
    options: MediaDeviceInfo[];
    onChange: (value: string) => void;
    placeholder?: string;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
    label,
    icon,
    value,
    options,
    onChange,
    placeholder = 'Select device',
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLabel = options.find((o) => o.deviceId === value)?.label || placeholder;

    return (
        <div className="bg-bg-card rounded-xl p-4 border border-border-subtle" ref={containerRef}>
            {label && (
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-text-secondary">{icon}</span>
                    <label className="text-xs font-medium text-text-primary uppercase tracking-wide">{label}</label>
                </div>
            )}

            <div className="relative">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full bg-bg-input border border-border-subtle rounded-lg px-3 py-2.5 text-sm text-text-primary flex items-center justify-between hover:bg-bg-elevated transition-colors"
                >
                    <span className="truncate pr-4">{selectedLabel}</span>
                    <ChevronDown
                        size={14}
                        className={`text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    />
                </button>

                {isOpen && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-bg-elevated border border-border-subtle rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto animated fadeIn">
                        <div className="p-1 space-y-0.5">
                            {options.map((device) => (
                                <button
                                    key={device.deviceId}
                                    onClick={() => {
                                        onChange(device.deviceId);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 text-sm rounded-md flex items-center justify-between group transition-colors ${value === device.deviceId ? 'bg-bg-input hover:bg-bg-elevated text-text-primary' : 'text-text-secondary hover:bg-bg-input hover:text-text-primary'}`}
                                >
                                    <span className="truncate">
                                        {device.label || `Device ${device.deviceId.slice(0, 5)}...`}
                                    </span>
                                    {value === device.deviceId && <Check size={14} className="text-accent-primary" />}
                                </button>
                            ))}
                            {options.length === 0 && (
                                <div className="px-3 py-2 text-sm text-gray-500 italic">No devices found</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// ProviderSelect — STT provider picker
// ---------------------------------------------------------------------------
interface ProviderOption {
    id: string;
    label: string;
    badge?: string | null;
    recommended?: boolean;
    desc: string;
    color: string;
    icon: React.ReactNode;
}

interface ProviderSelectProps {
    value: string;
    options: ProviderOption[];
    onChange: (value: string) => void;
}

const ProviderSelect: React.FC<ProviderSelectProps> = ({ value, options, onChange }) => {
    const isLight = useResolvedTheme() === 'light';
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selected = options.find((o) => o.id === value);

    const getBadgeStyle = (color?: string) => {
        switch (color) {
            case 'blue':
                return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'orange':
                return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
            case 'purple':
                return 'bg-[#d97757]/10 text-[#d97757] border-[#d97757]/20';
            case 'teal':
                return 'bg-teal-500/10 text-teal-500 border-teal-500/20';
            case 'cyan':
                return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
            case 'indigo':
                return 'bg-[#d97757]/10 text-[#d97757] border-[#d97757]/20';
            case 'green':
                return 'bg-green-500/10 text-green-500 border-green-500/20';
            default:
                return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
        }
    };

    const getIconStyle = (color?: string, isSelectedItem: boolean = false) => {
        if (isSelectedItem) return 'bg-accent-primary text-white shadow-sm';
        switch (color) {
            case 'blue':
                return 'bg-blue-500/10 text-blue-600';
            case 'orange':
                return 'bg-orange-500/10 text-orange-600';
            case 'purple':
                return 'bg-[#d97757]/10 text-[#c4623e]';
            case 'teal':
                return 'bg-teal-500/10 text-teal-600';
            case 'cyan':
                return 'bg-cyan-500/10 text-cyan-600';
            case 'indigo':
                return 'bg-[#d97757]/10 text-[#c4623e]';
            case 'green':
                return 'bg-green-500/10 text-green-600';
            default:
                return 'bg-gray-500/10 text-gray-600';
        }
    };

    return (
        <div ref={containerRef} className="relative z-20 font-sans">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full group bg-bg-input border border-border-subtle hover:border-border-muted shadow-sm rounded-xl p-2.5 pr-3.5 flex items-center justify-between transition-all duration-200 outline-none focus:ring-2 focus:ring-accent-primary/20 ${isOpen ? 'ring-2 ring-accent-primary/20 border-accent-primary/50' : 'hover:shadow-md'}`}
            >
                {selected ? (
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div
                            className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 transition-all duration-300 ${getIconStyle(selected.color)}`}
                        >
                            {selected.icon}
                        </div>
                        <div className="min-w-0 flex-1 text-left">
                            <div className="flex items-center gap-2">
                                <span className="text-[13px] font-semibold text-text-primary truncate leading-tight">
                                    {selected.label}
                                </span>
                                {selected.badge && (
                                    <span
                                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ml-2 ${getBadgeStyle(selected.badge === 'Saved' ? 'green' : selected.color)}`}
                                    >
                                        {selected.badge}
                                    </span>
                                )}
                                {selected.recommended && (
                                    <span
                                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ml-2 ${getBadgeStyle(selected.color)}`}
                                    >
                                        Recommended
                                    </span>
                                )}
                            </div>
                            <span className="text-[11px] text-text-tertiary truncate block leading-tight mt-0.5">
                                {selected.desc}
                            </span>
                        </div>
                    </div>
                ) : (
                    <span className="text-text-secondary px-2 text-sm">Select Provider</span>
                )}
                <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-text-tertiary transition-transform duration-300 group-hover:bg-bg-input ${isOpen ? 'rotate-180 bg-bg-input text-text-primary' : ''}`}
                >
                    <ChevronDown size={14} strokeWidth={2.5} />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className={`absolute top-full left-0 w-full mt-2 backdrop-blur-xl rounded-xl shadow-2xl overflow-hidden ring-1 ring-black/5 ${isLight ? 'bg-bg-elevated border border-border-subtle' : 'bg-bg-elevated/90 border border-white/5'}`}
                    >
                        <div className="max-h-[320px] overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
                            {options.map((option) => {
                                const isSelected = value === option.id;
                                return (
                                    <button
                                        key={option.id}
                                        onClick={() => {
                                            onChange(option.id);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full rounded-[10px] p-2 flex items-center gap-3 transition-all duration-200 group relative ${isSelected ? (isLight ? 'bg-bg-item-active shadow-inner' : 'bg-white/10 shadow-inner') : isLight ? 'hover:bg-bg-item-surface' : 'hover:bg-white/5'}`}
                                    >
                                        <div
                                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 ${isSelected ? 'scale-100' : 'scale-95 group-hover:scale-100'} ${getIconStyle(option.color, false)}`}
                                        >
                                            {option.icon}
                                        </div>
                                        <div className="flex-1 min-w-0 text-left">
                                            <div className="flex items-center justify-between mb-0.5">
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={`text-[13px] font-medium transition-colors ${isSelected && !isLight ? 'text-white' : 'text-text-primary'}`}
                                                    >
                                                        {option.label}
                                                    </span>
                                                    {option.badge && (
                                                        <span
                                                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${getBadgeStyle(option.badge === 'Saved' ? 'green' : option.color)}`}
                                                        >
                                                            {option.badge}
                                                        </span>
                                                    )}
                                                    {option.recommended && (
                                                        <span
                                                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide ${getBadgeStyle(option.color)}`}
                                                        >
                                                            Recommended
                                                        </span>
                                                    )}
                                                </div>
                                                {isSelected && (
                                                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                                        <Check
                                                            size={14}
                                                            className="text-accent-primary"
                                                            strokeWidth={3}
                                                        />
                                                    </motion.div>
                                                )}
                                            </div>
                                            <span
                                                className={`text-[11px] block truncate transition-colors ${isSelected && !isLight ? 'text-white/70' : 'text-text-tertiary'}`}
                                            >
                                                {option.desc}
                                            </span>
                                        </div>
                                        {!isSelected && (
                                            <div className="absolute inset-0 rounded-[10px] ring-1 ring-inset ring-transparent group-hover:ring-border-subtle pointer-events-none" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// ---------------------------------------------------------------------------
// AudioTab — self-contained audio & speech settings tab
// ---------------------------------------------------------------------------
export const AudioTab: React.FC = () => {
    // ── Device state ──────────────────────────────────────────────────────────
    const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
    const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedInput, setSelectedInput] = useState('');
    const [selectedOutput, setSelectedOutput] = useState('');
    const [micLevel, setMicLevel] = useState(0);
    const [useExperimentalSck, setUseExperimentalSck] = useState(false);

    // ── STT Provider state ────────────────────────────────────────────────────
    const [sttProvider, setSttProvider] = useState<
        | 'none'
        | 'google'
        | 'groq'
        | 'openai'
        | 'deepgram'
        | 'elevenlabs'
        | 'azure'
        | 'ibmwatson'
        | 'soniox'
        | 'natively'
        | 'whisper-local'
    >('none');
    const [whisperModelSize, setWhisperModelSize] = useState<'tiny' | 'base' | 'small' | 'medium'>('small');
    const [whisperDownload, setWhisperDownload] = useState<{ active: boolean; file: string; progress: number } | null>(
        null
    );
    const [whisperDownloaded, setWhisperDownloaded] = useState(false);
    const [groqSttModel, setGroqSttModel] = useState('whisper-large-v3-turbo');

    // ── STT API key state ─────────────────────────────────────────────────────
    const [sttGroqKey, setSttGroqKey] = useState('');
    const [sttOpenaiKey, setSttOpenaiKey] = useState('');
    const [sttDeepgramKey, setSttDeepgramKey] = useState('');
    const [sttElevenLabsKey, setSttElevenLabsKey] = useState('');
    const [sttAzureKey, setSttAzureKey] = useState('');
    const [sttAzureRegion, setSttAzureRegion] = useState('eastus');
    const [sttIbmKey, setSttIbmKey] = useState('');
    const [sttSonioxKey, setSttSonioxKey] = useState('');

    // ── STT UI state ──────────────────────────────────────────────────────────
    const [sttTestStatus, setSttTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [sttTestError, setSttTestError] = useState('');
    const [sttSaving, setSttSaving] = useState(false);
    const [sttSaved, setSttSaved] = useState(false);

    // ── Credential / provider flags ───────────────────────────────────────────
    const [googleServiceAccountPath, setGoogleServiceAccountPath] = useState<string | null>(null);
    const [hasLiveLensKey, setHasLiveLensKey] = useState(false);
    const [hasStoredSttGroqKey, setHasStoredSttGroqKey] = useState(false);
    const [hasStoredSttOpenaiKey, setHasStoredSttOpenaiKey] = useState(false);
    const [hasStoredDeepgramKey, setHasStoredDeepgramKey] = useState(false);
    const [hasStoredElevenLabsKey, setHasStoredElevenLabsKey] = useState(false);
    const [hasStoredAzureKey, setHasStoredAzureKey] = useState(false);
    const [hasStoredIbmWatsonKey, setHasStoredIbmWatsonKey] = useState(false);
    const [hasStoredSonioxKey, setHasStoredSonioxKey] = useState(false);

    // ── STT dropdown ──────────────────────────────────────────────────────────
    const [isSttDropdownOpen, setIsSttDropdownOpen] = useState(false);
    const sttDropdownRef = useRef<HTMLDivElement>(null);

    // ── Recognition Language state ────────────────────────────────────────────
    const [recognitionLanguage, setRecognitionLanguage] = useState('');
    const [selectedSttGroup, setSelectedSttGroup] = useState('');
    const [availableLanguages, setAvailableLanguages] = useState<Record<string, any>>({});
    const [autoDetectedLanguage, setAutoDetectedLanguage] = useState<string | null>(null);

    // ── Effects ───────────────────────────────────────────────────────────────

    // Close STT dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sttDropdownRef.current && !sttDropdownRef.current.contains(event.target as Node)) {
                setIsSttDropdownOpen(false);
            }
        };
        if (isSttDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isSttDropdownOpen]);

    // Load STT settings on mount
    useEffect(() => {
        const loadSttSettings = async () => {
            try {
                // @ts-ignore
                const creds = await window.electronAPI?.getStoredCredentials?.();
                if (creds) {
                    setSttProvider(creds.sttProvider || 'none');
                    if (creds.groqSttModel) setGroqSttModel(creds.groqSttModel);
                    setGoogleServiceAccountPath(creds.googleServiceAccountPath);
                    setHasStoredSttGroqKey(creds.hasSttGroqKey);
                    setHasStoredSttOpenaiKey(creds.hasSttOpenaiKey);
                    setHasStoredDeepgramKey(creds.hasDeepgramKey);
                    setHasStoredElevenLabsKey(creds.hasElevenLabsKey);
                    setHasStoredAzureKey(creds.hasAzureKey);
                    if (creds.azureRegion) setSttAzureRegion(creds.azureRegion);
                    setHasStoredIbmWatsonKey(creds.hasIbmWatsonKey);
                    setHasStoredSonioxKey(creds.hasSonioxKey || false);
                    // NOTE: setHasStoredTavilyKey intentionally omitted — belongs to ProfileTab
                    setHasLiveLensKey(creds.hasLiveLensKey || false);
                    // Whisper local
                    const wSize = (await window.electronAPI?.getWhisperModelSize?.()) ?? 'small';
                    setWhisperModelSize(wSize as any);
                    const wCheck = await window.electronAPI?.checkWhisperModel?.(wSize as any);
                    setWhisperDownloaded(wCheck?.downloaded ?? false);
                    // Raw key values are never loaded into React state — only hasKey booleans.
                    // Input fields start empty; user types a new key to replace an existing one.
                }
            } catch (e) {
                console.error('Failed to load STT settings:', e);
            }
        };
        loadSttSettings();
    }, []);

    // Live-reload settings whenever the backend broadcasts a credentials change
    useEffect(() => {
        if (!window.electronAPI?.onCredentialsChanged) return;
        const unsubscribe = window.electronAPI.onCredentialsChanged(() => {
            window.electronAPI
                ?.getStoredCredentials?.()
                .then((creds: any) => {
                    if (!creds) return;
                    setSttProvider(creds.sttProvider || 'none');
                    if (creds.groqSttModel) setGroqSttModel(creds.groqSttModel);
                    setHasLiveLensKey(creds.hasLiveLensKey || false);
                    setHasStoredSttGroqKey(creds.hasSttGroqKey);
                    setHasStoredSttOpenaiKey(creds.hasSttOpenaiKey);
                    setHasStoredDeepgramKey(creds.hasDeepgramKey);
                    setHasStoredElevenLabsKey(creds.hasElevenLabsKey);
                    setHasStoredAzureKey(creds.hasAzureKey);
                    setHasStoredIbmWatsonKey(creds.hasIbmWatsonKey);
                    setHasStoredSonioxKey(creds.hasSonioxKey || false);
                })
                .catch(() => {
                    /* silently ignore */
                });
        });
        return () => unsubscribe();
    }, []);

    // Subscribe to STT language auto-detection events
    useEffect(() => {
        if (window.electronAPI?.onSttLanguageAutoDetected) {
            const unsubscribe = window.electronAPI.onSttLanguageAutoDetected((bcp47: string) => {
                setAutoDetectedLanguage(bcp47);
            });
            return () => unsubscribe();
        }
    }, []);

    // Load audio devices
    useEffect(() => {
        const loadDevices = async () => {
            try {
                const [inputs, outputs] = await Promise.all([
                    // @ts-ignore
                    window.electronAPI?.getInputDevices() || Promise.resolve([]),
                    // @ts-ignore
                    window.electronAPI?.getOutputDevices() || Promise.resolve([]),
                ]);

                // Map to shape compatible with CustomSelect (which expects MediaDeviceInfo-like objects)
                const formatDevices = (devs: any[]) =>
                    devs.map((d) => ({
                        deviceId: d.id,
                        label: d.name,
                        kind: 'audioinput' as MediaDeviceKind,
                        groupId: '',
                        toJSON: () => d,
                    }));

                setInputDevices(formatDevices(inputs));
                setOutputDevices(formatDevices(outputs));

                // Load saved preferences
                const savedInput = localStorage.getItem('preferredInputDeviceId');
                const savedOutput = localStorage.getItem('preferredOutputDeviceId');

                if (savedInput && inputs.find((d: any) => d.id === savedInput)) {
                    setSelectedInput(savedInput);
                } else if (inputs.length > 0 && !selectedInput) {
                    setSelectedInput(inputs[0].id);
                }

                if (savedOutput && outputs.find((d: any) => d.id === savedOutput)) {
                    setSelectedOutput(savedOutput);
                } else if (outputs.length > 0 && !selectedOutput) {
                    setSelectedOutput(outputs[0].id);
                }
            } catch (e) {
                console.error('Error loading native devices:', e);
            }
        };
        loadDevices();

        // Load Experimental SCK pref
        const savedSck = localStorage.getItem('useExperimentalSckBackend') === 'true';
        setUseExperimentalSck(savedSck);
    }, [selectedInput, selectedOutput]);

    // Native mic test — start on mount, restart when selectedInput changes, stop on unmount
    useEffect(() => {
        const unsubscribe = window.electronAPI?.onAudioTestLevel?.((level) => {
            setMicLevel(Math.max(0, Math.min(100, level * 100)));
        });

        window.electronAPI?.startAudioTest(selectedInput || undefined).catch((error) => {
            console.error('Error starting native microphone test:', error);
            setMicLevel(0);
        });

        return () => {
            unsubscribe?.();
            window.electronAPI?.stopAudioTest?.().catch((error) => {
                console.error('Error stopping native microphone test:', error);
            });
            setMicLevel(0);
        };
    }, [selectedInput]);

    // Load recognition languages
    useEffect(() => {
        const loadLanguages = async () => {
            if (window.electronAPI?.getRecognitionLanguages) {
                const langs = await window.electronAPI.getRecognitionLanguages();
                setAvailableLanguages(langs);

                // Load stored preference or auto-detect
                const storedStt = await window.electronAPI.getSttLanguage();
                let currentLangKey = storedStt;

                if (!currentLangKey) {
                    const systemLocale = navigator.language;
                    const match = Object.entries(langs).find(
                        ([_, config]: [string, any]) =>
                            config.bcp47 === systemLocale ||
                            config.iso639 === systemLocale ||
                            (config.alternates && config.alternates.includes(systemLocale))
                    );

                    currentLangKey = match ? match[0] : 'english-us';

                    if (window.electronAPI?.setRecognitionLanguage) {
                        window.electronAPI.setRecognitionLanguage(currentLangKey);
                    }
                }

                setRecognitionLanguage(currentLangKey);

                if (langs[currentLangKey]) {
                    setSelectedSttGroup(langs[currentLangKey].group);
                } else {
                    setSelectedSttGroup('English');
                }
            }
        };
        loadLanguages();
    }, []);

    // ── Derived values ────────────────────────────────────────────────────────

    const languageGroups = Array.from(new Set(Object.values(availableLanguages).map((l: any) => l.group))).sort(
        (a, b) => {
            if (a === 'Auto') return -1;
            if (b === 'Auto') return 1;
            if (a === 'English') return -1;
            if (b === 'English') return 1;
            return a.localeCompare(b);
        }
    );

    const currentGroupVariants = Object.entries(availableLanguages)
        .filter(([_, lang]) => lang.group === selectedSttGroup)
        .map(([key, lang]) => ({
            deviceId: key,
            label: lang.label,
            kind: 'audioinput' as MediaDeviceKind,
            groupId: '',
            toJSON: () => ({}),
        }));

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleLanguageChange = async (key: string) => {
        setRecognitionLanguage(key);
        setAutoDetectedLanguage(null);
        if (availableLanguages[key]) {
            setSelectedSttGroup(availableLanguages[key].group);
        }
        if (window.electronAPI?.setRecognitionLanguage) {
            await window.electronAPI.setRecognitionLanguage(key);
        }
    };

    const handleGroupChange = (group: string) => {
        setSelectedSttGroup(group);
        const firstVariant = Object.entries(availableLanguages).find(([_, lang]) => lang.group === group);
        if (firstVariant) {
            handleLanguageChange(firstVariant[0]);
        }
    };

    const handleSttProviderChange = async (
        provider:
            | 'none'
            | 'google'
            | 'groq'
            | 'openai'
            | 'deepgram'
            | 'elevenlabs'
            | 'azure'
            | 'ibmwatson'
            | 'soniox'
            | 'natively'
            | 'whisper-local'
    ) => {
        setSttProvider(provider);
        setIsSttDropdownOpen(false);
        setSttTestStatus('idle');
        setSttTestError('');
        try {
            // @ts-ignore
            await window.electronAPI?.setSttProvider?.(provider);
        } catch (e) {
            console.error('Failed to set STT provider:', e);
        }
    };

    const handleSttKeySubmit = async (
        provider: 'groq' | 'openai' | 'deepgram' | 'elevenlabs' | 'azure' | 'ibmwatson' | 'soniox',
        key: string
    ) => {
        if (!key.trim()) return;

        setSttSaving(true);
        setSttTestStatus('testing');
        setSttTestError('');

        try {
            // @ts-ignore
            const testResult = await window.electronAPI?.testSttConnection?.(
                provider,
                key.trim(),
                provider === 'azure' ? sttAzureRegion : undefined
            );

            if (!testResult?.success) {
                setSttTestStatus('error');
                setSttTestError(testResult?.error || 'Validation failed. Key not saved.');
                setSttSaving(false);
                return;
            }

            setSttTestStatus('success');
            setTimeout(() => setSttTestStatus('idle'), 3000);

            if (provider === 'groq') {
                // @ts-ignore
                await window.electronAPI?.setGroqSttApiKey?.(key.trim());
            } else if (provider === 'openai') {
                // @ts-ignore
                await window.electronAPI?.setOpenAiSttApiKey?.(key.trim());
            } else if (provider === 'elevenlabs') {
                // @ts-ignore
                await window.electronAPI?.setElevenLabsApiKey?.(key.trim());
            } else if (provider === 'azure') {
                // @ts-ignore
                await window.electronAPI?.setAzureApiKey?.(key.trim());
            } else if (provider === 'ibmwatson') {
                // @ts-ignore
                await window.electronAPI?.setIbmWatsonApiKey?.(key.trim());
            } else if (provider === 'soniox') {
                // @ts-ignore
                await window.electronAPI?.setSonioxApiKey?.(key.trim());
            } else {
                // @ts-ignore
                await window.electronAPI?.setDeepgramApiKey?.(key.trim());
            }

            if (provider === 'groq') setHasStoredSttGroqKey(true);
            else if (provider === 'openai') setHasStoredSttOpenaiKey(true);
            else if (provider === 'elevenlabs') setHasStoredElevenLabsKey(true);
            else if (provider === 'azure') setHasStoredAzureKey(true);
            else if (provider === 'ibmwatson') setHasStoredIbmWatsonKey(true);
            else if (provider === 'soniox') setHasStoredSonioxKey(true);
            else setHasStoredDeepgramKey(true);

            setSttSaved(true);
            setTimeout(() => setSttSaved(false), 2000);
        } catch (e: any) {
            console.error(`Failed to save ${provider} STT key:`, e);
            setSttTestStatus('error');
            setSttTestError(e.message || 'Validation failed');
        } finally {
            setSttSaving(false);
        }
    };

    const handleRemoveSttKey = async (
        provider: 'groq' | 'openai' | 'deepgram' | 'elevenlabs' | 'azure' | 'ibmwatson' | 'soniox'
    ) => {
        if (
            !confirm(
                `Are you sure you want to remove the ${provider === 'ibmwatson' ? 'IBM Watson' : provider.charAt(0).toUpperCase() + provider.slice(1)} API key?`
            )
        )
            return;

        try {
            if (provider === 'groq') {
                // @ts-ignore
                await window.electronAPI?.setGroqSttApiKey?.('');
                setSttGroqKey('');
                setHasStoredSttGroqKey(false);
            } else if (provider === 'openai') {
                // @ts-ignore
                await window.electronAPI?.setOpenAiSttApiKey?.('');
                setSttOpenaiKey('');
                setHasStoredSttOpenaiKey(false);
            } else if (provider === 'elevenlabs') {
                // @ts-ignore
                await window.electronAPI?.setElevenLabsApiKey?.('');
                setSttElevenLabsKey('');
                setHasStoredElevenLabsKey(false);
            } else if (provider === 'azure') {
                // @ts-ignore
                await window.electronAPI?.setAzureApiKey?.('');
                setSttAzureKey('');
                setHasStoredAzureKey(false);
            } else if (provider === 'ibmwatson') {
                // @ts-ignore
                await window.electronAPI?.setIbmWatsonApiKey?.('');
                setSttIbmKey('');
                setHasStoredIbmWatsonKey(false);
            } else if (provider === 'soniox') {
                // @ts-ignore
                await window.electronAPI?.setSonioxApiKey?.('');
                setSttSonioxKey('');
                setHasStoredSonioxKey(false);
            } else {
                // @ts-ignore
                await window.electronAPI?.setDeepgramApiKey?.('');
                setSttDeepgramKey('');
                setHasStoredDeepgramKey(false);
            }
        } catch (e) {
            console.error(`Failed to remove ${provider} STT key:`, e);
        }
    };

    const handleTestSttConnection = async () => {
        if (
            sttProvider === 'none' ||
            sttProvider === 'google' ||
            sttProvider === 'natively' ||
            sttProvider === 'whisper-local'
        )
            return;
        const keyMap: Record<string, string> = {
            groq: sttGroqKey,
            openai: sttOpenaiKey,
            deepgram: sttDeepgramKey,
            elevenlabs: sttElevenLabsKey,
            azure: sttAzureKey,
            ibmwatson: sttIbmKey,
            soniox: sttSonioxKey,
        };
        const hasStoredMap: Record<string, boolean> = {
            groq: hasStoredSttGroqKey,
            openai: hasStoredSttOpenaiKey,
            deepgram: hasStoredDeepgramKey,
            elevenlabs: hasStoredElevenLabsKey,
            azure: hasStoredAzureKey,
            ibmwatson: hasStoredIbmWatsonKey,
            soniox: hasStoredSonioxKey,
        };
        const keyToTest = keyMap[sttProvider] || '';
        if (!keyToTest.trim() && !hasStoredMap[sttProvider]) {
            setSttTestStatus('error');
            setSttTestError('Please enter an API key first');
            return;
        }

        setSttTestStatus('testing');
        setSttTestError('');
        try {
            // @ts-ignore
            const result = await window.electronAPI?.testSttConnection?.(
                sttProvider,
                keyToTest.trim(),
                sttProvider === 'azure' ? sttAzureRegion : undefined
            );
            if (result?.success) {
                setSttTestStatus('success');
                setTimeout(() => setSttTestStatus('idle'), 3000);
            } else {
                setSttTestStatus('error');
                setSttTestError(result?.error || 'Connection failed');
            }
        } catch (e: any) {
            setSttTestStatus('error');
            setSttTestError(e.message || 'Test failed');
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 animated fadeIn">
            {/* ── Speech Provider Section ── */}
            <div>
                <h3 className="text-lg font-bold text-text-primary mb-1">Speech Provider</h3>
                <p className="text-xs text-text-secondary mb-5">
                    Choose the engine that transcribes audio to text.
                </p>

                <div className="space-y-4">
                    <div className="bg-bg-card rounded-xl border border-border-subtle p-4 space-y-3">
                        <label className="text-xs font-medium text-text-secondary block">
                            Speech Provider
                        </label>
                        <div className="relative">
                            <ProviderSelect
                                value={sttProvider}
                                onChange={(val) => handleSttProviderChange(val as any)}
                                options={[
                                    ...(hasLiveLensKey
                                        ? [
                                              {
                                                  id: 'natively',
                                                  label: 'LiveLens API',
                                                  badge: 'Saved' as const,
                                                  recommended: true,
                                                  desc: 'Managed transcription via LiveLens backend',
                                                  color: 'blue',
                                                  icon: <Mic size={14} />,
                                              },
                                          ]
                                        : []),
                                    {
                                        id: 'google',
                                        label: 'Google Cloud',
                                        badge: googleServiceAccountPath ? 'Saved' : null,
                                        recommended: true,
                                        desc: 'gRPC streaming via Service Account',
                                        color: 'blue',
                                        icon: <Mic size={14} />,
                                    },
                                    {
                                        id: 'groq',
                                        label: 'Groq Whisper',
                                        badge: hasStoredSttGroqKey ? 'Saved' : null,
                                        recommended: true,
                                        desc: 'Ultra-fast REST transcription',
                                        color: 'orange',
                                        icon: <Mic size={14} />,
                                    },
                                    {
                                        id: 'openai',
                                        label: 'OpenAI Whisper',
                                        badge: hasStoredSttOpenaiKey ? 'Saved' : null,
                                        desc: 'OpenAI-compatible Whisper API',
                                        color: 'green',
                                        icon: <Mic size={14} />,
                                    },
                                    {
                                        id: 'deepgram',
                                        label: 'Deepgram Nova-3',
                                        badge: hasStoredDeepgramKey ? 'Saved' : null,
                                        recommended: true,
                                        desc: 'High-accuracy REST transcription',
                                        color: 'purple',
                                        icon: <Mic size={14} />,
                                    },
                                    {
                                        id: 'elevenlabs',
                                        label: 'ElevenLabs Scribe',
                                        badge: hasStoredElevenLabsKey ? 'Saved' : null,
                                        desc: 'Scribe v2 Realtime API',
                                        color: 'teal',
                                        icon: <Mic size={14} />,
                                    },
                                    {
                                        id: 'azure',
                                        label: 'Azure Speech',
                                        badge: hasStoredAzureKey ? 'Saved' : null,
                                        desc: 'Microsoft Cognitive Services STT',
                                        color: 'cyan',
                                        icon: <Mic size={14} />,
                                    },
                                    {
                                        id: 'ibmwatson',
                                        label: 'IBM Watson',
                                        badge: hasStoredIbmWatsonKey ? 'Saved' : null,
                                        desc: 'IBM Watson cloud STT service',
                                        color: 'indigo',
                                        icon: <Mic size={14} />,
                                    },
                                    {
                                        id: 'soniox',
                                        label: 'Soniox',
                                        badge: hasStoredSonioxKey ? 'Saved' : null,
                                        recommended: true,
                                        desc: '60+ languages, multilingual, domain context',
                                        color: 'cyan',
                                        icon: <Mic size={14} />,
                                    },
                                    {
                                        id: 'whisper-local',
                                        label: 'Whisper Local',
                                        badge: null,
                                        desc: 'On-device · no API key · offline',
                                        color: 'green',
                                        icon: <Mic size={14} />,
                                    },
                                ]}
                            />
                        </div>
                    </div>

                    {/* Groq Model Selector */}
                    {sttProvider === 'groq' && (
                        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
                            <label className="text-xs font-medium text-text-secondary mb-2.5 block">
                                Whisper Model
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    {
                                        id: 'whisper-large-v3-turbo',
                                        label: 'V3 Turbo',
                                        desc: 'Fastest',
                                    },
                                    {
                                        id: 'whisper-large-v3',
                                        label: 'V3',
                                        desc: 'Most Accurate',
                                    },
                                ].map((m) => (
                                    <button
                                        key={m.id}
                                        onClick={async () => {
                                            setGroqSttModel(m.id);
                                            try {
                                                // @ts-ignore
                                                await window.electronAPI?.setGroqSttModel?.(
                                                    m.id
                                                );
                                            } catch (e) {
                                                console.error('Failed to set Groq model:', e);
                                            }
                                        }}
                                        className={`rounded-lg px-3 py-2.5 text-left transition-all duration-200 ease-in-out active:scale-[0.98] ${
                                            groqSttModel === m.id
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'bg-bg-input hover:bg-bg-elevated text-text-primary'
                                        }`}
                                    >
                                        <span className="text-sm font-medium block">
                                            {m.label}
                                        </span>
                                        <span
                                            className={`text-[11px] transition-colors ${
                                                groqSttModel === m.id
                                                    ? 'text-white/70'
                                                    : 'text-text-tertiary'
                                            }`}
                                        >
                                            {m.desc}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Whisper Local Model Selector */}
                    {sttProvider === 'whisper-local' && (
                        <div className="bg-bg-card rounded-xl border border-border-subtle p-4 space-y-3">
                            <label className="text-xs font-medium text-text-secondary block">
                                Model Size
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {(
                                    [
                                        { id: 'tiny', label: 'Tiny', desc: '75 MB · fastest' },
                                        { id: 'base', label: 'Base', desc: '142 MB · fast' },
                                        {
                                            id: 'small',
                                            label: 'Small',
                                            desc: '466 MB · recommended',
                                        },
                                        {
                                            id: 'medium',
                                            label: 'Medium',
                                            desc: '1.5 GB · best accuracy',
                                        },
                                    ] as const
                                ).map((m) => (
                                    <button
                                        key={m.id}
                                        onClick={async () => {
                                            setWhisperModelSize(m.id);
                                            await window.electronAPI?.setWhisperModelSize?.(
                                                m.id
                                            );
                                            const check =
                                                await window.electronAPI?.checkWhisperModel?.(
                                                    m.id
                                                );
                                            setWhisperDownloaded(check?.downloaded ?? false);
                                        }}
                                        className={`rounded-lg px-3 py-2.5 text-left transition-all duration-200 ease-in-out active:scale-[0.98] ${whisperModelSize === m.id ? 'bg-accent-primary text-white shadow-md' : 'bg-bg-input hover:bg-bg-elevated text-text-primary'}`}
                                    >
                                        <span className="text-sm font-medium block">
                                            {m.label}
                                        </span>
                                        <span
                                            className={`text-[11px] transition-colors ${whisperModelSize === m.id ? 'text-white/70' : 'text-text-tertiary'}`}
                                        >
                                            {m.desc}
                                        </span>
                                    </button>
                                ))}
                            </div>

                            {/* Download button */}
                            <div className="pt-1">
                                {whisperDownload?.active ? (
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[11px] text-text-secondary">
                                            <span className="truncate max-w-[200px]">
                                                {whisperDownload.file || 'Downloading…'}
                                            </span>
                                            <span>{whisperDownload.progress}%</span>
                                        </div>
                                        <div className="w-full bg-bg-input rounded-full h-1.5">
                                            <div
                                                className="bg-accent-primary h-1.5 rounded-full transition-all"
                                                style={{
                                                    width: `${whisperDownload.progress}%`,
                                                }}
                                            />
                                        </div>
                                    </div>
                                ) : whisperDownloaded ? (
                                    <p className="text-[11px] text-accent-primary font-medium">
                                        ✓ Model ready
                                    </p>
                                ) : (
                                    <button
                                        onClick={async () => {
                                            setWhisperDownload({
                                                active: true,
                                                file: '',
                                                progress: 0,
                                            });
                                            const unsub =
                                                window.electronAPI?.onWhisperDownloadProgress?.(
                                                    (info) => {
                                                        if (info.done) {
                                                            setWhisperDownload(null);
                                                            setWhisperDownloaded(true);
                                                            unsub?.();
                                                        } else {
                                                            setWhisperDownload({
                                                                active: true,
                                                                file: info.file || '',
                                                                progress: info.progress || 0,
                                                            });
                                                        }
                                                    }
                                                );
                                            const result =
                                                await window.electronAPI?.downloadWhisperModel?.(
                                                    whisperModelSize
                                                );
                                            if (!result?.success) {
                                                setWhisperDownload(null);
                                                unsub?.();
                                            }
                                        }}
                                        className="w-full py-2 rounded-lg bg-accent-primary hover:bg-accent-secondary text-white text-xs font-medium transition-colors"
                                    >
                                        Download {whisperModelSize} model
                                    </button>
                                )}
                            </div>
                            <p className="text-[10px] text-text-tertiary">
                                Model files are stored in your app data folder. First
                                transcription loads the model (~5s for small).
                            </p>
                        </div>
                    )}

                    {/* Google Cloud Service Account */}
                    {sttProvider === 'google' && (
                        <div className="bg-bg-card rounded-xl border border-border-subtle p-4">
                            <label className="text-xs font-medium text-text-secondary mb-2 block">
                                Service Account JSON
                            </label>
                            <div className="flex gap-2">
                                <div className="flex-1 bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-xs text-text-secondary font-mono truncate">
                                    {googleServiceAccountPath ? (
                                        <span className="text-text-primary">
                                            {googleServiceAccountPath.split('/').pop()}
                                        </span>
                                    ) : (
                                        <span className="text-text-tertiary italic">
                                            No file selected
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={async () => {
                                        // @ts-ignore
                                        const result =
                                            await window.electronAPI?.selectServiceAccount?.();
                                        if (result?.success && result.path) {
                                            setGoogleServiceAccountPath(result.path);
                                        }
                                    }}
                                    className="px-3 py-2 bg-bg-input hover:bg-bg-elevated border border-border-subtle rounded-lg text-xs font-medium text-text-primary transition-colors flex items-center gap-2"
                                >
                                    <Upload size={14} /> Select File
                                </button>
                            </div>
                            <p className="text-[10px] text-text-tertiary mt-2">
                                Required for Google Cloud Speech-to-Text.
                            </p>
                        </div>
                    )}

                    {/* API Key Input (non-Google providers) */}
                    {sttProvider !== 'google' && sttProvider !== 'whisper-local' && (
                        <div className="bg-bg-card rounded-xl border border-border-subtle p-4 space-y-3">
                            <label className="text-xs font-medium text-text-secondary block">
                                {sttProvider === 'groq'
                                    ? 'Groq'
                                    : sttProvider === 'openai'
                                      ? 'OpenAI STT'
                                      : sttProvider === 'elevenlabs'
                                        ? 'ElevenLabs'
                                        : sttProvider === 'azure'
                                          ? 'Azure'
                                          : sttProvider === 'ibmwatson'
                                            ? 'IBM Watson'
                                            : sttProvider === 'soniox'
                                              ? 'Soniox'
                                              : 'Deepgram'}{' '}
                                API Key
                            </label>
                            {sttProvider === 'openai' && (
                                <p className="text-[10px] text-text-tertiary mb-1.5">
                                    This key is separate from your main AI Provider key.
                                </p>
                            )}
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    value={
                                        sttProvider === 'groq'
                                            ? sttGroqKey
                                            : sttProvider === 'openai'
                                              ? sttOpenaiKey
                                              : sttProvider === 'elevenlabs'
                                                ? sttElevenLabsKey
                                                : sttProvider === 'azure'
                                                  ? sttAzureKey
                                                  : sttProvider === 'ibmwatson'
                                                    ? sttIbmKey
                                                    : sttProvider === 'soniox'
                                                      ? sttSonioxKey
                                                      : sttDeepgramKey
                                    }
                                    onChange={(e) => {
                                        if (sttProvider === 'groq')
                                            setSttGroqKey(e.target.value);
                                        else if (sttProvider === 'openai')
                                            setSttOpenaiKey(e.target.value);
                                        else if (sttProvider === 'elevenlabs')
                                            setSttElevenLabsKey(e.target.value);
                                        else if (sttProvider === 'azure')
                                            setSttAzureKey(e.target.value);
                                        else if (sttProvider === 'ibmwatson')
                                            setSttIbmKey(e.target.value);
                                        else if (sttProvider === 'soniox')
                                            setSttSonioxKey(e.target.value);
                                        else setSttDeepgramKey(e.target.value);
                                    }}
                                    placeholder={
                                        sttProvider === 'groq'
                                            ? hasStoredSttGroqKey
                                                ? '••••••••••••'
                                                : 'Enter Groq API key'
                                            : sttProvider === 'openai'
                                              ? hasStoredSttOpenaiKey
                                                  ? '••••••••••••'
                                                  : 'Enter OpenAI STT API key'
                                              : sttProvider === 'elevenlabs'
                                                ? hasStoredElevenLabsKey
                                                    ? '••••••••••••'
                                                    : 'Enter ElevenLabs API key'
                                                : sttProvider === 'azure'
                                                  ? hasStoredAzureKey
                                                      ? '••••••••••••'
                                                      : 'Enter Azure API key'
                                                  : sttProvider === 'ibmwatson'
                                                    ? hasStoredIbmWatsonKey
                                                        ? '••••••••••••'
                                                        : 'Enter IBM Watson API key'
                                                    : sttProvider === 'soniox'
                                                      ? hasStoredSonioxKey
                                                          ? '••••••••••••'
                                                          : 'Enter Soniox API key'
                                                      : hasStoredDeepgramKey
                                                        ? '••••••••••••'
                                                        : 'Enter Deepgram API key'
                                    }
                                    className="flex-1 bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary transition-colors"
                                />
                                <button
                                    onClick={() => {
                                        const keyMap: Record<string, string> = {
                                            groq: sttGroqKey,
                                            openai: sttOpenaiKey,
                                            deepgram: sttDeepgramKey,
                                            elevenlabs: sttElevenLabsKey,
                                            azure: sttAzureKey,
                                            ibmwatson: sttIbmKey,
                                        };
                                        handleSttKeySubmit(
                                            sttProvider as any,
                                            keyMap[sttProvider] || ''
                                        );
                                    }}
                                    disabled={
                                        sttSaving ||
                                        !(() => {
                                            const keyMap: Record<string, string> = {
                                                groq: sttGroqKey,
                                                openai: sttOpenaiKey,
                                                deepgram: sttDeepgramKey,
                                                elevenlabs: sttElevenLabsKey,
                                                azure: sttAzureKey,
                                                ibmwatson: sttIbmKey,
                                                soniox: sttSonioxKey,
                                            };
                                            return (keyMap[sttProvider] || '').trim();
                                        })()
                                    }
                                    className={`px-5 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                                        sttSaved
                                            ? 'bg-green-500/20 text-green-400'
                                            : 'bg-bg-input hover:bg-bg-input/80 border border-border-subtle text-text-primary disabled:opacity-50'
                                    }`}
                                >
                                    {sttSaving ? 'Saving...' : sttSaved ? 'Saved!' : 'Save'}
                                </button>
                                {(() => {
                                    const hasKeyMap: Record<string, boolean> = {
                                        groq: hasStoredSttGroqKey,
                                        openai: hasStoredSttOpenaiKey,
                                        deepgram: hasStoredDeepgramKey,
                                        elevenlabs: hasStoredElevenLabsKey,
                                        azure: hasStoredAzureKey,
                                        ibmwatson: hasStoredIbmWatsonKey,
                                        soniox: hasStoredSonioxKey,
                                    };
                                    return hasKeyMap[sttProvider] ? (
                                        <button
                                            onClick={() =>
                                                handleRemoveSttKey(sttProvider as any)
                                            }
                                            className="px-2.5 py-2.5 rounded-lg text-xs font-medium text-text-tertiary hover:text-red-500 hover:bg-red-500/10 transition-all"
                                            title="Remove API Key"
                                        >
                                            <Trash2 size={16} strokeWidth={1.5} />
                                        </button>
                                    ) : null;
                                })()}
                            </div>

                            {/* Azure Region Input */}
                            {sttProvider === 'azure' && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-text-secondary block">
                                        Region
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={sttAzureRegion}
                                            onChange={(e) => setSttAzureRegion(e.target.value)}
                                            placeholder="e.g. eastus"
                                            className="flex-1 bg-bg-input border border-border-subtle rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:outline-none focus:border-accent-primary transition-colors"
                                        />
                                        <button
                                            onClick={async () => {
                                                if (!sttAzureRegion.trim()) return;
                                                // @ts-ignore
                                                await window.electronAPI?.setAzureRegion?.(
                                                    sttAzureRegion.trim()
                                                );
                                                setSttSaved(true);
                                                setTimeout(() => setSttSaved(false), 2000);
                                            }}
                                            disabled={!sttAzureRegion.trim()}
                                            className="px-5 py-2.5 rounded-lg text-xs font-medium bg-bg-input hover:bg-bg-input/80 border border-border-subtle text-text-primary disabled:opacity-50 transition-colors"
                                        >
                                            Save
                                        </button>
                                    </div>
                                    <p className="text-[10px] text-text-tertiary">
                                        e.g. eastus, westeurope, westus2
                                    </p>
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handleTestSttConnection}
                                    disabled={sttTestStatus === 'testing'}
                                    className="text-xs bg-bg-input hover:bg-bg-elevated text-text-primary px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 disabled:opacity-50"
                                >
                                    {sttTestStatus === 'testing' ? (
                                        <>
                                            <RefreshCw size={12} className="animate-spin" />{' '}
                                            Testing...
                                        </>
                                    ) : sttTestStatus === 'success' ? (
                                        <>
                                            <Check size={12} className="text-green-500" />{' '}
                                            Connected
                                        </>
                                    ) : (
                                        <>Test Connection</>
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        const urls: Record<string, string> = {
                                            groq: 'https://console.groq.com/keys',
                                            openai: 'https://platform.openai.com/api-keys',
                                            deepgram: 'https://console.deepgram.com',
                                            elevenlabs:
                                                'https://elevenlabs.io/app/settings/api-keys',
                                            azure: 'https://portal.azure.com/#create/Microsoft.CognitiveServicesSpeech',
                                            ibmwatson:
                                                'https://cloud.ibm.com/catalog/services/speech-to-text',
                                        };
                                        if (urls[sttProvider]) {
                                            // @ts-ignore
                                            window.electronAPI?.openExternal(urls[sttProvider]);
                                        }
                                    }}
                                    className="text-xs text-text-tertiary hover:text-text-primary flex items-center gap-1 transition-colors ml-1"
                                    title="Get API Key"
                                >
                                    <ExternalLink size={12} />
                                </button>
                                {sttTestStatus === 'error' && (
                                    <span className="text-xs text-red-400">{sttTestError}</span>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Recognition Language Family */}
                    <CustomSelect
                        label="Language"
                        icon={<Globe size={14} />}
                        value={selectedSttGroup}
                        options={languageGroups.map((g) => ({
                            deviceId: g,
                            label: g,
                            kind: 'audioinput' as MediaDeviceKind,
                            groupId: '',
                            toJSON: () => ({}),
                        }))}
                        onChange={handleGroupChange}
                        placeholder="Select Language"
                    />

                    {/* Variant/Accent Selector (Conditional) */}
                    {currentGroupVariants.length > 1 && (
                        <div className="mt-3 animated fadeIn">
                            <CustomSelect
                                label="Accent / Region"
                                icon={<MapPin size={14} />}
                                value={recognitionLanguage}
                                options={currentGroupVariants}
                                onChange={handleLanguageChange}
                                placeholder="Select Region"
                            />
                        </div>
                    )}

                    <div className="flex gap-2 items-center mt-2 px-1">
                        <Info size={14} className="text-text-secondary shrink-0" />
                        <p className="text-xs text-text-secondary">
                            {recognitionLanguage === 'auto'
                                ? autoDetectedLanguage
                                    ? (() => {
                                          const label = Object.values(availableLanguages).find(
                                              (l: any) =>
                                                  l.bcp47 === autoDetectedLanguage ||
                                                  l.iso639 === autoDetectedLanguage
                                          )?.label as string | undefined;
                                          return `Auto mode — detected: ${label ?? autoDetectedLanguage}`;
                                      })()
                                    : 'Auto mode — language will be detected from the first few seconds of audio.'
                                : 'Select the primary language being spoken in the meeting.'}
                        </p>
                    </div>
                </div>
            </div>

            <div className="h-px bg-border-subtle" />

            {/* ── Audio Configuration Section ── */}
            <div>
                <h3 className="text-lg font-bold text-text-primary mb-1">
                    Audio Configuration
                </h3>
                <p className="text-xs text-text-secondary mb-5">
                    Manage input and output devices.
                </p>

                <div className="space-y-4">
                    <CustomSelect
                        label="Input Device"
                        icon={<Mic size={16} />}
                        value={selectedInput}
                        options={inputDevices}
                        onChange={(id) => {
                            setSelectedInput(id);
                            localStorage.setItem('preferredInputDeviceId', id);
                        }}
                        placeholder="Default Microphone"
                    />

                    <div>
                        <div className="flex justify-between text-xs text-text-secondary mb-2 px-1">
                            <span>Input Level</span>
                        </div>
                        <div className="h-1.5 bg-bg-input rounded-full overflow-hidden">
                            <div
                                className="h-full bg-green-500 transition-all duration-100 ease-out"
                                style={{ width: `${micLevel}%` }}
                            />
                        </div>
                    </div>

                    <div className="h-px bg-border-subtle my-2" />

                    <CustomSelect
                        label="Output Device"
                        icon={<Speaker size={16} />}
                        value={selectedOutput}
                        options={outputDevices}
                        onChange={(id) => {
                            setSelectedOutput(id);
                            localStorage.setItem('preferredOutputDeviceId', id);
                        }}
                        placeholder="Default Speakers"
                    />

                    <div className="flex justify-end">
                        <button
                            onClick={async () => {
                                try {
                                    const AudioContext =
                                        window.AudioContext ||
                                        (window as any).webkitAudioContext;
                                    if (!AudioContext) {
                                        console.error('Web Audio API not supported');
                                        return;
                                    }

                                    const ctx = new AudioContext();

                                    if (ctx.state === 'suspended') {
                                        await ctx.resume();
                                    }

                                    const oscillator = ctx.createOscillator();
                                    const gainNode = ctx.createGain();

                                    oscillator.connect(gainNode);
                                    gainNode.connect(ctx.destination);

                                    oscillator.type = 'sine';
                                    oscillator.frequency.setValueAtTime(
                                        523.25,
                                        ctx.currentTime
                                    );
                                    gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
                                    gainNode.gain.exponentialRampToValueAtTime(
                                        0.01,
                                        ctx.currentTime + 1.0
                                    );

                                    if (selectedOutput && (ctx as any).setSinkId) {
                                        try {
                                            await (ctx as any).setSinkId(selectedOutput);
                                        } catch (e) {
                                            console.warn(
                                                'Error setting sink for AudioContext',
                                                e
                                            );
                                        }
                                    }

                                    oscillator.start();
                                    oscillator.stop(ctx.currentTime + 1.0);
                                } catch (e) {
                                    console.error('Error playing test sound', e);
                                }
                            }}
                            className="text-xs bg-bg-input hover:bg-bg-elevated text-text-primary px-3 py-1.5 rounded-md transition-colors flex items-center gap-2"
                        >
                            <Speaker size={12} /> Test Sound
                        </button>
                    </div>

                    <div className="h-px bg-border-subtle my-2" />

                    {/* SCK Backend Toggle */}
                    <div className="bg-amber-500/5 rounded-xl border border-amber-500/20 p-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-start gap-3">
                                <div className="mt-0.5 p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
                                    <FlaskConical size={18} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h3 className="text-sm font-bold text-text-primary">
                                            SCK Backend
                                        </h3>
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#d97757]/15 text-[#e8a882] uppercase tracking-wide">
                                            Alternative
                                        </span>
                                    </div>
                                    <p className="text-xs text-text-secondary leading-relaxed max-w-[300px]">
                                        Use the ScreenCaptureKit backend. An optimized
                                        alternative to CoreAudio if you experience any capture
                                        issues.
                                    </p>
                                </div>
                            </div>
                            <div
                                onClick={() => {
                                    const newState = !useExperimentalSck;
                                    setUseExperimentalSck(newState);
                                    window.localStorage.setItem(
                                        'useExperimentalSckBackend',
                                        newState ? 'true' : 'false'
                                    );
                                }}
                                className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${useExperimentalSck ? 'bg-amber-500' : 'bg-bg-toggle-switch border border-border-muted'}`}
                            >
                                <div
                                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${useExperimentalSck ? 'translate-x-5' : 'translate-x-0'}`}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
