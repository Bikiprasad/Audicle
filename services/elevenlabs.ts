export interface Voice {
    voice_id: string;
    name: string;
    category?: string;
    preview_url?: string;
}

export async function getVoices(apiKey: string): Promise<Voice[]> {
    if (!apiKey) return [];

    try {
        const response = await fetch("https://api.elevenlabs.io/v1/voices", {
            headers: {
                "xi-api-key": apiKey
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch voices: ${response.statusText}`);
        }

        const data = await response.json();
        return data.voices || [];
    } catch (error) {
        console.error("Error fetching voices:", error);
        throw error;
    }
}

export async function streamTextToAudio(
    text: string,
    voiceId: string,
    apiKey: string,
    onAudioData: (data: Blob, textChunk: string) => void,
    onProgress?: (current: number, total: number) => void
) {
    const CHUNK_SIZE_LIMIT = 500;
    const chunks = splitTextSmartly(text, CHUNK_SIZE_LIMIT);
    const totalChunks = chunks.length;

    let processedCount = 0;

    for (const chunk of chunks) {
        if (!chunk.trim()) continue;

        try {
            const response = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
                {
                    method: "POST",
                    headers: {
                        "xi-api-key": apiKey,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        text: chunk,
                        model_id: "eleven_multilingual_v2",
                        output_format: "mp3_44100_128",
                    }),
                }
            );

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail?.message || `API Error: ${response.statusText}`);
            }

            if (!response.body) throw new Error("No response body");

            const reader = response.body.getReader();
            const audioChunks: Uint8Array[] = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) {
                    audioChunks.push(value);
                }
            }

            // Combine chunks into one Blob
            const blob = new Blob(audioChunks, { type: "audio/mpeg" });
            onAudioData(blob, chunk);

            processedCount++;
            onProgress?.(processedCount, totalChunks);

        } catch (error) {
            console.error("Error streaming chunk:", error);
            throw error;
        }
    }
}

function splitTextSmartly(text: string, limit: number): string[] {
    // Regex to split by sentence terminators but keep them
    // This is a simplified regex; production would need more robustness
    const sentenceRegex = /([.!?]+[\s\r\n]+)/g;
    const tokens = text.split(sentenceRegex);

    const chunks: string[] = [];
    let currentChunk = "";

    for (const token of tokens) {
        if ((currentChunk + token).length <= limit) {
            currentChunk += token;
        } else {
            if (currentChunk) chunks.push(currentChunk);

            // If the token itself is larger than limit, we might need to soft split or just push it
            if (token.length > limit) {
                // For safety, just push it as its own chunk even if it exceeds limit slightly
                // or specific logic to split by comma, etc.
                chunks.push(token);
                currentChunk = "";
            } else {
                currentChunk = token;
            }
        }
    }
    if (currentChunk) chunks.push(currentChunk);

    return chunks;
}
