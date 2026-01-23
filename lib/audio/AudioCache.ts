/**
 * AudioCache - IndexedDB-based cache for ElevenLabs audio chunks
 * 
 * This prevents redundant API calls when:
 * - User seeks within already-fetched content
 * - User restarts playback
 * - User downloads audio (reuses cached chunks)
 */

const DB_NAME = 'audicle-audio-cache';
const DB_VERSION = 1;
const STORE_NAME = 'audio-chunks';

interface CachedChunk {
    textHash: string;       // Hash of the chunk text
    voiceId: string;        // Voice used
    audioBuffer: ArrayBuffer;
    timestamp: number;      // For LRU eviction
}

export class AudioCache {
    private db: IDBDatabase | null = null;
    private memoryCache: Map<string, ArrayBuffer> = new Map();
    private maxMemoryItems = 10;

    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'key' });
                }
            };
        });
    }

    private generateKey(text: string, voiceId: string): string {
        // Simple hash for cache key
        let hash = 0;
        const str = `${voiceId}:${text}`;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return `chunk_${hash}`;
    }

    async get(text: string, voiceId: string): Promise<ArrayBuffer | null> {
        const key = this.generateKey(text, voiceId);

        // Check memory cache first
        if (this.memoryCache.has(key)) {
            console.log('[AudioCache] Memory hit:', key.slice(0, 20));
            return this.memoryCache.get(key)!;
        }

        // Check IndexedDB
        if (!this.db) await this.init();

        return new Promise((resolve) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(key);

            request.onsuccess = () => {
                if (request.result) {
                    console.log('[AudioCache] DB hit:', key.slice(0, 20));
                    // Promote to memory cache
                    this.memoryCache.set(key, request.result.audioBuffer);
                    this.trimMemoryCache();
                    resolve(request.result.audioBuffer);
                } else {
                    resolve(null);
                }
            };

            request.onerror = () => resolve(null);
        });
    }

    async set(text: string, voiceId: string, audioBuffer: ArrayBuffer): Promise<void> {
        const key = this.generateKey(text, voiceId);

        // Store in memory cache
        this.memoryCache.set(key, audioBuffer);
        this.trimMemoryCache();

        // Store in IndexedDB
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            const record = {
                key,
                textHash: key,
                voiceId,
                audioBuffer,
                timestamp: Date.now()
            };

            const request = store.put(record);
            request.onsuccess = () => {
                console.log('[AudioCache] Stored:', key.slice(0, 20));
                resolve();
            };
            request.onerror = () => reject(request.error);
        });
    }

    private trimMemoryCache(): void {
        if (this.memoryCache.size > this.maxMemoryItems) {
            const keysToDelete = Array.from(this.memoryCache.keys()).slice(0, 3);
            keysToDelete.forEach(k => this.memoryCache.delete(k));
        }
    }

    async clear(): Promise<void> {
        this.memoryCache.clear();
        if (!this.db) return;

        return new Promise((resolve) => {
            const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);
            store.clear();
            transaction.oncomplete = () => resolve();
        });
    }
}

// Singleton instance
export const audioCache = new AudioCache();
