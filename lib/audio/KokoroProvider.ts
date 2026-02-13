
import type { AudioProvider, Voice } from "./types";
import { KOKORO_VOICES } from "~lib/constants";

export class KokoroProvider implements AudioProvider {
    private baseUrl: string;
    private listeners: Map<string, Set<(data?: any) => void>> = new Map();
    private audioContext: AudioContext | null = null;
    private audioElement: HTMLAudioElement | null = null;
    private mediaSource: MediaSource | null = null;
    private sourceBuffer: SourceBuffer | null = null;
    private gainNode: GainNode | null = null;
    private sourceNode: MediaElementAudioSourceNode | null = null;

    public isPlaying: boolean = false;
    private currentText: string = "";
    private currentVoiceId: string = "";
    private playbackRate: number = 1.0;
    private currentVolume: number = 1.0;

    // Queue for source buffer appending
    private bufferQueue: Uint8Array[] = [];
    private isAppending: boolean = false;
    private isStreamComplete: boolean = false;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl.replace(/\/+$/, ""); // Remove trailing slash
    }

    setBaseUrl(url: string) {
        this.baseUrl = url.replace(/\/+$/, "");
    }

    subscribe(event: string, callback: (data?: any) => void): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)?.add(callback);
        return () => this.listeners.get(event)?.delete(callback);
    }

    private emit(event: string, data?: any) {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }

    async getVoices(): Promise<Voice[]> {
        // Return static list for now, since we don't need to fetch from API every time
        // (The API endpoint exists but our static list has better metadata/descriptions)
        return KOKORO_VOICES;
    }

    private playSessionId: number = 0;


    async play(text: string, voiceId: string, speed: number): Promise<void> {
        this.stop();
        this.playSessionId++;
        const currentSessionId = this.playSessionId;
        const startTime = performance.now();
        console.log(`[Kokoro] Play Request Started at ${startTime.toFixed(2)}ms`);

        this.currentText = text;
        this.currentVoiceId = voiceId;
        this.playbackRate = 1.0;

        // precise estimate: ~150 words per minute => 0.4 seconds per word
        const wordCount = text.trim().split(/\s+/).length;
        this.estimatedDuration = Math.max(1, wordCount * 0.4);

        this.emit("waiting");

        try {
            this.initializeAudioSystem();

            if (!this.audioElement || !this.mediaSource) return;

            const payload = {
                input: text,
                voice: voiceId,
                model: "kokoro",
                response_format: "mp3", // Request MP3 for MSE support
                speed: speed
            };
            console.log("Kokoro Request Payload:", payload);

            const response = await fetch(`${this.baseUrl}/v1/audio/speech`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload)
            });

            const ttfb = performance.now() - startTime;
            console.log(`[Kokoro] TTFB (Headers): ${ttfb.toFixed(2)}ms`);

            if (currentSessionId !== this.playSessionId) {
                console.log("Kokoro: Play request cancelled");
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Kokoro API Error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            if (!response.body) {
                throw new Error("Kokoro API: No response body");
            }

            // Set up SourceBuffer
            // We need to wait for sourceopen if it's not ready, but initializeAudioSystem should convert it to 'open' state via setting src
            if (this.mediaSource.readyState !== 'open') {
                await new Promise<void>((resolve) => {
                    if (!this.mediaSource) return resolve();
                    this.mediaSource.addEventListener('sourceopen', () => resolve(), { once: true });
                });
            }

            if (currentSessionId !== this.playSessionId) return;

            try {
                // Determine mime type. Safest for MP3 is audio/mpeg. 
                // Some browsers might need 'audio/mp3'.
                if (!this.sourceBuffer) {
                    // Check support
                    const mime = 'audio/mpeg';
                    if (MediaSource.isTypeSupported(mime)) {
                        this.sourceBuffer = this.mediaSource.addSourceBuffer(mime);
                    } else {
                        // Fallback: This browser might not support MP3 in MSE (rare for mp3, more common for AAC).
                        // In that case we might need to fallback to full blob download.
                        throw new Error(`MSE Mime type ${mime} not supported`);
                    }
                }
            } catch (e) {
                console.warn("MSE initialization failed, falling back to full download method", e);
                // Fallback to legacy arraybuffer method could be implemented here OR just fail. 
                // For now let's assume MP3 MSE support (Chrome/FF/Edge/Safari support it well).
                throw e;
            }

            this.sourceBuffer.mode = 'sequence';
            this.sourceBuffer.addEventListener('updateend', () => {
                this.isAppending = false;
                this.processQueue();
            });

            this.isPlaying = true;
            this.isStreamComplete = false;
            this.emit("play"); // Emit play early as we start streaming

            // Start reading the stream
            const reader = response.body.getReader();

            let firstChunkReceived = false;

            this.audioElement.addEventListener('playing', () => {
                const playbackLatency = performance.now() - startTime;
                console.log(`[Kokoro] Audio Playback Started: ${playbackLatency.toFixed(2)}ms`);
            }, { once: true });

            this.audioElement.play().catch(e => console.error("Audio play failed (autoplay?)", e));

            while (true) {
                const { done, value } = await reader.read();

                if (currentSessionId !== this.playSessionId) {
                    reader.cancel();
                    return;
                }

                if (done) {
                    this.isStreamComplete = true;
                    this.processQueue(); // Trigger final check
                    break;
                }

                if (value) {
                    if (!firstChunkReceived) {
                        firstChunkReceived = true;
                        const firstChunkTime = performance.now() - startTime;
                        console.log(`[Kokoro] First Chunk Received: ${firstChunkTime.toFixed(2)}ms`);
                    }
                    this.bufferQueue.push(value);
                    this.processQueue();
                }
            }

        } catch (e) {
            if (currentSessionId === this.playSessionId) {
                console.error("Kokoro Play Error", e);
                this.emit("error", e);
                this.stop();
            }
        }
    }

    private processQueue() {
        if (!this.sourceBuffer || this.isAppending || this.bufferQueue.length === 0) {
            if (this.isStreamComplete && !this.isAppending && this.bufferQueue.length === 0 && this.mediaSource?.readyState === 'open') {
                try {
                    this.mediaSource.endOfStream();
                } catch (e) { console.warn("Error ending stream", e); }
            }
            return;
        }

        this.isAppending = true;
        const chunk = this.bufferQueue.shift();


        if (chunk) {
            try {
                this.sourceBuffer.appendBuffer(chunk as BufferSource);
            } catch (e) {
                console.error("SourceBuffer append error", e);
                // If quota exceeded, we might need to remove old buffer, but for TTS short clips this is rare.
                this.isAppending = false;
            }
        } else {
            this.isAppending = false;
        }
    }

    private initializeAudioSystem() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        if (this.audioContext.state === "suspended") {
            this.audioContext.resume();
        }

        if (this.audioElement) {
            // Clean up old element/media source if needed?
            // Actually reusing the element is better but we need a new MediaSource for a new stream typically.
            // Or we can just set src to '' and reset.
            this.cleanupAudioElement();
        }

        this.audioElement = new Audio();
        this.audioElement.crossOrigin = "anonymous";
        this.mediaSource = new MediaSource();
        this.audioElement.src = URL.createObjectURL(this.mediaSource);

        // Connect to AudioContext
        this.sourceNode = this.audioContext.createMediaElementSource(this.audioElement);
        this.gainNode = this.audioContext.createGain();
        this.gainNode.gain.value = this.currentVolume;
        this.sourceNode.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);

        // Events
        this.audioElement.onended = () => {
            if (this.isPlaying) {
                this.emit("ended");
                this.isPlaying = false;
            }
        };

        this.audioElement.ontimeupdate = () => {
            if (this.isPlaying) {
                this.emit("timeupdate");
            }
        };

        this.audioElement.playbackRate = this.playbackRate;
    }

    private cleanupAudioElement() {
        if (this.audioElement) {
            this.audioElement.pause();
            this.audioElement.removeAttribute('src');
            this.audioElement.load();
            this.audioElement = null;
        }
        if (this.sourceNode) {
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }
        if (this.gainNode) {
            this.gainNode.disconnect();
            this.gainNode = null;
        }
        if (this.mediaSource) {
            // mediaSource GC'd by unsetting src usually
            this.mediaSource = null;
        }
        this.sourceBuffer = null;
        this.bufferQueue = [];
        this.isAppending = false;
        this.isStreamComplete = false;
    }

    pause(): void {
        if (this.audioElement && this.isPlaying) {
            this.audioElement.pause();
            this.isPlaying = false;
            this.emit("pause");
        }
    }

    resume(): void {
        if (this.audioElement && !this.isPlaying) {
            this.audioElement.play();
            this.isPlaying = true;
            this.emit("play");
        }
    }

    stop(): void {
        this.playSessionId++; // Invalidate current session
        this.cleanupAudioElement();
        this.isPlaying = false;
        // this.emit("stop"); // Optional?
    }

    seek(time: number): void {
        if (this.audioElement) {
            // Clamp to buffered ranges if possible, or just try seeking
            // MSE seeking outside buffered range might stall, but browser handles it usually.
            // We'll just clamp to be safe against UI sending weird values.
            const safeTime = Math.max(0, Math.min(time, this.getDuration()));
            this.audioElement.currentTime = safeTime;
            this.emit("timeupdate");
        }
    }

    setVolume(volume: number): void {
        this.currentVolume = volume;
        if (this.gainNode) {
            this.gainNode.gain.value = volume;
        }
    }

    setSpeed(speed: number): void {
        // Here 'speed' usually refers to playbackRate for the audio element
        this.playbackRate = speed;
        if (this.audioElement) {
            this.audioElement.playbackRate = speed;
        }
        // Note: The original 'speed' param in play() was sent to backend for generation speed.
        // If the user wants to change generation speed mid-playback, that requires re-generation (expensive).
        // Usually UI speed sliders control playbackRate.
    }

    getCurrentTime(): number {
        return this.audioElement ? this.audioElement.currentTime : 0;
    }

    getDuration(): number {
        if (!this.audioElement) return 0;
        const duration = this.audioElement.duration;
        // If duration is finite and non-zero (meaning browser knows it), return it.
        // Otherwise return our word-count estimate to keep the UI usable.
        if (Number.isFinite(duration) && duration > 0 && duration !== Infinity) {
            return duration;
        }
        return this.estimatedDuration;
    }

    private estimatedDuration: number = 0;

    async generateAudioBlob(text: string, voiceId: string, speed: number): Promise<Blob> {
        try {
            const payload = {
                input: text,
                voice: voiceId,
                model: "kokoro",
                response_format: "mp3",
                speed: speed
            };

            const response = await fetch(`${this.baseUrl}/v1/audio/speech`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Kokoro generation failed: ${response.status} - ${errorText}`);
            }

            return await response.blob();
        } catch (e) {
            console.error("Kokoro generateAudioBlob failed", e);
            throw e;
        }
    }

    async download(text: string, voiceId: string): Promise<void> {
        try {
            const payload = {
                input: text,
                voice: voiceId,
                model: "kokoro",
                response_format: "mp3"
            };

            console.log("Kokoro Download Payload:", payload);

            const response = await fetch(`${this.baseUrl}/v1/audio/speech`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Kokoro Download Error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.style.display = "none";
            a.href = url;
            a.download = `kokoro-${voiceId}-${Date.now()}.mp3`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

        } catch (e) {
            console.error("Kokoro Download Failed", e);
            throw e;
        }
    }
}
