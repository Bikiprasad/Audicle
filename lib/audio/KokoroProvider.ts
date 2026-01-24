
import type { AudioProvider, Voice, WordBoundaryEvent } from "./types";

export class KokoroProvider implements AudioProvider {
    private baseUrl: string;
    private listeners: Map<string, Set<(data?: any) => void>> = new Map();
    private audioContext: AudioContext | null = null;
    private sourceNode: AudioBufferSourceNode | null = null;
    private isPlaying: boolean = false;
    private startTime: number = 0;
    private pauseTime: number = 0;
    private accumulatedTime: number = 0;
    private duration: number = 0;
    private playbackRate: number = 1.0;
    private currentText: string = "";
    private currentVoiceId: string = "";

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
        try {
            // Attempt to fetch voices from API if available
            // Assuming strict remsky/Kokoro-FastAPI might not have a /voices endpoint documented,
            // but we'll try a common convention or fallback to defaults.
            // For now, I'll provide standard Kokoro voices as hardcoded fallbacks
            // because `remsky/Kokoro-FastAPI` often just exposes the model.

            const defaults: Voice[] = [
                { id: "af_bella", name: "Bella (American Female)", provider: "kokoro" },
                { id: "af_sarah", name: "Sarah (American Female)", provider: "kokoro" },
                { id: "am_michael", name: "Michael (American Male)", provider: "kokoro" },
                { id: "am_adam", name: "Adam (American Male)", provider: "kokoro" },
                { id: "bf_emma", name: "Emma (British Female)", provider: "kokoro" },
                { id: "bf_isabella", name: "Isabella (British Female)", provider: "kokoro" },
                { id: "bm_lewis", name: "Lewis (British Male)", provider: "kokoro" },
                { id: "bm_george", name: "George (British Male)", provider: "kokoro" },
            ];

            return defaults;
        } catch (e) {
            console.warn("Kokoro: Failed to fetch voices, using defaults", e);
            return [];
        }
    }

    private playSessionId: number = 0;

    async play(text: string, voiceId: string, speed: number): Promise<void> {
        this.stop();
        this.playSessionId++;
        const currentSessionId = this.playSessionId;

        this.currentText = text;
        this.currentVoiceId = voiceId;
        // For Kokoro Native Speed: We set local playback rate to 1.0 because the audio FILE itself is sped up.
        this.playbackRate = 1.0;

        this.emit("waiting");

        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            // Resume context if suspended (browser autoplay policy)
            if (this.audioContext.state === "suspended") {
                await this.audioContext.resume();
            }

            const payload = {
                input: text,
                voice: voiceId,
                model: "kokoro",
                speed: speed // Send speed to server
            };
            console.log("Kokoro Request Payload:", payload);

            // Prepare Request
            const response = await fetch(`${this.baseUrl}/v1/audio/speech`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload)
            });

            if (currentSessionId !== this.playSessionId) {
                console.log("Kokoro: Play request cancelled");
                return;
            }

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Kokoro API Error Details:", errorText);
                throw new Error(`Kokoro API Error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const arrayBuffer = await response.arrayBuffer();

            if (currentSessionId !== this.playSessionId) return;

            const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

            if (currentSessionId !== this.playSessionId) return;

            this.currentBuffer = audioBuffer;
            this.duration = audioBuffer.duration;
            this.playBuffer(audioBuffer);

            this.emit("play");

        } catch (e) {
            if (currentSessionId === this.playSessionId) {
                console.error("Kokoro Play Error", e);
                this.emit("error", e);
            }
        }
    }

    private gainNode: GainNode | null = null;

    private playBuffer(buffer: AudioBuffer, offset: number = 0) {
        if (!this.audioContext) return;

        this.sourceNode = this.audioContext.createBufferSource();
        this.sourceNode.buffer = buffer;
        this.sourceNode.playbackRate.value = this.playbackRate;

        if (!this.gainNode) {
            this.gainNode = this.audioContext.createGain();
            this.gainNode.connect(this.audioContext.destination);
        }

        this.sourceNode.connect(this.gainNode);

        this.sourceNode.onended = () => {
            // Only emit ended if we actually finished and weren't just stopped/paused manually
            if (this.isPlaying && (this.getCurrentTime() >= this.duration - 0.5)) {
                this.emit("ended");
                this.isPlaying = false;
            }
        };

        const startTime = this.audioContext.currentTime;
        this.sourceNode.start(0, offset);

        // Correct start time calculation to account for offset
        this.startTime = startTime - (offset / this.playbackRate);
        this.isPlaying = true;

        // Start time update loop
        this.startMonitor();
    }

    private monitorInterval: NodeJS.Timeout | null = null;

    private startMonitor() {
        if (this.monitorInterval) clearInterval(this.monitorInterval);
        this.monitorInterval = setInterval(() => {
            if (this.isPlaying) {
                this.emit("timeupdate");

                // Simulate word boundaries? 
                // Kokoro API doesn't seem to return timestamps/alignment yet in standard OpenAI format.
                // We could estimate based on WPM if needed, but for now simple time updates.
            }
        }, 100);
    }

    pause(): void {
        if (this.isPlaying && this.sourceNode) {
            this.sourceNode.stop();
            this.sourceNode = null;
            this.pauseTime = this.getCurrentTime();
            this.isPlaying = false;
            this.emit("pause");
        }
    }

    resume(): void {
        if (!this.isPlaying && this.pauseTime >= 0 && this.currentBuffer) {
            this.playBuffer(this.currentBuffer, this.pauseTime);
            this.pauseTime = 0;
            this.emit("play");
        }
    }

    // Quick fix for Resume: Store buffer
    private currentBuffer: AudioBuffer | null = null;

    stop(): void {
        if (this.sourceNode) {
            this.sourceNode.stop();
            this.sourceNode = null;
        }
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        this.isPlaying = false;
        this.accumulatedTime = 0;
        this.pauseTime = 0;
        this.pauseTime = 0;
        // this.currentBuffer = null; // Don't clear buffer on stop to allow restart
    }

    seek(time: number): void {
        if (!this.currentBuffer) return;

        if (this.isPlaying) {
            this.sourceNode?.stop();
            this.playBuffer(this.currentBuffer, time);
            this.emit("timeupdate");
        } else {
            this.pauseTime = Math.min(time, this.duration);
            this.emit("timeupdate");
        }
    }

    setVolume(volume: number): void {
        if (this.gainNode) {
            this.gainNode.gain.value = volume;
        }
    }

    setSpeed(speed: number): void {
        // Native Speed Change (Requires Re-generation)
        if (this.currentText && this.currentVoiceId) {
            const currentTime = this.getCurrentTime();
            const progress = this.duration > 0 ? currentTime / this.duration : 0;
            const wasPlaying = this.isPlaying;

            // Re-play with new speed
            this.play(this.currentText, this.currentVoiceId, speed).then(() => {
                const newTime = progress * this.duration;
                this.seek(newTime);
                if (!wasPlaying) {
                    this.pause(); // Convert back to pause state if we were paused, but after seek updates
                }
            });
        }
    }

    getCurrentTime(): number {
        if (!this.audioContext) return 0;
        if (this.pauseTime > 0 && !this.isPlaying) return this.pauseTime;
        if (!this.isPlaying) return 0;

        const elapsed = (this.audioContext.currentTime - this.startTime) * this.playbackRate;
        return Math.min(elapsed, this.duration);
    }

    getDuration(): number {
        return this.duration;
    }

    async download(text: string, voiceId: string): Promise<void> {
        try {
            const payload = {
                input: text,
                voice: voiceId,
                model: "kokoro"
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
