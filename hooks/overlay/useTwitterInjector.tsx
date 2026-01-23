import { useEffect } from "react"
import type { usePlayerStore } from "~store/usePlayerStore"

export const useTwitterInjector = (
    setText: (text: string) => void,
    setUiState: (state: any) => void,
    setBackgroundImage: (url: string | null) => void,
    setShowOverlay: (show: boolean) => void,
    loadVoices: () => void
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

                // VALIDATION 1: Must have tweet text OR article text
                const tweetText = article.querySelector('[data-testid="tweetText"]')
                // For long-form articles, text structure might differ, so we also check for substantial text content
                // if standard tweetText is missing, we proceed if it looks like a main content article
                const isMainArticle = article.getAttribute("tabindex") === "-1" || article.closest('[data-testid="primaryColumn"]')

                if ((!tweetText || !tweetText.textContent?.trim()) && !isMainArticle) {
                    return // Skip checks if no text and not a main article candidate
                }

                // VALIDATION 2: Must NOT be in sidebar, modal, or image lightbox
                const isInSidebar = article.closest('[data-testid="sidebarColumn"]')
                const isInModal = article.closest('[aria-modal="true"]')
                const isInLightbox = article.closest('[aria-label="Image"]') ||
                    article.closest('[data-testid="swipe-to-dismiss"]') ||
                    article.closest('[role="dialog"]') ||
                    article.closest('[data-testid="mask"]')
                // Also check if the article is inside the photo viewer layer (usually has specific z-index or layer structure)
                const isInPhotoLayer = article.closest('#layers') && !article.closest('[data-testid="primaryColumn"]')

                if (isInSidebar || isInModal || isInLightbox || isInPhotoLayer) {
                    return // Skip non-feed content
                }

                // VALIDATION 3: Find ALL action bars WITHIN this specific tweet/article
                // We want to inject in both top (stats row) and bottom action bars if they exist
                const actionBars = article.querySelectorAll('[role="group"]:not([data-audicle-injected])')

                actionBars.forEach(actionBar => {
                    // Heuristic: Must contain at least one standard action button to be valid
                    // This prevents injecting into poll groups or other non-action bar groups
                    const hasExistingActions = actionBar.querySelector('[data-testid="reply"]') ||
                        actionBar.querySelector('[data-testid="like"]') ||
                        actionBar.querySelector('[data-testid="retweet"]') ||
                        actionBar.querySelector('[aria-label*="Share"]') ||
                        actionBar.querySelector('[aria-label="Bookmark"]');

                    if (!hasExistingActions) return;

                    // Mark action bar as injected
                    actionBar.setAttribute('data-audicle-injected', 'true')

                    // Create Listen Button Wrapper (New instance for each bar)
                    const btnContainer = document.createElement('div')

                    // Mimic Twitter's action item container styles
                    btnContainer.className = "css-175oi2r r-1777fci r-bt1l66 r-bztko3 r-16y2uox r-165w44y"
                    btnContainer.style.display = "inline-flex"
                    btnContainer.style.alignItems = "center"
                    btnContainer.style.cursor = "pointer"
                    btnContainer.setAttribute("role", "button")
                    btnContainer.setAttribute("aria-label", "Listen with Audicle")
                    btnContainer.title = "Listen with Audicle"

                    // Inner Icon Container (Circle hover effect)
                    btnContainer.innerHTML = `
                        <div dir="ltr" class="css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41 r-1awozwy r-6koalj r-1h0z5md r-o7ynqc r-6416eg r-1ny4l3l" style="display: flex; align-items: center; justify-content: center; width: 34.75px; height: 34.75px; border-radius: 9999px; transition: background-color 0.2s;">
                            <svg viewBox="0 0 24 24" aria-hidden="true" style="width: 1.25em; height: 1.25em; fill: currentColor; color: rgb(29, 155, 240);">
                                <path d="M8 5.14v14c0 .56.61.87 1.05.53l10.5-7c.39-.29.39-.81 0-1.1l-10.5-7C8.61 4.27 8 4.58 8 5.14z"></path>
                            </svg>
                        </div>
                    `

                    // Hover Logic
                    const innerDiv = btnContainer.firstElementChild as HTMLElement
                    btnContainer.onmouseenter = () => { innerDiv.style.backgroundColor = "rgba(29, 155, 240, 0.1)" }
                    btnContainer.onmouseleave = () => { innerDiv.style.backgroundColor = "transparent" }

                    // Click Handler
                    btnContainer.onclick = (e) => {
                        e.stopPropagation()
                        e.preventDefault()

                        try {
                            // Extract Image (if any)
                            let imgUrl: string | null = null
                            const photos = article.querySelectorAll('[data-testid="tweetPhoto"] img')
                            if (photos.length > 0) {
                                imgUrl = (photos[0] as HTMLImageElement).src
                            }

                            // Clone and Clean Extraction
                            const clone = article.cloneNode(true) as Element
                            // Remove noise
                            clone.querySelectorAll('[data-testid="User-Name"], [data-testid="socialContext"], [role="group"], time, [data-testid="card.wrapper"]').forEach(el => el.remove())

                            let extractedText = ""
                            // Strategy A: data-text (Articles)
                            const dataText = Array.from(clone.querySelectorAll('[data-text="true"]'))

                            // Strategy B: Article Body (Long-form)
                            const articleBody = clone.querySelector('[data-testid="article-body"]')

                            if (dataText.length > 0) {
                                extractedText = dataText.map(el => el.textContent).join("\n\n")
                            } else if (articleBody) {
                                // Extract from article body
                                extractedText = (articleBody as HTMLElement).innerText || articleBody.textContent || ""
                            } else {
                                // Strategy C: tweetText (Standard)
                                const clonedTweetText = clone.querySelector('[data-testid="tweetText"]')
                                extractedText = clonedTweetText ? clonedTweetText.textContent || "" : (clone as HTMLElement).innerText
                            }

                            // Clean Unicode/Emoji noise and normalize
                            extractedText = extractedText
                                .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
                                .replace(/\s+/g, ' ')
                                .trim()

                            if (extractedText && extractedText.length > 10) {
                                setText(extractedText)
                                setUiState("editing")
                                setBackgroundImage(imgUrl || "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop")
                                setShowOverlay(true)
                                loadVoices()
                            } else {
                                alert("Not enough text to read from this tweet.")
                            }
                        } catch (err) {
                            console.error("Extraction failed", err)
                        }
                    }

                    // Append to action bar
                    actionBar.appendChild(btnContainer)
                })

            })
        }


        // Use setInterval instead of MutationObserver
        const intervalId = setInterval(() => {
            // Safety check: Stop polling if extension is reloaded/invalidated
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
