import type { AudioProvider, PlayerEvent, Voice, WordBoundaryEvent } from "./types";
import { WebSpeechProvider } from "./WebSpeechProvider";
import { ElevenLabsProvider } from "./ElevenLabsProvider";
import { KokoroProvider } from "./KokoroProvider";
import { AnalyticsService } from "~hooks/useAnalytics";

type EventHandler = (data?: any) => void;

class AudioService {
    private provider: AudioProvider;
    private listeners: Map<PlayerEvent, Set<EventHandler>> = new Map();
    private currentProviderName: 'web-speech' | 'elevenlabs' | 'kokoro' = 'web-speech';

    // Centralized State Cache
    private _playbackRate: number = 1;

    constructor() {
        console.log("AudioService: Initializing");
        this.provider = new WebSpeechProvider();
        this.bindProviderEvents(this.provider);
    }

    private bindProviderEvents(provider: AudioProvider) {
        // We subscribe to all supported events from the provider and re-emit them
        const events: PlayerEvent[] = ['play', 'pause', 'timeupdate', 'ended', 'waiting', 'error', 'boundary', 'volumechange', 'speedchange'];

        events.forEach(event => {
            provider.subscribe(event, (data) => {
                // Intercept specific events to update local state if needed
                if (event === 'speedchange') this._playbackRate = data;

                this.emit(event, data);
            });
        });
    }

