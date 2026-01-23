import type { AudioProvider, Voice, WordBoundaryEvent } from "./types";
import { audioCache } from "./AudioCache";

export class ElevenLabsProvider implements AudioProvider {
    private apiKey: string;
    private isPlaying: boolean = false;
    private volume: number = 1;

    // MediaSource State
    private mediaSource: MediaSource | null = null;
    private sourceBuffer: SourceBuffer | null = null;
    private audio: HTMLAudioElement | null = null;

    // Streaming State
    private allChunks: string[] = []; // Master list of all chunks
    private isFetching: boolean = false;
    private abortController: AbortController | null = null;

    // Playback State
    private estimatedDuration: number = 0;
    private fullTextLength: number = 0;
    private currentVoiceId: string = "";

    private fullText: string = "";
    private currentSpeed: number = 1;
    private onBoundary?: (e: WordBoundaryEvent) => void;
    private monitorInterval: NodeJS.Timeout | null = null;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    hasKey(key: string): boolean {
        return this.apiKey === key;
    }

    async getVoices(): Promise<Voice[]> {
        if (!this.apiKey) return [];
        try {
            const response = await fetch("https://api.elevenlabs.io/v1/voices", {
                headers: { "xi-api-key": this.apiKey }
            });
            if (!response.ok) throw new Error(`Failed to fetch voices: ${response.statusText}`);
            const data = await response.json();
            return (data.voices || []).map((v: any) => ({
                id: v.voice_id,
                name: v.name,
                provider: 'elevenlabs',
                nativeVoiceObj: v
            }));
        } catch (error) {
            console.error("Error fetching voices:", error);
            return [];
        }
    }

    async play(text: string, voiceId: string, speed: number, onBoundary?: (e: WordBoundaryEvent) => void): Promise<void> {
        this.stop();
        await new Promise(r => setTimeout(r, 50));

        this.isPlaying = true;
        this.fullText = text;
        this.currentVoiceId = voiceId;
        this.fullTextLength = text.length;
        this.onBoundary = onBoundary;
        this.abortController = new AbortController();

        this.estimatedDuration = text.length / 15;

        this.mediaSource = new MediaSource();
        this.audio = new Audio();
        this.audio.src = URL.createObjectURL(this.mediaSource);
        this.audio.volume = this.volume;
        this.audio.playbackRate = speed;
        this.currentSpeed = speed;

        this.mediaSource.addEventListener('sourceopen', () => {
            this.startStreaming();
        });

        this.audio.addEventListener('canplay', () => {
            if (this.isPlaying && this.audio?.paused) {
                this.audio.play().catch(e => console.error("Play failed", e));
            }
        });

        this.startMonitor();
    }

    private startMonitor() {
        if (this.monitorInterval) clearInterval(this.monitorInterval);
        this.monitorInterval = setInterval(() => {
            if (!this.isPlaying || !this.audio || this.audio.paused) return;

            // Estimate character position based on time
            // Base rate: 15 chars/sec at 1x, scales with playback speed
            const currentTime = this.audio.currentTime;
            const charsPerSec = 15 * this.currentSpeed;
            const estimatedCharIndex = Math.floor(currentTime * charsPerSec);

            if (this.onBoundary) {
                this.onBoundary({
                    name: 'word',
                    charIndex: estimatedCharIndex,
                    charLength: 1 // We don't verify length, UI handles snapping
                });
            }
        }, 100);
    }

    private async startStreaming() {
        if (!this.mediaSource || this.mediaSource.readyState !== 'open') return;
        try {
            this.sourceBuffer = this.mediaSource.addSourceBuffer('audio/mpeg');
        } catch (e) {
            console.error(e);
            return;
        }

        this.allChunks = this.splitTextSmartly(this.fullText, 1000);
        await this.processQueue(0);
    }

    private async processQueue(startIndex: number) {
        let globalCharOffset = 0;
        for (let i = 0; i < startIndex; i++) {
            globalCharOffset += this.allChunks[i].length + 1;
        }

        const startTime = globalCharOffset / 15;

        if (this.sourceBuffer) {
            // Check if we can clean buffer?
            // Safer to just set timestampOffset. 
            // If browser has buffered 0-10s, and we set offset to 20s, it works.
            this.sourceBuffer.timestampOffset = startTime;
        }

        if (this.audio) {
            this.audio.currentTime = startTime;
        }

        for (let i = startIndex; i < this.allChunks.length; i++) {
            if (!this.isPlaying || this.abortController?.signal.aborted) break;

            const chunk = this.allChunks[i];

            try {
                const arrayBuffer = await this.fetchAudioChunk(chunk, this.currentVoiceId);
                if (!arrayBuffer) continue;

                await this.appendToBuffer(arrayBuffer);
                globalCharOffset += chunk.length + 1;
            } catch (e) {
                console.error("Stream Loop Error", e);
            }
        }

        if (this.mediaSource && this.mediaSource.readyState === 'open') {
            this.mediaSource.endOfStream();
        }
    }

