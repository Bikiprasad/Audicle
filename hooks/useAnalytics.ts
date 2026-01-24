import { useStorage } from "@plasmohq/storage/hook"
import { Storage } from "@plasmohq/storage"

const storage = new Storage({
    area: "local"
})

export interface HistoryItem {
    timestamp: string // ISO Date String
    model: 'kokoro' | 'elevenlabs' | 'webspeech'
    chars: number
}

export interface AnalyticsData {
    totalChars: number
    byModel: {
        kokoro: number
        elevenlabs: number
        webspeech: number
    }
    history: HistoryItem[]
}

const DEFAULT_DATA: AnalyticsData = {
    totalChars: 0,
    byModel: {
        kokoro: 0,
        elevenlabs: 0,
        webspeech: 0
    },
    history: []
}



export const useAnalytics = () => {
    const [data] = useStorage<AnalyticsData>("audicle-analytics-v1", (stored) => {
        if (!stored) return DEFAULT_DATA

        // Robust Migration:
        // Filter out any history items that don't have a valid ISO timestamp or are missing 'timestamp' field.
        // We do NOT wipe the whole array, just drop bad items.
        // We also don't need to write back here explicitly because useStorage syncs state, 
        // BUT if we want to clean the actual storage, we might need a useEffect side-effect or just let valid new items append.
        // Since we can't easily async write back in this initial transform, we'll just filter for the view.

        let safeHistory = stored.history || []

        // Check if any items are legacy (missing timestamp)
        const hasLegacy = safeHistory.some(h => !(h as any).timestamp)

        if (hasLegacy) {
            safeHistory = safeHistory.filter(h => !!(h as any).timestamp)
        }

        return {
            ...stored,
            history: safeHistory
        }
    })

    return { data: data || DEFAULT_DATA }
}

export const AnalyticsService = {
    trackUsage: async (model: 'kokoro' | 'elevenlabs' | 'webspeech', chars: number) => {
        const stored = await storage.get<AnalyticsData>("audicle-analytics-v1") || DEFAULT_DATA
        const now = new Date().toISOString()

        const newData = {
            ...stored,
            totalChars: stored.totalChars + chars,
            byModel: {
                ...stored.byModel,
                [model]: (stored.byModel[model] || 0) + chars
            },
            history: [
                ...stored.history,
                { timestamp: now, model, chars }
            ]
        }

        // Limit history to last 1000 entries to prevent storage bloat?
        if (newData.history.length > 1000) {
            newData.history = newData.history.slice(-1000)
        }

        await storage.set("audicle-analytics-v1", newData)
        return newData
    },

    getStats: async () => {
        return await storage.get<AnalyticsData>("audicle-analytics-v1") || DEFAULT_DATA
    }
}
