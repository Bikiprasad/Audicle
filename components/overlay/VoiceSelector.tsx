import { motion, AnimatePresence } from "framer-motion"
import { Volume1 } from "lucide-react"
import { useState } from "react"
import { cn } from "~lib/utils"
import type { Voice } from "~lib/audio/types"

interface VoiceSelectorProps {
    voices: Voice[]
    currentVoiceId: string
    onVoiceSelect: (voiceId: string) => void
    disabled?: boolean
}

export const VoiceSelector = ({ voices, currentVoiceId, onVoiceSelect, disabled }: VoiceSelectorProps) => {
    const [showVoiceSelect, setShowVoiceSelect] = useState(false)
    const [searchVoice, setSearchVoice] = useState("")

    const filteredVoices = voices.filter(v => v.name.toLowerCase().includes(searchVoice.toLowerCase()))

    return (
        <div className="w-full mt-6">
            <div className="relative w-full">
                <button
                    onClick={() => !disabled && setShowVoiceSelect(!showVoiceSelect)}
                    disabled={disabled}
                    className="w-full flex items-center justify-between bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl px-4 py-3 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                            <Volume1 size={14} className="text-white" />
                        </div>
                        <div className="text-left overflow-hidden">
                            <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Voice Persona</p>
                            <div className="flex flex-col">
                                <p className="text-[13px] text-white font-medium truncate w-40">
                                    {voices.find(v => v.id === currentVoiceId)?.name || "Select Voice"}
                                </p>
                                {/* Description for selected voice */}
                                <p className="text-[10px] text-zinc-400 truncate w-40">
                                    {voices.find(v => v.id === currentVoiceId)?.description || ""}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className={cn("text-zinc-600 transition-transform duration-300", showVoiceSelect ? "rotate-90" : "")}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </div>
                </button>

                {/* Dropdown Drawer */}
                <AnimatePresence>
                    {showVoiceSelect && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: "auto", opacity: 1, marginTop: 8 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            className="overflow-hidden bg-black/60 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl relative z-50"
                        >
                            <div className="p-2">
                                <input
                                    type="text"
                                    placeholder="Find a voice..."
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-white focus:outline-none focus:border-blue-500 mb-2 placeholder:text-zinc-600"
                                    value={searchVoice}
                                    onChange={e => setSearchVoice(e.target.value)}
                                    autoFocus
                                />
                                <div className="max-h-[140px] overflow-y-auto custom-scrollbar space-y-1">
                                    {filteredVoices.map(v => (
                                        <button
                                            key={v.id}
                                            onClick={() => {
                                                onVoiceSelect(v.id)
                                                setShowVoiceSelect(false)
                                            }}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] transition-all",
                                                currentVoiceId === v.id
                                                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            <div className="flex flex-col text-left gap-0.5">
                                                <span className="font-medium text-[13px]">{v.name}</span>
                                                {v.description && <span className="text-[10px] text-zinc-500">{v.description}</span>}
                                            </div>

                                            <div className="flex items-center gap-3 ml-auto">
                                                {/* Provider Badge */}
                                                <span className={cn(
                                                    "text-[9px] px-1.5 py-0.5 rounded-[4px] uppercase font-bold tracking-wider opacity-80",
                                                    v.provider === 'web-speech' ? "bg-zinc-800 text-zinc-400" :
                                                        v.provider === 'elevenlabs' ? "bg-blue-900/30 text-blue-300 border border-blue-500/20" :
                                                            "bg-orange-900/30 text-orange-300 border border-orange-500/20" // Kokoro
                                                )}>
                                                    {v.provider === 'web-speech' ? 'Web Speech' :
                                                        v.provider === 'elevenlabs' ? 'Elevenlabs' : 'Kokoro TTS'}
                                                </span>

                                                {currentVoiceId === v.id && (
                                                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