    seek(time: number): void {
        if (!this.audio || !this.mediaSource) return;

        const safeTime = Math.max(0, Math.min(time, this.estimatedDuration));
        const estimatedCharIndex = Math.floor(safeTime * 15);

        let cumulativeChars = 0;
        let targetChunkIndex = 0;

        for (let i = 0; i < this.allChunks.length; i++) {
            cumulativeChars += this.allChunks[i].length + 1;
            if (cumulativeChars > estimatedCharIndex) {
                targetChunkIndex = i;
                break;
            }
        }

        console.log("Seeking to Chunk:", targetChunkIndex, "Time:", safeTime);

        if (this.abortController) {
            this.abortController.abort();
            this.abortController = new AbortController();
        }

        if (this.sourceBuffer && !this.sourceBuffer.updating) {
            try {
                this.sourceBuffer.abort();
                // We attempt to remove existing buffer to safely reset playback state
                // This prevents "restart from beginning" glitches if timestamps overlap weirdly.
                // Note: remove is async, but we can usually fire-and-forget before new append/offset updates?
                // Actually, best practice is to wait. But `processQueue` sets `timestampOffset` immediately.
                // Let's rely on timestampOffset logic which is standard for "seeking to new segment".

                // If we are truly restarting from scratch, removing is cleaner.
                // Let's TRY to remove 0-infinity
                this.sourceBuffer.remove(0, this.mediaSource.duration);
            } catch (e) { }
        }

        // Wait small tick for cleanup?
        setTimeout(() => {
            this.processQueue(targetChunkIndex);
        }, 50);
    }

    private async appendToBuffer(buffer: ArrayBuffer): Promise<void> {
        return new Promise((resolve) => {
            if (!this.sourceBuffer) { resolve(); return; }

            if (this.sourceBuffer.updating) {
                this.sourceBuffer.addEventListener('updateend', () => {
                    this.sourceBuffer?.appendBuffer(buffer);
                }, { once: true });
            } else {
                this.sourceBuffer.appendBuffer(buffer);
            }

            const onUpdateEnd = () => {
                this.sourceBuffer?.removeEventListener('updateend', onUpdateEnd);
                resolve();
            }
            this.sourceBuffer.addEventListener('updateend', onUpdateEnd);
        });
    }

    private async fetchAudioChunk(text: string, voiceId: string): Promise<ArrayBuffer | null> {
        // Check cache first
        const cached = await audioCache.get(text, voiceId);
        if (cached) {
            console.log('[ElevenLabs] Cache hit, saving API call');
            return cached;
        }

        try {
            const response = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
                {
                    method: "POST",
                    headers: {
                        "xi-api-key": this.apiKey,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        text: text,
                        model_id: "eleven_multilingual_v2",
                        output_format: "mp3_44100_128",
                    }),
                    signal: this.abortController?.signal
                }
            );

            if (!response.ok) return null;
            const buffer = await response.arrayBuffer();

            // Store in cache
            audioCache.set(text, voiceId, buffer).catch(e => console.warn('[AudioCache] Store failed:', e));

            return buffer;
        } catch (e) {
            return null;
        }
    }

    setSpeed(speed: number): void {
        if (this.audio) this.audio.playbackRate = speed;
        this.currentSpeed = speed;
    }

    stop(): void {
        this.isPlaying = false;
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        if (this.abortController) this.abortController.abort();
        if (this.audio) this.audio.pause();
        this.mediaSource = null;
        this.sourceBuffer = null;
    }

    pause(): void { this.isPlaying = false; if (this.audio) this.audio.pause(); }
    resume(): void { this.isPlaying = true; if (this.audio) this.audio.play(); }
    getCurrentTime(): number { return this.audio?.currentTime || 0; }
    getDuration(): number { return Math.max(this.estimatedDuration, this.audio?.duration || 0); }
    setVolume(volume: number): void { this.volume = volume; if (this.audio) this.audio.volume = volume; }

    async download(text: string, voiceId: string): Promise<void> {
        // We fetch the whole audio as a single blob for download.
        // Note: For extremely long texts, this might hit API limits or timeout.
        // Ideally we reuse the chunks but stitching MP3s client-side is complex (headers).
        // We'll try a single large request for now. 

        try {
            const response = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, // Not /stream, we want the whole file
                {
                    method: "POST",
                    headers: {
                        "xi-api-key": this.apiKey,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        text: text,
                        model_id: "eleven_multilingual_v2",
                        output_format: "mp3_44100_128",
                    }),
                }
            );

            if (!response.ok) throw new Error("Download failed");

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `audicle-reading-${Date.now()}.mp3`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (e) {
            console.error("Download error", e);
            throw e;
        }
    }

    private splitTextSmartly(text: string, limit: number): string[] {
        const sentenceRegex = /([.!?]+[\s\r\n]+)/g;
        const tokens = text.split(sentenceRegex);
        const chunks: string[] = [];
        let currentChunk = "";

        for (const token of tokens) {
            if ((currentChunk + token).length <= limit) {
                currentChunk += token;
            } else {
                if (currentChunk) chunks.push(currentChunk);
                if (token.length > limit) chunks.push(token);
                else currentChunk = token;
            }
        }
        if (currentChunk) chunks.push(currentChunk);
        return chunks.filter(c => c.trim().length > 0);
    }
}
