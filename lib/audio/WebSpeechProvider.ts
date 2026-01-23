import type { AudioProvider, Voice, WordBoundaryEvent } from "./types";

// Default Web Speech voice
const DEFAULT_WEB_SPEECH_VOICE = "Google UK English Male";

export class WebSpeechProvider implements AudioProvider {
    private isPlaying: boolean = false;
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
    private currentOnBoundary?: (e: WordBoundaryEvent) => void;
    private charsPerSec: number = 15;

    // Session Management
    private sessionResolve: (() => void) | null = null;
    private sessionReject: ((reason?: any) => void) | null = null;

    private get synthesis(): SpeechSynthesis {
        return window.speechSynthesis;
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
            // If we haven't received a real event in > 200ms, use estimation
            if (now - this.lastEventTime > 200) {
                const elapsedSinceStart = Math.max(0, (now - this.startTime) / 1000);
                const estimatedCharIndex = Math.floor(elapsedSinceStart * this.charsPerSec);

                // Don't overshoot current chunk length
                const currentLen = this.chunks[this.currentChunkIndex]?.length || 0;
                if (estimatedCharIndex < currentLen) {
                    if (this.currentOnBoundary) {
                        this.currentOnBoundary({
                            charIndex: this.calculateGlobalCharIndex(estimatedCharIndex),
                            charLength: 1,
                            name: 'word' // approximate
                        });
                    }
                }
            }
        }, 100);
    }

    async play(text: string, voiceId: string, speed: number, onBoundary?: (e: WordBoundaryEvent) => void): Promise<void> {
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
        this.currentOnBoundary = onBoundary;
        this.lastBoundaryCharIndex = 0;

        this.originalChunks = this.splitTextRobustly(text);
        this.chunks = [...this.originalChunks];  // Working copy
        this.currentChunkIndex = 0;
        this.globalCharOffset = 0;  // No seek offset initially

        this.startMonitor();

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
                if (this.currentOnBoundary) {
                    this.currentOnBoundary({
                        charIndex: this.calculateGlobalCharIndex(e.charIndex),
                        charLength: e.charLength,
                        name: e.name
                    });
                }
            }
        }

        utterance.onend = () => {
            if (this.isVolumeRestart) {
                this.isVolumeRestart = false;
                return;
            }
            if (!this.sessionResolve) return;

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
            this.isPlaying = false;
            this.utterance = null;
            if (e.error === 'interrupted' || e.error === 'canceled') return;
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
        if (this.isPlaying && this.utterance && !this.synthesis.paused && this.pauseTime === 0) {
            this.performSmartRestart();
        }
    }

    setSpeed(speed: number): void {
        if (this.currentSpeed === speed) return;
        this.currentSpeed = speed;
        // Only restart if accurately speaking
        if (this.isPlaying && this.utterance && !this.synthesis.paused && this.pauseTime === 0) {
            this.charsPerSec = 15 * speed;
            this.performSmartRestart();
        } else {
            // Just update calculation basis
            this.charsPerSec = 15 * speed;
            // If paused, we cancel the current stale utterance so `resume` rebuilds it
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
        this.startTime = Date.now();

        const estimatedGlobalCharIndex = Math.floor(time * this.charsPerSec);

        // Find which ORIGINAL chunk this belongs to
        let cumulative = 0;
        let targetChunk = 0;
        let localIndex = 0;

        for (let i = 0; i < this.originalChunks.length; i++) {
            const len = this.originalChunks[i].length;
            if (estimatedGlobalCharIndex < cumulative + len) {
                targetChunk = i;
                localIndex = estimatedGlobalCharIndex - cumulative;
                break;
            }
            cumulative += len;
        }

        // Set the global offset to the seek position
        this.globalCharOffset = estimatedGlobalCharIndex;
        this.currentChunkIndex = targetChunk;
        this.lastBoundaryCharIndex = localIndex;

        // Rebuild working chunks from seek position
        this.rebuildChunksFromSeek(targetChunk, localIndex);

        // If playing, restart immediately
        if (this.isPlaying && this.pauseTime === 0) {
            this.performSeekRestart();
        } else {
            // If paused, just clear current utterance so resume() starts fresh
            this.synthesis.cancel();
            this.utterance = null;
        }
    }

    private rebuildChunksFromSeek(chunkIndex: number, localCharIndex: number): void {
        // Create new working chunks starting from seek position
        this.chunks = [];

        if (chunkIndex < this.originalChunks.length) {
            // First chunk is the remainder of the target chunk from localCharIndex
            const targetChunk = this.originalChunks[chunkIndex];

            // Find word boundary to start from (don't cut mid-word)
            let startIndex = localCharIndex;
            if (startIndex > 0 && startIndex < targetChunk.length) {
                // Look for previous space to start at word boundary
                const spaceIndex = targetChunk.lastIndexOf(' ', startIndex);
                if (spaceIndex > 0) {
                    startIndex = spaceIndex + 1;
                }
            }

            const remainder = targetChunk.substring(startIndex).trim();
            if (remainder.length > 0) {
                this.chunks.push(remainder);
            }

            // Add all subsequent original chunks
            for (let i = chunkIndex + 1; i < this.originalChunks.length; i++) {
                this.chunks.push(this.originalChunks[i]);
            }
        }

        // Reset chunk index since we rebuilt the array
        this.currentChunkIndex = 0;
    }

    private performSeekRestart(): void {
        this.isVolumeRestart = true;
        this.synthesis.cancel();

        setTimeout(() => {
            this.isVolumeRestart = false;
            this.startTime = Date.now();
            this.playNextChunk();
        }, 50);
    }

    private jumpToChunkForIndex(globalIndex: number) {
        // Internal helper reused by seek, kept for logic reference but seek() now inlines the logic
        // We can remove it or keep it for future.
        let cumulative = 0;
        let targetChunk = 0;
        let localIndex = 0;

        for (let i = 0; i < this.chunks.length; i++) {
            const len = this.chunks[i].length;
            if (globalIndex < cumulative + len) {
                targetChunk = i;
                localIndex = globalIndex - cumulative;
                break;
            }
            cumulative += len;
        }

        this.currentChunkIndex = targetChunk;
        this.lastBoundaryCharIndex = localIndex;

        this.performSmartRestart(true);
    }

    private performSmartRestart(forceIndex: boolean = false) {
        this.isVolumeRestart = true;
        this.synthesis.cancel();

        const elapsedSinceStart = Math.max(0, (Date.now() - this.startTime) / 1000);
        const estimatedLocalCharIndex = Math.floor(elapsedSinceStart * this.charsPerSec);

        const currentText = this.chunks[this.currentChunkIndex];
        if (!currentText) {
            this.isVolumeRestart = false;
            return;
        }

        const safeLimit = Math.max(0, currentText.length - 10);

        const restartLocalIndex = Math.min(
            safeLimit,
            forceIndex ? this.lastBoundaryCharIndex : Math.max(this.lastBoundaryCharIndex, estimatedLocalCharIndex)
        );

        setTimeout(() => {
            this.isVolumeRestart = false;

            let sliceIndex = restartLocalIndex;
            if (restartLocalIndex > 0 && restartLocalIndex < currentText.length) {
                const lastSpace = currentText.lastIndexOf(" ", restartLocalIndex);
                if (lastSpace > 0) sliceIndex = lastSpace + 1;
            }

            // Update global offset to account for skipped characters
            this.globalCharOffset += sliceIndex;

            const remainder = currentText.substring(sliceIndex).trim();

            if (remainder.length > 0) {
                this.chunks[this.currentChunkIndex] = remainder;
            } else {
                this.currentChunkIndex++;
            }

            this.lastBoundaryCharIndex = 0;
            this.startTime = Date.now();

            this.playNextChunk();
        }, 50);
    }
}
