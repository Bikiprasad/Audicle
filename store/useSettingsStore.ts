import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

interface SettingsState {
    elevenLabsApiKey: string
    voiceId: string
    playbackSpeed: number
    setApiKey: (key: string) => void
    setVoiceId: (id: string) => void
    setPlaybackSpeed: (speed: number) => void
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            elevenLabsApiKey: "",
            voiceId: "21m00Tcm4TlvDq8ikWAM", // Default voice (Rachel)
            playbackSpeed: 1.0,
            setApiKey: (key) => set({ elevenLabsApiKey: key }),
            setVoiceId: (id) => set({ voiceId: id }),
            setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
        }),
        {
            name: "audicle-settings-storage",
            storage: createJSONStorage(() => localStorage),
        }
    )
)
