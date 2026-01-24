import { Readability } from "@mozilla/readability"

export interface PageContent {
    text: string
    url: string
}

export function parseCurrentPage(): PageContent {
    const hostname = window.location.hostname

    // Log for debugging
    console.log("Audicle: Parsing hostname:", hostname)

    if (hostname.includes("x.com") || hostname.includes("twitter.com")) {
        return parseTwitter()
    } else {
        return parseArticle()
    }
}

function parseArticle(): PageContent {
    const url = window.location.href
    try {
        const documentClone = document.cloneNode(true) as Document
        const reader = new Readability(documentClone)
        const article = reader.parse()
        return {
            text: article ? article.textContent.trim() : "",
            url
        }
    } catch (e) {
        console.error("Readability check failed", e)
        return {
            text: (document.body as HTMLElement).innerText.trim(),
            url
        }
    }
}

function parseTwitter(): PageContent {
    const path = window.location.pathname
    const match = path.match(/status\/(\d+)/)
    const tweetId = match ? match[1] : null

    console.log("Audicle: Parsing Twitter. Tweet ID:", tweetId)

    let mainArticle: Element | null = null

    // Strategy 1: Find Article containing link to current Tweet ID
    if (tweetId) {
        const articles = Array.from(document.querySelectorAll('article'))
        mainArticle = articles.find(article => {
            const links = Array.from(article.querySelectorAll('a'))
            return links.some(link => link.href.includes(`/status/${tweetId}`))
        }) || null
    }

    // Strategy 2: Focus on tabindex="-1" (Often the main focused tweet)
    if (!mainArticle) {
        mainArticle = document.querySelector('article[tabindex="-1"]')
    }

    // Strategy 3: Heuristic for "First Visible Tweet" if on Feed
    // We assume the user wants to play the first fully visible tweet or the one they just clicked?
    // Actually, `parseCurrentPage` is called when `Overlay` mounts or generates.
    // If they clicked a "Play" button injected by us, we might know the tweet.
    // BUT `parseCurrentPage` is a general scraper. It grabs the "Active" content.
    // If we are on the feed, `parseCurrentPage` might just grab the first visible one.

    if (!mainArticle) {
        mainArticle = document.querySelector('article')
    }

    let text = ""
    let url = window.location.href

    if (mainArticle) {
        // Extract Text
        const tweetTextNode = mainArticle.querySelector('[data-testid="tweetText"]')
        if (tweetTextNode) {
            text = cleanText(tweetTextNode.textContent || "")
        } else {
            text = cleanText((mainArticle as HTMLElement).innerText)
        }

        // Extract URL (Permalink)
        // Look for the <time> element which is wrapped in a link
        const timeElement = mainArticle.querySelector('time')
        if (timeElement) {
            const link = timeElement.closest('a')
            if (link) {
                url = link.href
            }
        }
    }

    return { text, url }
}

function cleanText(text: string): string {
    return text
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
        .trim()
}
