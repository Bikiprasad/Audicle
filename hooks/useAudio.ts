import { useState, useEffect, useCallback } from "react";
import { audioService } from "~lib/audio/AudioService";
import type { PlayerEvent, WordBoundaryEvent } from "~lib/audio/types";

export const useAudio = () => {
    // Local React State reflecting AudioService state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1); // Default, syncing to be better
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isBuffering, setIsBuffering] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [wordBoundary, setWordBoundary] = useState<WordBoundaryEvent | null>(null);

    // Initial State Sync
    useEffect(() => {
        setDuration(audioService.getDuration());
        setCurrentTime(audioService.getCurrentTime());
        setPlaybackRate(audioService.getPlaybackRate());
        // We can't easily sync "isPlaying" without a getter, but events cover it.
    }, []);

    // Event Subscriptions
    useEffect(() => {
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleEnded = () => { setIsPlaying(false); setIsBuffering(false); };
        const handleWaiting = () => setIsBuffering(true);
        const handleTimeUpdate = () => {
            setCurrentTime(audioService.getCurrentTime());
            setDuration(audioService.getDuration());
            setIsBuffering(false); // If time is updating, we aren't buffering
        };
        const handleError = (e: any) => setError(e?.message || "Audio Error");
        const handleBoundary = (e: WordBoundaryEvent) => setWordBoundary(e);
        const handleVolumeChange = (vol: number) => setVolume(vol); // Provider should emit this
        const handleSpeedChange = (speed: number) => setPlaybackRate(speed);

        const unsubs = [
            audioService.on('play', handlePlay),
            audioService.on('pause', handlePause),
            audioService.on('ended', handleEnded),
            audioService.on('waiting', handleWaiting),
            audioService.on('timeupdate', handleTimeUpdate),
            audioService.on('error', handleError),
            audioService.on('boundary', handleBoundary),
            audioService.on('volumechange', handleVolumeChange),
            audioService.on('speedchange', handleSpeedChange)
        ];

        return () => {
            unsubs.forEach(u => u());
        };
    }, []);

    // Wrapper Methods
    const play = useCallback((text: string, voiceId: string, speed: number, apiKey?: string, isElevenLabsEnabled?: boolean, kokoroUrl?: string, isKokoroEnabled?: boolean) => {
        setError(null);
        return audioService.play(text, voiceId, speed, apiKey, isElevenLabsEnabled, kokoroUrl, isKokoroEnabled);
    }, []);

    const pause = useCallback(() => audioService.pause(), []);
    const resume = useCallback(() => audioService.resume(), []);
    const stop = useCallback(() => audioService.stop(), []);

    const seek = useCallback((time: number) => {
        // Optimistic update
        setCurrentTime(time);
        audioService.seek(time);
    }, []);

    const changeVolume = useCallback((val: number) => {
        setVolume(val); // Optimistic
        audioService.setVolume(val);
    }, []);

    const changeSpeed = useCallback((val: number) => {
        setPlaybackRate(val); // Optimistic
        audioService.setSpeed(val);
    }, []);

    return {
        isPlaying,
        currentTime,
        duration,
        volume,
        playbackRate,
        isBuffering,
        error,
        wordBoundary,
        play,
        pause,
        resume,
        stop,
        seek,
        setVolume: changeVolume,
        setSpeed: changeSpeed
    };
};
