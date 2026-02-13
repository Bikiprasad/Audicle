import type { AudioProvider, Voice } from "./types";
import { audioCache } from "./AudioCache";

type EventHandler = (data?: any) => void;

interface SarvamVoice {
    voice_id: string; // e.g. "hi-IN-male"
    name: string;
    description?: string;
}

export class SarvamProvider implements AudioProvider {
    private apiKey: string;
    public isPlaying: boolean = false;
    private volume: number = 1;

    // Event System
    private listeners: Map<string, Set<EventHandler>> = new Map();

    private audio: HTMLAudioElement | null = null;

    // Audio Queue for chunked playback
    private audioQueue: ArrayBuffer[] = [];
    private isPlayingQueue: boolean = false;
    private currentChunkIndex: number = 0;
    private totalChunks: number = 0;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
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

    hasKey(key: string): boolean {
        return this.apiKey === key;
    }

    async getVoices(): Promise<Voice[]> {
        // Comprehensive list of Sarvam Bulbul v3 speakers and languages
        const languages = [
            { code: "hi-IN", name: "Hindi" },
            { code: "bn-IN", name: "Bengali" },
            { code: "kn-IN", name: "Kannada" },
            { code: "ml-IN", name: "Malayalam" },
            { code: "mr-IN", name: "Marathi" },
            { code: "od-IN", name: "Odia" },
            { code: "pa-IN", name: "Punjabi" },
            { code: "ta-IN", name: "Tamil" },
            { code: "te-IN", name: "Telugu" },
            { code: "gu-IN", name: "Gujarati" },
            { code: "en-IN", name: "English (Indian)" }
        ];

        // Sarvam Bulbul v3 speakers with comprehensive descriptions
        const speakers = {
            male: [
                { id: "shubh", name: "Shubh", description: "Conversational, friendly (Default)" },
                { id: "aditya", name: "Aditya", description: "Warm, professional" },
                { id: "rahul", name: "Rahul", description: "Clear, articulate" },
                { id: "rohan", name: "Rohan", description: "Energetic, youthful" },
                { id: "amit", name: "Amit", description: "Calm, reassuring" },
                { id: "dev", name: "Dev", description: "Confident, modern" },
                { id: "ratan", name: "Ratan", description: "Mature, authoritative" },
                { id: "varun", name: "Varun", description: "Dynamic, engaging" },
                { id: "manan", name: "Manan", description: "Conversational, consistent" },
                { id: "sumit", name: "Sumit", description: "Smooth, pleasant" },
                { id: "kabir", name: "Kabir", description: "Deep, commanding" },
                { id: "aayan", name: "Aayan", description: "Gentle, soothing" },
                { id: "ashutosh", name: "Ashutosh", description: "Professional, clear" },
                { id: "advait", name: "Advait", description: "Thoughtful, measured" },
                { id: "anand", name: "Anand", description: "Cheerful, upbeat" },
                { id: "tarun", name: "Tarun", description: "Versatile, natural" },
                { id: "sunny", name: "Sunny", description: "Bright, optimistic" },
                { id: "mani", name: "Mani", description: "Steady, reliable" },
                { id: "gokul", name: "Gokul", description: "Rich, expressive" },
                { id: "vijay", name: "Vijay", description: "Strong, confident" },
                { id: "mohit", name: "Mohit", description: "Friendly, approachable" },
                { id: "rehan", name: "Rehan", description: "Sophisticated, polished" },
                { id: "soham", name: "Soham", description: "Balanced, neutral" }
            ],
            female: [
                { id: "shreya", name: "Shreya", description: "News, authoritative" },
                { id: "ritu", name: "Ritu", description: "Warm, nurturing" },
                { id: "priya", name: "Priya", description: "Sweet, melodious" },
                { id: "neha", name: "Neha", description: "Bright, cheerful" },
                { id: "pooja", name: "Pooja", description: "Gentle, soothing" },
                { id: "simran", name: "Simran", description: "Elegant, refined" },
                { id: "kavya", name: "Kavya", description: "Expressive, vibrant" },
                { id: "ishita", name: "Ishita", description: "Entertainment, dynamic" },
                { id: "roopa", name: "Roopa", description: "Professional, clear" },
                { id: "amelia", name: "Amelia", description: "Modern, cosmopolitan" },
                { id: "sophia", name: "Sophia", description: "Sophisticated, polished" },
                { id: "tanya", name: "Tanya", description: "Energetic, youthful" },
                { id: "shruti", name: "Shruti", description: "Calm, reassuring" },
                { id: "suhani", name: "Suhani", description: "Pleasant, friendly" },
                { id: "kavitha", name: "Kavitha", description: "Articulate, confident" },
                { id: "rupali", name: "Rupali", description: "Versatile, natural" }
            ]
        };

        const voices: Voice[] = [];

        // Generate voices for each language-speaker combination
        for (const lang of languages) {
            for (const speaker of [...speakers.male, ...speakers.female]) {
                const description = speaker.description
                    ? `${lang.name} • ${speaker.description}`
                    : `${lang.name}`;

                voices.push({
                    id: `sarvam-${lang.code}-${speaker.id}`,
                    name: `${speaker.name} (${lang.name})`,
                    description,
                    provider: 'sarvam',
                    nativeVoiceObj: { language: lang.code, speaker: speaker.id }
                });
            }
        }

        return voices;
    }

