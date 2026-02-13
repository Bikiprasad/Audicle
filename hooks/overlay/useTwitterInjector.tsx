import { useEffect } from "react"
import type { usePlayerStore } from "~store/usePlayerStore"
import { cleanText } from "~lib/parser"

export const useTwitterInjector = (
    setText: (text: string) => void,
    setUiState: (state: any) => void,
    setBackgroundImage: (url: string | null) => void,
    setShowOverlay: (show: boolean) => void,
    loadVoices: () => void,
    setSourceUrl: (url: string) => void,
    setMetadata?: (meta: any) => void
) => {
    useEffect(() => {
        if (!window.location.hostname.includes("x.com")) return

        const handleInject = () => {
            // STRICT TARGETING: Inject in tweets AND articles
            // Find all articles that haven't been processed
            const tweetArticles = document.querySelectorAll('article:not([data-audicle-processed])')

            tweetArticles.forEach(article => {
                // Mark as processed immediately to avoid duplicates
                article.setAttribute('data-audicle-processed', 'true')

                // ... (Existing Validations) ...
                const tweetText = article.querySelector('[data-testid="tweetText"]')
                const isMainArticle = article.getAttribute("tabindex") === "-1" || article.closest('[data-testid="primaryColumn"]')

                if ((!tweetText || !tweetText.textContent?.trim()) && !isMainArticle) return

                const isInSidebar = article.closest('[data-testid="sidebarColumn"]')
                const isInModal = article.closest('[aria-modal="true"]')
                // const isInLightbox = ... (kept same)
                if (isInSidebar || isInModal) return

                // VALIDATION 3: Find ALL action bars WITHIN this specific tweet/article
                const actionBars = article.querySelectorAll('[role="group"]:not([data-audicle-injected])')

                actionBars.forEach(actionBar => {
                    const hasExistingActions = actionBar.querySelector('[data-testid="reply"]') ||
                        actionBar.querySelector('[data-testid="like"]') ||
                        actionBar.querySelector('[data-testid="retweet"]') ||
                        actionBar.querySelector('[aria-label*="Share"]') ||
                        actionBar.querySelector('[aria-label="Bookmark"]');

                    if (!hasExistingActions) return;

                    actionBar.setAttribute('data-audicle-injected', 'true')

                    // Create Button
                    const btnContainer = document.createElement('div')
                    // ... (Styles) ...
                    btnContainer.className = "css-175oi2r r-1777fci r-bt1l66 r-bztko3 r-16y2uox r-165w44y"
                    btnContainer.style.display = "inline-flex"
                    btnContainer.style.alignItems = "center"
                    btnContainer.style.cursor = "pointer"
                    btnContainer.setAttribute("role", "button")
                    btnContainer.setAttribute("aria-label", "Listen with Audicle")
                    btnContainer.title = "Listen with Audicle"

                    btnContainer.innerHTML = `
                        <div dir="ltr" class="css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41 r-1awozwy r-6koalj r-1h0z5md r-o7ynqc r-6416eg r-1ny4l3l" style="display: flex; align-items: center; justify-content: center; width: 34.75px; height: 34.75px; border-radius: 9999px; transition: background-color 0.2s;">
                            <svg viewBox="0 0 24 24" aria-hidden="true" style="width: 1.25em; height: 1.25em; fill: currentColor; color: rgb(29, 155, 240);">
                                <path d="M8 5.14v14c0 .56.61.87 1.05.53l10.5-7c.39-.29.39-.81 0-1.1l-10.5-7C8.61 4.27 8 4.58 8 5.14z"></path>
                            </svg>
                        </div>
                    `

                    btnContainer.onclick = (e) => {
                        e.stopPropagation()
                        e.preventDefault()

                        try {
                            // 1. Extract Metadata from the *Clicked Article Context*
                            const metadata: any = {
                                title: "Untitled Tweet"
                            }

                            // Author & Handle
                            const userLink = article.querySelector('[data-testid="User-Name"]') as HTMLElement
                            if (userLink) {
                                // Usually: "Name\n@handle\n..."
                                const rawText = userLink.innerText || ""
                                const lines = rawText.split('\n').filter(l => l.trim())
                                if (lines.length >= 2) {
                                    metadata.author = lines[0]
                                    metadata.handle = lines.find(l => l.startsWith('@')) || lines[1]
                                }
                            }

                            // Avatar (High Res)
                            const avatarImg = article.querySelector('[data-testid="Tweet-User-Avatar"] img') as HTMLImageElement
                            if (avatarImg) {
                                metadata.avatar = avatarImg.src.replace('_normal', '_400x400').replace('_mini', '_400x400')
                            }

                            // Timestamp
                            const timeEl = article.querySelector('time') as HTMLTimeElement
                            if (timeEl) metadata.tweetTimestamp = timeEl.getAttribute('datetime')

                            console.log("Audicle: Extracted Click Metadata", metadata)
                            if (setMetadata) setMetadata(metadata)

                            // 2. Extract Text & Image (Existing Logic)
                            let imgUrl: string | null = null
                            const photos = article.querySelectorAll('[data-testid="tweetPhoto"] img')
                            if (photos.length > 0) {
                                imgUrl = (photos[0] as HTMLImageElement).src
                            }

                            // Clone and Clean extraction - SIMPLIFIED APPROACH
                            const clone = article.cloneNode(true) as HTMLElement

                            // 1. Remove UI noise elements
                            clone.querySelectorAll(`
                                [data-testid="User-Name"], 
                                [data-testid="socialContext"], 
                                [role="group"], 
                                time, 
                                [data-testid="card.wrapper"],
                                [data-testid="placementTracking"],
                                [aria-label*="Subscribe"],
                                [role="button"]
                            `).forEach(el => el.remove())

                            let extractedText = "";
                            const tweetTextEl = clone.querySelector('[data-testid="tweetText"]') as HTMLElement;

                            // 2. Simple extraction - use innerText which handles spacing naturally
                            if (tweetTextEl) {
                                extractedText = tweetTextEl.innerText;
                            } else {
                                extractedText = clone.innerText;
                            }

                            // 3. Minimal cleanup - only remove obvious UI noise
                            extractedText = extractedText
                                .replace(/^.*?@\w+\s*\n/i, '') // Remove author line if at start
                                .replace(/Subscribe\s*\n/gi, '')
                                .replace(/[·•]\s*\d+([.,]\d+)?\s*[MK]?\s*Views/gi, '')
                                .replace(/The full version of this post is available here\.?/gi, '');

                            extractedText = cleanText(extractedText);

                            // URL Logic
                            let tweetUrl = window.location.href;
                            const timeElement = article.querySelector('time');
                            if (timeElement) {
                                const link = timeElement.closest('a');
                                if (link) tweetUrl = link.href;
                            }

                            if (extractedText && extractedText.length > 5) {
                                setText(extractedText)
                                setSourceUrl(tweetUrl)
                                setUiState("editing")
                                setBackgroundImage(imgUrl || "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop")
                                setShowOverlay(true)
                                loadVoices()
                            } else {
                                alert("Not enough text to read.")
                            }
                        } catch (err) {
                            console.error("Extraction failed", err)
                        }
                    }

                    actionBar.appendChild(btnContainer)
                })
            })
        }

        const intervalId = setInterval(() => {
            if (!chrome.runtime?.id) {
                clearInterval(intervalId)
                return
            }
            handleInject()
        }, 1000)

        handleInject()
        return () => clearInterval(intervalId)
    }, [setShowOverlay, setText, setUiState])
}
