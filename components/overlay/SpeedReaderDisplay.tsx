import React from "react";

interface SpeedReaderDisplayProps {
    text: string;
    currentIndex: number;
}

export const SpeedReaderDisplay: React.FC<SpeedReaderDisplayProps> = ({ text, currentIndex }) => {
    // 1. Find the current word based on currentIndex
    const safeIndex = Math.min(Math.max(0, currentIndex), text.length - 1);
    // Simple boundary check: scan back/forward for space
    const isSpace = (i: number) => /\s/.test(text[i] || " ");

    let start = safeIndex;
    while (start > 0 && !isSpace(start - 1)) start--;

    let end = safeIndex;
    while (end < text.length && !isSpace(end)) end++;

    const rawWord = text.slice(start, end);
    const word = rawWord.trim();

    if (!word) return <span className="w-full text-center text-zinc-600 text-lg font-sans">...</span>;

    // 2. ORP Calculation (Standardized)
    let orpIndex = 0;
    const len = word.length;
    if (len <= 1) orpIndex = 0;
    else if (len <= 5) orpIndex = 1;
    else if (len <= 9) orpIndex = 2;
    else if (len <= 13) orpIndex = 3;
    else orpIndex = 4;

    if (orpIndex >= len) orpIndex = len - 1;

    const leftPart = word.slice(0, orpIndex);
    const orpChar = word[orpIndex];
    const rightPart = word.slice(orpIndex + 1);

    return (
        <div className="w-full h-full relative flex flex-col items-center justify-center">
            {/* MARKER LINES */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0 border-l border-white/20 h-full z-0 flex flex-col justify-between py-2 pointer-events-none">
                <div className="w-[1px] h-3 bg-white/60 -ml-[0.5px]" />
                <div className="w-[1px] h-3 bg-white/60 -ml-[0.5px]" />
            </div>

            <div className="text-[42px] font-serif leading-none flex items-center z-10 w-full whitespace-nowrap">
                <div className="flex w-full items-baseline justify-center">
                    {/* Left Side (Align Right to Touch Center) */}
                    <div className="flex-1 text-right">
                        <span className="text-white">{leftPart}</span>
                    </div>

                    {/* ORP (Centered) */}
                    <div className="w-[1ch] text-center text-red-500 font-bold shrink-0 mx-0">
                        {orpChar}
                    </div>

                    {/* Right Side (Align Left to Touch Center) */}
                    <div className="flex-1 text-left">
                        <span className="text-white">{rightPart}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