    /**
     * Smart text chunking with multi-tier fallback strategy
     * Tries to split at natural boundaries: sentences > paragraphs > lines > words > hard split
     */
    private chunkText(text: string, maxChars: number = 500): string[] {
        if (text.length <= maxChars) return [text];

        const chunks: string[] = [];
        let remaining = text;

        while (remaining.length > maxChars) {
            let chunkEnd = maxChars;

            // Tier 1: Try to split at sentence boundaries (. ! ? followed by space)
            const sentenceMatch = remaining.slice(0, maxChars).match(/[.!?]\s/g);
            if (sentenceMatch && sentenceMatch.length > 0) {
                const lastSentence = remaining.slice(0, maxChars).lastIndexOf(sentenceMatch[sentenceMatch.length - 1]);
                if (lastSentence > maxChars * 0.5) { // At least 50% of max
                    chunkEnd = lastSentence + 2; // Include punctuation + space
                }
            }

            // Tier 2: If no sentence boundary, try paragraph break (\n\n)
            if (chunkEnd === maxChars) {
                const paragraphBreak = remaining.slice(0, maxChars).lastIndexOf('\n\n');
                if (paragraphBreak > maxChars * 0.3) { // At least 30% of max
                    chunkEnd = paragraphBreak + 2;
                }
            }

            // Tier 3: If no paragraph, try single line break (\n)
            if (chunkEnd === maxChars) {
                const lineBreak = remaining.slice(0, maxChars).lastIndexOf('\n');
                if (lineBreak > maxChars * 0.3) {
                    chunkEnd = lineBreak + 1;
                }
            }

            // Tier 4: Try to split at word boundary (space)
            if (chunkEnd === maxChars) {
                const lastSpace = remaining.slice(0, maxChars).lastIndexOf(' ');
                if (lastSpace > maxChars * 0.5) { // At least 50% of max
                    chunkEnd = lastSpace + 1;
                }
            }

            // Tier 5: Hard split at maxChars (last resort for continuous text with no spaces)
            // This only happens for 2000+ chars with no spaces/breaks

            chunks.push(remaining.slice(0, chunkEnd).trim());
            remaining = remaining.slice(chunkEnd).trim();
        }

        if (remaining) chunks.push(remaining);

        console.log(`Sarvam: Split text into ${chunks.length} chunks`);
        return chunks;
    }

    /**
     * Format numbers in text for better speech pronunciation
     * Adds commas to numbers larger than 4 digits (e.g., 10000 -> 10,000)
     */
    private formatNumbersForSpeech(text: string): string {
        // Match numbers with 5+ digits that don't already have commas
        return text.replace(/\b(\d{5,})\b/g, (match) => {
            // Only format if it doesn't already have commas
            if (match.includes(',')) return match;

            // Add commas for thousands separators
            return match.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        });
    }