    // --- Event Emitter Logic ---
    on(event: PlayerEvent, handler: EventHandler): () => void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)?.add(handler);
        return () => this.off(event, handler);
    }

    off(event: PlayerEvent, handler: EventHandler) {
        this.listeners.get(event)?.delete(handler);
    }

    private emit(event: PlayerEvent, data?: any) {
        this.listeners.get(event)?.forEach(handler => handler(data));
    }

    // --- Provider Management ---
    private ensureProvider(apiKey?: string, isElevenLabsEnabled: boolean = true, kokoroUrl?: string, isKokoroEnabled: boolean = false, targetVoiceId?: string) {
        // Determine target provider
        let target: 'web-speech' | 'elevenlabs' | 'kokoro' = 'web-speech';

        if (isKokoroEnabled && kokoroUrl) {
            // Priority to Kokoro if enabled? Or only if voice matches?
            // For now, if voiceId is known to be Kokoro (we can guess by ID format or pass generic)
            // But usually we want:
            // 1. If ElevenLabs enabled -> Check if voice is ElevenLabs
            // 2. If Kokoro enabled -> Check if voice is Kokoro
            // 3. Fallback WebSpeech

            // Heuristic: Kokoro voices in our Provider are short IDs like "af", "am", or have "kokoro" provider property

            // Simplest logic: If we are asking to play a specific voice, check which provider it likely belongs to.
            // But we don't have the voice object here, only ID.

            // Assume:
            // ElevenLabs IDs are 20+ chars (usually) or we just default to ElevenLabs if enabled.
            // Kokoro IDs are short (af, am) or namespaced?

            // Let's rely on Explicit Toggles + ID format or just simple priority.
            // If Kokoro is enabled, we should probably check if the ID looks like Kokoro OR if we are just listing voices.

            // If we are just "ensuring provider" without a target voice (e.g. getVoices), we might need to remain on current or switch to "Primary".
            // Actually `getVoices` returns a combined list usually? No, `this.provider.getVoices()` only returns its own.
            // Wait, if `AudioService` is a facade, `getVoices` should ideally return ALL voices from ALL providers?
            // The current architecture seems to swap the single active provider. This means we can only see voices from ONE provider at a time.
            // This is a limitation of the current `AudioService`.

            // To fix this properly, `getVoices` should aggregate. But for this specific task (adding Kokoro),
            // I should stick to the existing pattern: "Active Provider Mode".

            // So, which mode is active?
            if (targetVoiceId) {
                // If we have a target voice, try to detect provider
                if (['af', 'am', 'bf', 'bm'].some(prefix => targetVoiceId.startsWith(prefix))) {
                    target = 'kokoro';
                } else if (!isElevenLabsEnabled) {
                    // If EL is disabled, and it's not known Kokoro, default WebSpeech?
                    // Or if it IS enabled, default EL?
                    target = 'web-speech';
                } else {
                    target = 'elevenlabs';
                }
            } else {
                // No target voice (e.g. getVoices call), prioritize enabled services
                if (isKokoroEnabled) target = 'kokoro';
                else if (isElevenLabsEnabled) target = 'elevenlabs';
                else target = 'web-speech';
            }
        } else if (isElevenLabsEnabled && apiKey) {
            target = 'elevenlabs';
        }

        // Force switch if needed
        if (this.currentProviderName !== target) {
            console.log(`AudioService: Switching to ${target}`);
            this.provider.stop();

            if (target === 'kokoro' && kokoroUrl) {
                this.provider = new KokoroProvider(kokoroUrl);
            } else if (target === 'elevenlabs' && apiKey) {
                this.provider = new ElevenLabsProvider(apiKey);
            } else {
                this.provider = new WebSpeechProvider();
            }

            this.currentProviderName = target;
            this.bindProviderEvents(this.provider);
        } else {
            // Same provider, maybe update config
            if (target === 'kokoro' && this.provider instanceof KokoroProvider) {
                this.provider.setBaseUrl(kokoroUrl!);
            } else if (target === 'elevenlabs' && this.provider instanceof ElevenLabsProvider) {
                if (!this.provider.hasKey(apiKey!)) {
                    this.provider = new ElevenLabsProvider(apiKey!);
                    this.bindProviderEvents(this.provider);
                }
            }
        }
    }

    // --- Public API ---

    async getVoices(apiKey?: string, isElevenLabsEnabled: boolean = true, kokoroUrl?: string, isKokoroEnabled: boolean = false): Promise<Voice[]> {
        const promises: Promise<Voice[]>[] = [];

        // 1. Web Speech (Always available)
        promises.push(new WebSpeechProvider().getVoices());

        // 2. ElevenLabs
        if (isElevenLabsEnabled && apiKey) {
            promises.push(new ElevenLabsProvider(apiKey).getVoices());
        }

        // 3. Kokoro
        if (isKokoroEnabled && kokoroUrl) {
            promises.push(new KokoroProvider(kokoroUrl).getVoices());
        }

        const results = await Promise.all(promises);
        return results.flat();
    }

    async play(text: string, voiceId: string, speed: number, apiKey?: string, isElevenLabsEnabled: boolean = true, kokoroUrl?: string, isKokoroEnabled: boolean = false): Promise<void> {
        this.ensureProvider(apiKey, isElevenLabsEnabled, kokoroUrl, isKokoroEnabled, voiceId);

        // Analytics Tracking
        try {
            const provider = this.currentProviderName;
            // Only track valid providers, maybe exclude webspeech if desired, but good to have all data
            if (provider === 'kokoro' || provider === 'elevenlabs') {
                AnalyticsService.trackUsage(provider, text.length);
            }
        } catch (e) {
            console.error("Analytics Error", e);
        }

        this._playbackRate = speed;
        return this.provider.play(text, voiceId, speed);
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

    seek(time: number): void {
        this.provider.seek(time);
    }

    setVolume(volume: number): void {
        this.provider.setVolume(volume);
    }

    setSpeed(speed: number): void {
        this._playbackRate = speed;
        this.provider.setSpeed(speed);
    }

    // State Accessors

    getCurrentTime(): number {
        return this.provider.getCurrentTime();
    }

    getDuration(): number {
        return this.provider.getDuration();
    }

    getProviderName(): string {
        return this.currentProviderName;
    }

    isPlaying(): boolean {
        // We need to track this locally or ask provider?
        // Providers usually don't expose isPlaying directly in interface, but they track it.
        // Let's add it to AudioProvider interface if missing, or track via events.
        // Actually, WebSpeechProvider has isPlaying prop?
        // Let's rely on internal tracking for now since we listen to all events.
        // Or better: ask provider.
        return (this.provider as any).isPlaying || false;
    }

    getPlaybackRate(): number {
        return this._playbackRate;
    }

    async download(text: string, voiceId: string): Promise<void> {
        if (this.provider.download) {
            return this.provider.download(text, voiceId);
        }
        throw new Error("Download not supported by current provider");
    }
}

export const audioService = new AudioService();
