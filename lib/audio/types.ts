export interface Voice {
    id: string;
    name: string;
    provider: 'web-speech' | 'elevenlabs' | 'kokoro' | 'sarvam';
    nativeVoiceObj?: any; // For WebSpeech
    description?: string;
}

export interface WordBoundaryEvent {
    charIndex: number;
    charLength?: number;
    name?: string; // e.g. 'word' or 'sentence'
}

export interface AudioProvider {
    subscribe(event: string, callback: (data?: any) => void): () => void;

    play(text: string, voiceId: string, speed: number): Promise<void>;
    pause(): void;
    resume(): void;
    stop(): void;
    seek(time: number): void;
    setVolume(volume: number): void;
    setSpeed(speed: number): void;

    getVoices(): Promise<Voice[]>;
    getCurrentTime(): number;
    getDuration(): number;
    isPlaying?: boolean | (() => boolean); // Optional for now
    download?(text: string, voiceId: string): Promise<void>;
    generateAudioBlob?(text: string, voiceId: string, speed: number): Promise<Blob>;
}

export type PlayerEvent =
    | 'play'
    | 'pause'
    | 'timeupdate'
    | 'ended'
    | 'waiting'
    | 'error'
    | 'boundary'
    | 'volumechange'
    | 'speedchange';
