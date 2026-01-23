export interface Voice {
    id: string;
    name: string;
    provider: 'web-speech' | 'elevenlabs';
    nativeVoiceObj?: any; // For WebSpeech
}

export interface WordBoundaryEvent {
    charIndex: number;
    charLength?: number;
    name?: string; // e.g. 'word' or 'sentence'
}

export interface AudioProvider {
    play(text: string, voiceId: string, speed: number, onBoundary?: (e: WordBoundaryEvent) => void): Promise<void>;
    pause(): void;
    resume(): void;
    stop(): void;
    getVoices(): Promise<Voice[]>;
    getCurrentTime?(): number;
    getDuration?(): number;
    getDuration?(): number;
    setVolume?(volume: number): void;
    seek?(time: number): void;
    download?(text: string, voiceId: string): Promise<void>;
}
