import { motion, AnimatePresence } from "framer-motion"
import { Play, Pause, X, Minus, ScanSearch, Zap, Loader2, SkipBack, Edit3, Volume2, VolumeX, Download, RotateCcw, BookOpen, Check, Bookmark, BookmarkCheck } from "lucide-react"
import { cn } from "~lib/utils"
import type { ReaderMode } from "~hooks/useSettings"
// import type { Voice } from "~lib/audio/types"
import { Tooltip } from "./Tooltip"
import { VoiceSelector } from "./VoiceSelector"
import { SpeedReaderDisplay } from "./SpeedReaderDisplay"
import { ParagraphHighlighter } from "./ParagraphHighlighter"

interface PlayerProps {
    uiState: "idle" | "generating" | "editing" | "ready"
    // Audio State
    isPlaying: boolean
    currentTime: number
    duration: number
    volume: number
    playbackSpeed: number
    bars: number[]

    // Data State
    text: string
    error: string | null
    backgroundImage: string | null
    generationProgress: { current: number, total: number }
    voices: any[]
    voiceId: string
    showEditor: boolean // Local UI state or passed down?
    currentIndex: number // for word highlighting

    // Handlers
    onClose: () => void
    onMinimize: () => void
    onPlayPause: () => void
    onImport: () => void
    onGenerate: () => void
    onReset: () => void
    onSeek: (time: number) => void // if supported
    onVolumeChange: (vol: number) => void
    onSpeedChange: (speed: number) => void
    onVoiceSelect: (id: string) => void
    onRestart: () => void
    onToggleEditor: () => void
    onTextChange: (text: string) => void
    onSave?: () => void
    isSaved?: boolean
    onDownload?: () => void
    isDownloading?: boolean
    isDownloadComplete?: boolean
    onErrorClear?: () => void
    isMuted: boolean
    onMuteToggle: () => void
    isBuffering?: boolean
    // Speed Reader Mode
    readerMode: ReaderMode
    speedReaderWpm: number
    onWpmChange: (wpm: number) => void
}

