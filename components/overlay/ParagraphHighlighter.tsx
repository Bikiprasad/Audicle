import React, { useEffect, useRef } from "react";
import { cn } from "~lib/utils";

interface ParagraphHighlighterProps {
    text: string;
    currentIndex: number;
}

export const ParagraphHighlighter: React.FC<ParagraphHighlighterProps> = ({ text, currentIndex }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const activeWordRef = useRef<HTMLSpanElement>(null);

    const targetScrollTop = useRef(0);
    const isScrolling = useRef(false);

    // Auto-scroll loop
    useEffect(() => {
        if (!activeWordRef.current || !containerRef.current) return;

        const container = containerRef.current;
        const element = activeWordRef.current;

        // Calculate target to center the element
        // We use offsetTop. Ensure container is relative/positioned if needed, 
        // effectively offsetTop is usually from the top of the scrollable content area.
        const middleOffset = container.offsetHeight / 2;
        const target = element.offsetTop - middleOffset + (element.offsetHeight / 2);

        targetScrollTop.current = target;

        if (!isScrolling.current) {
            isScrolling.current = true;

            const animateScroll = () => {
                if (!containerRef.current) {
                    isScrolling.current = false;
                    return;
                }

                const current = containerRef.current.scrollTop;
                const dist = targetScrollTop.current - current;

                // Smoothness factor (lower = smoother/slower, higher = snappier)
                // 0.05 is very smooth "cinematic" feel
                const ease = 0.05;

                if (Math.abs(dist) > 1) {
                    containerRef.current.scrollTop = current + dist * ease;
                    requestAnimationFrame(animateScroll);
                } else {
                    isScrolling.current = false;
                }
            };
            requestAnimationFrame(animateScroll);
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
                return (
                    <span
                        key={i}
                        className="text-white/90"
                    >
                        {segment}
                    </span>
                );
            }

            return (
                <span
                    key={i}
                    ref={isCurrent ? activeWordRef : null}
                    className="text-white/90 inline-block px-0.5"
                >
                    {segment}
                </span>
            );
        });
    };

    return (
        <div
            ref={containerRef}
            className="w-full h-full overflow-y-auto overflow-x-hidden custom-scrollbar box-border p-6 text-[22px] leading-[1.8] font-medium font-sans tracking-wide text-center whitespace-pre-wrap select-none drop-shadow-md relative"
        >
            <div className="py-24">
                {renderText()}
            </div>
        </div>
    );
};
