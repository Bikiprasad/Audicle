import { create } from "zustand"

export type UiState = "idle" | "editing" | "generating" | "ready"

interface PlayerState {
    uiState: UiState
    isPlaying: boolean
    text: string
    sourceUrl: string
    generationProgress: { current: number; total: number }

    setUiState: (state: UiState) => void
    setIsPlaying: (isPlaying: boolean) => void
    setText: (text: string) => void
    setSourceUrl: (url: string) => void
    setGenerationProgress: (current: number, total: number) => void
    reset: () => void
}

export const usePlayerStore = create<PlayerState>((set) => ({
    uiState: "idle",
    isPlaying: false,
    text: "",
    sourceUrl: "",
    generationProgress: { current: 0, total: 0 },

    setUiState: (uiState) => set({ uiState }),
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setText: (text) => set({ text }),
    setSourceUrl: (sourceUrl) => set({ sourceUrl }),
    setGenerationProgress: (current, total) => set({ generationProgress: { current, total } }),
    reset: () => set({ uiState: "idle", isPlaying: false, text: "", sourceUrl: "", generationProgress: { current: 0, total: 0 } })
}))
