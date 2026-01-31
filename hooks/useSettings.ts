import { useState, useEffect } from "react"


export type ReaderMode = 'audio' | 'speed-reader';
export type Theme = 'light' | 'dark';

export interface Settings {
    elevenLabsApiKey: string
    voiceId: string
    playbackSpeed: number
    isElevenLabsEnabled?: boolean
    readerMode: ReaderMode
    speedReaderWpm: number
    // Kokoro Settings
    kokoroUrl?: string
    isKokoroEnabled?: boolean
    isPro?: boolean // Pro Tier Flag
    videoQuality: '720p' | '1080p'
    theme?: Theme

}

// Settings that persist to storage (NO showOverlay)
const DEFAULT_SETTINGS: Settings = {
    elevenLabsApiKey: "",
    voiceId: "21m00Tcm4TlvDq8ikWAM",
    playbackSpeed: 1.0,
    readerMode: 'audio',
    speedReaderWpm: 400,
    kokoroUrl: "http://localhost:8880", // Default assumption
    isKokoroEnabled: false,
    isPro: true, // Default Enabled for Testing
    videoQuality: '720p',
    theme: 'dark', // Default to dark for now

}

export const useSettings = () => {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

    // Session-only state: showOverlay (never persisted, always starts false)
    const [showOverlay, setShowOverlayState] = useState(false)

    // Load initial settings (without showOverlay)
    useEffect(() => {
        chrome.storage.local.get("audicle-v1", (result) => {
            if (result["audicle-v1"]) {
                const val = result["audicle-v1"]
                // Explicitly exclude showOverlay from loaded settings
                const { showOverlay: _, ...persistedSettings } = val
                setSettings({ ...DEFAULT_SETTINGS, ...persistedSettings })
                console.log("Audicle: Loaded settings (v1)", persistedSettings)
            }
        })
    }, [])

    // Sync changes from other contexts (but ignore showOverlay)
    useEffect(() => {
        const onChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
            if (area === "local" && changes["audicle-v1"]) {
                const val = changes["audicle-v1"].newValue
                const { showOverlay: _, ...persistedSettings } = val
                setSettings((prev) => ({ ...prev, ...persistedSettings }))
                console.log("Audicle: Synced settings (v1)", persistedSettings)
            }
        }

        chrome.storage.onChanged.addListener(onChange)
        return () => chrome.storage.onChanged.removeListener(onChange)
    }, [])

    // Update settings: Updates local state AND chrome storage
    const updateSettings = (updates: Partial<Settings>) => {
        setSettings(prev => {
            const next = { ...prev, ...updates }

            // Save to storage
            chrome.storage.local.set({ "audicle-v1": next }, () => {
                if (chrome.runtime.lastError) {
                    console.error("Audicle: Save Error:", chrome.runtime.lastError)
                } else {
                    console.log("Audicle: Saved (v1)", next)
                }
            })
            return next
        })
    }

    return {
        settings,
        apiKey: settings.elevenLabsApiKey,
        voiceId: settings.voiceId,
        playbackSpeed: settings.playbackSpeed,
        readerMode: settings.readerMode,
        speedReaderWpm: settings.speedReaderWpm,
        showOverlay, // Session-only, always false on page load
        isElevenLabsEnabled: settings.isElevenLabsEnabled !== undefined ? settings.isElevenLabsEnabled : true,
        kokoroUrl: settings.kokoroUrl || "http://localhost:8880",
        isKokoroEnabled: settings.isKokoroEnabled || false,
        setApiKey: (key: string) => updateSettings({ elevenLabsApiKey: key }),
        setVoiceId: (id: string) => updateSettings({ voiceId: id }),
        setPlaybackSpeed: (speed: number) => updateSettings({ playbackSpeed: speed }),
        setReaderMode: (mode: ReaderMode) => updateSettings({ readerMode: mode }),
        setSpeedReaderWpm: (wpm: number) => updateSettings({ speedReaderWpm: wpm }),
        setShowOverlay: setShowOverlayState, // Session-only setter (no storage)
        setIsElevenLabsEnabled: (enabled: boolean) => updateSettings({ isElevenLabsEnabled: enabled }),
        setKokoroUrl: (url: string) => updateSettings({ kokoroUrl: url }),
        setIsKokoroEnabled: (enabled: boolean) => updateSettings({ isKokoroEnabled: enabled }),
        isPro: settings.isPro ?? true,
        theme: settings.theme || 'dark',
        setTheme: (theme: Theme) => updateSettings({ theme }),
        videoQuality: settings.videoQuality || '720p',
        setVideoQuality: (q: '720p' | '1080p') => updateSettings({ videoQuality: q })
    }
}
