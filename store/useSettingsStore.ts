import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

interface SettingsState {
    elevenLabsApiKey: string
    voiceId: string
    playbackSpeed: number
    isElevenLabsEnabled: boolean
    setApiKey: (key: string) => void
    setVoiceId: (id: string) => void
    setPlaybackSpeed: (speed: number) => void
    setIsElevenLabsEnabled: (enabled: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            elevenLabsApiKey: "",
            voiceId: "21m00Tcm4TlvDq8ikWAM", // Default voice (Rachel)
            playbackSpeed: 1.0,
            isElevenLabsEnabled: true, // Default to true (will fallback if no key)
            setApiKey: (key) => {
                set({ elevenLabsApiKey: key });
            },
            setVoiceId: (id) => set({ voiceId: id }),
            setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
            setIsElevenLabsEnabled: (enabled) => set({ isElevenLabsEnabled: enabled }),
        }),
        {
            name: "audicle-settings-storage",
            storage: createJSONStorage(() => localStorage),
            onRehydrateStorage: () => (state) => { }
        }
    )
)
