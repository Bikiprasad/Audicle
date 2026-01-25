import type { AudioProvider, Voice, WordBoundaryEvent } from "./types";

// Default Web Speech voice
const DEFAULT_WEB_SPEECH_VOICE = "Google UK English Male";

type EventHandler = (data?: any) => void;

export class WebSpeechProvider implements AudioProvider {
    // Event System
    private listeners: Map<string, Set<EventHandler>> = new Map();

    public isPlaying: boolean = false;
    private volume: number = 1;

    // Monitor State
    private monitorInterval: NodeJS.Timeout | null = null;
    private lastEventTime: number = 0;

    // Global State
    private fullText: string = "";
    private totalEstimatedDuration: number = 0;

    // Time Tracking
    private accumulatedTime: number = 0;
    private startTime: number = 0;
    private pauseTime: number = 0;

    // Chunking State
    private originalChunks: string[] = [];  // Immutable reference
    private chunks: string[] = [];           // Working copy (may be modified on seek)
    private currentChunkIndex: number = 0;

    // Seek/Sync Offset - tracks chars skipped from original text due to seek
    private globalCharOffset: number = 0;

    // Granular Resume State
    private lastBoundaryCharIndex: number = 0;

    // Active Segment State
    private utterance: SpeechSynthesisUtterance | null = null;
    private currentVoiceId: string = "";
    private currentSpeed: number = 1;
    private charsPerSec: number = 15;

    // Session Management
    private sessionResolve: (() => void) | null = null;
    private sessionReject: ((reason?: any) => void) | null = null;

