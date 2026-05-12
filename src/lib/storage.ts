/**
 * Centralised localStorage abstraction.
 * All key strings live here — no magic strings scattered across components.
 */

export const STORAGE_KEYS = {
    overlayOpacity: 'natively_overlay_opacity',
    undetectable: 'natively_undetectable',
    hasLaunched: 'natively_has_launched',
    permsShown: 'natively_perms_shown_v1',
    ollamaSetupDone: 'natively_ollama_setup_done',
    lastMeetingStart: 'natively_last_meeting_start',
    trialClaimed: 'natively_trial_claimed',
    groqFastText: 'natively_groq_fast_text',
    interviewerTranscript: 'natively_interviewer_transcript',
    autoScroll: 'liveLens_auto_scroll',
    preferredInputDeviceId: 'preferredInputDeviceId',
    preferredOutputDeviceId: 'preferredOutputDeviceId',
    useExperimentalSck: 'useExperimentalSckBackend',
    useLegacyAudio: 'useLegacyAudioBackend',
    cachedModels: 'cached-models',
    cachedCurrentModel: 'cached-current-model',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export const storage = {
    get(key: StorageKey): string | null {
        return localStorage.getItem(key);
    },
    set(key: StorageKey, value: string): void {
        localStorage.setItem(key, value);
    },
    remove(key: StorageKey): void {
        localStorage.removeItem(key);
    },
    getBool(key: StorageKey, defaultValue = false): boolean {
        const v = localStorage.getItem(key);
        return v === null ? defaultValue : v === 'true';
    },
    getNumber(key: StorageKey, defaultValue: number): number {
        const v = localStorage.getItem(key);
        if (!v) return defaultValue;
        const n = parseFloat(v);
        return Number.isFinite(n) ? n : defaultValue;
    },
};
