import type { AudioProvider, Voice, WordBoundaryEvent } from "./types";
import { WebSpeechProvider } from "./WebSpeechProvider";
import { ElevenLabsProvider } from "./ElevenLabsProvider";

class AudioService {
    private provider: AudioProvider;
    // private currentApiKey: string | null = null; // Removed state

    constructor() {
        console.log("AudioService: Initializing (Default: WebSpeechProvider)");
        this.provider = new WebSpeechProvider();
    }

    // Stateless: Switch provider based on key presence AND toggle
    private ensureProvider(apiKey?: string, isElevenLabsEnabled: boolean = true) {
        if (apiKey && isElevenLabsEnabled) {
            // Check if current provider is ElevenLabs and has the same key
            if (this.provider instanceof ElevenLabsProvider && this.provider.hasKey(apiKey)) {
                return; // Same key, keep using it (preserves state)
            }

            console.log("AudioService: Switching to ElevenLabsProvider (Key+Enabled)");
            this.provider = new ElevenLabsProvider(apiKey);
        } else {
            if (!(this.provider instanceof WebSpeechProvider)) {
                console.log("AudioService: Switching to WebSpeechProvider");
                this.provider = new WebSpeechProvider();
            }
        }
    }

    async getVoices(apiKey?: string, isElevenLabsEnabled: boolean = true): Promise<Voice[]> {
        this.ensureProvider(apiKey, isElevenLabsEnabled);
        return this.provider.getVoices();
    }

    async play(text: string, voiceId: string, speed: number, apiKey?: string, isElevenLabsEnabled: boolean = true, onBoundary?: (e: WordBoundaryEvent) => void): Promise<void> {
        this.ensureProvider(apiKey, isElevenLabsEnabled);
        return this.provider.play(text, voiceId, speed, onBoundary);
    }

    pause(): void {
        this.provider.pause();
    }

    resume(): void {
        this.provider.resume();
    }

    stop(): void {
        this.provider.stop();
    }

    getCurrentTime(): number {
        return this.provider.getCurrentTime ? this.provider.getCurrentTime() : 0;
    }

    getDuration(): number {
        return this.provider.getDuration ? this.provider.getDuration() : 0;
    }

    getProviderName(): string {
        return this.provider instanceof WebSpeechProvider ? "WebSpeechProvider" : "ElevenLabsProvider";
    }

    setVolume(volume: number): void {
        if (this.provider.setVolume) {
            this.provider.setVolume(volume);
        }
    }
}

export const audioService = new AudioService();
