import { useState, useEffect, useCallback } from "react"

export interface SavedArticle {
    id: string
    url: string
    title: string
    addedAt: number
    status: 'new' | 'in-progress' | 'finished'
    progress?: number
    // Metadata for Twitter Card
    author?: string
    handle?: string
    avatar?: string
    image?: string
    tweetTimestamp?: string
}

export const useReadingList = () => {
    const [articles, setArticles] = useState<SavedArticle[]>([])

    // Load
    useEffect(() => {
        chrome.storage.local.get("audicle-library-v1", (result) => {
            if (result["audicle-library-v1"]) {
                const data = result["audicle-library-v1"] as SavedArticle[]
                // Dedupe
                const uniqueData = data.filter((item, index, self) =>
                    index === self.findIndex((t) => t.id === item.id)
                )
                setArticles(uniqueData)
            }
        })
    }, [])

    // Sync
    useEffect(() => {
        const onChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
            if (area === "local" && changes["audicle-library-v1"]) {
                setArticles(changes["audicle-library-v1"].newValue || [])
            }
        }
        chrome.storage.onChanged.addListener(onChange)
        return () => chrome.storage.onChanged.removeListener(onChange)
    }, [])

    const saveLibrary = (newLibrary: SavedArticle[]) => {
        chrome.storage.local.set({ "audicle-library-v1": newLibrary })
        setArticles(newLibrary)
    }

    const addArticle = useCallback((article: Omit<SavedArticle, "addedAt" | "status" | "id">) => {
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        const newArt: SavedArticle = {
            id,
            ...article,
            addedAt: Date.now(),
            status: 'new'
        }

        saveLibrary([...articles, newArt])
    }, [articles])

    const removeArticle = useCallback((id: string) => {
        saveLibrary(articles.filter(a => a.id !== id))
    }, [articles])

    const isSaved = useCallback((url: string) => {
        return articles.some(a => a.url === url)
    }, [articles])

    const clearLibrary = useCallback(() => {
        saveLibrary([])
    }, [])

    return {
        articles,
        addArticle,
        removeArticle,
        isSaved,
        clearLibrary,
        count: articles.length
    }
}
