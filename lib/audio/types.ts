export interface Voice {
    id: string;
    name: string;
    provider: 'web-speech' | 'elevenlabs';
    nativeVoiceObj?: any; // For WebSpeech
}

export interface WordBoundaryEvent {
    charIndex: number;
    charLength?: number;
}

export interface AudioProvider {
    play(text: string, voiceId: string, speed: number, onBoundary?: (e: WordBoundaryEvent) => void): Promise<void>;
    pause(): void;
    resume(): void;
    stop(): void;
    getVoices(): Promise<Voice[]>;
    getCurrentTime?(): number;
    getDuration?(): number;
    setVolume?(volume: number): void;
}
