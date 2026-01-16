import { useState, useEffect } from "react"

export interface Settings {
    elevenLabsApiKey: string
    voiceId: string
    playbackSpeed: number
    showOverlay: boolean
}

const DEFAULT_SETTINGS: Settings = {
    elevenLabsApiKey: "",
    voiceId: "21m00Tcm4TlvDq8ikWAM",
    playbackSpeed: 1.0,
    showOverlay: false
}

export const useSettings = () => {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

    // Load initial settings
    useEffect(() => {
        chrome.storage.local.get("audicle-v1", (result) => {
            if (result["audicle-v1"]) {
                const val = result["audicle-v1"]
                setSettings({ ...DEFAULT_SETTINGS, ...val })
                console.log("Audicle: Loaded settings (v1)", val)
            }
        })
    }, [])

    // Sync changes from other contexts
    useEffect(() => {
        const onChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
            if (area === "local" && changes["audicle-v1"]) {
                const val = changes["audicle-v1"].newValue
                setSettings((prev) => ({ ...prev, ...val }))
                console.log("Audicle: Synced settings (v1)", val)
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
        showOverlay: settings.showOverlay,
        setApiKey: (key: string) => updateSettings({ elevenLabsApiKey: key }),
        setVoiceId: (id: string) => updateSettings({ voiceId: id }),
        setPlaybackSpeed: (speed: number) => updateSettings({ playbackSpeed: speed }),
        setShowOverlay: (show: boolean) => updateSettings({ showOverlay: show })
    }
}
