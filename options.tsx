import React, { useState, useEffect } from "react"
import { useSettings } from "~hooks/useSettings"
import { useReadingList } from "~hooks/useReadingList"
import { useAnalytics } from "~hooks/useAnalytics"
import { HomeIcon, LayersIcon, PieChartIcon, SettingsIcon } from "~lib/icons"
import { cn } from "~lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Cloud, Shield, Play, Trash2, ArrowUpRight, Github, Coffee, Zap, BookOpen, Mic } from "lucide-react"
import "./style.css"

// Voices Config (re-using old voice map)
const KOKORO_VOICES = [
    { name: 'Bella', id: 'af_bella', description: 'American Female, Natural' },
    { name: 'Michael', id: 'am_michael', description: 'American Male, Deep' },
    { name: 'Sarah', id: 'af_sarah', description: 'American Female, Soft' },
    { name: 'Adam', id: 'am_adam', description: 'American Male, Authoritative' },
    { name: 'Emma', id: 'bf_emma', description: 'British Female, Proper' },
    { name: 'Lewis', id: 'bm_lewis', description: 'British Male, Narrator' },
];

function OptionsIndex() {
    // Initialize from localStorage or default to 'home'
    const [activeTab, setActiveTab] = useState<'home' | 'voices' | 'analytics' | 'library' | 'settings'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('audicle_active_tab') as any) || 'home'
        }
        return 'home'
    })

    // Persist activeTab changes
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('audicle_active_tab', activeTab)
        }
    }, [activeTab])

    return (
        <div className="flex h-screen bg-gray-50 text-slate-800 font-sans selection:bg-indigo-100">
            {/* Sidebar (Fixed Expanded) */}
            <aside
                className="w-64 bg-white border-r border-gray-100 flex flex-col items-start px-6 py-8 space-y-8 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] relative shrink-0"
            >
                {/* Brand */}
                <div className="flex items-center gap-4 w-full">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200 shrink-0">
                        A
                    </div>
                    <span className="font-bold text-xl text-slate-900 tracking-tight">
                        Audicle
                    </span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 flex flex-col gap-2 w-full">
                    <SidebarItem
                        icon={<HomeIcon />}
                        label="Dashboard"
                        active={activeTab === 'home'}
                        onClick={() => setActiveTab('home')}
                    />
                    <SidebarItem
                        icon={<Mic />} // Using Mic icon for Voice Studio content
                        label="Voice Studio"
                        active={activeTab === 'voices'}
                        onClick={() => setActiveTab('voices')}
                    />
                    <SidebarItem
                        icon={<LayersIcon />}
                        label="Library"
                        active={activeTab === 'library'}
                        onClick={() => setActiveTab('library')}
                    />
                    <SidebarItem
                        icon={<PieChartIcon />}
                        label="Analytics"
                        active={activeTab === 'analytics'}
                        onClick={() => setActiveTab('analytics')}
                    />
                    <SidebarItem
                        icon={<SettingsIcon />}
                        label="Settings"
                        active={activeTab === 'settings'}
                        onClick={() => setActiveTab('settings')}
                    />
                </nav>

                {/* User Profile */}
                <div className="flex items-center gap-3 w-full justify-start">
                    <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden border border-gray-200 shrink-0">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-bold text-slate-900 truncate">Ali Z.</span>
                        <span className="text-xs text-gray-400 truncate">Pro Plan</span>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header */}
                <header className="h-20 px-8 flex items-center justify-between bg-white/80 backdrop-blur border-b border-gray-100 z-10">
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Dashboard</span>
                        <h1 className="text-xl font-bold text-slate-900">
                            {activeTab === 'home' && 'Welcome to Audicle'}
                            {activeTab === 'voices' && 'Voice Studio'}
                            {activeTab === 'library' && 'Reading Library'}
                            {activeTab === 'analytics' && 'Analytics Overview'}
                            {activeTab === 'settings' && 'Configuration'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow transition-all cursor-default">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-semibold text-slate-700">System Online</span>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    <AnimatePresence mode="wait">
                        {activeTab === 'home' && (
                            <motion.div
                                key="home"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                            >
                                <HomeView />
                            </motion.div>
                        )}
                        {activeTab === 'voices' && (
                            <motion.div
                                key="voices"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3 }}
                            >
                                <VoiceStudio />
                            </motion.div>
                        )}
                        {activeTab === 'analytics' && <AnalyticsView />}
                        {activeTab === 'library' && <LibraryView />}
                        {activeTab === 'settings' && <SettingsView />}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    )
}

