/**
 * SpeedReaderEngine - RSVP-only text reader without audio
 * 
 * Uses timer-based word progression with adjustable WPM (400-1500)
 */

export type SpeedReaderCallback = (wordIndex: number, word: string) => void;

export class SpeedReaderEngine {
    private words: string[] = [];
    private wordIndex: number = 0;
    private wpm: number = 400;
    private intervalId: NodeJS.Timeout | null = null;
    private isPlaying: boolean = false;
    private onWordChange?: SpeedReaderCallback;
    private onComplete?: () => void;

    /**
     * Load text and split into words
     */
    setText(text: string): void {
        this.words = text
            .replace(/\s+/g, ' ')
            .trim()
            .split(' ')
            .filter(w => w.length > 0);
        this.wordIndex = 0;
    }

    /**
     * Set words per minute (400-1500)
     */
    setWpm(wpm: number): void {
        this.wpm = Math.max(400, Math.min(1500, wpm));
        // If playing, restart with new speed
        if (this.isPlaying) {
            this.stopTimer();
            this.startTimer();
        }
    }

    getWpm(): number {
        return this.wpm;
    }

    /**
     * Set callback for word changes
     */
    setOnWordChange(callback: SpeedReaderCallback): void {
        this.onWordChange = callback;
    }

    setOnComplete(callback: () => void): void {
        this.onComplete = callback;
    }

    /**
     * Start playback
     */
    play(): void {
        if (this.words.length === 0) return;
        if (this.wordIndex >= this.words.length) {
            this.wordIndex = 0; // Restart if at end
        }
        this.isPlaying = true;
        this.emitWord();
        this.startTimer();
    }

    /**
     * Pause playback
     */
    pause(): void {
        this.isPlaying = false;
        this.stopTimer();
    }

    /**
     * Toggle play/pause
     */
    toggle(): void {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    /**
     * Seek to specific word index
     */
    seekToWord(index: number): void {
        this.wordIndex = Math.max(0, Math.min(index, this.words.length - 1));
        this.emitWord();
    }

    /**
     * Seek by percentage (0-1)
     */
    seekByProgress(progress: number): void {
        const index = Math.floor(progress * this.words.length);
        this.seekToWord(index);
    }

    /**
     * Restart from beginning
     */
    restart(): void {
        this.wordIndex = 0;
        this.emitWord();
        if (this.isPlaying) {
            this.stopTimer();
            this.startTimer();
        }
    }

    /**
     * Stop and reset
     */
    stop(): void {
        this.isPlaying = false;
        this.stopTimer();
        this.wordIndex = 0;
    }

    /**
     * Get total word count
     */
    getTotalWords(): number {
        return this.words.length;
    }

    /**
     * Get current word index
     */
    getCurrentWordIndex(): number {
        return this.wordIndex;
    }

    /**
     * Get current word
     */
    getCurrentWord(): string {
        return this.words[this.wordIndex] || '';
    }

    /**
     * Get progress (0-1)
     */
    getProgress(): number {
        if (this.words.length === 0) return 0;
        return this.wordIndex / this.words.length;
    }

    /**
     * Get estimated reading time in seconds
     */
    getEstimatedDuration(): number {
        return (this.words.length / this.wpm) * 60;
    }

    /**
     * Get current "time" based on word position
     */
    getCurrentTime(): number {
        return (this.wordIndex / this.wpm) * 60;
    }

    /**
     * Check if playing
     */
    getIsPlaying(): boolean {
        return this.isPlaying;
    }

    // --- Private Methods ---

    private startTimer(): void {
        const intervalMs = 60000 / this.wpm;
        this.intervalId = setInterval(() => {
            this.wordIndex++;
            if (this.wordIndex >= this.words.length) {
                this.stop();
                this.onComplete?.();
                return;
            }
            this.emitWord();
        }, intervalMs);
    }

    private stopTimer(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    private emitWord(): void {
        if (this.onWordChange && this.words[this.wordIndex]) {
            this.onWordChange(this.wordIndex, this.words[this.wordIndex]);
        }
    }
}

// Singleton instance
export const speedReaderEngine = new SpeedReaderEngine();
