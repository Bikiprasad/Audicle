import { motion } from "framer-motion"
import { Pause, Play, Plus, Volume2 } from "lucide-react"
import { cn } from "~lib/utils"

interface MiniPlayerProps {
    isPlaying: boolean
    isMuted: boolean
    onTogglePlay: () => void
    onToggleMute: () => void
    onExpand: () => void
}

export const MiniPlayer = ({ isPlaying, isMuted, onTogglePlay, onToggleMute, onExpand }: MiniPlayerProps) => {
    return (
        <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed top-12 right-12 z-[2147483647] font-sans antialiased"
        >
            <div className="flex items-center gap-2 bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-full p-2 pr-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">

                {/* Expand Button (Left) */}
                <button
                    onClick={onExpand}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                >
                    <Plus size={14} className="rotate-45" />
                </button>

                {/* Play/Pause */}
                <button
                    onClick={onTogglePlay}
                    className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center transition-all",
                        isPlaying
                            ? "bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.5)]"
                            : "bg-white/10 text-white hover:bg-white/20"
                    )}
                >
                    {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
                </button>

                {/* Mute/Unmute */}
                <button
                    onClick={onToggleMute}
                    className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
                        isMuted ? "text-red-400 bg-red-500/10" : "text-zinc-400 hover:text-white hover:bg-white/5"
                    )}
                >
                    {isMuted ? <Volume2 size={16} className="opacity-50" /> : <Volume2 size={16} />}
                    {isMuted && <div className="absolute w-8 h-0.5 bg-red-400 rotate-45" />}
                </button>

                {/* Status Dot */}
                <div className={cn("w-2 h-2 rounded-full ml-1 animate-pulse", isPlaying ? "bg-green-500" : "bg-zinc-600")} />

            </div>
        </motion.div>
    )
}