export const Player = ({
    uiState,
    isPlaying,
    currentTime,
    duration,
    volume,
    playbackSpeed,
    bars,
    text,
    error,
    backgroundImage,
    generationProgress,
    voices,
    voiceId,
    showEditor,
    currentIndex,
    onClose,
    onMinimize,
    onPlayPause,
    onImport,
    onGenerate,
    onReset,
    onSeek,
    onVolumeChange,
    onSpeedChange,
    onVoiceSelect,
    onRestart,
    onToggleEditor,
    onTextChange,
    onSave,
    isSaved,
    onDownload,
    isDownloading,
    isDownloadComplete,
    isMuted,
    onMuteToggle,
    isBuffering,
    readerMode,
    speedReaderWpm,
    onWpmChange
}: PlayerProps) => {

    const isFinished = uiState === "ready" && !isPlaying && duration > 0 && currentTime >= (duration - 0.2);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <motion.div
            drag
            dragMomentum={false}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed top-12 right-12 z-[2147483647] font-sans antialiased"
        >
            {/* GLASS CONTAINER */}
            <div className="w-[380px] relative rounded-[32px] p-6 overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] bg-neutral-900/90 backdrop-blur-xl">

                {/* Header Controls - Outside OLED, high z-index */}
                <div className="flex items-center justify-end gap-2 mb-2">
                    {readerMode === 'audio' && (
                        <button
                            onClick={onMinimize}
                            className="text-zinc-500 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-full"
                        >
                            <Minus size={14} />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="text-zinc-500 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded-full"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Noise Texture Overlay */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />

                {/* OLED SCREEN */}
                <div className="relative bg-black rounded-[20px] px-5 pt-5 pb-1 text-white min-h-[180px] flex flex-col shadow-[inset_0_2px_10px_rgba(0,0,0,1)] border border-white/5 overflow-hidden group">

                    {/* Dynamic Background Image - Audio Mode Only */}
                    {readerMode === 'audio' && backgroundImage && (
                        <div className="absolute inset-0 z-0">
                            <div
                                className="absolute inset-0 bg-cover bg-center opacity-90 transition-opacity duration-1000"
                                style={{ backgroundImage: `url(${backgroundImage})` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30" />
                        </div>
                    )}

                    {/* Matte Glass Background - Speed Reader Mode */}
                    {readerMode === 'speed-reader' && (
                        <div className="absolute inset-0 z-0 bg-gradient-to-b from-zinc-900/50 to-black/80" />
                    )}

                    {/* Screen Glare & Effect */}
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/5 to-transparent pointer-events-none rounded-[20px] z-20" />

                    {/* Main Display */}
                    <div className="flex-1 flex flex-col justify-center items-center text-center z-30 relative w-full overflow-hidden">
                        {error ? (
                            <div className="text-red-300 text-xs font-mono bg-red-900/80 px-3 py-2 rounded-lg border border-red-500/20 backdrop-blur-sm shadow-lg">{error}</div>
                        ) : uiState === "idle" ? (
                            <div className="bg-black/60 backdrop-blur-sm p-4 rounded-xl border border-white/5 shadow-2xl flex flex-col items-center">
                                <ScanSearch className="text-zinc-400 mb-3 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]" size={24} />
                                <p className="text-white/90 text-[10px] tracking-[0.2em] font-bold">READY TO SCAN</p>
                            </div>
                        ) : uiState === "generating" ? (
                            <div className="w-full px-4 flex flex-col items-center">
                                <div className="bg-black/60 backdrop-blur-sm py-2 px-4 rounded-full border border-white/5 shadow-lg mb-3">
                                    <p className="text-blue-400 text-[10px] tracking-[0.2em] font-bold animate-pulse text-center">SYNTHESIZING</p>
                                </div>
                                <div className="h-1 w-32 bg-zinc-800/80 rounded-full overflow-hidden backdrop-blur-sm">
                                    <motion.div
                                        className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(generationProgress.current / (generationProgress.total || 1)) * 100}%` }}
                                    />
                                </div>
                                <p className="text-zinc-400 text-[9px] mt-2 text-center font-mono bg-black/40 px-2 rounded">{generationProgress.current}/{generationProgress.total}</p>
                            </div>
                        ) : uiState === "editing" ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <div className="bg-black/60 backdrop-blur-sm py-2 px-4 rounded-full border border-white/5 shadow-lg flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                                    <p className="text-[10px] text-white/90 font-mono tracking-widest font-bold">CLICK PLAY TO LISTEN</p>
                                </div>
                            </div>
                        ) : uiState === "ready" ? (
                            readerMode === 'speed-reader' ? (
                                <SpeedReaderDisplay text={text} currentIndex={currentIndex} />
                            ) : (
                                <div className="absolute inset-0 flex flex-col">
                                    <ParagraphHighlighter text={text} currentIndex={currentIndex} />
                                </div>
                            )
                        ) : null}
                    </div>


                </div>

                {/* Seeker Bar (Waveform) */}
                {uiState === "ready" && (
                    <div className="w-full px-6 mt-6 mb-2 z-30 relative h-12 group">
                        <div className="flex items-center justify-between w-full h-full gap-[2px]">
                            {bars.map((height, i) => {
                                const progress = currentTime / (duration || 1)
                                const percent = i / bars.length
                                const isPlayed = percent < progress
                                return (
                                    <div
                                        key={i}
                                        className={cn(
                                            "w-1.5 rounded-full transition-all duration-200",
                                            isPlayed ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.4)] scale-y-100" : "bg-white/10 scale-y-90"
                                        )}
                                        style={{
                                            height: `${Math.max(20, height * 100)}%`,
                                        }}
                                    />
                                )
                            })}
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={duration || 1}
                            step={0.1}
                            value={currentTime}
                            onChange={(e) => onSeek(parseFloat(e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-40"
                            aria-label="Seek"
                        />
                    </div>
                )}

                {/* Header: Status & Time */}
                {/* Header: Status & Time */}
                <div className="flex justify-between items-center text-[10px] text-zinc-500 mt-2 px-6 pt-[10px] font-mono z-30 tracking-widest uppercase">
                    <div className="flex items-center gap-1.5">
                        <span className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor]", isPlaying ? "bg-green-500" : "bg-red-500")} />
                        {uiState}
                    </div>
                    {/* Time or Words Display */}
                    <div className="flex items-center gap-2">
                        {readerMode === 'audio' ? (
                            <span>{(currentTime).toFixed(1)}s</span>
                        ) : (
                            <span>{(text || "").split(/\s+/).filter(w => w.length > 0).length} Words</span>
                        )}
                    </div>
                </div>

                {/* CONTROLS SECTION - Two Row Layout */}
                <div className="mt-4 px-4 space-y-3">
                    {/* Row 1: Volume + Play Button + Time */}
                    <div className="flex items-center justify-between gap-3">
                        {/* Volume with Mute Toggle - Audio Mode Only */}
                        {readerMode === 'audio' ? (
                            <div className="flex items-center gap-1.5 bg-black/40 rounded-full px-2 py-1.5 border border-white/5">
                                <button
                                    onClick={onMuteToggle}
                                    className="text-zinc-500 hover:text-white transition-colors shrink-0"
                                >
                                    {isMuted ? <VolumeX size={14} className="text-red-400" /> : <Volume2 size={14} />}
                                </button>
                                <input
                                    type="range" min={0} max={1} step={0.05}
                                    value={isMuted ? 0 : volume}
                                    onChange={e => onVolumeChange(parseFloat(e.target.value))}
                                    className="w-12 h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                                />
                            </div>
                        ) : (
                            // Spacer for alignment in Speed Reader mode
                            <div className="w-12 h-1" />
                        )}

                        {/* Central Play Button */}
                        <div className="w-14 h-14 rounded-full bg-gradient-to-b from-white/10 to-transparent p-0.5 shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
                            <Tooltip text={isPlaying ? "Pause" : uiState === "idle" ? "Import" : isFinished ? "Restart" : "Play"} className="w-full h-full">
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    className={cn(
                                        "w-full h-full rounded-full flex items-center justify-center transition-all border border-white/10",
                                        isPlaying
                                            ? "bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]"
                                            : "bg-[#222] shadow-[inset_0_2px_5px_rgba(255,255,255,0.1)] hover:bg-[#333]"
                                    )}
                                    onClick={() => {
                                        if (isFinished) onRestart()
                                        else if (uiState === "idle") onImport()
                                        else if (uiState === "editing") onGenerate()
                                        else if (uiState === "ready") onPlayPause()
                                    }}
                                >
                                    {uiState === "idle" && <ScanSearch size={18} className="text-zinc-400" />}
                                    {uiState === "editing" && <Zap size={18} className="text-orange-500" />}
                                    {uiState === "generating" && <Loader2 size={18} className="text-blue-500 animate-spin" />}
                                    {uiState === "ready" && (
                                        isBuffering
                                            ? <Loader2 size={22} className="text-white animate-spin" />
                                            : isPlaying
                                                ? <Pause size={22} className="text-white fill-white" />
                                                : isFinished
                                                    ? <RotateCcw size={22} className="text-white" />
                                                    : <Play size={22} className="text-white ml-0.5 fill-white" />
                                    )}
                                </motion.button>
                            </Tooltip>
                        </div>

                        {/* Time Display - Audio Mode Only */}
                        {readerMode === 'audio' ? (
                            <div className="flex items-center justify-end gap-1 text-[11px] font-mono text-zinc-400 w-[72px]">
                                <span>{formatTime(currentTime)}</span>
                                <span className="text-zinc-600">/</span>
                                <span className="text-zinc-600">{formatTime(duration)}</span>
                            </div>
                        ) : (
                            // Spacer for alignment
                            <div className="w-[72px]" />
                        )}
                    </div>

                    {/* Row 2: Secondary Controls */}
                    <div className="flex items-center justify-center gap-2">
                        {/* Speed Selector - Audio Mode Only */}
                        {readerMode === 'audio' && (
                            <div className="relative group">
                                <button className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                                    {playbackSpeed}x
                                </button>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center pb-2 w-[50px] z-50">
                                    <div className="flex flex-col gap-1 bg-black/95 p-1.5 rounded-xl border border-white/10 shadow-xl backdrop-blur-md w-full">
                                        {[0.5, 1, 1.5, 2, 3, 5].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => onSpeedChange(s)}
                                                className={cn(
                                                    "w-full py-1 text-[10px] rounded-lg transition-all text-center",
                                                    playbackSpeed === s
                                                        ? "text-blue-400 bg-blue-500/10 font-bold"
                                                        : "text-zinc-400 hover:bg-white/10 hover:text-white"
                                                )}
                                            >
                                                {s}x
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* WPM Selector - Speed Reader Mode Only */}
                        {readerMode === 'speed-reader' && (
                            <div className="relative group">
                                <button className="w-16 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[9px] font-mono text-purple-400 hover:bg-white/10 transition-all">
                                    {speedReaderWpm} WPM
                                </button>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center pb-2 w-[70px] z-50">
                                    <div className="flex flex-col gap-1 bg-black/95 p-1.5 rounded-xl border border-white/10 shadow-xl backdrop-blur-md w-full max-h-[200px] overflow-y-auto custom-scrollbar">
                                        {[200, 300, 400, 500, 600, 800, 1000, 1200, 1500].map(w => (
                                            <button
                                                key={w}
                                                onClick={() => onWpmChange(w)}
                                                className={cn(
                                                    "w-full py-1.5 text-[9px] rounded-lg transition-all text-center whitespace-nowrap",
                                                    speedReaderWpm === w
                                                        ? "text-purple-400 bg-purple-500/10 font-bold"
                                                        : "text-zinc-400 hover:bg-white/10 hover:text-white"
                                                )}
                                            >
                                                {w} WPM
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <Tooltip text="Restart">
                            <button
                                onClick={onRestart}
                                disabled={uiState !== "ready"}
                                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
                            >
                                <SkipBack size={14} />
                            </button>
                        </Tooltip>

                        <Tooltip text="Edit Text">
                            <button
                                onClick={onToggleEditor}
                                disabled={uiState === "idle" || uiState === "generating"}
                                className={cn(
                                    "w-9 h-9 rounded-full border flex items-center justify-center transition-all disabled:opacity-30",
                                    showEditor && uiState === "editing"
                                        ? "bg-white text-black border-white"
                                        : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
                                )}
                            >
                                <Edit3 size={14} />
                            </button>
                        </Tooltip>

                        <Tooltip text={isSaved ? "Saved" : "Save to Library"}>
                            <button
                                onClick={onSave}
                                className={cn(
                                    "w-9 h-9 rounded-full border flex items-center justify-center transition-all",
                                    isSaved
                                        ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                                        : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
                                )}
                            >
                                {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                            </button>
                        </Tooltip>

                        <Tooltip text="Download MP3">
                            <button
                                onClick={onDownload}
                                disabled={uiState !== "ready" || isDownloading}
                                className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
                            >
                                {isDownloading
                                    ? <Loader2 size={14} className="animate-spin text-blue-400" />
                                    : isDownloadComplete
                                        ? <Check size={14} className="text-green-400" />
                                        : <Download size={14} />}
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* Secondary Row: Voice Selector */}
                {/* Secondary Row: Voice Selector - Audio Mode Only */}
                {readerMode === 'audio' && (
                    <VoiceSelector
                        voices={voices}
                        currentVoiceId={voiceId}
                        onVoiceSelect={onVoiceSelect}
                    />
                )}

                {/* BOTTOM BRANDING */}
                <div className="mt-8 flex justify-center">
                    <Tooltip text="Reset Player">
                        <button
                            onClick={onReset}
                            className="text-[9px] font-bold text-zinc-600 tracking-[0.3em] hover:text-white transition-colors uppercase"
                        >
                            AUDICLE / RESET
                        </button>
                    </Tooltip>
                </div>

                {/* Editor Panel (Expandable) */}
                <AnimatePresence>
                    {uiState === "editing" && showEditor && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: "auto", opacity: 1, marginTop: 24 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            className="w-full overflow-hidden"
                        >
                            <div className="bg-black/40 rounded-xl border border-white/10 p-3">
                                <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
                                    <span className="text-[10px] text-zinc-500 font-mono uppercase">Text Editor</span>
                                    <span className="text-[10px] text-zinc-600 font-mono">{text?.length} chars</span>
                                </div>
                                <textarea
                                    value={text}
                                    onChange={e => onTextChange(e.target.value)}
                                    className="w-full h-32 bg-transparent text-[12px] text-zinc-300 font-mono resize-none focus:outline-none leading-relaxed custom-scrollbar"
                                    placeholder="Enter or paste text here..."
                                    autoFocus
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div >
        </motion.div >
    )
}
