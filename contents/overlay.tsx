import { useState, useRef, useEffect, useMemo } from "react"
import { useSettings } from "~hooks/useSettings"
import { usePlayerStore } from "~store/usePlayerStore"
import { parseCurrentPage } from "~lib/parser"
import type { Voice } from "~lib/audio/types"
import { audioService } from "~lib/audio/AudioService"
import { speedReaderEngine } from "~lib/reader/SpeedReaderEngine"
import { MiniPlayer } from "~components/overlay/MiniPlayer"
import { Player } from "~components/overlay/Player"
import { useTwitterInjector } from "~hooks/overlay/useTwitterInjector"

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
    const { apiKey, voiceId, playbackSpeed, showOverlay, isElevenLabsEnabled, readerMode, speedReaderWpm, setVoiceId, setShowOverlay, setPlaybackSpeed, setSpeedReaderWpm } = useSettings()
    const { uiState, isPlaying, text, generationProgress, setUiState, setIsPlaying, setText, setGenerationProgress, reset } = usePlayerStore()

    const [error, setError] = useState<string | null>(null)
    const [backgroundImage, setBackgroundImage] = useState<string | null>(null)

    // Local UI State
    const [isMinimized, setIsMinimized] = useState(false)
    const [isMuted, setIsMuted] = useState(false)
    const [showEditor, setShowEditor] = useState(false)

    // Audio State
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, setVolume] = useState(1)
    const previousVolume = useRef(1)

    // Highlight State
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isFinished, setIsFinished] = useState(false)

    // Voice Selector State
    const [voices, setVoices] = useState<Voice[]>([])
    // const [isLoadingVoices, setIsLoadingVoices] = useState(false)

    // Waveform Bars
    const bars = useMemo(() => Array.from({ length: 50 }, () => Math.max(0.2, Math.random())), [])

    // --- Helper: Load Voices ---
    const loadVoices = async () => {
        // setIsLoadingVoices(true)
        try {
            const list = await audioService.getVoices(apiKey, isElevenLabsEnabled)
            setVoices(list)
        } catch (e) {
            console.error(e)
        } finally {
            // setIsLoadingVoices(false)
        }
    }

    // Load voices when Overlay is shown
    useEffect(() => {
        if (showOverlay) {
            loadVoices()
        }
    }, [showOverlay, apiKey, isElevenLabsEnabled])

    // Close Editor when state changes from editing
    useEffect(() => {
        if (uiState !== "editing") setShowEditor(false)
    }, [uiState])

    // --- Twitter Injection ---
    useTwitterInjector(setText, setUiState, setBackgroundImage, setShowOverlay, loadVoices)

    // --- Audio Polling ---
    useEffect(() => {
        let intervalId: NodeJS.Timeout;

        if (uiState === 'ready') {
            intervalId = setInterval(() => {
                const t = audioService.getCurrentTime();
                const d = audioService.getDuration();

                setCurrentTime(prev => Math.abs(prev - t) > 0.1 ? t : prev);
                if (d > 0) setDuration(prev => prev !== d ? d : prev);
            }, 100);
        }

        return () => clearInterval(intervalId);
    }, [uiState]);

    // Volume & Speed Sync
    useEffect(() => {
        if (audioService.setVolume) {
            audioService.setVolume(volume);
        }
    }, [volume])

    useEffect(() => {
        // Now using explicit setSpeed
        if (audioService.setSpeed) {
            audioService.setSpeed(playbackSpeed);
        }
    }, [playbackSpeed])

    // Note: Re-applying speed continuously can be buggy depending on implementation, 
    // but we'll assume audioService handles it or we do it on demand.
    // Ideally we call setSpeed only when it changes. 
    // For now, let's leave it as is or move to onSpeedChange handler.

    // --- Handlers ---

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
        setUiState("generating")
        setCurrentIndex(0)
        setGenerationProgress(0, 0)
        setError(null)

        // SPEED READER MODE
        if (readerMode === 'speed-reader') {
            try {
                speedReaderEngine.setText(text)
                speedReaderEngine.setWpm(speedReaderWpm)
                speedReaderEngine.setOnWordChange((wordIndex, word) => {
                    // Convert word index to approximate char index for RSVP display
                    const words = text.split(/\s+/)
                    let charIndex = 0
                    for (let i = 0; i < wordIndex && i < words.length; i++) {
                        charIndex += words[i].length + 1
                    }
                    setCurrentIndex(charIndex)
                })
                speedReaderEngine.setOnComplete(() => {
                    setIsPlaying(false)
                    setIsFinished(true)
                })
                setDuration(speedReaderEngine.getEstimatedDuration())
                setUiState("ready")
                setIsFinished(false)
                setIsPlaying(true)
                speedReaderEngine.play()
            } catch (e: any) {
                console.error("Speed Reader failed", e)
                setError("Speed Reader failed")
                setUiState("editing")
                setIsPlaying(false)
            }
            return
        }

        // AUDIO MODE (unchanged)
        try {
            console.log("Overlay: Playing", {
                textLength: text.length,
                voiceId,
                playbackSpeed,
                activeProvider: audioService.getProviderName()
            });
            setUiState("ready")
            setIsPlaying(true)
            await audioService.play(text, voiceId, playbackSpeed, apiKey, isElevenLabsEnabled, (boundary) => {
                setCurrentIndex(boundary.charIndex)
            })
            console.log("Overlay: Playback finished");
            setIsPlaying(false)
        } catch (e: any) {
            console.error("Overlay: Playback failed", e);
            setError("Playback failed")
            setUiState("editing")
            setIsPlaying(false)
        }
    }

    const togglePlayPause = () => {
        if (readerMode === 'speed-reader') {
            if (isPlaying) {
                speedReaderEngine.pause();
                setIsPlaying(false);
            } else {
                speedReaderEngine.play();
                setIsPlaying(true);
            }
        } else {
            // Audio mode (unchanged)
            if (isPlaying) {
                audioService.pause();
                setIsPlaying(false);
            } else {
                audioService.resume();
                setIsPlaying(true);
            }
        }
    }

    const restartPlaylist = () => {
        if (readerMode === 'speed-reader') {
            setIsFinished(false); // Reset finish state
            speedReaderEngine.restart();
            if (speedReaderEngine.getIsPlaying()) {
                speedReaderEngine.pause();
            }
            setCurrentIndex(0);
            setIsPlaying(false); // Pause at start
        } else {
            // Audio mode (unchanged)
            audioService.stop();
            setCurrentIndex(0);
            handleGenerate();
        }
    }


    const toggleMute = () => {
        if (isMuted) {
            setVolume(previousVolume.current)
            setIsMuted(false)
        } else {
            previousVolume.current = volume
            setVolume(0)
            setIsMuted(true)
        }
    }

    const handleReset = () => {
        reset()
        setText("This is a sample text")
        setUiState("editing")
        loadVoices()
    }

    // --- Render ---

    if (!showOverlay) return null

    if (isMinimized) {
        return (
            <MiniPlayer
                isPlaying={isPlaying}
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
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            playbackSpeed={playbackSpeed}
            bars={bars}
            text={text}
            error={error}
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
                setCurrentTime(t) // Optimistic update

                // Calculate and update currentIndex based on seek time
                // Base rate: ~15 chars/sec at 1x speed, scales with playbackSpeed
                const charsPerSec = 15 * playbackSpeed;
                const estimatedCharIndex = Math.floor(t * charsPerSec);
                setCurrentIndex(Math.min(estimatedCharIndex, text.length - 1));

                audioService.seek(t)
            }} // Syncs both time and text display (speed-aware)
            onVolumeChange={setVolume}
            onSpeedChange={setPlaybackSpeed}
            onVoiceSelect={(id) => {
                setVoiceId(id)
                // Force stop playback to prevent mixed voice states
                audioService.stop()
                setIsPlaying(false)
                setCurrentIndex(0)

                // If not idle, force back to editing state to allow regeneration
                if (uiState !== "idle") {
                    setUiState("editing")
                }
            }}
            onRestart={restartPlaylist}
            onToggleEditor={() => {
                setUiState("editing")
                setShowEditor(prev => !prev)
            }}
            onTextChange={setText}
            onDownload={async () => {
                try {
                    if (audioService.getProviderName() === "WebSpeechProvider") {
                        // Native browser TTS cannot be downloaded
                        alert("Download is only available for Premium Voices (ElevenLabs).");
                        return;
                    }
                    // Trigger download
                    // We need to disable UI or show loading? 
                    // For now, fire and forget (it shows browser download pill).
                    await audioService.download(text, voiceId);
                } catch (e) {
                    console.error("Download failed", e);
                    alert("Download failed. Check API Key or Network.");
                }
            }}
            isMuted={isMuted}
            onMuteToggle={toggleMute}
            readerMode={readerMode}
            speedReaderWpm={speedReaderWpm}
            onWpmChange={setSpeedReaderWpm}
        />
    )
}

export default Overlay
