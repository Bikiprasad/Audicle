import type { Voice } from "./audio/types"

export const KOKORO_VOICES: Voice[] = [
    // FEMALE VOICES (10)
    { name: 'Bella', id: 'af_bella', description: 'American Female, Natural', provider: 'kokoro' },
    { name: 'Sarah', id: 'af_sarah', description: 'American Female, Soft', provider: 'kokoro' },
    { name: 'Nicole', id: 'af_nicole', description: 'American Female, Professional', provider: 'kokoro' },
    { name: 'Sky', id: 'af_sky', description: 'American Female, Clear', provider: 'kokoro' },
    { name: 'Aoede', id: 'af_aoede', description: 'American Female, Expressive', provider: 'kokoro' },
    { name: 'Jessica', id: 'af_jessica', description: 'American Female, Warm', provider: 'kokoro' },
    { name: 'Emma', id: 'bf_emma', description: 'British Female, Proper', provider: 'kokoro' },
    { name: 'Isabella', id: 'bf_isabella', description: 'British Female, Elegant', provider: 'kokoro' },
    { name: 'Alice', id: 'bf_alice', description: 'British Female, Calm', provider: 'kokoro' },
    { name: 'Lily', id: 'bf_lily', description: 'British Female, Youthful', provider: 'kokoro' },

    // MALE VOICES (10)
    { name: 'Michael', id: 'am_michael', description: 'American Male, Deep', provider: 'kokoro' },
    { name: 'Adam', id: 'am_adam', description: 'American Male, Authoritative', provider: 'kokoro' },
    { name: 'Echo', id: 'am_echo', description: 'American Male, Balanced', provider: 'kokoro' },
    { name: 'Eric', id: 'am_eric', description: 'American Male, Friendly', provider: 'kokoro' },
    { name: 'Liam', id: 'am_liam', description: 'American Male, Neutral', provider: 'kokoro' },
    { name: 'Onyx', id: 'am_onyx', description: 'American Male, Dark', provider: 'kokoro' },
    { name: 'Santa', id: 'am_santa', description: 'American Male, Jolly', provider: 'kokoro' },
    { name: 'Lewis', id: 'bm_lewis', description: 'British Male, Narrator', provider: 'kokoro' },
    { name: 'George', id: 'bm_george', description: 'British Male, Formal', provider: 'kokoro' },
    { name: 'Fable', id: 'bm_fable', description: 'British Male, Storyteller', provider: 'kokoro' },
];
