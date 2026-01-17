import type { AudioProvider, Voice, WordBoundaryEvent } from "./types";

export class ElevenLabsProvider implements AudioProvider {
    private apiKey: string;
    private audioQueue: HTMLAudioElement[] = [];
    private currentAudio: HTMLAudioElement | null = null;
    private isPlaying: boolean = false;
    private abortController: AbortController | null = null;
    private volume: number = 1;

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
        this.stop(); // Stop previous

        // Small delay to ensure clean state for replay
        await new Promise(r => setTimeout(r, 50));

        this.isPlaying = true;
        this.abortController = new AbortController();

        const chunks = this.splitTextSmartly(text, 500);

        // We track global char index across chunks
        let globalCharIndex = 0;

        for (const chunk of chunks) {
            if (!this.isPlaying) break;
            if (this.abortController.signal.aborted) break;

            try {
                const blob = await this.fetchAudio(chunk, voiceId);
                if (!blob) {
                    globalCharIndex += chunk.length + 1; // +1 for space/separator
                    continue;
                }

                await this.playBlob(blob, speed, chunk, globalCharIndex, onBoundary);
                globalCharIndex += chunk.length + 1;
            } catch (e) {
                console.error("Error playing chunk", e);
            }
        }

        this.isPlaying = false;
    }

    private async fetchAudio(text: string, voiceId: string): Promise<Blob | null> {
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

            if (!response.ok) {
                console.error("ElevenLabs API Error", await response.text());
                return null;
            }

            return await response.blob();
        } catch (e) {
            if (e.name === 'AbortError') return null;
            console.error(e);
            return null;
        }
    }

    private async playBlob(
        blob: Blob,
        speed: number,
        textChunk: string,
        startIndex: number,
        onBoundary?: (e: WordBoundaryEvent) => void
    ): Promise<void> {
        return new Promise((resolve, reject) => {
            if (!this.isPlaying) {
                resolve();
                return;
            }

            const url = URL.createObjectURL(blob);
            const audio = new Audio(url);
            this.currentAudio = audio;
            audio.playbackRate = speed;

            // ESTIMATION LOGIC
            // To simulate karaoke, we assume words are spoken evenly distrubuted over time.
            // This is imperfect but better than nothing for raw audio.
            let intervalId: NodeJS.Timeout;

            if (onBoundary) {
                audio.onloadedmetadata = () => {
                    const duration = audio.duration / speed;
                    const words = textChunk.split(/(\s+)/); // split but keep separators to count chars correctly
                    let charCount = 0;
                    let wordIndex = 0;

                    // Simple estimation: emit word events based on fraction of duration
                    // A better way: pre-calculate word timings? No data.
                    // Let's just emit events linearly? No, that's too robotic.
                    // Let's try to map word length to duration fraction? 
                    // length / totalLength * duration

                    const totalChars = textChunk.length;
                    let accumulatedTime = 0;
                    let timeMap: { time: number, index: number }[] = [];

                    for (let i = 0; i < words.length; i++) {
                        const word = words[i];
                        // Should we highlight separators? usually not.
                        // boundary event usually fires at start of word.
                        if (word.trim().length > 0) {
                            const percent = word.length / totalChars;
                            const time = percent * duration * 1000; // ms
                            timeMap.push({ time: accumulatedTime, index: startIndex + charCount });
                            accumulatedTime += time;
                        } else {
                            // space/separator, just add duration but no event? 
                            // Or just assume spaces take small time?
                            const percent = word.length / totalChars;
                            accumulatedTime += percent * duration * 1000;
                        }
                        charCount += word.length;
                    }

                    // Now play and check time
                    const startTime = Date.now();
                    let currentWordIdx = 0;

                    intervalId = setInterval(() => {
                        if (!this.isPlaying || audio.paused) return;
                        const elapsed = (Date.now() - startTime) * speed; // scale by speed? 
                        // Actually audio.currentTime is better source if available
                        const currentT = audio.currentTime * 1000;

                        // Find next word
                        // simple: check if currentT passed the next word's expected start time
                        // We need to match currentT to timeMap
                        while (currentWordIdx < timeMap.length && currentT >= timeMap[currentWordIdx].time) {
                            onBoundary({ charIndex: timeMap[currentWordIdx].index });
                            currentWordIdx++;
                        }
                    }, 50);
                };
            }


            audio.onended = () => {
                clearInterval(intervalId);
                URL.revokeObjectURL(url);
                this.currentAudio = null;
                resolve();
            };

            audio.onerror = (e) => {
                clearInterval(intervalId);
                URL.revokeObjectURL(url);
                this.currentAudio = null;
                reject(e);
            };

            audio.volume = this.volume;
            audio.play().catch(reject);
        });
    }


    pause(): void {
        this.isPlaying = false;
        if (this.currentAudio) {
            this.currentAudio.pause();
        }
    }

    resume(): void {
        this.isPlaying = true;
        if (this.currentAudio) {
            this.currentAudio.play();
        }
    }

    stop(): void {
        this.isPlaying = false;
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
    }

    getCurrentTime(): number {
        return this.currentAudio?.currentTime || 0;
    }

    getDuration(): number {
        return this.currentAudio?.duration || 0;
    }

    setVolume(volume: number): void {
        this.volume = volume;
        if (this.currentAudio) {
            this.currentAudio.volume = volume;
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
        return chunks;
    }
}
