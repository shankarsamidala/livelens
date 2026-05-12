/**
 * Named types for all IPC return values.
 * Import these in electron.d.ts and anywhere that consumes IPC results,
 * so we don't have sprawling inline object types scattered across the codebase.
 */

// ── Shared ────────────────────────────────────────────────────────────────────

export interface IpcOk {
    success: boolean;
    error?: string;
}

// ── Audio / Devices ───────────────────────────────────────────────────────────

export interface AudioDevice {
    id: string;
    name: string;
}

// ── Meetings ──────────────────────────────────────────────────────────────────

export interface MeetingSummary {
    id: string;
    title: string;
    date: string;
    duration: string;
    summary: string;
}

export interface MeetingTranscriptEntry {
    speaker: string;
    text: string;
    timestamp: number;
}

export interface MeetingUsageEntry {
    type: 'assist' | 'followup' | 'chat' | 'followup_questions';
    timestamp: number;
    question?: string;
    answer?: string;
    items?: string[];
}

export interface MeetingDetail extends MeetingSummary {
    detailedSummary?: {
        actionItems: string[];
        keyPoints: string[];
        actionItemsTitle?: string;
        keyPointsTitle?: string;
    };
    transcript?: MeetingTranscriptEntry[];
    usage?: MeetingUsageEntry[];
}

// ── STT ───────────────────────────────────────────────────────────────────────

export type SttProviderName =
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
    | 'whisper-local';

export type WhisperModelSize = 'tiny' | 'base' | 'small' | 'medium';

export interface SttStatusData {
    state: 'connected' | 'reconnecting' | 'failed';
    provider: string;
    error?: string;
    channel: 'user' | 'interviewer';
    reconnectAttempts?: number;
}

// ── Credentials ───────────────────────────────────────────────────────────────

export interface StoredCredentials {
    hasLiveLensKey?: boolean;
    hasGeminiKey: boolean;
    hasGroqKey: boolean;
    hasOpenaiKey: boolean;
    hasClaudeKey: boolean;
    googleServiceAccountPath: string | null;
    sttProvider: SttProviderName;
    hasSttGroqKey: boolean;
    hasSttOpenaiKey: boolean;
    hasDeepgramKey: boolean;
    hasElevenLabsKey: boolean;
    hasAzureKey: boolean;
    azureRegion: string;
    hasIbmWatsonKey: boolean;
    ibmWatsonRegion: string;
    groqSttModel?: string;
    hasSonioxKey?: boolean;
    hasTavilyKey?: boolean;
    geminiPreferredModel?: string;
    groqPreferredModel?: string;
    openaiPreferredModel?: string;
    claudePreferredModel?: string;
    /** @deprecated Raw keys — access via hasStt*Key booleans instead */
    sttGroqKey?: string;
    sttOpenaiKey?: string;
    sttDeepgramKey?: string;
    sttElevenLabsKey?: string;
    sttAzureKey?: string;
    sttIbmKey?: string;
    sttSonioxKey?: string;
}

// ── LLM Config ────────────────────────────────────────────────────────────────

export interface LlmConfig {
    provider: 'ollama' | 'gemini';
    model: string;
    isOllama: boolean;
}

// ── License ───────────────────────────────────────────────────────────────────

export interface LicenseDetails {
    isPremium: boolean;
    plan?: string;
    provider?: string;
}

// ── Keybinds ──────────────────────────────────────────────────────────────────

export interface KeybindEntry {
    id: string;
    label: string;
    accelerator: string;
    isGlobal: boolean;
    defaultAccelerator: string;
}

// ── Permissions ───────────────────────────────────────────────────────────────

export type PermissionState = 'granted' | 'denied' | 'not-determined' | 'restricted';

export interface PermissionsResult {
    microphone: PermissionState;
    screen: PermissionState;
    platform: string;
}

// ── Theme ─────────────────────────────────────────────────────────────────────

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeState {
    mode: ThemeMode;
    resolved: 'light' | 'dark';
}

// ── Calendar ──────────────────────────────────────────────────────────────────

export interface CalendarEvent {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    link?: string;
    source: 'google';
}

// ── Modes ─────────────────────────────────────────────────────────────────────

export interface ModeRecord {
    id: string;
    name: string;
    templateType: string;
    customContext: string;
    isActive: boolean;
    createdAt: string;
    referenceFileCount?: number;
}

export interface ModeReferenceFile {
    id: string;
    modeId: string;
    fileName: string;
    content: string;
    createdAt: string;
}

export interface ModeNoteSection {
    id: string;
    modeId: string;
    title: string;
    description: string;
    sortOrder: number;
}

// ── Intelligence ──────────────────────────────────────────────────────────────

export interface IntelligenceContext {
    context: string;
    lastAssistantMessage: string | null;
    activeMode: string;
}

// ── RAG ───────────────────────────────────────────────────────────────────────

export interface RagQueryResult {
    success?: boolean;
    fallback?: boolean;
    error?: string;
}

export interface RagQueueStatus {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
}

// ── Profile ───────────────────────────────────────────────────────────────────

export interface ProfileStatus {
    hasProfile: boolean;
    profileMode: boolean;
    name?: string;
    role?: string;
    totalExperienceYears?: number;
}

// ── Trial ─────────────────────────────────────────────────────────────────────

export interface TrialUsage {
    ai: number;
    stt_seconds: number;
    search: number;
}

export interface TrialStatus {
    ok: boolean;
    expired?: boolean;
    remaining_ms?: number;
    started_at?: string;
    expires_at?: string;
    converted_to?: string | null;
    usage?: TrialUsage;
    limits?: object;
    error?: string;
    /** startTrial only */
    trial_token?: string;
    already_used?: boolean;
    status?: number;
}

// ── Donation ──────────────────────────────────────────────────────────────────

export interface DonationStatus {
    shouldShow: boolean;
    hasDonated: boolean;
    lifetimeShows: number;
}
