import { useState, useRef, useEffect, useMemo } from "react"
import { useSettings } from "~hooks/useSettings"
import { usePlayerStore } from "~store/usePlayerStore"
import { parseCurrentPage } from "~lib/parser"
import type { Voice } from "~lib/audio/types"
import { audioService } from "~lib/audio/AudioService" // Still needed for getVoices
import { speedReaderEngine } from "~lib/reader/SpeedReaderEngine"
import { useReadingList } from "~hooks/useReadingList"
import { MiniPlayer } from "~components/overlay/MiniPlayer"
import { Player } from "~components/overlay/Player"
import { useTwitterInjector } from "~hooks/overlay/useTwitterInjector"
import { useAudio } from "~hooks/useAudio"

import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
    matches: ["https://x.com/*", "https://twitter.com/*"]
}

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

function Overlay() {
    const { apiKey, voiceId, playbackSpeed, showOverlay, isElevenLabsEnabled, readerMode, speedReaderWpm, kokoroUrl, isKokoroEnabled, isPro, setVoiceId, setShowOverlay, setPlaybackSpeed, setSpeedReaderWpm } = useSettings()
    const { uiState, text, sourceUrl, generationProgress, setUiState, setText, setSourceUrl, setGenerationProgress, reset } = usePlayerStore()
    const { addArticle, removeArticle, isSaved, articles } = useReadingList()

    // Using new Audio Hook
    const audio = useAudio();

    // Sync Store isPlaying with Audio Hook
    // Note: usePlayerStore's isPlaying might be redundant now, but we keep it for global syncing if needed.
    // Ideally we should deprecate usePlayerStore.isPlaying in favor of audio.isPlaying

    const [error, setError] = useState<string | null>(null)
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null)

    // Local UI State
    const [isMinimized, setIsMinimized] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [showEditor, setShowEditor] = useState(false)

    // Highlight State
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isFinished, setIsFinished] = useState(false)
    const [isDownloading, setIsDownloading] = useState(false)
    const [isDownloadComplete, setIsDownloadComplete] = useState(false)

    // Voice Selector State
    const [voices, setVoices] = useState<Voice[]>([])

    // Waveform Bars
    const bars = useMemo(() => Array.from({ length: 50 }, () => Math.max(0.2, Math.random())), [])

    // --- Helper: Load Voices ---
    const loadVoices = async () => {
        try {
            const list = await audioService.getVoices(apiKey, isElevenLabsEnabled, kokoroUrl, isKokoroEnabled)
            setVoices(list)
        } catch (e) {
            console.error(e)
        }
    }

    // Load voices when Overlay is shown
    useEffect(() => {
        if (showOverlay) {
            loadVoices()
        }
    }, [showOverlay, apiKey, isElevenLabsEnabled, kokoroUrl, isKokoroEnabled, readerMode])

    // Close Editor when state changes from editing
    useEffect(() => {
        if (uiState !== "editing") setShowEditor(false)
    }, [uiState])

    // --- Twitter Injection ---
    useTwitterInjector(setText, setUiState, setBackgroundImage, setShowOverlay, loadVoices, setSourceUrl)

    // --- Word Boundary Sync ---
    useEffect(() => {
        if (audio.wordBoundary) {
            setCurrentIndex(audio.wordBoundary.charIndex);
        } else if (readerMode === 'audio' && audio.isPlaying) {
            // Fallback for providers without word boundaries (e.g. Kokoro Stream)
            // Estimate position: ~15 chars/sec * speed
            const charsPerSec = 15 * playbackSpeed;
            const estimatedIndex = Math.floor(audio.currentTime * charsPerSec);
            setCurrentIndex(Math.min(estimatedIndex, text.length));
        }
    }, [audio.wordBoundary, audio.currentTime, audio.isPlaying, readerMode, playbackSpeed, text.length]);

    // --- Audio Error Sync ---
    useEffect(() => {
        if (audio.error) setError(audio.error);
    }, [audio.error]);

    // Initial Speed/Volume Set
    // (Optional: relying on user action or hook defaults)

    // --- Handlers ---

    const handleImport = () => {
        setError(null)
        try {
            const { text: extractedText, url: extractedUrl } = parseCurrentPage()
            if (!extractedText) throw new Error("No text found.")
            setText(extractedText)
            setSourceUrl(extractedUrl)
            setUiState("editing")
            loadVoices()
        } catch (e: any) {
            setError(e.message)
        }
    }

    const handleGenerate = async () => {
        setUiState("generating")
        setGenerationProgress(0, 100)

        // Parsing
        // Only re-parse if text is empty (e.g. fresh start) to avoid overwriting specific extraction or user edits
        if (!text || text.trim().length === 0) {
            const { text: parsedText, url: parsedUrl } = parseCurrentPage()
            setText(parsedText)
            setSourceUrl(parsedUrl)
            console.log("Audicle: Parsed Content", { textLen: parsedText.length, url: parsedUrl })
        } else {
            console.log("Audicle: Using existing text", { textLen: text.length })
        }

        const currentText = text && text.trim().length > 0 ? text : (parseCurrentPage().text || "");

        if (!currentText || currentText.length < 5) {
            // Error handling
            // We might want to set error state
            setUiState("idle")
            return
        }
        setCurrentIndex(0)
        setError(null)

        // SPEED READER MODE
        if (readerMode === 'speed-reader') {
            try {
                speedReaderEngine.setText(currentText)
                speedReaderEngine.setWpm(speedReaderWpm)
                speedReaderEngine.setOnWordChange((wordIndex, word) => {
                    const words = currentText.split(/\s+/)
                    let charIndex = 0
                    for (let i = 0; i < wordIndex && i < words.length; i++) {
                        charIndex += words[i].length + 1
                    }
                    setCurrentIndex(charIndex)
                })
                speedReaderEngine.setOnComplete(() => {
                    setIsFinished(true)
                })
                // setDuration(speedReaderEngine.getEstimatedDuration()) // SpeedReader doesn't emit standard duration yet
                setUiState("ready")
                setIsFinished(false)
                speedReaderEngine.play()
            } catch (e: any) {
                console.error("Speed Reader failed", e)
                setError("Speed Reader failed")
                setUiState("editing")
            }
            return
        }

        // AUDIO MODE
        try {
            console.log("Overlay: Playing", {
                textLength: currentText.length,
                voiceId,
                playbackSpeed,
                activeProvider: audio.isBuffering ? "buffering" : "ready"
            });
            setUiState("ready")

            await audio.play(text, voiceId, playbackSpeed, apiKey, isElevenLabsEnabled, kokoroUrl, isKokoroEnabled);

            // Note: Hook will update isPlaying. We don't need manual setIsPlaying here.
            console.log("Overlay: Playback started");
        } catch (e: any) {
            console.error("Overlay: Playback failed", e);
            setError("Playback failed")
            setUiState("editing")
        }
    }

    const togglePlayPause = () => {
        if (readerMode === 'speed-reader') {
            if (speedReaderEngine.getIsPlaying()) {
                speedReaderEngine.pause();
            } else {
                speedReaderEngine.play();
            }
        } else {
            // Audio mode
            if (audio.isPlaying) {
                audio.pause();
            } else {
                audio.resume();
            }
        }
    }

    const restartPlaylist = () => {
        if (readerMode === 'speed-reader') {
            setIsFinished(false);
            speedReaderEngine.restart();
            if (speedReaderEngine.getIsPlaying()) {
                speedReaderEngine.pause();
            }
            setCurrentIndex(0);
        } else {
            // Audio mode
            audio.seek(0);
            if (!audio.isPlaying) {
                audio.resume();
            }
            setCurrentIndex(0);
        }
    }


    const toggleMute = () => {
        // Simple mute toggle logic - storing previous volume in component state if needed, 
        // or just toggling between 0 and 1 (or current volume)
        if (isMuted) {
            audio.setVolume(1); // Restore to full? Or store previous?
            setIsMuted(false)
        } else {
            audio.setVolume(0)
            setIsMuted(true)
        }
    }

    const handleReset = () => {
        reset()
        audio.stop()
        setText("This is a sample text")
        setUiState("editing")
        loadVoices()
    }

    // --- Render ---

    if (!showOverlay) return null

    if (isMinimized) {
        return (
            <MiniPlayer
                isPlaying={readerMode === 'speed-reader' ? speedReaderEngine.getIsPlaying() : audio.isPlaying}
                isMuted={isMuted}
                onTogglePlay={togglePlayPause}
                onToggleMute={toggleMute}
                onExpand={() => setIsMinimized(false)}
            />
        )
    }

    return (
        <Player
            // State
            uiState={uiState}
            isPlaying={readerMode === 'speed-reader' ? speedReaderEngine.getIsPlaying() : audio.isPlaying}
            isBuffering={audio.isBuffering}
            currentTime={audio.currentTime}
            duration={audio.duration}
            volume={audio.volume}
            playbackSpeed={playbackSpeed}
            bars={bars}
            text={text}
            error={error || audio.error}
            backgroundImage={backgroundImage}
            generationProgress={generationProgress}
            voices={voices}
            voiceId={voiceId}
            showEditor={showEditor}
            currentIndex={currentIndex}

            // Handlers
            onClose={() => setShowOverlay(false)}
            onMinimize={() => setIsMinimized(true)}
            onPlayPause={togglePlayPause}
            onImport={handleImport}
            onGenerate={handleGenerate}
            onReset={handleReset}
            onSeek={(t) => {
                // Optimistic text update
                const charsPerSec = 15 * playbackSpeed;
                const estimatedCharIndex = Math.floor(t * charsPerSec);
                setCurrentIndex(Math.min(estimatedCharIndex, text.length - 1));

                audio.seek(t);
            }}
            onVolumeChange={(v) => {
                audio.setVolume(v)
                if (v > 0) setIsMuted(false)
            }}
            onSpeedChange={(s) => {
                setPlaybackSpeed(s)
                audio.setSpeed(s)
            }}
            onVoiceSelect={(id) => {
                setVoiceId(id)
                audio.stop()
                setCurrentIndex(0)
                if (uiState !== "idle") setUiState("editing")
            }}
            onRestart={restartPlaylist}
            onToggleEditor={() => {
                setUiState("editing")
                setShowEditor(prev => !prev)
            }}
            onTextChange={setText}
            onDownload={async () => {
                setIsDownloading(true);
                setIsDownloadComplete(false);
                try {
                    await audioService.download(text, voiceId);
                    setIsDownloadComplete(true);
                    setTimeout(() => setIsDownloadComplete(false), 2000);
                } catch (e) {
                    console.error("Download failed", e);
                    alert("Download failed. Check API Key or Network.");
                } finally {
                    setIsDownloading(false);
                }
            }}
            isDownloading={isDownloading}
            isDownloadComplete={isDownloadComplete}
            isMuted={isMuted}
            onMuteToggle={toggleMute}
            readerMode={readerMode}
            speedReaderWpm={speedReaderWpm}
            onWpmChange={setSpeedReaderWpm}
            isSaved={isSaved(sourceUrl || window.location.href)}
            onSave={() => {
                if (!isPro) {
                    alert("Saving to library is a Pro feature.");
                    return;
                }
                const url = sourceUrl || window.location.href;
                const existingArticle = articles.find(a => a.url === url);

                if (existingArticle) {
                    removeArticle(existingArticle.id);
                } else {
                    // Scrape Metadata
                    const metadata: any = {
                        title: document.title || "Untitled Article",
                        url: url
                    }

                    try {
                        // Twitter Specific Scraping
                        const isTwitter = url.includes("twitter.com") || url.includes("x.com")
                        if (isTwitter) {
                            // 1. Extract Tweet ID from URL
                            // URL formats: /user/status/1234... or /user/status/1234...?s=20
                            const match = url.match(/status\/(\d+)/)
                            const tweetId = match ? match[1] : null

                            let article: HTMLElement | null = null;

                            if (tweetId) {
                                // 2. Find the specific article element that links to this Tweet ID
                                // Twitter articles usually have a Time element or link pointing to the status
                                const articles = Array.from(document.querySelectorAll('article'))
                                article = articles.find(art => {
                                    // Check for any link to this status ID inside the article
                                    // Note: We search for the ID but need to be careful not to match replies if we are on a detail page?
                                    // Actually, on a detail page, the main tweet is usually the one without a parent "Show this thread" context above it?
                                    // Simple heuristic: Look for <a href*="status/ID">
                                    return art.querySelector(`a[href*="/status/${tweetId}"]`)
                                }) as HTMLElement
                            }

                            // Fallback: If no ID found or article not found (maybe main focused tweet?), try main article
                            if (!article) {
                                article = document.querySelector('article[data-testid="tweet"]') as HTMLElement || document.querySelector('article') as HTMLElement
                            }

                            if (article) {
                                // Avatar (Scoped to article)
                                const avatarImg = article.querySelector('[data-testid="Tweet-User-Avatar"] img') as HTMLImageElement
                                if (avatarImg) metadata.avatar = avatarImg.src

                                // Name & Handle (Scoped to article)
                                const userLink = article.querySelector('[data-testid="User-Name"]') as HTMLElement
                                if (userLink) {
                                    // The text usually contains "Name\n@handle\n..."
                                    // We need to be careful with formatting
                                    const rawText = userLink.innerText || ""
                                    const lines = rawText.split('\n').filter(l => l.trim())
                                    if (lines.length >= 2) {
                                        metadata.author = lines[0]
                                        // Handle usually starts with @ in the text content hidden/visible
                                        metadata.handle = lines.find(l => l.startsWith('@')) || lines[1]
                                    }
                                }

                                // Tweet Text (Title)
                                // Replace "Untitled Article" with actual tweet text
                                const tweetText = article.querySelector('[data-testid="tweetText"]') as HTMLElement
                                if (tweetText) {
                                    metadata.title = tweetText.innerText.substring(0, 100) + (tweetText.innerText.length > 100 ? "..." : "")
                                }

                                // Tweet Image (Scoped to article)
                                const tweetPhoto = article.querySelector('[data-testid="tweetPhoto"] img') as HTMLImageElement
                                if (tweetPhoto) metadata.image = tweetPhoto.src

                                // Timestamp
                                // Twitter timestamps are usually in a <time> element
                                // We try multiple selectors to catch it
                                const timeEl = article.querySelector('time') as HTMLTimeElement
                                if (timeEl) {
                                    metadata.tweetTimestamp = timeEl.getAttribute('datetime')
                                } else {
                                    // Fallback: look for generic time string in aria-labels or text
                                    // But <time> is standard on Twitter web
                                }
                            }
                        }
                    } catch (e) {
                        console.warn("Metadata scraping failed", e)
                    }

                    addArticle({
                        ...metadata
                    });
                }
            }}
        />
    )
}

export default Overlay
