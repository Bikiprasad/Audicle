import type { AudioProvider, Voice, WordBoundaryEvent } from "./types";
import { audioCache } from "./AudioCache";

type EventHandler = (data?: any) => void;

export class ElevenLabsProvider implements AudioProvider {
    private apiKey: string;
    public isPlaying: boolean = false;
    private volume: number = 1;

    // Event System
    private listeners: Map<string, Set<EventHandler>> = new Map();

    // MediaSource State
    private mediaSource: MediaSource | null = null;
    private sourceBuffer: SourceBuffer | null = null;
    private audio: HTMLAudioElement | null = null;

    // Buffer Queue
    private bufferQueue: ArrayBuffer[] = [];
    private isAppending: boolean = false;

    // Streaming State
    private allChunks: string[] = [];
    private isFetching: boolean = false;
    private abortController: AbortController | null = null;
    private streamController: AbortController | null = null; // Separate for stream loop

    // Playback State
    private estimatedDuration: number = 0;
    private fullText: string = "";
    private currentVoiceId: string = "";
    private currentSpeed: number = 1;
    private monitorInterval: NodeJS.Timeout | null = null;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    subscribe(event: string, callback: EventHandler): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)?.add(callback);
        return () => this.listeners.get(event)?.delete(callback);
    }

    private emit(event: string, data?: any) {
        this.listeners.get(event)?.forEach(cb => cb(data));
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
            this.emit('error', error);
            return [];
        }
    }

    async play(text: string, voiceId: string, speed: number): Promise<void> {
        this.stop();
        await new Promise(r => setTimeout(r, 50));

        this.isPlaying = true;
        this.fullText = text;
        this.currentVoiceId = voiceId;
        this.estimatedDuration = text.length / 15; // Rough estimate
        this.currentSpeed = speed;

        this.emit('play');
        this.emit('waiting'); // Initial buffering state

        this.mediaSource = new MediaSource();
        this.audio = new Audio();
        this.audio.src = URL.createObjectURL(this.mediaSource);
        this.audio.volume = this.volume;
        this.audio.playbackRate = speed;

        // Native Audio Events -> Provider Events
        this.audio.addEventListener('timeupdate', () => this.emit('timeupdate'));
        this.audio.addEventListener('ended', () => {
            // Only emit ended if we really are done
            if (this.mediaSource?.readyState === 'ended' && !this.isFetching) {
                this.emit('ended');
            }
        });
        this.audio.addEventListener('waiting', () => this.emit('waiting'));
        this.audio.addEventListener('playing', () => this.emit('play'));
        this.audio.addEventListener('error', (e) => this.emit('error', e));

        this.mediaSource.addEventListener('sourceopen', () => {
            this.startStreaming();
        });

        // Auto-play when ready
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

            const currentTime = this.audio.currentTime;
            const charsPerSec = 15 * this.currentSpeed;
            const estimatedCharIndex = Math.floor(currentTime * charsPerSec);

            this.emit('boundary', {
                name: 'word',
                charIndex: estimatedCharIndex,
                charLength: 1
            });
        }, 100);
    }

    private async startStreaming() {
        if (!this.mediaSource || this.mediaSource.readyState !== 'open') return;
        try {
            // Check if buffer already exists
            if (this.mediaSource.sourceBuffers.length > 0) return;
            this.sourceBuffer = this.mediaSource.addSourceBuffer('audio/mpeg');
            this.sourceBuffer.mode = 'sequence';
            this.sourceBuffer.addEventListener('updateend', () => this.processBufferQueue());
        } catch (e) {
            console.error(e);
            this.emit('error', e);
            return;
        }

        this.allChunks = this.splitTextSmartly(this.fullText, 1000);
        this.streamController = new AbortController();
        await this.processFetchLoop(0, this.streamController.signal);
    }

    private async processFetchLoop(startIndex: number, signal: AbortSignal) {
        this.isFetching = true;

        // Calculate offset time for the start index
        let charOffset = 0;
        for (let i = 0; i < startIndex; i++) {
            charOffset += this.allChunks[i].length + 1;
        }

        // If we are seeking/restarting, ensure timestamps align
        if (this.sourceBuffer && startIndex > 0) {
            const startTime = charOffset / 15;
            this.sourceBuffer.timestampOffset = startTime;
            if (this.audio) this.audio.currentTime = startTime;
        }

        for (let i = startIndex; i < this.allChunks.length; i++) {
            if (signal.aborted || !this.isPlaying) break;

            const chunk = this.allChunks[i];
            try {
                const arrayBuffer = await this.fetchAudioChunk(chunk, this.currentVoiceId);
                if (signal.aborted) break;

                if (arrayBuffer) {
                    this.queueBuffer(arrayBuffer);
                }
            } catch (e) {
                console.error("Stream Loop Error", e);
            }
        }

        this.isFetching = false;
        if (!signal.aborted && this.mediaSource && this.mediaSource.readyState === 'open') {
            // We only end stream if queue is also empty? 
            // Ideally we wait, but endOfStream() just signals "no more data coming".
            // We should check if we are actually done.
            this.mediaSource.endOfStream();
        }
    }

    private queueBuffer(buffer: ArrayBuffer) {
        this.bufferQueue.push(buffer);
        this.processBufferQueue();
    }

    private processBufferQueue() {
        if (this.isAppending || this.bufferQueue.length === 0 || !this.sourceBuffer || this.sourceBuffer.updating) return;

        this.isAppending = true;
        const buffer = this.bufferQueue.shift();

        try {
            if (buffer) this.sourceBuffer.appendBuffer(buffer);
        } catch (e) {
            console.error("Append Error", e);
            // Re-queue on error? Or drop?
        }
        this.isAppending = false;
    }

    seek(time: number): void {
        if (!this.audio || !this.mediaSource) return;

        const safeTime = Math.max(0, Math.min(time, this.estimatedDuration));
        const estimatedCharIndex = Math.floor(safeTime * 15);

        // Find Target Chunk
        let cumulativeChars = 0;
        let targetChunkIndex = 0;
        for (let i = 0; i < this.allChunks.length; i++) {
            const len = this.allChunks[i].length + 1;
            if (cumulativeChars + len > estimatedCharIndex) {
                targetChunkIndex = i;
                break;
            }
            cumulativeChars += len;
        }

        console.log(`Seeking to time ${safeTime} (Chunk ${targetChunkIndex})`);

        // 1. Abort current stream loop
        if (this.streamController) {
            this.streamController.abort();
            this.streamController = new AbortController(); // Reset
        }

        // 2. Clear Buffer Queue
        this.bufferQueue = [];

        // 3. Reset Source Buffer range if possible
        if (this.sourceBuffer && !this.sourceBuffer.updating) {
            try {
                // We remove everything to avoid timestamp overlap issues.
                // Modern browsers handle this usually well, but cleaning is safer for logic.
                // Note: remove() is async.
                this.sourceBuffer.abort(); // Clear any pending updates
                // this.sourceBuffer.remove(0, this.mediaSource.duration); 
                // Removing might be too aggressive and cause "ended" events.
                // Instead, we just rely on updating `timestampOffset` in `processFetchLoop`.
            } catch (e) { }
        }

        // 4. Update Time immediately for UI
        this.audio.currentTime = safeTime; // this triggers 'timeupdate'

        // 5. Restart Stream Loop from target chunk
        this.emit('waiting'); // UI loading state
        this.processFetchLoop(targetChunkIndex, this.streamController!.signal);
    }

    // ... (fetchAudioChunk, setSpeed, stop, pause, resume same as before but using emit/state) ...

    private async fetchAudioChunk(text: string, voiceId: string): Promise<ArrayBuffer | null> {
        // Check cache first
        const cached = await audioCache.get(text, voiceId);
        if (cached) return cached;

        if (!this.apiKey) return null;

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
                    // No signal here, we manage aborts manually via outer loop logic 
                    // or pass a specific fetch signal if needed. 
                    // For now, let fetches finish to populate cache.
                }
            );

            if (!response.ok) return null;
            const buffer = await response.arrayBuffer();
            audioCache.set(text, voiceId, buffer).catch(console.warn);
            return buffer;
        } catch (e) {
            return null;
        }
    }

    setSpeed(speed: number): void {
        this.currentSpeed = speed;
        if (this.audio) this.audio.playbackRate = speed;
        this.emit('speedchange', speed);
    }

    setVolume(volume: number): void {
        this.volume = volume;
        if (this.audio) this.audio.volume = volume;
        this.emit('volumechange', volume);
    }

    stop(): void {
        this.isPlaying = false;
        if (this.monitorInterval) clearInterval(this.monitorInterval);
        if (this.streamController) this.streamController.abort();
        if (this.audio) {
            this.audio.pause();
            this.audio.src = "";
            this.audio = null;
        }
        this.mediaSource = null;
        this.sourceBuffer = null;
        this.bufferQueue = [];
        this.emit('ended'); // Reset UI
    }

    pause(): void {
        this.isPlaying = false;
        if (this.audio) this.audio.pause();
        this.emit('pause');
    }

    resume(): void {
        this.isPlaying = true;
        if (this.audio) this.audio.play();
        this.emit('play');
    }

    getCurrentTime(): number { return this.audio?.currentTime || 0; }
    getDuration(): number { return Math.max(this.estimatedDuration, this.audio?.duration || 0); }

    async download(text: string, voiceId: string): Promise<void> {
        try {
            const blob = await this.generateAudioBlob(text, voiceId, 1.0);
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

    async generateAudioBlob(text: string, voiceId: string, speed: number): Promise<Blob> {
        if (!this.apiKey) throw new Error("API Key missing");

        const chunks = this.splitTextSmartly(text, 4000);
        const audioBuffers: ArrayBuffer[] = [];

        for (const chunk of chunks) {
            const response = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
                {
                    method: "POST",
                    headers: {
                        "xi-api-key": this.apiKey,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        text: chunk,
                        model_id: "eleven_multilingual_v2",
                        output_format: "mp3_44100_128",
                    }),
                }
            );

            if (!response.ok) throw new Error(`ElevenLabs generation failed: ${response.statusText}`);
            const buffer = await response.arrayBuffer();
            audioBuffers.push(buffer);
        }

        return new Blob(audioBuffers, { type: 'audio/mpeg' });
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