    private get synthesis(): SpeechSynthesis {
        return window.speechSynthesis;
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

    async getVoices(): Promise<Voice[]> {
        return new Promise((resolve) => {
            let voices = this.synthesis.getVoices();
            if (voices.length > 0) {
                resolve(this.mapVoices(voices));
                return;
            }
            window.speechSynthesis.onvoiceschanged = () => {
                voices = this.synthesis.getVoices();
                resolve(this.mapVoices(voices));
            };
        });
    }

    private mapVoices(nativeVoices: SpeechSynthesisVoice[]): Voice[] {
        const allowed = ["Google US English", "Google UK English Female", "Google UK English Male", "Microsoft David", "Microsoft Zira"];
        return nativeVoices
            .filter(v => allowed.some(a => v.name.includes(a)) || v.default)
            .map((v) => ({
                id: v.name,
                name: v.name,
                provider: 'web-speech',
                nativeVoiceObj: v
            }));
    }

    private startMonitor() {
        if (this.monitorInterval) clearInterval(this.monitorInterval);
        this.monitorInterval = setInterval(() => {
            if (!this.isPlaying || !this.utterance || this.synthesis.paused || this.pauseTime > 0) return;

            const now = Date.now();
            this.emit('timeupdate');

            // If we haven't received a real event in > 200ms, use estimation
            if (now - this.lastEventTime > 200) {
                const elapsedSinceStart = Math.max(0, (now - this.startTime) / 1000);
                const estimatedCharIndex = Math.floor(elapsedSinceStart * this.charsPerSec);

                // Don't overshoot current chunk length
                const currentLen = this.chunks[this.currentChunkIndex]?.length || 0;
                if (estimatedCharIndex < currentLen) {
                    this.emit('boundary', {
                        charIndex: this.calculateGlobalCharIndex(estimatedCharIndex),
                        charLength: 1,
                        name: 'word' // approximate
                    });
                }
            }
        }, 100);
    }

    async play(text: string, voiceId: string, speed: number): Promise<void> {
        this.stop();

        // Give browser a moment
        await new Promise(r => setTimeout(r, 50));

        this.fullText = text;
        this.calculateDuration(text, speed);

        // Reset Logic
        this.accumulatedTime = 0;
        this.startTime = 0;
        this.pauseTime = 0;
        this.currentVoiceId = voiceId;
        this.currentSpeed = speed;
        this.lastBoundaryCharIndex = 0;

        this.originalChunks = this.splitTextRobustly(text);
        this.chunks = [...this.originalChunks];  // Working copy
        this.currentChunkIndex = 0;
        this.globalCharOffset = 0;  // No seek offset initially

        this.startMonitor();
        this.emit('play');

        return new Promise((resolve, reject) => {
            this.sessionResolve = resolve;
            this.sessionReject = reject;
            this.playNextChunk();
        });
    }

    private calculateDuration(text: string, speed: number) {
        this.charsPerSec = 15 * speed;
        this.totalEstimatedDuration = text.length / this.charsPerSec;
    }

    // State for Volume Change
    private isVolumeRestart: boolean = false;

    private splitTextRobustly(text: string): string[] {
        const HARD_LIMIT = 200;

        const lines = text.split(/\n+/);
        const finalChunks: string[] = [];

        for (const line of lines) {
            if (!line.trim()) continue;
            // Split by common punctuation
            const sentences = line.match(/[^.!?]+[.!?]+|[^.!?]+$/g);
            const rawChunks = sentences ? sentences.map(s => s.trim()).filter(s => s) : [line.trim()];

            for (const chunk of rawChunks) {
                if (chunk.length <= HARD_LIMIT) {
                    finalChunks.push(chunk);
                } else {
                    const subChunks = this.splitByLength(chunk, HARD_LIMIT);
                    finalChunks.push(...subChunks);
                }
            }
        }

        if (finalChunks.length === 0) return [text];
        return finalChunks;
    }

    private splitByLength(text: string, limit: number): string[] {
        const result: string[] = [];
        let remaining = text;
        while (remaining.length > limit) {
            let splitIndex = remaining.lastIndexOf(',', limit);
            if (splitIndex === -1) splitIndex = remaining.lastIndexOf(' ', limit);
            if (splitIndex === -1) splitIndex = limit;

            result.push(remaining.substring(0, splitIndex + 1).trim());
            remaining = remaining.substring(splitIndex + 1).trim();
        }
        if (remaining) result.push(remaining);
        return result;
    }

    private playNextChunk(): void {
        if (this.currentChunkIndex >= this.chunks.length) {
            this.finishSession();
            return;
        }

        const textToSpeak = this.chunks[this.currentChunkIndex];
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        this.utterance = utterance;

        const voices = this.synthesis.getVoices();
        let selectedVoice = voices.find(v => v.name === this.currentVoiceId);

        // Fallback to default UK English Male if requested voice not found
        if (!selectedVoice) {
            selectedVoice = voices.find(v => v.name.includes(DEFAULT_WEB_SPEECH_VOICE));
        }

        if (selectedVoice) {
            utterance.voice = selectedVoice;
            utterance.lang = selectedVoice.lang;
        }

        utterance.rate = this.currentSpeed;
        utterance.volume = this.volume;

        // Time Tracking Start
        this.startTime = Date.now();
        this.pauseTime = 0;
        this.lastBoundaryCharIndex = 0;
        this.isPlaying = true;

        utterance.onboundary = (e) => {
            if (e.name === 'word' || e.name === 'sentence') {
                this.lastEventTime = Date.now();
                this.lastBoundaryCharIndex = e.charIndex;

                this.emit('boundary', {
                    charIndex: this.calculateGlobalCharIndex(e.charIndex),
                    charLength: e.charLength,
                    name: e.name
                });
            }
        }

        utterance.onend = () => {
            // System ended naturally
            if (this.isVolumeRestart) {
                this.isVolumeRestart = false;
                return;
            }
            if (!this.sessionResolve) return;

            // Mark chunk as done
            this.isPlaying = false;
            this.utterance = null;

            const chunkDuration = textToSpeak.length / this.charsPerSec;
            this.accumulatedTime += chunkDuration;

            // Update global offset to track position in original text
            this.globalCharOffset += textToSpeak.length;

            this.currentChunkIndex++;
            this.playNextChunk();
        };

        utterance.onerror = (e) => {
            if (this.isVolumeRestart && (e.error === 'canceled' || e.error === 'interrupted')) {
                return;
            }

            // If genuinely interrupted/cancelled not by us
            this.isPlaying = false;
            this.utterance = null;

            if (e.error === 'interrupted' || e.error === 'canceled') return;

            this.emit('error', e);
            if (this.sessionReject) this.sessionReject(e);
        };

        this.synthesis.speak(utterance);
    }

    private calculateGlobalCharIndex(localIndex: number): number {
        // Use globalCharOffset to account for seek position
        // This gives us the correct position in the ORIGINAL text
        return this.globalCharOffset + localIndex;
    }

    private finishSession() {
        this.emit('ended');
        if (this.sessionResolve) {
            this.sessionResolve();
            this.sessionResolve = null;
            this.sessionReject = null;
        }
        this.isPlaying = false;
    }

    pause(): void {
        if (this.isPlaying) {
            this.synthesis.pause();
            this.pauseTime = Date.now();
            this.emit('pause');
        }
    }

    resume(): void {
        if (this.isPlaying) {
            // If we have an active utterance and were just system-paused
            if (this.utterance && this.pauseTime > 0) {
                this.synthesis.resume();
            } else {
                // If we cancelled it (due to seek/speed change while paused), we must restart
                this.playNextChunk();
            }

            if (this.pauseTime > 0) {
                const pauseDuration = Date.now() - this.pauseTime;
                this.startTime += pauseDuration;
                this.pauseTime = 0;
            }
            this.emit('play');
        }
    }

    stop(): void {
        if (this.monitorInterval) {
            clearInterval(this.monitorInterval);
            this.monitorInterval = null;
        }
        this.sessionResolve = null;
        this.sessionReject = null;
        this.synthesis.cancel();
        this.utterance = null;
        this.isPlaying = false;
        this.accumulatedTime = 0;
        this.originalChunks = [];
        this.chunks = [];
        this.currentChunkIndex = 0;
        this.globalCharOffset = 0;
        this.emit('ended');
    }

    getCurrentTime(): number {
        if (!this.isPlaying && this.accumulatedTime === 0) return 0;
        let currentElapsed = 0;
        const isActuallyPaused = this.synthesis.paused || (this.pauseTime > 0);
        if (this.isPlaying) {
            if (isActuallyPaused && this.pauseTime > 0) {
                currentElapsed = (this.pauseTime - this.startTime) / 1000;
            } else if (!isActuallyPaused && this.startTime > 0) {
                currentElapsed = (Date.now() - this.startTime) / 1000;
            }
        }
        return Math.min(this.accumulatedTime + Math.max(0, currentElapsed), this.totalEstimatedDuration);
    }

    getDuration(): number {
        return this.totalEstimatedDuration;
    }

    setVolume(volume: number): void {
        this.volume = volume;
        this.emit('volumechange', volume);
        if (this.isPlaying && this.utterance && !this.synthesis.paused && this.pauseTime === 0) {
            // Restart from current estimation
            const elapsedSinceStart = Math.max(0, (Date.now() - this.startTime) / 1000);
            const estimatedLocalCharIndex = Math.floor(elapsedSinceStart * this.charsPerSec);
            const currentChunkStart = this.originalChunks.slice(0, this.currentChunkIndex).reduce((acc, c) => acc + c.length, 0);

            // Calculate where we are legally in the original text
            // We need to know "where in original text did this current chunk start?"
            // Actually, `playFromIndex` handles everything if we pass global index.
            // But simpler: just use `calculateGlobalCharIndex`.

            // Wait, `calculateGlobalCharIndex` uses `globalCharOffset`.
            // `globalCharOffset` tracks how much we SKIPPED.
            // So `globalCharOffset` + `localIndex` = Position in Original Text.

            const globalIndex = this.calculateGlobalCharIndex(Math.max(this.lastBoundaryCharIndex, estimatedLocalCharIndex));
            this.playFromIndex(globalIndex);
        }
    }

    setSpeed(speed: number): void {
        if (this.currentSpeed === speed) return;
        this.currentSpeed = speed;
        this.emit('speedchange', speed);

        if (this.isPlaying && this.utterance && !this.synthesis.paused && this.pauseTime === 0) {
            this.charsPerSec = 15 * speed;
            // Restart from current pos
            const elapsedSinceStart = Math.max(0, (Date.now() - this.startTime) / 1000);
            const estimatedLocalCharIndex = Math.floor(elapsedSinceStart * this.charsPerSec);
            const globalIndex = this.calculateGlobalCharIndex(Math.max(this.lastBoundaryCharIndex, estimatedLocalCharIndex));
            this.playFromIndex(globalIndex);
        } else {
            this.charsPerSec = 15 * speed;
            if (this.pauseTime > 0) {
                this.synthesis.cancel();
                this.utterance = null;
            }
        }
    }

    seek(time: number): void {
        if (time < 0) time = 0;
        if (time > this.totalEstimatedDuration) time = this.totalEstimatedDuration;

        this.accumulatedTime = time;
        // Estimate global char index
        const estimatedGlobalCharIndex = Math.floor(time * (15 * this.currentSpeed));

        this.playFromIndex(estimatedGlobalCharIndex);
        this.emit('timeupdate');
    }

    private playFromIndex(globalStartIndex: number): void {
        this.isVolumeRestart = true;
        this.synthesis.cancel();

        // Safe bounds
        if (globalStartIndex < 0) globalStartIndex = 0;
        if (globalStartIndex >= this.fullText.length) globalStartIndex = this.fullText.length - 1;

        this.globalCharOffset = globalStartIndex;

        // Find which original chunk this index falls into
        let cumulative = 0;
        let targetChunkIndex = 0;
        let localStartIndex = 0;

        for (let i = 0; i < this.originalChunks.length; i++) {
            const len = this.originalChunks[i].length;
            if (globalStartIndex < cumulative + len) {
                targetChunkIndex = i;
                localStartIndex = globalStartIndex - cumulative;
                break;
            }
            cumulative += len;
        }

        // Rebuild chunks:
        // 1. Target chunk (sliced from localStartIndex)
        // 2. All subsequent chunks
        this.chunks = [];

        // Slice target chunk to start at correct word boundary (approx)
        const targetChunk = this.originalChunks[targetChunkIndex];
        let sliceIndex = localStartIndex;

        // Robust word boundary: try to start after a space if we are in middle of text
        if (sliceIndex > 0 && sliceIndex < targetChunk.length) {
            const lastSpace = targetChunk.lastIndexOf(" ", sliceIndex);
            if (lastSpace >= 0) sliceIndex = lastSpace + 1;
        }

        // Adjust global offset slightly if we moved the slice point
        const adjustment = sliceIndex - localStartIndex;
        // actually if we move backward (lastIndexOf), we are re-playing some chars.
        // globalCharOffset represents "how many chars of original text are BEFORE the current chunks[0][0]"?
        // So globalCharOffset should come from cumulative + sliceIndex.
        this.globalCharOffset = cumulative + sliceIndex;

        const firstChunk = targetChunk.substring(sliceIndex);
        if (firstChunk.trim()) {
            this.chunks.push(firstChunk);
        }

        // Add remaining original chunks
        for (let i = targetChunkIndex + 1; i < this.originalChunks.length; i++) {
            this.chunks.push(this.originalChunks[i]);
        }

        this.currentChunkIndex = 0;
        this.lastBoundaryCharIndex = 0;

        // If we were playing, restart. If paused, we just prepped the state.
        if (this.isPlaying && this.pauseTime === 0) {
            setTimeout(() => {
                this.isVolumeRestart = false;
                this.startTime = Date.now();
                this.playNextChunk();
            }, 50);
        } else {
            this.utterance = null;
            this.isVolumeRestart = false;
        }
    }
}
