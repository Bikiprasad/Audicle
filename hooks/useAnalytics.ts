import { useState, useEffect } from "react"

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

const STORAGE_KEY = "audicle-analytics-v1"

export const useAnalytics = () => {
    const [data, setData] = useState<AnalyticsData>(DEFAULT_DATA)

    // Load initial data
    useEffect(() => {
        chrome.storage.local.get(STORAGE_KEY, (result) => {
            if (result[STORAGE_KEY]) {
                const stored = result[STORAGE_KEY]

                // Robust Migration / Validation
                let safeHistory = stored.history || []
                const hasLegacy = safeHistory.some((h: any) => !h.timestamp)
                if (hasLegacy) {
                    safeHistory = safeHistory.filter((h: any) => !!h.timestamp)
                }

                // Merge with defaults
                const merged: AnalyticsData = {
                    ...DEFAULT_DATA,
                    ...stored,
                    byModel: {
                        ...DEFAULT_DATA.byModel,
                        ...(stored.byModel || {})
                    },
                    history: safeHistory
                }

                setData(merged)
            }
        })
    }, [])

    // Listen for changes
    useEffect(() => {
        const onChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
            if (area === "local" && changes[STORAGE_KEY]) {
                const newValue = changes[STORAGE_KEY].newValue
                if (newValue) {
                    // Re-apply migration logic just in case
                    let safeHistory = newValue.history || []
                    const hasLegacy = safeHistory.some((h: any) => !h.timestamp)
                    if (hasLegacy) {
                        safeHistory = safeHistory.filter((h: any) => !!h.timestamp)
                    }

                    // Merge with defaults to ensure all fields exist
                    const merged: AnalyticsData = {
                        ...DEFAULT_DATA,
                        ...newValue,
                        byModel: {
                            ...DEFAULT_DATA.byModel,
                            ...(newValue.byModel || {})
                        },
                        history: safeHistory
                    }

                    setData(merged)
                }
            }
        }
        chrome.storage.onChanged.addListener(onChange)
        return () => chrome.storage.onChanged.removeListener(onChange)
    }, [])

    const getWords = (chars: number) => Math.round(chars / 5)
    const getTokens = (chars: number) => Math.round(chars / 4)

    const getGrowthTrend = () => {
        if (!data || !data.history) return 0

        const now = new Date()
        const oneDay = 24 * 60 * 60 * 1000
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
        const yesterdayStart = todayStart - oneDay

        const todayChars = data.history
            .filter(h => new Date(h.timestamp).getTime() >= todayStart)
            .reduce((acc, curr) => acc + curr.chars, 0)

        const yesterdayChars = data.history
            .filter(h => {
                const t = new Date(h.timestamp).getTime()
                return t >= yesterdayStart && t < todayStart
            })
            .reduce((acc, curr) => acc + curr.chars, 0)

        if (yesterdayChars === 0) return todayChars > 0 ? 100 : 0
        return Math.round(((todayChars - yesterdayChars) / yesterdayChars) * 100)
    }

    return {
        data,
        getWords,
        getTokens,
        getGrowthTrend
    }
}

export const AnalyticsService = {
    trackUsage: async (model: 'kokoro' | 'elevenlabs' | 'webspeech', chars: number) => {
        console.log(`[Analytics] Tracking usage: ${model} +${chars} chars`);

        // Get current (promisified chrome.storage)
        const result = await new Promise<{ [key: string]: any }>((resolve) => {
            chrome.storage.local.get(STORAGE_KEY, resolve)
        })

        const stored: AnalyticsData = result[STORAGE_KEY] || DEFAULT_DATA
        const now = new Date().toISOString()

        const newData: AnalyticsData = {
            ...stored,
            totalChars: stored.totalChars + chars,
            byModel: {
                ...DEFAULT_DATA.byModel,
                ...(stored.byModel || {}),
                [model]: ((stored.byModel || {})[model] || 0) + chars
            },
            history: [
                ...(stored.history || []),
                { timestamp: now, model, chars }
            ]
        }

        console.log("[Analytics] New Data:", newData);

        // Limit history to last 1000 entries
        if (newData.history.length > 1000) {
            newData.history = newData.history.slice(-1000)
        }

        await new Promise<void>((resolve) => {
            chrome.storage.local.set({ [STORAGE_KEY]: newData }, resolve)
        })

        return newData
    },

    getStats: async () => {
        const result = await new Promise<{ [key: string]: any }>((resolve) => {
            chrome.storage.local.get(STORAGE_KEY, resolve)
        })
        return result[STORAGE_KEY] || DEFAULT_DATA
    }
}
