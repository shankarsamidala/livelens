import { EventEmitter } from 'events';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export type WhisperModelSize = 'tiny' | 'base' | 'small' | 'medium';

export const WHISPER_MODEL_SIZES: { id: WhisperModelSize; label: string; sizeMB: number }[] = [
    { id: 'tiny',   label: 'Tiny (~75 MB)',    sizeMB: 75  },
    { id: 'base',   label: 'Base (~142 MB)',   sizeMB: 142 },
    { id: 'small',  label: 'Small (~466 MB)',  sizeMB: 466 },
    { id: 'medium', label: 'Medium (~1.5 GB)', sizeMB: 1500 },
];

// Shared pipeline cache — one loaded model persists for the app lifetime
const pipelineCache = new Map<string, any>();

export class WhisperLocalSTT extends EventEmitter {
    private pipeline: any = null;
    private modelSize: WhisperModelSize;
    private language: string = 'english';
    private sampleRate: number = 16000;
    private audioChunks: Buffer[] = [];
    private isRunning: boolean = false;
    private silenceTimer: NodeJS.Timeout | null = null;
    private isProcessing: boolean = false;

    constructor(modelSize: WhisperModelSize = 'small') {
        super();
        this.modelSize = modelSize;
    }

    async start(): Promise<void> {
        this.isRunning = true;
        this.audioChunks = [];
        if (!this.pipeline) {
            await this.loadModel();
        }
    }

    stop(): void {
        this.isRunning = false;
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        this.audioChunks = [];
        this.isProcessing = false;
    }

    write(chunk: Buffer): void {
        if (!this.isRunning) return;
        this.audioChunks.push(chunk);
        // Fallback: process after 2s of silence if speech_ended doesn't fire
        if (this.silenceTimer) clearTimeout(this.silenceTimer);
        this.silenceTimer = setTimeout(() => this.processBuffer(), 2000);
    }

    notifySpeechEnded(): void {
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        // Run without awaiting — caller doesn't expect a promise here
        this.processBuffer().catch(err => console.error('[WhisperLocalSTT] processBuffer error:', err));
    }

    private static getCacheDir(): string {
        return path.join(app.getPath('userData'), 'whisper-models');
    }

    private async loadModel(progressCallback?: (p: any) => void): Promise<void> {
        const modelId = `Xenova/whisper-${this.modelSize}`;
        if (pipelineCache.has(modelId)) {
            this.pipeline = pipelineCache.get(modelId);
            return;
        }
        console.log(`[WhisperLocalSTT] Loading model ${modelId}...`);

        // Dynamic import required: @xenova/transformers is ESM
        const { pipeline, env } = await import('@xenova/transformers');
        env.cacheDir = WhisperLocalSTT.getCacheDir();

        this.pipeline = await pipeline('automatic-speech-recognition', modelId, {
            quantized: true,
            progress_callback: progressCallback ?? ((p: any) => {
                if (p.status === 'downloading') {
                    const pct = p.total ? Math.round((p.loaded / p.total) * 100) : 0;
                    console.log(`[WhisperLocalSTT] ${p.file}: ${pct}%`);
                }
            }),
        });

        pipelineCache.set(modelId, this.pipeline);
        console.log(`[WhisperLocalSTT] Model ready: ${modelId}`);
    }

    private async processBuffer(): Promise<void> {
        if (this.isProcessing || this.audioChunks.length === 0 || !this.pipeline) return;

        const chunks = [...this.audioChunks];
        this.audioChunks = [];
        this.isProcessing = true;

        try {
            const combined = Buffer.concat(chunks);
            // Convert Int16 LE PCM → Float32 normalized [-1, 1]
            const samples = Math.floor(combined.length / 2);
            const float32 = new Float32Array(samples);
            for (let i = 0; i < samples; i++) {
                float32[i] = combined.readInt16LE(i * 2) / 32768.0;
            }

            // Normalise language string: 'english-us' → 'english', 'auto' → null (auto-detect)
            const lang = this.language === 'auto' ? null : this.language.split('-')[0];

            const result = await this.pipeline(float32, {
                sampling_rate: this.sampleRate,
                language: lang,
                task: 'transcribe',
                chunk_length_s: 30,
                stride_length_s: 5,
            });

            const text = (result?.text ?? '').trim();
            if (text) {
                this.emit('transcript', { text, isFinal: true, confidence: 1.0 });
            }
        } catch (err) {
            console.error('[WhisperLocalSTT] Transcription error:', err);
            this.emit('error', err);
        } finally {
            this.isProcessing = false;
        }
    }

    setSampleRate(rate: number): void { this.sampleRate = rate; }
    setRecognitionLanguage(lang: string): void { this.language = lang; }
    setAudioChannelCount(_count: number): void {}
    setCredentials(_filePath: string): void {}

    // ── Static helpers used by IPC handler ────────────────────────────────────

    /**
     * Returns true if all required model files are present on disk.
     * Checks for the snapshots folder which @xenova/transformers populates after a complete download.
     */
    static isModelDownloaded(modelSize: WhisperModelSize): boolean {
        const cacheDir = WhisperLocalSTT.getCacheDir();
        // HuggingFace hub cache layout: models--{org}--{model}/snapshots/<hash>/
        const modelDir = path.join(cacheDir, `models--Xenova--whisper-${modelSize}`, 'snapshots');
        try {
            const snapshotDirs = fs.readdirSync(modelDir);
            // At least one snapshot dir must exist and contain the encoder weights
            return snapshotDirs.some(snapshot => {
                const snapshotPath = path.join(modelDir, snapshot);
                const files = fs.readdirSync(snapshotPath);
                return files.some(f => f.includes('encoder') || f.includes('config.json'));
            });
        } catch {
            return false;
        }
    }

    static async downloadModel(
        modelSize: WhisperModelSize,
        onProgress: (info: { file: string; progress: number; loaded: number; total: number }) => void
    ): Promise<void> {
        const { pipeline, env } = await import('@xenova/transformers');
        env.cacheDir = WhisperLocalSTT.getCacheDir();

        await pipeline('automatic-speech-recognition', `Xenova/whisper-${modelSize}`, {
            quantized: true,
            progress_callback: (p: any) => {
                if (p.status === 'downloading' && p.total) {
                    onProgress({
                        file: p.file,
                        progress: Math.round((p.loaded / p.total) * 100),
                        loaded: p.loaded,
                        total: p.total,
                    });
                }
            },
        });
    }
}