const SidebarItem = ({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={cn(
            "flex items-center rounded-xl transition-all duration-200 group relative overflow-hidden w-full justify-start px-4 py-3 gap-3",
            active
                ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                : "text-gray-400 hover:bg-gray-100 hover:text-indigo-600"
        )}
    >
        <div className="shrink-0 flex items-center justify-center">
            {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement, { width: 20, height: 20 }) : null}
        </div>
        <span className="text-sm font-medium whitespace-nowrap">
            {label}
        </span>
    </button>
)

// --- View Components ---

const HomeView = () => {
    return (
        <div className="max-w-4xl mx-auto space-y-10 pb-10">
            {/* Hero Section */}
            <div className="text-center space-y-4 py-8">
                <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Turn Reading into Listening.</h2>
                <p className="text-lg text-gray-500 max-w-2xl mx-auto">
                    Audicle transforms any article, tweet, or selection into high-quality audio using the ultrafast Kokoro TTS engine. Experience the web with your ears.
                </p>
                <div className="flex justify-center gap-4 pt-4">
                    <a href="https://github.com/remsky/Kokoro-FastAPI" target="_blank" className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 hover:shadow-lg transition-all">
                        <Github size={18} />
                        KokoroFastAPI Repo
                    </a>
                </div>
            </div>

            {/* How to Use Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { icon: <BookOpen size={24} />, title: "Select Test", desc: "Highlight any text on a webpage or open a Tweet." },
                    { icon: <Zap size={24} />, title: "Activate", desc: "Right-click and choose 'Read with Audicle' or use the shortcut." },
                    { icon: <Play size={24} />, title: "Listen", desc: "Sit back and enjoy high-quality neural speech synthesis." }
                ].map((step, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                            {step.icon}
                        </div>
                        <h3 className="font-bold text-slate-800 mb-2">{step.title}</h3>
                        <p className="text-sm text-gray-500">{step.desc}</p>
                    </div>
                ))}
            </div>

            {/* Support / Buy Me Coffee */}
            <a
                href="https://buymeacoffee.com/bikiprasad"
                target="_blank"
                className="block group relative overflow-hidden rounded-2xl bg-[#FFDD00] text-slate-900 p-8 shadow-lg hover:shadow-xl transition-all"
            >
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 shadow-md group-hover:scale-110 transition-transform">
                        <Coffee size={28} className="ml-0.5" />
                    </div>
                    <h3 className="text-2xl font-extrabold mb-2">Enjoying Audicle?</h3>
                    <p className="font-medium opacity-80 max-w-md">
                        Your support helps keep the project alive and brings more amazing voices to the platform. Buy me a coffee!
                    </p>
                </div>
                {/* Decorative Pattern */}
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-multiply"></div>
                <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-2xl"></div>
            </a>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center text-xs text-gray-400 mt-8"
            >
                Powerful TTS provided by Kokoro v0.19 · Built with Plasmo
            </motion.div>
        </div>
    )
}

const VoiceStudio = () => {
    const { voiceId, setVoiceId } = useSettings()

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {KOKORO_VOICES.map((v) => {
                const isSelected = voiceId === v.id;
                return (
                    <div
                        key={v.id}
                        onClick={() => setVoiceId(v.id)}
                        className={cn(
                            "group bg-white rounded-2xl p-6 border transition-all cursor-pointer relative overflow-hidden",
                            isSelected
                                ? "border-indigo-500 shadow-[0_4px_20px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500"
                                : "border-gray-100 hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100"
                        )}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold transition-all",
                                isSelected ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-600"
                            )}>
                                {v.name[0]}
                            </div>
                            {isSelected && (
                                <div className="px-2 py-1 rounded bg-indigo-50 text-[10px] font-bold text-indigo-600 uppercase">
                                    Active
                                </div>
                            )}
                        </div>

                        <h3 className={cn("text-lg font-bold mb-1", isSelected ? "text-slate-900" : "text-slate-700")}>{v.name}</h3>
                        <p className="text-xs text-gray-500 mb-6">{v.description}</p>

                        <button className="w-full py-2.5 rounded-lg border border-gray-100 bg-gray-50 text-xs font-semibold text-gray-600 hover:bg-white hover:border-gray-200 transition-all flex items-center justify-center gap-2">
                            <Play size={14} fill="currentColor" className="opacity-50" /> Preview Voice
                        </button>
                    </div>
                )
            })}
        </div>
    )
}

