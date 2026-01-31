import React, { useEffect, useState, useMemo } from "react";
import { cn } from "~lib/utils";

interface SpeedReaderDisplayProps {
    text: string;
    currentIndex: number;
    avatar?: string;
}

export const SpeedReaderDisplay: React.FC<SpeedReaderDisplayProps> = ({ text, currentIndex, avatar }) => {
    // Speaking state logic (Visual feedback only)
    const [isSpeaking, setIsSpeaking] = useState(false);

    useEffect(() => {
        if (currentIndex > 0) {
            setIsSpeaking(true);
            const timer = setTimeout(() => setIsSpeaking(false), 150);
            return () => clearTimeout(timer);
        }
    }, [currentIndex]);

    // Calculate current word based on char index
    const currentWord = useMemo(() => {
        if (!text) return "";
        let start = currentIndex;
        let end = currentIndex;

        // Find start of word
        while (start > 0 && /\S/.test(text[start - 1])) {
            start--;
        }

        // Find end of word
        while (end < text.length && /\S/.test(text[end])) {
            end++;
        }

        return text.slice(start, end);
    }, [text, currentIndex]);

    // Pivot calculation for RSVP (Optical Center)
    const pivot = Math.floor(currentWord.length > 1 ? currentWord.length / 3 : 0);
    const leftPart = currentWord.slice(0, pivot);
    const centerChar = currentWord[pivot];
    const rightPart = currentWord.slice(pivot + 1);

    return (
        <div className="w-full h-full relative flex flex-col items-center justify-center overflow-hidden bg-black/20 rounded-xl p-6">
            {/* 2D Avatar (Optional Background/Top) */}
            {avatar && (
                <div className={cn(
                    "mb-6 w-16 h-16 rounded-full overflow-hidden border-2 transition-transform duration-200 shadow-lg",
                    isSpeaking ? "scale-105 border-green-500 shadow-green-500/20" : "border-white/10"
                )}>
                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                </div>
            )}

            {/* RSVP Text Display */}
            <div className="flex items-baseline text-4xl font-mono relative">
                {/* Left Part */}
                <div className="text-right text-zinc-500 blur-[0.5px]">
                    {leftPart}
                </div>

                {/* Center Pivot (Highlighted) */}
                <div className="font-bold text-white px-0.5 transform scale-110 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                    {centerChar}
                </div>

                {/* Right Part */}
                <div className="text-left text-zinc-400">
                    {rightPart}
                </div>

                {/* Focus Guides */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-red-500/20 -translate-x-1/2 h-full -z-10" />
            </div>

            {/* Speaking Indicator */}
            <div className={cn(
                "mt-4 w-1.5 h-1.5 rounded-full transition-colors",
                isSpeaking ? "bg-green-500" : "bg-zinc-700"
            )} />
        </div>
    );
};
