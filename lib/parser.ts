import { Readability } from "@mozilla/readability"

export function parseCurrentPage(): string {
    const hostname = window.location.hostname

    // Log for debugging
    console.log("Audicle: Parsing hostname:", hostname)

    if (hostname.includes("x.com") || hostname.includes("twitter.com")) {
        return parseTwitter()
    } else {
        return parseArticle()
    }
}

function parseArticle(): string {
    try {
        const documentClone = document.cloneNode(true) as Document
        const reader = new Readability(documentClone)
        const article = reader.parse()
        return article ? article.textContent.trim() : ""
    } catch (e) {
        console.error("Readability check failed", e)
        return (document.body as HTMLElement).innerText.trim()
    }
}

function parseTwitter(): string {
    const path = window.location.pathname
    const match = path.match(/status\/(\d+)/)
    const tweetId = match ? match[1] : null

    console.log("Audicle: Parsing Twitter. Tweet ID:", tweetId)

    let mainArticle: Element | null = null

    // Strategy 1: Find Article containing link to current Tweet ID
    if (tweetId) {
        const articles = Array.from(document.querySelectorAll('article'))
        mainArticle = articles.find(article => {
            // Check if any link inside this article points to the specific tweet ID
            // We check for "status/ID" to avoid partial matches
            const links = Array.from(article.querySelectorAll('a'))
            return links.some(link => link.href.includes(`/status/${tweetId}`))
        }) || null

        if (mainArticle) console.log("Audicle: Found main article by Tweet ID link.")
    }

    // Strategy 2: Focus on tabindex="-1" (Often the main focused tweet)
    if (!mainArticle) {
        mainArticle = document.querySelector('article[tabindex="-1"]')
        if (mainArticle) console.log("Audicle: Found main article by tabindex -1.")
    }

    // Extraction: If we found a specific main article, extract text from it
    if (mainArticle) {
        // Try to find the specific text container first
        const tweetTextNode = mainArticle.querySelector('[data-testid="tweetText"]')
        if (tweetTextNode) {
            return cleanText(tweetTextNode.textContent || "")
        }

        // Fallback: Get all text from the article, but try to exclude obvious UI noise
        // This is a bit "dirty" but handles "Articles" that don't use tweetText structure
        return cleanText((mainArticle as HTMLElement).innerText)
    }

    // Strategy 3 (Fallback): Old behavior - just grab the first tweetText or article
    console.log("Audicle: Fallback to generic selection.")

    const elements = Array.from(document.querySelectorAll('[data-testid="tweetText"]'))
    if (elements.length > 0) {
        // Only return the first one as it's likely the main one if we are on a status page
        return cleanText(elements[0].textContent || "")
    }

    const firstArticle = document.querySelector('article')
    return firstArticle ? cleanText((firstArticle as HTMLElement).innerText) : ""
}

function cleanText(text: string): string {
    return text
        .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '')
        .trim()
}