const AnalyticsView = () => {
    const { data } = useAnalytics()
    const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n)

    const maxVal = Math.max(data.byModel.kokoro, data.byModel.elevenlabs, 1)
    const kPercent = (data.byModel.kokoro / maxVal) * 100
    const ePercent = (data.byModel.elevenlabs / maxVal) * 100



    // Process Daily History
    const dailyStats = React.useMemo(() => {
        const stats: Record<string, { kokoro: number, elevenlabs: number }> = {}
        const now = new Date()

        // Helper to get YYYY-MM-DD
        const toISODate = (date: Date) => date.toISOString().split('T')[0]

        // Group by YYYY-MM-DD
        data.history.forEach(h => {
            // Ensure valid date
            const d = new Date(h.timestamp)
            if (isNaN(d.getTime())) return

            const dateKey = toISODate(d)
            if (!stats[dateKey]) stats[dateKey] = { kokoro: 0, elevenlabs: 0 }
            if (h.model === 'kokoro') stats[dateKey].kokoro += h.chars
            if (h.model === 'elevenlabs') stats[dateKey].elevenlabs += h.chars
        })

        // Generate last 7 days keys (YYYY-MM-DD)
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(now.getTime() - (6 - i) * 24 * 60 * 60 * 1000)
            return toISODate(d)
        })

        return last7Days.map(dateKey => ({
            date: dateKey, // This is YYYY-MM-DD
            kokoro: stats[dateKey]?.kokoro || 0,
            elevenlabs: stats[dateKey]?.elevenlabs || 0
        }))

    }, [data.history])

    const maxDaily = Math.max(1, ...dailyStats.map(d => d.kokoro + d.elevenlabs))

    // Helper to format display date safely
    const formatDisplayDate = (isoDate: string) => {
        const d = new Date(isoDate)
        // Add timezone offset compensation to prevent day shift if needed, 
        // but YYYY-MM-DD is UTC based in ISO, so new Date("2024-01-24") is treated as UTC in some contexts.
        // Better: parse explicitly.
        // Actually new Date("YYYY-MM-DD") is usually UTC. 
        // toLocaleDateString() uses local time, so it might shift.
        // Hack: Append T00:00:00 to ensure local handling or just use UTC methods.
        // Let's stick to simple formatting:
        return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })
    }

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="space-y-6"
        >
            {/* Top Cards Row */}
            <div className="grid grid-cols-3 gap-6">
                {/* ... Cards content same ... */}
                <Card title="Total Usage" value={`${fmt(data.totalChars)} chars`} change="+12.5%" isPositive>
                    <div className="h-16 mt-4">
                        <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                            <path d="M0 30 C 20 20, 40 40, 60 10 S 80 5, 100 25" fill="none" stroke="#6366f1" strokeWidth="2" />
                            <circle cx="100" cy="25" r="3" fill="#6366f1" />
                        </svg>
                    </div>
                </Card>
                <Card title="Kokoro (Local)" value={fmt(data.byModel.kokoro)}>
                    <div className="mt-6 flex items-center gap-3">
                        <div className="flex-1 h-2 bg-orange-100 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500" style={{ width: `${kPercent}%` }} />
                        </div>
                        <span className="text-xs font-bold text-orange-600">{Math.round(kPercent)}%</span>
                    </div>
                </Card>
                <Card title="ElevenLabs (Cloud)" value={fmt(data.byModel.elevenlabs)}>
                    <div className="mt-6 flex items-center gap-3">
                        <div className="flex-1 h-2 bg-blue-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${ePercent}%` }} />
                        </div>
                        <span className="text-xs font-bold text-blue-600">{Math.round(ePercent)}%</span>
                    </div>
                </Card>
            </div>

            {/* Daily Usage Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Daily Usage</h3>
                        <p className="text-xs text-gray-400">Character consumption per day (Last 7 Days)</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500" />
                            <span className="text-xs font-bold text-gray-500">Kokoro</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-xs font-bold text-gray-500">ElevenLabs</span>
                        </div>
                    </div>
                </div>

                <div className="h-64 flex items-end justify-between gap-4 px-4">
                    {dailyStats.map((d, i) => {
                        const hKokoro = (d.kokoro / maxDaily) * 100
                        const hEleven = (d.elevenlabs / maxDaily) * 100
                        const dateLabel = formatDisplayDate(d.date)

                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg whitespace-nowrap z-10 pointer-events-none">
                                    <div className="font-bold">{d.date}</div>
                                    <div className="text-orange-300">Kokoro: {fmt(d.kokoro)}</div>
                                    <div className="text-blue-300">ElevenLabs: {fmt(d.elevenlabs)}</div>
                                </div>

                                {/* Stacked Bar */}
                                <div className="w-full max-w-[40px] h-full flex flex-col justify-end rounded-t-lg overflow-hidden bg-gray-50 relative">
                                    <motion.div
                                        initial={{ height: 0 }} animate={{ height: `${hEleven}%` }}
                                        className="w-full bg-blue-500 hover:bg-blue-600 transition-colors"
                                    />
                                    <motion.div
                                        initial={{ height: 0 }} animate={{ height: `${hKokoro}%` }}
                                        className="w-full bg-orange-500 hover:bg-orange-600 transition-colors"
                                    />
                                </div>

                                <span className="text-[10px] font-bold text-gray-400 mt-2 whitespace-nowrap">{dateLabel}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Usage History Log</h3>
                </div>

                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-gray-400 text-xs uppercase tracking-wider text-left">
                            <th className="pb-4 font-normal pl-4">Time</th>
                            <th className="pb-4 font-normal">Model</th>
                            <th className="pb-4 font-normal">Characters</th>
                            <th className="pb-4 font-normal">Status</th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-600 font-medium">
                        {data.history.length === 0 && (
                            <tr><td colSpan={4} className="py-8 text-center text-gray-400 italic">No history yet.</td></tr>
                        )}
                        {data.history.slice().reverse().slice(0, 10).map((h, i) => {
                            const date = new Date(h.timestamp)
                            const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                            const timeStr = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

                            return (
                                <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors group">
                                    <td className="py-4 pl-4 text-gray-500">
                                        <div className="font-bold text-slate-700">{dateStr}</div>
                                        <div className="text-xs text-gray-400">{timeStr}</div>
                                    </td>
                                    <td className="py-4 flex items-center gap-2">
                                        <div className={cn("w-2 h-2 rounded-full", h.model === 'kokoro' ? "bg-orange-500" : "bg-blue-500")} />
                                        <span className="text-slate-900 capitalize">{h.model}</span>
                                    </td>
                                    <td className="py-4 text-slate-900 font-bold">{fmt(h.chars)}</td>
                                    <td className="py-4">
                                        <span className="px-2 py-1 rounded text-xs font-bold bg-green-50 text-green-600">
                                            Recorded
                                        </span>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </motion.div>
    )
}

const LibraryView = () => {
    const { articles, removeArticle, count } = useReadingList()

    // Sort by Date Descending (Newest First)
    const sortedArticles = React.useMemo(() => {
        return [...articles].sort((a, b) => b.addedAt - a.addedAt)
    }, [articles])

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="space-y-6"
        >
            <div className="grid grid-cols-4 gap-6">
                <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200">
                    <div className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Total Saved</div>
                    <div className="text-4xl font-bold">{count}</div>
                    <div className="text-indigo-100 text-sm mt-2">Articles in Library</div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-lg font-bold text-slate-800">Saved Articles</h3>
                </div>

                {count === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center bg-white rounded-2xl border border-gray-100">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <LayersIcon className="text-gray-300" />
                        </div>
                        <h4 className="text-slate-900 font-bold mb-1">Library is empty</h4>
                        <p className="text-sm text-gray-500">Save articles to read them later.</p>
                    </div>
                ) : (
                    // Masonry Layout without Gaps
                    <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6">
                        {sortedArticles.map((article) => (
                            <div
                                key={article.id}
                                className="break-inside-avoid bg-white rounded-[20px] border border-gray-100 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-md transition-all relative group flex flex-col"
                            >
                                {/* Header */}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex gap-3">
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-50">
                                            {article.avatar ? (
                                                <img src={article.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold bg-gray-50 uppercase text-sm">
                                                    {(article.author || article.title)[0]}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col leading-tight">
                                            <div className="flex items-center gap-1">
                                                <span className="font-bold text-slate-900 text-[15px]">{article.author || "Unknown User"}</span>
                                                {/* Verified Badge */}
                                                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] text-[#1D9BF0] fill-current">
                                                    <g><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.02-3.01-1.09-3.96-1.11-.95-2.73-1.1-3.96-.28C14.35 3.11 13.11 2.22 11.68 2.22c-1.43 0-2.67.89-3.34 2.19-1.23-.82-2.85-.67-3.96.28-1.1.95-1.55 2.57-1.09 3.96C2 9.33 1.12 10.57 1.12 12c0 1.43.89 2.67 2.19 3.34-.46 1.39-.02 3.01 1.09 3.96 1.11.95 2.73 1.1 3.96.28.67 1.31 1.91 2.19 3.34 2.19 1.43 0 2.67-.89 3.34-2.19 1.23.82 2.85.67 3.96-.28 1.1-.95 1.55-2.57 1.09-3.96C21.38 14.67 22.25 13.43 22.25 12zM9.6 17.65l-4.5-4.5 1.76-1.77 2.74 2.74 5.74-5.74 1.76 1.76-7.5 7.5z"></path></g>
                                                </svg>
                                            </div>
                                            <span className="text-gray-500 text-[14px]">{article.handle || `@${new URL(article.url).hostname}`}</span>
                                        </div>
                                    </div>

                                    {/* X Logo / Delete Action */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                removeArticle(article.id)
                                            }}
                                            className="text-gray-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100"
                                            title="Remove from Library"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-900 fill-current" aria-hidden="true">
                                            <g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g>
                                        </svg>
                                    </div>
                                </div>

                                {/* Body */}
                                <a href={article.url} target="_blank" className="block flex-1 group/card">
                                    <p className="text-slate-900 text-[15px] leading-6 whitespace-pre-wrap mb-3 font-normal">
                                        {article.title}
                                    </p>

                                    {/* Image */}
                                    {article.image && (
                                        <div className="rounded-2xl border border-gray-100 overflow-hidden bg-gray-50 mt-2">
                                            <img src={article.image} alt="Tweet Media" className="w-full h-auto object-cover max-h-[400px]" />
                                        </div>
                                    )}
                                </a>

                                {/* Footer / Metadata (Timestamp Only + Buttons) */}
                                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                                    <div className="flex items-center gap-1 text-gray-500 text-[14px]">
                                        <span>
                                            {article.tweetTimestamp
                                                ? new Date(article.tweetTimestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                                                : new Date(article.addedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                                            }
                                        </span>
                                        <span>·</span>
                                        <span>
                                            {article.tweetTimestamp
                                                ? new Date(article.tweetTimestamp).toLocaleDateString([], { day: 'numeric', month: 'short', year: '2-digit' })
                                                : new Date(article.addedAt).toLocaleDateString([], { day: 'numeric', month: 'short', year: '2-digit' })
                                            }
                                        </span>
                                    </div>

                                    {/* Play Action */}
                                    <button
                                        onClick={() => {
                                            window.open(article.url, '_blank')
                                        }}
                                        className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                        title="Play Tweet"
                                    >
                                        <Play size={14} fill="currentColor" className="ml-0.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    )
}

const SettingsView = () => {
    const { apiKey, kokoroUrl, isKokoroEnabled, isElevenLabsEnabled, setApiKey, setKokoroUrl, setIsKokoroEnabled, setIsElevenLabsEnabled } = useSettings()

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl space-y-6">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600">
                        <Cloud size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Kokoro TTS (Local)</h3>
                        <p className="text-sm text-gray-500">Configure local inference server.</p>
                    </div>
                    <div className="ml-auto">
                        <Toggle checked={isKokoroEnabled} onChange={() => setIsKokoroEnabled(!isKokoroEnabled)} activeColor="bg-orange-500" />
                    </div>
                </div>

                <AnimatePresence>
                    {isKokoroEnabled && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="pt-4 border-t border-gray-50">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">API Endpoint</label>
                                <input
                                    type="text"
                                    value={kokoroUrl || ""}
                                    onChange={(e) => setKokoroUrl(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                    placeholder="http://localhost:8880"
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">ElevenLabs (Cloud)</h3>
                        <p className="text-sm text-gray-500">Premium cloud synthesis via API Key.</p>
                    </div>
                    <div className="ml-auto">
                        <Toggle checked={isElevenLabsEnabled} onChange={() => setIsElevenLabsEnabled(!isElevenLabsEnabled)} activeColor="bg-blue-500" />
                    </div>
                </div>

                <AnimatePresence>
                    {isElevenLabsEnabled && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="pt-4 border-t border-gray-50">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">API Key</label>
                                <input
                                    type="password"
                                    value={apiKey || ""}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                    placeholder="sk_..."
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    )
}

const Card = ({ title, value, change, isPositive, children }: any) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow">
        <div className="flex justify-between items-start">
            <h4 className="text-sm font-bold text-gray-500">{title}</h4>
            <div className="text-gray-300 transform rotate-45"><ArrowUpRight size={14} /></div>
        </div>
        <div>
            <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-slate-800">{value}</span>
                {change && (
                    <span className={cn("text-xs font-bold", isPositive ? "text-green-500" : "text-red-500")}>
                        {change}
                    </span>
                )}
            </div>
            {children}
        </div>
    </div>
)

const Toggle = ({ checked, onChange, activeColor = "bg-indigo-600" }: any) => (
    <button
        onClick={onChange}
        className={cn("w-12 h-6 rounded-full transition-colors relative", checked ? activeColor : "bg-gray-300")}
    >
        <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm", checked ? "left-7" : "left-1")} />
    </button>
)

export default OptionsIndex