    /**
     * Translate text to target language using Sarvam Translation API
     */
    private async translateText(text: string, targetLangCode: string): Promise<string> {
        try {
            const response = await fetch("https://api.sarvam.ai/translate", {
                method: "POST",
                headers: {
                    "api-subscription-key": this.apiKey,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    input: text,
                    source_language_code: "en-IN",
                    target_language_code: targetLangCode,
                    speaker_gender: "Male",
                    mode: "formal",
                    model: "mayura:v1",
                    enable_preprocessing: true
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Sarvam Translation API Error: ${response.status} ${errorText}`);
                // Return original text if translation fails
                return text;
            }

            const data = await response.json();
            return data.translated_text || text;
        } catch (error) {
            console.error("Translation failed:", error);
            // Fallback to original text on error
            return text;
        }
    }


    async play(text: string, voiceId: string, speed: number): Promise<void> {
        this.stop();

        this.isPlaying = true;
        this.emit('play');
        this.emit('waiting');

        try {
            // Parse voice ID format: "sarvam-hi-IN-shubh" -> language: "hi-IN", speaker: "shubh"
            const parts = voiceId.replace('sarvam-', '').split('-');

            // Extract language code (e.g., "hi-IN" from ["hi", "IN", "shubh"])
            let langCode: string;
            let speakerId: string;

            if (parts.length >= 3) {
                // Format: sarvam-{lang}-{country}-{speaker}
                langCode = `${parts[0]}-${parts[1]}`;
                speakerId = parts.slice(2).join('-');
            } else {
                // Fallback for old format or malformed IDs
                langCode = parts[0] || 'hi-IN';
                speakerId = 'meera';
            }

            // Chunk the text for better UX on long articles
            const chunks = this.chunkText(text);
            this.totalChunks = chunks.length;
            this.currentChunkIndex = 0;
            this.audioQueue = [];

            console.log(`Sarvam: Processing ${chunks.length} chunk(s)`);

            // Process each chunk sequentially
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                console.log(`Sarvam: Processing chunk ${i + 1}/${chunks.length}`);

                // Auto-translate if target language is not English
                let finalText = chunk;
                if (langCode !== 'en-IN') {
                    // Format numbers before translation for better pronunciation
                    const formattedChunk = this.formatNumbersForSpeech(chunk);
                    console.log(`Sarvam: Translating chunk ${i + 1} to ${langCode}...`);
                    finalText = await this.translateText(formattedChunk, langCode);
                } else {
                    // Even for English, format numbers for better pronunciation
                    finalText = this.formatNumbersForSpeech(chunk);
                }

                // Check if translated/formatted text exceeds 500 char limit (Strict Sarvam TTS limit)
                let finalChunks: string[] = [finalText];
                if (finalText.length > 500) {
                    console.warn(`Sarvam: Translated text too long (${finalText.length} chars), re-chunking...`);
                    finalChunks = this.chunkText(finalText, 500);
                }

                for (const subChunk of finalChunks) {
                    // Check cache with translated text
                    let buffer = await audioCache.get(subChunk, voiceId);

                    if (!buffer) {
                        const response = await fetch("https://api.sarvam.ai/text-to-speech", {
                            method: "POST",
                            headers: {
                                "api-subscription-key": this.apiKey,
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                inputs: [subChunk],
                                target_language_code: langCode,
                                speaker: speakerId,
                                pace: speed,
                                speech_sample_rate: 48000,
                                enable_preprocessing: true,
                                model: "bulbul:v3"
                            })
                        });

                        if (!response.ok) {
                            const errorText = await response.text();
                            throw new Error(`Sarvam API Error: ${response.status} ${errorText}`);
                        }

                        const data = await response.json();
                        if (data && data.audios && data.audios[0]) {
                            // Base64 decode
                            const binaryString = atob(data.audios[0]);
                            const len = binaryString.length;
                            const bytes = new Uint8Array(len);
                            for (let j = 0; j < len; j++) {
                                bytes[j] = binaryString.charCodeAt(j);
                            }
                            buffer = bytes.buffer;

                            await audioCache.set(subChunk, voiceId, buffer);
                        } else {
                            throw new Error("Invalid response format from Sarvam API");
                        }
                    }

                    // Add to queue
                    this.audioQueue.push(buffer);
                    this.totalChunks = this.audioQueue.length; // Update total chunks if we split further
                }

                // Start playing first chunk immediately if not already playing
                if (i === 0 && !this.isPlayingQueue) {
                    this.playQueue();
                }
            }

        } catch (error) {
            console.error("Sarvam Play Error:", error);
            this.emit('error', error);
            this.isPlaying = false;
        }
    }

    /**
     * Generate complete audio blob for download/export (no playback)
     * Handles chunking, translation, and concatenation
     */
    async generateAudioBlob(text: string, voiceId: string, speed: number): Promise<Blob> {
        console.log('Sarvam: Generating audio blob for download...');

        // Parse voice ID
        const parts = voiceId.replace('sarvam-', '').split('-');
        let langCode: string;
        let speakerId: string;

        if (parts.length >= 3) {
            langCode = `${parts[0]}-${parts[1]}`;
            speakerId = parts.slice(2).join('-');
        } else {
            langCode = parts[0] || 'hi-IN';
            speakerId = 'meera';
        }

        // Chunk the text
        const chunks = this.chunkText(text);
        const audioBuffers: ArrayBuffer[] = [];

        // Process each chunk
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            console.log(`Sarvam: Generating chunk ${i + 1}/${chunks.length} for download`);

            // Format numbers and translate if needed
            let finalText = chunk;
            if (langCode !== 'en-IN') {
                const formattedChunk = this.formatNumbersForSpeech(chunk);
                finalText = await this.translateText(formattedChunk, langCode);
            } else {
                finalText = this.formatNumbersForSpeech(chunk);
            }

            // Ensure translated/formatted text respects 500 char limit
            let finalChunks: string[] = [finalText];
            if (finalText.length > 500) {
                finalChunks = this.chunkText(finalText, 500);
            }

            for (const subChunk of finalChunks) {
                // Check cache
                let buffer = await audioCache.get(subChunk, voiceId);

                if (!buffer) {
                    // Retry logic with exponential backoff
                    let retries = 0;
                    const maxRetries = 3;
                    let lastError: Error | null = null;

                    while (retries < maxRetries && !buffer) {
                        try {
                            // Add delay between requests to avoid rate limiting (except first request)
                            if (i > 0 || retries > 0) {
                                await new Promise(resolve => setTimeout(resolve, 300 + (retries * 500)));
                            }

                            const controller = new AbortController();
                            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

                            const response = await fetch("https://api.sarvam.ai/text-to-speech", {
                                method: "POST",
                                headers: {
                                    "api-subscription-key": this.apiKey,
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    inputs: [subChunk],
                                    target_language_code: langCode,
                                    speaker: speakerId,
                                    pace: speed,
                                    speech_sample_rate: 48000,
                                    enable_preprocessing: true,
                                    model: "bulbul:v3"
                                }),
                                signal: controller.signal
                            });

                            clearTimeout(timeoutId);

                            if (!response.ok) {
                                const errorText = await response.text();
                                throw new Error(`Sarvam API Error: ${response.status} ${errorText}`);
                            }

                            const data = await response.json();
                            if (data && data.audios && data.audios[0]) {
                                // Base64 decode
                                const binaryString = atob(data.audios[0]);
                                const len = binaryString.length;
                                const bytes = new Uint8Array(len);
                                for (let j = 0; j < len; j++) {
                                    bytes[j] = binaryString.charCodeAt(j);
                                }
                                buffer = bytes.buffer;

                                await audioCache.set(subChunk, voiceId, buffer);
                            } else {
                                throw new Error("Invalid response format from Sarvam API");
                            }
                        } catch (error) {
                            lastError = error as Error;
                            retries++;

                            if (error.name === 'AbortError') {
                                console.warn(`Sarvam: Request timeout for chunk ${i + 1}/${chunks.length}, retry ${retries}/${maxRetries}`);
                            } else {
                                console.warn(`Sarvam: Error for chunk ${i + 1}/${chunks.length}, retry ${retries}/${maxRetries}:`, error);
                            }

                            if (retries >= maxRetries) {
                                throw new Error(`Failed to generate audio after ${maxRetries} retries: ${lastError?.message || 'Unknown error'}`);
                            }
                        }
                    }
                }

                audioBuffers.push(buffer);
            }
        }

        // Concatenate all audio buffers
        console.log(`Sarvam: Concatenating ${audioBuffers.length} audio chunks...`);
        const totalLength = audioBuffers.reduce((sum, buf) => sum + buf.byteLength, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const buffer of audioBuffers) {
            combined.set(new Uint8Array(buffer), offset);
            offset += buffer.byteLength;
        }

        console.log('Sarvam: Audio blob generation complete');
        return new Blob([combined], { type: 'audio/mpeg' });
    }

    private async playBlob(buffer: ArrayBuffer, speed: number) {
        if (this.audio) {
            this.audio.pause();
            URL.revokeObjectURL(this.audio.src);
        }

        const blob = new Blob([buffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);

        this.audio = new Audio(url);
        this.audio.volume = this.volume;
        this.audio.playbackRate = speed;

        this.audio.onended = () => {
            this.isPlaying = false;
            this.emit('ended');
        };

        // Re-emit generic events
        this.audio.onplay = () => this.emit('play');
        this.audio.onpause = () => this.emit('pause');
        this.audio.onerror = (e) => this.emit('error', e);
        this.audio.onwaiting = () => this.emit('waiting');
        this.audio.ontimeupdate = () => this.emit('timeupdate');

        await this.audio.play();
    }

    /**
     * Play audio chunks from queue seamlessly
     */
    private async playQueue() {
        if (this.isPlayingQueue || this.audioQueue.length === 0) return;

        this.isPlayingQueue = true;

        while (this.audioQueue.length > 0) {
            const buffer = this.audioQueue.shift()!;
            this.currentChunkIndex++;

            console.log(`Sarvam: Playing chunk ${this.currentChunkIndex}/${this.totalChunks}`);

            // Play this chunk
            await this.playBlob(buffer, this.audio?.playbackRate || 1);

            // Wait for chunk to finish
            await new Promise<void>((resolve) => {
                if (this.audio) {
                    this.audio.onended = () => {
                        resolve();
                    };
                }
            });
        }

        this.isPlayingQueue = false;
        this.currentChunkIndex = 0;
        this.totalChunks = 0;
        this.isPlaying = false;
        this.emit('ended');
    }



    pause(): void {
        this.isPlaying = false;
        if (this.audio) this.audio.pause();
        this.emit('pause');
    }

    resume(): void {
        this.isPlaying = true;
        if (this.audio) this.audio.play();
        this.emit('play');
    }

    stop(): void {
        this.isPlaying = false;
        this.isPlayingQueue = false;
        this.audioQueue = [];
        this.currentChunkIndex = 0;
        this.totalChunks = 0;

        if (this.audio) {
            this.audio.pause();
            this.audio.currentTime = 0;
        }
        this.emit('stop');
    }

    seek(time: number): void {
        if (this.audio) {
            this.audio.currentTime = time;
        }
    }

    setVolume(volume: number): void {
        this.volume = volume;
        if (this.audio) this.audio.volume = volume;
        this.emit('volumechange', volume);
    }

    setSpeed(speed: number): void {
        if (this.audio) {
            this.audio.playbackRate = speed;
        }
        this.emit('speedchange', speed);
    }

    getCurrentTime(): number {
        return this.audio?.currentTime || 0;
    }

    getDuration(): number {
        return this.audio?.duration || 0;
    }

    /**
     * Download audio as MP3 file
     */
    async download(text: string, voiceId: string): Promise<void> {
        try {
            console.log('Sarvam: Starting MP3 download...');

            // Generate complete audio blob
            const blob = await this.generateAudioBlob(text, voiceId, 1.0);

            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sarvam-audio-${Date.now()}.mp3`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('Sarvam: MP3 download complete');
        } catch (error) {
            console.error('Sarvam: Download failed', error);
            throw error;
        }
    }
}
