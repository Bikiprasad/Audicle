import React, { useEffect, useRef } from "react";
import { cn } from "~lib/utils";

interface ParagraphHighlighterProps {
    text: string;
    currentIndex: number;
}

export const ParagraphHighlighter: React.FC<ParagraphHighlighterProps> = ({ text, currentIndex }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const activeWordRef = useRef<HTMLSpanElement>(null);

    // Auto-scroll to active word
    useEffect(() => {
        if (activeWordRef.current && containerRef.current) {
            // Smooth scroll or instant? Instant is better for syncing.
            // But we want to keep it centered vertically if possible.
            activeWordRef.current.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest"
            });
        }
    }, [currentIndex]);

    // Tokenize text into words and delimiters for rendering (preserving whitespace/structure)
    // Actually, `WebSpeechProvider` and `AudioService` work with CHARACTER INDICES.
    // The `currentIndex` is a character index.
    // So we need to render the text and highlight characters from `currentIndex` to end of word?
    // Or just highlight the word that `currentIndex` falls into.

    // Efficient Rendering:
    // We can't re-tokenize on every render if text is huge. But for articles it's fine.
    // We need to map character indices to DOM elements.

    const renderText = () => {
        const elements = [];
        let lastIndex = 0;

        // Simple word split regex that keeps delimiters
        // Using a similar logic to what we had in SpeedReader for word boundaries is tricky visually.
        // Let's iterate words.

        // Actually, simpler approach for "Highlight":
        // 1. Find start/end of current word around `currentIndex`.
        // 2. Render text in 3 parts: Before, Highlighted, After?
        // NO, that rebuilds DOM too much.

        // Better: Split text by spaces once (not strictly robust but okay for visualization).
        // BUT we need character-perfect mapping.

        // Let's assume standard Western text for MVP.
        const words = text.split(/(\s+)/); // Split by whitespace, keep delimiters

        let charCount = 0;

        return words.map((segment, i) => {
            const start = charCount;
            const end = charCount + segment.length;
            charCount = end;

            const isCurrent = currentIndex >= start && currentIndex < end;

            // Check if it's a word (not just whitespace) to consider "highlightable"
            // actually if we seek to whitespace, we should probably highlight the next word or nothing.
            // `AudioService` usually emits indices at start of words.
            const isWord = /\S/.test(segment);

            if (!isWord) {
                return <span key={i}>{segment}</span>;
            }

            return (
                <span
                    key={i}
                    ref={isCurrent ? activeWordRef : null}
                    className={cn(
                        "transition-colors duration-200 rounded-sm px-0.5 mx-[-2px]",
                        isCurrent ? "bg-white/20 text-white font-semibold shadow-[0_0_10px_rgba(255,255,255,0.2)]" : "text-zinc-400"
                    )}
                >
                    {segment}
                </span>
            );
        });
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full overflow-y-auto custom-scrollbar p-4 text-[16px] leading-relaxed font-serif text-justify whitespace-pre-wrap"
        >
            {renderText()}
        </div>
    );
};
