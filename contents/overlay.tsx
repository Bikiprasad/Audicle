import { useState, useRef, useEffect, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useSettings } from "~hooks/useSettings"
import { usePlayerStore } from "~store/usePlayerStore"
import { parseCurrentPage } from "~lib/parser"
import { streamTextToAudio, getVoices, type Voice } from "~services/elevenlabs"
import { Play, Pause, FastForward, ScanSearch, X, FileText, Minus, Plus, Zap, Volume2, Move, Loader2, RefreshCw, Settings2, SkipBack, Edit3, Volume1 } from "lucide-react"
import { cn } from "~lib/utils"

// Inject styles
import cssText from "data-text:~style.css"
export const getStyle = () => {
    const style = document.createElement("style")
    style.textContent = cssText + `
        /* Custom Scrollbar */
        .custom-scrollbar::-webkit-scrollbar {
            width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.4);
        }
    `
    return style
}

interface AudioChunk {
    url: string
    text: string
}

// Custom Tooltip Component
const Tooltip = ({ children, text, className }: { children: React.ReactNode, text: string, className?: string }) => {
    const [show, setShow] = useState(false)
    return (
        <div className={cn("relative flex items-center justify-center", className)} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
            {children}
            <AnimatePresence>
                {show && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: -5 }}
                        exit={{ opacity: 0 }}
                        className="absolute bottom-full mb-2 px-2 py-1 bg-black/90 text-white text-[10px] rounded shadow-xl border border-white/10 whitespace-nowrap z-50 pointer-events-none"
                    >
                        {text}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function Overlay() {
    const { apiKey, voiceId, playbackSpeed, showOverlay, setVoiceId, setShowOverlay, setPlaybackSpeed } = useSettings()
    const { uiState, isPlaying, text, generationProgress, setUiState, setIsPlaying, setText, setGenerationProgress, reset } = usePlayerStore()

    const [error, setError] = useState<string | null>(null)
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null) // New State

    // Audio State
    const [playlist, setPlaylist] = useState<AudioChunk[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [isScrubbing, setIsScrubbing] = useState(false)

    // Volume Control
    const [volume, setVolume] = useState(1) // 0 to 1

    // Voice Selector State
    const [voices, setVoices] = useState<Voice[]>([])
    const [isLoadingVoices, setIsLoadingVoices] = useState(false)
    const [showVoiceSelect, setShowVoiceSelect] = useState(false)
    const [searchVoice, setSearchVoice] = useState("")
    const [showEditor, setShowEditor] = useState(false) // Editor visibility toggle

    // Waveform Bars
    const bars = useMemo(() => Array.from({ length: 50 }, () => Math.max(0.2, Math.random())), [])

    // Helper: Load Voices
    const loadVoices = async () => {
        if (!apiKey) return
        setIsLoadingVoices(true)
        try {
            const list = await getVoices(apiKey)
            setVoices(list)
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoadingVoices(false)
        }
    }

    // Close Editor when state changes from editing
    useEffect(() => {
        if (uiState !== "editing") setShowEditor(false)
    }, [uiState])

    // X.com Injection Logic
    useEffect(() => {
        if (!window.location.hostname.includes("x.com")) return

        const handleInject = () => {
            // Find all action bars (role="group") that don't have our button yet
            const actionBars = document.querySelectorAll('[role="group"]:not([data-audicle-injected])')

            actionBars.forEach(bar => {
                bar.setAttribute('data-audicle-injected', "true")

                // Create Listen Button
                const btn = document.createElement('div')
                // Mimic X classes for alignment/hover. Simplified for safety.
                btn.className = "css-175oi2r r-1777fci r-bt1l66 r-bztko3 r-16y2uox r-165w44y"
                btn.style.display = "inline-flex"
                btn.style.alignItems = "center"
                btn.style.marginLeft = "4px"
                btn.style.cursor = "pointer"
                btn.setAttribute("role", "button")
                btn.setAttribute("aria-label", "Listen with Audicle")
                btn.title = "Listen with Audicle"

                // Icon (Play/Listen)
                btn.innerHTML = `
                    <div dir="ltr" class="css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41 r-1awozwy r-6koalj r-1h0z5md r-o7ynqc r-6416eg r-1ny4l3l" style="color: rgb(29, 155, 240); display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 9999px; transition: background-color 0.2s;">
                        <svg viewBox="0 0 24 24" aria-hidden="true" style="width: 1.25em; height: 1.25em; fill: currentColor;">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"></path>
                        </svg>
                    </div>
                 `

                // Hover effect logic (manual since we aren't using React for this injected node)
                const innerDiv = btn.firstElementChild as HTMLElement
                btn.onmouseenter = () => { innerDiv.style.backgroundColor = "rgba(29, 155, 240, 0.1)" }
                btn.onmouseleave = () => { innerDiv.style.backgroundColor = "transparent" }

                btn.onclick = (e) => {
                    e.stopPropagation()
                    e.preventDefault()

                    // Find the tweet container
                    const tweetArticle = bar.closest('article')
                    if (tweetArticle) {
                        try {
                            // Extract Image (if any)
                            let imgUrl: string | null = null
                            const photo = tweetArticle.querySelector('[data-testid="tweetPhoto"] img') as HTMLImageElement
                            if (photo) imgUrl = photo.src

                            // Clone and Clean Extraction
                            const clone = tweetArticle.cloneNode(true) as Element
                            // Remove noise
                            clone.querySelectorAll('[data-testid="User-Name"], [data-testid="socialContext"], [role="group"], time').forEach(el => el.remove())

                            let extractedText = ""
                            // Strategy A: data-text (Articles)
                            const dataText = Array.from(clone.querySelectorAll('[data-text="true"]'))
                            if (dataText.length > 0) extractedText = dataText.map(el => el.textContent).join("\n\n")
                            else {
                                // Strategy B: tweetText (Standard)
                                const tweetText = clone.querySelector('[data-testid="tweetText"]')
                                extractedText = tweetText ? tweetText.textContent || "" : (clone as HTMLElement).innerText
                            }

                            // Clean Unicode/Emoji noise
                            extractedText = extractedText.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim()

                            if (extractedText) {
                                setText(extractedText)
                                setUiState("editing")
                                setBackgroundImage(imgUrl || "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop")
                                setShowOverlay(true)
                                loadVoices()
                            } else {
                                alert("Could not extract text from this tweet.")
                            }
                        } catch (err) {
                            console.error("Extraction failed", err)
                        }
                    }
                }

                // Insert before the Share button (usually the last one) or just append
                // bar.insertBefore(btn, bar.lastElementChild) 
                bar.appendChild(btn)
            })
        }

        const observer = new MutationObserver(handleInject)
        observer.observe(document.body, { childList: true, subtree: true })

        // Initial run with delay to ensure hydration
        setTimeout(handleInject, 1000)
        setTimeout(handleInject, 3000)

        return () => observer.disconnect()
    }, [setShowOverlay, setText, setUiState])



    // Refs for effects
    const isScrubbingRef = useRef(false)
    const playNextRef = useRef<() => void>(null)

    // Sync refs
    useEffect(() => { isScrubbingRef.current = isScrubbing }, [isScrubbing])

    useEffect(() => {
        playNextRef.current = () => {
            setCurrentIndex(prev => {
                if (prev < playlist.length - 1) return prev + 1
                setIsPlaying(false)
                return prev
            })
        }
    }, [playlist.length, setIsPlaying])

    // Init Audio (Rub once)
    useEffect(() => {
        const audio = new Audio()
        audioRef.current = audio
        audio.volume = volume

        const updateTime = () => {
            if (!isScrubbingRef.current) setCurrentTime(audio.currentTime)
        }
        const updateDuration = () => setDuration(audio.duration)
        const handleEnded = () => playNextRef.current?.()

        audio.addEventListener("timeupdate", updateTime)
        audio.addEventListener("loadedmetadata", updateDuration)
        audio.addEventListener("ended", handleEnded)

        return () => {
            audio.pause()
            audio.removeEventListener("timeupdate", updateTime)
            audio.removeEventListener("loadedmetadata", updateDuration)
            audio.removeEventListener("ended", handleEnded)
        }
    }, [])

    // Sync Volume
    useEffect(() => {
        if (audioRef.current) audioRef.current.volume = volume
    }, [volume])

    // Sync Playback Speed
    useEffect(() => {
        if (audioRef.current) audioRef.current.playbackRate = playbackSpeed
    }, [playbackSpeed])

    // Playback Logic
    useEffect(() => {
        if (!audioRef.current || playlist.length === 0) return
        const chunk = playlist[currentIndex]
        if (!chunk) return

        if (audioRef.current.src !== chunk.url) {
            audioRef.current.src = chunk.url
            audioRef.current.playbackRate = playbackSpeed
            if (isPlaying) audioRef.current.play().catch(console.error)
        } else {
            if (isPlaying) audioRef.current.play().catch(console.error)
            else audioRef.current.pause()
        }
    }, [currentIndex, playlist, isPlaying, playbackSpeed])

    const handleImport = () => {
        setError(null)
        try {
            const extracted = parseCurrentPage()
            if (!extracted) throw new Error("No text found.")
            setText(extracted)
            setUiState("editing")
            loadVoices()
        } catch (e: any) {
            setError(e.message)
        }
    }

    const handleGenerate = async () => {
        if (!apiKey) {
            setError("API Key Missing")
            return
        }
        setUiState("generating")
        setPlaylist([])
        setCurrentIndex(0)
        setGenerationProgress(0, 0)
        setError(null)

        try {
            const newPlaylist: AudioChunk[] = []
            await streamTextToAudio(
                text,
                voiceId,
                apiKey,
                (blob, textChunk) => newPlaylist.push({ url: URL.createObjectURL(blob), text: textChunk }),
                (current, total) => setGenerationProgress(current, total)
            )
            setPlaylist(newPlaylist)
            setUiState("ready")
        } catch (e: any) {
            setError("Gen Failed")
            setUiState("editing")
        }
    }

    const restartPlaylist = () => {
        setCurrentIndex(0)
        setIsPlaying(true)
        if (audioRef.current) {
            audioRef.current.currentTime = 0
            audioRef.current.play().catch(console.error)
        }
    }

    if (!showOverlay) return null

    // Filter voices
    const filteredVoices = voices.filter(v => v.name.toLowerCase().includes(searchVoice.toLowerCase()))

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

                {/* Close Button */}
                <button
                    onClick={() => setShowOverlay(false)}
                    className="absolute top-4 right-4 z-50 text-white/20 hover:text-white transition-colors"
                >
                    <X size={16} />
                </button>

                {/* Noise Texture Overlay */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />

                {/* OLED SCREEN */}
                <div className="relative bg-black rounded-[20px] px-5 pt-5 pb-1 text-white min-h-[180px] flex flex-col shadow-[inset_0_2px_10px_rgba(0,0,0,1)] border border-white/5 overflow-hidden group">

                    {/* Dynamic Background Image */}
                    {backgroundImage && (
                        <div className="absolute inset-0 z-0">
                            <div
                                className="absolute inset-0 bg-cover bg-center opacity-90 transition-opacity duration-1000"
                                style={{ backgroundImage: `url(${backgroundImage})` }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" /> {/* Gradient for text readability at bottom */}
                        </div>
                    )}

                    {/* Screen Glare & Effect */}
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-white/5 to-transparent pointer-events-none rounded-[20px] z-20" />



                    {/* Main Display */}
                    <div className="flex-1 flex flex-col justify-center items-center text-center z-30 relative w-full overflow-hidden">
                        {error ? (
                            <div className="text-red-300 text-xs font-mono bg-red-900/30 px-3 py-2 rounded-lg border border-red-500/20">{error}</div>
                        ) : uiState === "idle" ? (
                            <>
                                <ScanSearch className="text-zinc-600 mb-3 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]" size={32} />
                                <p className="text-zinc-500 text-[10px] tracking-[0.2em] font-bold">READY TO SCAN</p>
                            </>
                        ) : uiState === "generating" ? (
                            <div className="w-full px-4">
                                <p className="text-blue-400 text-[9px] tracking-[0.2em] font-bold animate-pulse text-center mb-2">SYNTHESIZING</p>
                                <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-blue-500 shadow-[0_0_10px_#3b82f6]"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(generationProgress.current / (generationProgress.total || 1)) * 100}%` }}
                                    />
                                </div>
                                <p className="text-zinc-600 text-[9px] mt-2 text-center font-mono">{generationProgress.current}/{generationProgress.total}</p>
                            </div>
                        ) : uiState === "editing" ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse mb-2" />
                                <p className="text-[10px] text-zinc-500 font-mono tracking-widest">CLICK PLAY TO LISTEN</p>
                            </div>
                        ) : uiState === "ready" ? (
                            <div className="w-full h-full relative p-4 flex flex-col justify-end items-center pb-1">
                                <motion.div
                                    key={currentIndex}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-[18px] leading-relaxed font-bold text-center w-full max-w-full px-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] whitespace-nowrap overflow-hidden mb-[-50px]"
                                >
                                    {(() => {
                                        const words = playlist[currentIndex]?.text?.split(/\s+/) || []
                                        if (words.length === 0) return null

                                        const progress = currentTime / (duration || 0.1)
                                        const safeProgress = Math.min(Math.max(progress, 0), 0.99)
                                        const activeIndex = Math.floor(safeProgress * words.length)

                                        // Show 7 words: 3 before, active, 3 after
                                        let start = Math.max(0, activeIndex - 3)
                                        let end = start + 7

                                        if (end > words.length) {
                                            end = words.length
                                            start = Math.max(0, end - 7)
                                        }

                                        const visibleSlice = words.slice(start, end)

                                        return visibleSlice.map((word, i) => {
                                            const absIndex = start + i
                                            const isActive = absIndex === activeIndex
                                            const isEdge = i === 0 || i === visibleSlice.length - 1

                                            return (
                                                <span
                                                    key={absIndex}
                                                    className={cn(
                                                        "inline-block mx-1.5 transition-all duration-150 transform",
                                                        isActive
                                                            ? "text-blue-400 scale-110 z-10 opacity-100"
                                                            : isEdge
                                                                ? "text-white/30 scale-90 blur-[1px]"
                                                                : "text-white/70 scale-95"
                                                    )}
                                                >
                                                    {word}
                                                </span>
                                            )
                                        })
                                    })()}
                                </motion.div>
                            </div>
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
                            onMouseDown={() => setIsScrubbing(true)}
                            onMouseUp={() => setIsScrubbing(false)}
                            onChange={(e) => {
                                const t = parseFloat(e.target.value);
                                setCurrentTime(t);
                                if (audioRef.current) audioRef.current.currentTime = t
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-40"
                            aria-label="Seek"
                        />
                    </div>
                )}

                {/* Header: Status & Time */}
                <div className="flex justify-between items-center text-[10px] text-zinc-500 mt-2 px-6 pt-[10px] font-mono z-30 tracking-widest uppercase">
                    <div className="flex items-center gap-1.5">
                        <span className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor]", isPlaying ? "bg-green-500" : "bg-red-500")} />
                        {uiState}
                    </div>
                    <div className="flex items-center gap-2">
                        <span>{(currentTime).toFixed(1)}s</span>
                    </div>
                </div>

                {/* CONTROLS ROW */}
                <div className="flex items-center justify-between mt-2 px-2 relative z-50 min-h-[64px]">

                    {/* Volume Slider (Left) */}
                    <div className="flex items-center gap-2 bg-black/40 rounded-full p-2 border border-white/5 w-24 z-30">
                        <Volume2 size={12} className="text-zinc-500 ml-1" />
                        <Tooltip text={`Volume: ${Math.round(volume * 100)}%`}>
                            <input
                                type="range" min={0} max={1} step={0.05} value={volume}
                                onChange={e => setVolume(parseFloat(e.target.value))}
                                className="w-full h-1 bg-zinc-700 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2 [&::-webkit-slider-thumb]:h-2 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
                            />
                        </Tooltip>
                    </div>

                    {/* CENTRAL ACTION BUTTON */}
                    <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-20">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-b from-white/10 to-transparent p-0.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                            <Tooltip text={isPlaying ? "Pause" : uiState === "idle" ? "Import Text" : "Play"} className="w-full h-full">
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    className={cn(
                                        "w-full h-full rounded-full flex items-center justify-center transition-all z-20 border border-white/10",
                                        isPlaying
                                            ? "bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.5)]"
                                            : "bg-[#222] shadow-[inset_0_2px_5px_rgba(255,255,255,0.1)] hover:bg-[#333]"
                                    )}
                                    onClick={() => {
                                        if (uiState === "idle") handleImport()
                                        else if (uiState === "editing") handleGenerate()
                                        else if (uiState === "ready") setIsPlaying(!isPlaying)
                                    }}
                                >
                                    {uiState === "idle" && <ScanSearch size={20} className="text-zinc-400" />}
                                    {uiState === "editing" && <Zap size={20} className="text-orange-500" />}
                                    {uiState === "generating" && <Loader2 size={20} className="text-blue-500 animate-spin" />}
                                    {uiState === "ready" && (
                                        isPlaying
                                            ? <Pause size={24} className="text-white fill-white" />
                                            : <Play size={24} className="text-white ml-1 fill-white" />
                                    )}
                                </motion.button>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Playback Controls / Edit (Right) */}
                    <div className="flex items-center gap-2 z-30">
                        {/* Speed Selector */}
                        <div className="relative group z-40">
                            <button className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                                {playbackSpeed}x
                            </button>
                            {/* Hover Bridge Container */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center pb-2 w-[50px]">
                                <div className="flex flex-col gap-1 bg-black/90 p-1 rounded-xl border border-white/10 shadow-xl backdrop-blur-md w-full">
                                    {[0.5, 1, 1.5, 2, 3, 5].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setPlaybackSpeed(s)}
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
                        <Tooltip text="Restart">
                            <button
                                onClick={() => uiState === "ready" ? restartPlaylist() : null}
                                disabled={uiState !== "ready"}
                                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-30"
                            >
                                <SkipBack size={14} />
                            </button>
                        </Tooltip>

                        <Tooltip text="Edit Text">
                            <button
                                onClick={() => {
                                    setUiState("editing")
                                    setShowEditor(prev => !prev)
                                }}
                                disabled={uiState === "idle" || uiState === "generating"}
                                className={cn(
                                    "w-8 h-8 rounded-full border flex items-center justify-center transition-all disabled:opacity-30",
                                    showEditor && uiState === "editing"
                                        ? "bg-white text-black border-white"
                                        : "bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10"
                                )}
                            >
                                <Edit3 size={14} />
                            </button>
                        </Tooltip>
                    </div>
                </div>

                {/* Secondary Row: Voice Selector */}
                <div className="w-full mt-6">
                    <div className="relative w-full">
                        <button
                            onClick={() => setShowVoiceSelect(!showVoiceSelect)}
                            className="w-full flex items-center justify-between bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl px-4 py-3 transition-colors group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                                    <Volume1 size={14} className="text-white" />
                                </div>
                                <div className="text-left">
                                    <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Voice Persona</p>
                                    <p className="text-[13px] text-white font-medium truncate w-40">
                                        {voices.find(v => v.voice_id === voiceId)?.name || "Select Voice"}
                                    </p>
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
                                        />
                                        <div className="max-h-[140px] overflow-y-auto custom-scrollbar space-y-1">
                                            {filteredVoices.map(v => (
                                                <button
                                                    key={v.voice_id}
                                                    onClick={() => {
                                                        setVoiceId(v.voice_id)
                                                        setShowVoiceSelect(false)
                                                        if (uiState === "ready") setUiState("editing")
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] transition-all",
                                                        voiceId === v.voice_id
                                                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                                            : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                                    )}
                                                >
                                                    <span>{v.name}</span>
                                                    {voiceId === v.voice_id && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* BOTTOM BRANDING */}
                <div className="mt-8 flex justify-center">
                    <Tooltip text="Reset Player">
                        <button
                            onClick={() => {
                                reset()
                                setText("This is a sample text")
                                setUiState("editing")
                                loadVoices()
                            }}
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
                                    <span className="text-[10px] text-zinc-600 font-mono">{text.length} chars</span>
                                </div>
                                <textarea
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                    className="w-full h-32 bg-transparent text-[12px] text-zinc-300 font-mono resize-none focus:outline-none leading-relaxed custom-scrollbar"
                                    placeholder="Enter or paste text here..."
                                    autoFocus
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div >
    )
}

export default Overlay
