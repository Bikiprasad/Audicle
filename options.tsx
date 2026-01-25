import React, { useState, useEffect, useMemo } from "react"
import { useSettings } from "~hooks/useSettings"
import { useReadingList } from "~hooks/useReadingList"
import { useAnalytics } from "~hooks/useAnalytics"
import { HomeIcon, LayersIcon, PieChartIcon, SettingsIcon } from "~lib/icons"
import { cn } from "~lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { Cloud, Shield, Play, Trash2, ArrowUpRight, Github, Coffee, Zap, BookOpen, Mic, Sun, Moon, TerminalSquare } from "lucide-react"
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
    const { theme, setTheme } = useSettings()

    // Initialize from localStorage or default to 'home'
    const [activeTab, setActiveTab] = useState<'home' | 'voices' | 'analytics' | 'library' | 'settings' | 'setup'>(() => {
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

    // Apply Theme Class
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [theme])

    const toggleTheme = () => {
        setTheme(theme === 'dark' ? 'light' : 'dark')
    }

    return (
        <div className="flex h-screen bg-gray-50 text-slate-800 font-sans selection:bg-gray-200 dark:bg-neutral-900 dark:text-gray-200 dark:selection:bg-white/20">
            {/* Sidebar (Fixed Expanded) */}
            <aside
                className="w-64 bg-white border-r border-gray-100 flex flex-col items-start px-6 py-8 space-y-8 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)] relative shrink-0 dark:bg-neutral-950 dark:border-white/5 dark:shadow-none"
            >
                {/* Brand */}
                <div className="flex items-center gap-4 w-full">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-gray-200 shrink-0 dark:shadow-none dark:bg-white dark:text-black">
                        A
                    </div>
                    <span className="font-bold text-xl text-slate-900 tracking-tight dark:text-white">
                        Audicle
                    </span>
                </div>

                {/* Navigation */}
                <nav className="flex-1 flex flex-col gap-2 w-full">
                    <SidebarItem
                        icon={<HomeIcon />}
                        label="Home"
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
                        icon={<TerminalSquare />}
                        label="Setup Guide"
                        active={activeTab === 'setup'}
                        onClick={() => setActiveTab('setup')}
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


            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* Header */}
                <header className="h-20 px-8 flex items-center justify-between bg-white/80 backdrop-blur border-b border-gray-100 z-10 dark:bg-neutral-900/80 dark:border-white/5">
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider dark:text-zinc-500">
                            {activeTab === 'setup' ? 'Installation' : 'Home'}
                        </span>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                            {activeTab === 'home' && 'Welcome to Audicle'}
                            {activeTab === 'voices' && 'Voice Studio'}
                            {activeTab === 'library' && 'Reading Library'}
                            {activeTab === 'analytics' && 'Analytics Overview'}
                            {activeTab === 'settings' && 'Configuration'}
                            {activeTab === 'setup' && 'Local Inference Setup'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-6">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-zinc-300"
                        >
                            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow transition-all cursor-default dark:bg-white/5 dark:border-white/5 dark:shadow-none">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">System Online</span>
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
                                <motion.div
                                    key="home"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    transition={{ duration: 0.3 }}
                                >
                                    <HomeView onNavigate={(tab) => setActiveTab(tab)} />
                                </motion.div>
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
                        {activeTab === 'setup' && <SetupView />}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    )
}

const SidebarItem = ({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
    <motion.button
        whileHover={{ scale: 1.02, x: 4 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        onClick={onClick}
        className={cn(
            "flex items-center rounded-xl transition-colors duration-200 group relative overflow-hidden w-full justify-start px-4 py-3 gap-3",
            active
                ? "bg-slate-900 text-white shadow-lg shadow-slate-200 dark:bg-white dark:text-black dark:shadow-none"
                : "text-gray-400 hover:bg-gray-100 hover:text-slate-900 dark:text-zinc-500 dark:hover:bg-white/5 dark:hover:text-white"
        )}
    >
        <div className="shrink-0 flex items-center justify-center">
            {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement, { width: 20, height: 20 }) : null}
        </div>
        <span className="text-sm font-medium whitespace-nowrap">
            {label}
        </span>
    </motion.button>
)

// --- View Components ---

// --- View Components ---

const ElevenLabsIcon = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 119 119" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
        <rect x="22.2666" y="27.8333" width="22.3125" height="91.1667" fill="currentColor" />
        <rect x="74.2666" y="0" width="22.3125" height="91.1667" fill="currentColor" />
    </svg>
)

const RSVPReaderDemo = () => {
    const [word, setWord] = useState("Ready?")
    const [isPlaying, setIsPlaying] = useState(false)
    const [wpm, setWpm] = useState(300)

    const sampleText = "Audicle transforms the way you consume the web. By using Rapid Serial Visual Presentation, you can read articles at double or triple your normal speed. The red letter Guide helps your eyes stay focused, eliminating saccadic eye movements and reducing strain. Experience the future of high-bandwidth information consumption right now."
    const words = useMemo(() => sampleText.split(" "), [])

    useEffect(() => {
        if (!isPlaying) return

        let i = 0
        const intervalMs = 60000 / wpm

        const interval = setInterval(() => {
            if (i >= words.length) {
                setIsPlaying(false)
                setWord("Replay ↻")
                clearInterval(interval)
                return
            }
            setWord(words[i])
            i++
        }, intervalMs)

        return () => clearInterval(interval)
    }, [isPlaying, wpm, words])

    // ORP (Optimal Recognition Point) Logic
    const pivot = Math.ceil((word.length - 1) * 0.35)
    const leftPart = word.slice(0, pivot)
    const highlight = word[pivot]
    const rightPart = word.slice(pivot + 1)

    return (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-xl text-center space-y-6 max-w-sm mx-auto dark:bg-zinc-900 dark:border-white/10 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gray-100 dark:bg-white/5">
                {isPlaying && (
                    <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        transition={{ duration: (words.length * 60) / wpm, ease: "linear" }}
                        className="h-full bg-slate-900 dark:bg-white"
                    />
                )}
            </div>

            <div className="h-20 flex items-center justify-center">
                <div className="font-serif text-4xl font-bold text-slate-800 dark:text-zinc-200 whitespace-nowrap">
                    <span>{leftPart}</span>
                    <span className="text-red-500">{highlight}</span>
                    <span>{rightPart}</span>
                </div>
            </div>

            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 dark:bg-white/5">
                    <span className="text-xs font-bold text-gray-500 dark:text-zinc-500">SPEED</span>
                    <select
                        value={wpm}
                        onChange={(e) => setWpm(Number(e.target.value))}
                        className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none dark:text-white"
                        disabled={isPlaying}
                    >
                        <option value={300}>300 WPM</option>
                        <option value={400}>400 WPM</option>
                        <option value={500}>500 WPM</option>
                    </select>
                </div>

                <button
                    onClick={() => {
                        if (isPlaying) {
                            setIsPlaying(false)
                            setWord("Paused")
                        } else {
                            setIsPlaying(true)
                        }
                    }}
                    className="px-6 py-2 bg-slate-900 text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-slate-800 transition-colors dark:bg-white dark:text-black dark:hover:bg-zinc-200"
                >
                    {isPlaying ? "Stop" : word === "Replay ↻" ? "Replay" : "Start Demo"}
                </button>
            </div>

            <p className="text-[10px] text-gray-400 dark:text-zinc-600">
                Active Speed Reading Demo ({words.length} words)
            </p>
        </div>
    )
}

const HomeView = ({ onNavigate }: { onNavigate: (tab: any) => void }) => {
    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    }

    return (
        <div className="max-w-5xl mx-auto space-y-16 pb-12">
            {/* Hero Section */}
            <div className="text-center space-y-8 py-10 relative overflow-hidden">
                {/* CSS-only Background Gradients */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-slate-200/50 blur-[100px] rounded-full pointer-events-none dark:bg-white/5" />
                <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gray-100 blur-[80px] rounded-full pointer-events-none dark:bg-transparent" />

                <div className="relative z-10 space-y-6">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-white text-[11px] font-bold uppercase tracking-wider shadow-lg dark:bg-white dark:text-black dark:border-white">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <span>v0.1.0 Beta Now Live</span>
                    </div>

                    <h2 className="text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.1] dark:text-white">
                        The Intelligent Way to <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-zinc-400">Listen to the Web.</span>
                    </h2>

                    <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed dark:text-zinc-400">
                        <span className="font-bold text-slate-800 dark:text-zinc-200">Audicle</span> isn't just a reader. It's a context-aware research assistant that turns articles, threads, and papers into high-fidelity audio—instantly and privately.
                    </p>
                </div>

                <div className="flex justify-center gap-4 pt-6 relative z-10">
                    <button onClick={() => onNavigate('setup')} className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5 transition-all dark:bg-white dark:text-black dark:hover:bg-zinc-200 shadow-2xl shadow-gray-200 dark:shadow-none">
                        <TerminalSquare size={20} />
                        <span>Setup & Installation</span>
                    </button>
                    <button onClick={() => window.open('https://github.com/remsky/Kokoro-FastAPI', '_blank')} className="flex items-center gap-3 px-8 py-4 bg-white text-slate-700 border border-gray-200 rounded-2xl font-bold hover:bg-gray-50 transition-all dark:bg-white/5 dark:text-white dark:border-white/10 dark:hover:bg-white/10">
                        <Github size={20} />
                        <span>View Source</span>
                    </button>
                </div>
            </div>

            {/* Core Features Grid */}
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
                {[
                    {
                        icon: <LayersIcon size={32} />,
                        color: "text-slate-900 dark:text-white",
                        bg: "bg-gray-100 dark:bg-white/10",
                        title: "Smart Extraction",
                        desc: "Audicle bypasses ads and clutter. Its heuristic engine identifies the main content, stitching together multi-part Tweets and complex article structures automatically."
                    },
                    {
                        icon: <Shield size={32} />,
                        color: "text-emerald-600 dark:text-emerald-400",
                        bg: "bg-emerald-50 dark:bg-emerald-500/10",
                        title: "100% Private & Local",
                        desc: "Your reading data never leaves your device. By leveraging local inference with Kokoro-82M, Audicle ensures privacy while delivering near-zero latency."
                    },
                    {
                        icon: <Zap size={32} />,
                        color: "text-orange-600 dark:text-orange-400",
                        bg: "bg-orange-50 dark:bg-orange-500/10",
                        title: "Instant Streaming",
                        desc: "No waiting for audio files to render. Audicle uses a custom MSE pipeline to stream generated audio chunks to your browser instantly as they are created."
                    },
                ].map((feature, i) => (
                    <motion.div
                        key={i}
                        variants={item}
                        whileHover={{ y: -5 }}
                        className="bg-white p-6 rounded-[24px] shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] flex flex-col items-start text-left hover:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.1)] transition-shadow duration-300 dark:bg-zinc-900/50 dark:shadow-none dark:border dark:border-white/5"
                    >
                        <div className={cn("w-14 h-14 flex items-center justify-center mb-5", feature.bg, feature.color)}>
                            {React.cloneElement(feature.icon as React.ReactElement, { size: 24 })}
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2 dark:text-white">{feature.title}</h3>
                        <p className="text-sm leading-6 text-gray-500 dark:text-zinc-400 font-medium">{feature.desc}</p>
                    </motion.div>
                ))}
            </motion.div>

            {/* Feature Spotlight Rows */}
            <div className="space-y-12">
                {/* RSVP Row */}
                <motion.div
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="bg-slate-900 rounded-[32px] p-8 md:p-12 text-white relative overflow-hidden dark:bg-white/5 dark:border dark:border-white/5"
                >
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 blur-[100px] rounded-full pointer-events-none" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 text-blue-300 font-bold uppercase text-xs tracking-wider">
                                <Play size={16} className="fill-current" />
                                <span>New Feature</span>
                            </div>
                            <h3 className="text-4xl font-extrabold leading-tight">Read at the Speed of Thought.</h3>
                            <p className="text-lg text-slate-300 leading-relaxed max-w-md dark:text-zinc-400">
                                Audicle's <strong>RSVP Reader</strong> eliminates eye movement, allowing you to consume articles at 500+ WPM with higher retention.
                            </p>
                            <ul className="space-y-3 pt-2">
                                {[
                                    'Eliminates saccadic eye movements',
                                    'Reduces reading fatigue',
                                    'Optimal Recognition Point (ORP) highlighting'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-400">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="transform md:scale-110 md:translate-x-6">
                            <RSVPReaderDemo />
                        </div>
                    </div>
                </motion.div>

                {/* ElevenLabs Row */}
                <motion.div
                    whileHover={{ scale: 1.01 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="bg-white rounded-[32px] p-8 md:p-12 border border-gray-200 shadow-sm relative overflow-hidden dark:bg-zinc-900/50 dark:border-white/5"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
                        {/* Visual Side */}
                        <div className="relative order-2 md:order-1">
                            <div className="aspect-square max-w-sm mx-auto bg-gradient-to-br from-gray-900 to-black rounded-3xl p-8 flex flex-col justify-between text-white shadow-2xl relative overflow-hidden dark:from-zinc-800 dark:to-zinc-950">
                                <ElevenLabsIcon className="w-16 h-16 text-white" />
                                <div className="space-y-2">
                                    <div className="text-sm font-mono text-gray-400">Powered by</div>
                                    <div className="text-3xl font-bold tracking-tight">ElevenLabs</div>
                                    <div className="text-sm text-gray-500">Multilingual v2</div>
                                </div>
                                {/* Decorative Waveform */}
                                <div className="absolute right-0 bottom-0 top-1/2 w-1/2 opacity-20">
                                    <div className="flex gap-1 h-full items-end pb-8 pr-8 justify-end">
                                        {[40, 60, 30, 80, 50, 90, 20].map((h, i) => (
                                            <div key={i} className="w-2 bg-white rounded-full" style={{ height: `${h}%` }} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Text Side */}
                        <div className="space-y-6 order-1 md:order-2">
                            <div className="inline-flex items-center gap-2 text-slate-900 font-bold uppercase text-xs tracking-wider dark:text-white">
                                <ElevenLabsIcon className="w-4 h-4" />
                                <span>Partner Integration</span>
                            </div>
                            <h3 className="text-4xl font-extrabold leading-tight text-slate-900 dark:text-white">World-Class AI Voices. <br /><span className="text-gray-400">Zero Markups.</span></h3>
                            <p className="text-lg text-gray-500 leading-relaxed dark:text-zinc-400">
                                Connect your personal <strong>ElevenLabs API Key</strong> to unlock the most realistic AI voices on the planet. Audicle acts as a direct client—your keys and data never touch our servers.
                            </p>
                            <div className="flex gap-4 pt-2">
                                <button onClick={() => window.open('https://elevenlabs.io', '_blank')} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-colors dark:bg-white dark:text-black">
                                    Get API Key
                                </button>
                                <button onClick={() => onNavigate('settings')} className="px-6 py-2.5 bg-gray-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors dark:bg-white/10 dark:text-white dark:hover:bg-white/20">
                                    Configure
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Engineering Deep Dive */}
            <div className="bg-slate-50 rounded-[32px] p-10 border border-gray-200 dark:bg-white/5 dark:border-white/5">
                <div className="flex flex-col md:flex-row gap-12 items-center">
                    <div className="flex-1 space-y-6">
                        <div className="inline-flex items-center gap-2 text-slate-900 font-bold uppercase text-xs tracking-wider dark:text-white">
                            <BookOpen className="w-4 h-4" />
                            <span>Architecture Spotlight</span>
                        </div>
                        <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">Constructing the Audio DOM</h3>
                        <div className="space-y-4 text-gray-600 dark:text-zinc-300">
                            <p className="leading-relaxed">
                                Single Page Applications (SPAs) like Twitter make text extraction notoriously difficult due to virtualization and dynamic loading.
                            </p>
                            <p className="leading-relaxed">
                                Audicle solves this with a <strong>Dynamic Observer</strong> system that:
                            </p>
                            <ul className="space-y-3 pt-2">
                                {[
                                    'Detects feed mutations in real-time',
                                    'Reconstructs conversation threads from disjointed DOM nodes',
                                    'Differentiates between mathematical notation and standard text',
                                    'Injects non-destructive highlights synced to audio playback'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm font-medium">
                                        <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-900 shrink-0 dark:bg-white" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Visual Graphic */}
                    <div className="flex-1 w-full aspect-video bg-white rounded-2xl border border-gray-200 shadow-lg p-6 relative overflow-hidden dark:bg-zinc-900 dark:border-white/10">
                        <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                            <LayersIcon size={200} />
                        </div>
                        <div className="relative z-10 space-y-4 font-mono text-xs">
                            <div className="flex items-center gap-2 text-gray-400 dark:text-zinc-600 pb-2 border-b border-gray-100 dark:border-white/5">
                                <div className="w-3 h-3 rounded-full bg-red-400" />
                                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                                <div className="w-3 h-3 rounded-full bg-green-400" />
                                <span className="ml-2">audicle-parser.ts</span>
                            </div>

                            <div className="space-y-1">
                                <div className="text-rose-600 dark:text-rose-400">function parseThread(root: HTMLElement) {'{'}</div>
                                <div className="pl-4 text-blue-600 dark:text-blue-400">const walker = document.createTreeWalker(</div>
                                <div className="pl-8 text-emerald-600 dark:text-emerald-400">root, NodeFilter.SHOW_TEXT, null</div>
                                <div className="pl-4 text-blue-600 dark:text-blue-400">);</div>
                                <div className="pl-4 text-slate-500 dark:text-zinc-500">// Intelligent filtering logic...</div>
                                <div className="pl-4 text-rose-600 dark:text-rose-400">while (walker.nextNode()) {'{'}</div>
                                <div className="pl-8 text-slate-500 dark:text-zinc-500">if (isVirtualList(walker.currentNode)) continue;</div>
                                <div className="pl-8 text-slate-500 dark:text-zinc-500">queue.add(normalize(walker.currentNode));</div>
                                <div className="pl-4 text-rose-600 dark:text-rose-400">{'}'}</div>
                                <div className="text-rose-600 dark:text-rose-400">{'}'}</div>
                            </div>

                            <div className="absolute bottom-6 right-6 px-3 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase tracking-wider dark:bg-green-900/30 dark:text-green-400">
                                Parsing Active
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Neural Voice Pipeline (Kokoro Deep Dive) */}
            <div className="space-y-16">
                <div className="text-center max-w-2xl mx-auto space-y-4">
                    <div className="inline-flex items-center gap-2 text-orange-600 font-bold uppercase text-xs tracking-wider dark:text-orange-400">
                        <Mic className="w-4 h-4" />
                        <span>The Voice Engine</span>
                    </div>
                    <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">Powered by Kokoro-82M</h3>
                    <p className="text-gray-500 leading-relaxed dark:text-zinc-400">
                        Audicle bridges the gap between web content and high-fidelity audio by integrating the <strong>Kokoro-82M</strong> model. It's an open-weight TTS model that rivals commercial APIs while running entirely on your local hardware.
                    </p>
                </div>

                {/* Pipeline Visualization */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                        { step: "01", title: "Text Normalization", icon: "Aa", color: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-zinc-300", desc: "Raw text is cleaned, URLs stripped, and numbers converted to words." },
                        { step: "02", title: "G2P Conversion", icon: "PH", color: "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400", desc: "Text is converted to phonemes (Grapheme-to-Phoneme) for pronunciation accuracy." },
                        { step: "03", title: "Neural Inference", icon: <Cloud size={20} />, color: "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400", desc: "The ONNX model predicts audio spectrograms from phonemes in <200ms." },
                        { step: "04", title: "Vocoder & Stream", icon: <Zap size={20} />, color: "bg-green-100 text-green-600 dark:bg-green-500/20 dark:text-green-400", desc: "Spectrograms are decoded to PCM audio and streamed instantly to the browser." }
                    ].map((item, i) => (
                        <div key={i} className="relative group">
                            <div className="bg-white rounded-[24px] p-8 border border-gray-100 h-full hover:shadow-xl hover:-translate-y-1 transition-all dark:bg-zinc-900/50 dark:border-white/5 dark:shadow-none">
                                <div className="flex justify-between items-start mb-6">
                                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm", item.color)}>
                                        {item.icon}
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-300 dark:text-zinc-600 tracking-widest">{item.step}</span>
                                </div>
                                <h4 className="font-bold text-slate-900 mb-3 text-lg dark:text-white">{item.title}</h4>
                                <p className="text-sm text-gray-500 leading-relaxed dark:text-zinc-500">{item.desc}</p>
                            </div>
                            {/* Connector Line (Mobile hidden) */}
                            {i < 3 && (
                                <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-gray-200 z-10 -translate-y-1/2 dark:bg-white/10" />
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Support / Buy Me Coffee */}
            <div className="pt-8">
                <a
                    href="https://buymeacoffee.com/bikiprasad"
                    target="_blank"
                    className="block group relative overflow-hidden rounded-[32px] bg-gradient-to-br from-amber-400 to-orange-500 text-white p-12 shadow-2xl hover:shadow-orange-500/20 transition-all hover:-translate-y-1"
                >
                    {/* Decorative Circles */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/5 rounded-full blur-xl translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-12">
                        <div className="flex items-center gap-8">
                            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 transform -rotate-6">
                                <Coffee size={40} className="ml-1 text-amber-600" />
                            </div>
                            <div className="text-left space-y-2">
                                <h3 className="text-2xl font-extrabold drop-shadow-sm">Support Open Source Engineering</h3>
                                <p className="font-medium opacity-90 max-w-lg text-base leading-relaxed text-amber-50">
                                    If you appreciate the technical depth and polish of this project, consider buying me a coffee. Your support fuels more AI experiments!
                                </p>
                            </div>
                        </div>

                        <div className="bg-white text-amber-600 px-8 py-4 rounded-2xl font-bold hover:bg-amber-50 transition-colors whitespace-nowrap shadow-md text-sm uppercase tracking-wide">
                            Buy me a Coffee →
                        </div>
                    </div>
                </a>
            </div>

            <div className="text-center pt-24 pb-8 border-t border-gray-100 dark:border-white/5">
                <p className="text-xs text-gray-400 dark:text-zinc-600 font-mono uppercase tracking-widest mb-2">
                    Engineered by Bikiprasad
                </p>
                <p className="text-[10px] text-gray-300 dark:text-zinc-700">
                    Built with Plasmo · React · Tailwind · TypeScript · Chrome Extension API V3
                </p>
            </div>
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
                            "group bg-white rounded-2xl p-6 border transition-all cursor-pointer relative overflow-hidden dark:bg-white/5 dark:border-white/5 dark:hover:bg-white/10",
                            isSelected
                                ? "border-slate-900 shadow-[0_4px_20px_rgba(0,0,0,0.1)] ring-1 ring-slate-900 dark:border-white dark:shadow-none dark:ring-white"
                                : "border-gray-100 hover:border-gray-200 hover:shadow-lg hover:shadow-gray-100"
                        )}
                    >
                        <div className="flex justify-between items-start mb-4">
                            <div className={cn(
                                "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold transition-all",
                                isSelected ? "bg-slate-900 text-white dark:bg-white dark:text-black" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200 group-hover:text-slate-900 dark:bg-white/10 dark:text-zinc-400 dark:group-hover:text-white"
                            )}>
                                {v.name[0]}
                            </div>
                            {isSelected && (
                                <div className="px-2 py-1 rounded bg-slate-100 text-[10px] font-bold text-slate-900 uppercase dark:bg-white/20 dark:text-white">
                                    Active
                                </div>
                            )}
                        </div>

                        <h3 className={cn("text-lg font-bold mb-1", isSelected ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-zinc-200")}>{v.name}</h3>
                        <p className="text-xs text-gray-500 mb-6 dark:text-zinc-500">{v.description}</p>

                        <button className="w-full py-2.5 rounded-lg border border-gray-100 bg-gray-50 text-xs font-semibold text-gray-600 hover:bg-white hover:border-gray-200 transition-all flex items-center justify-center gap-2 dark:bg-white/5 dark:border-white/5 dark:text-zinc-400 dark:hover:bg-white/10">
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

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    }

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="space-y-6"
        >
            {/* Top Cards Row */}
            <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-3 gap-6"
            >
                {/* ... Cards content same ... */}
                <motion.div variants={item}>
                    <Card title="Total Usage" value={`${fmt(data.totalChars)} chars`} change="+12.5%" isPositive>
                        <div className="h-16 mt-4">
                            <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                                <path d="M0 30 C 20 20, 40 40, 60 10 S 80 5, 100 25" fill="none" stroke="#6366f1" strokeWidth="2" />
                                <circle cx="100" cy="25" r="3" fill="#6366f1" />
                            </svg>
                        </div>
                    </Card>
                </motion.div>
                <motion.div variants={item}>
                    <Card title="Kokoro (Local)" value={fmt(data.byModel.kokoro)}>
                        <div className="mt-6 flex items-center gap-3">
                            <div className="flex-1 h-2 bg-orange-100 rounded-full overflow-hidden">
                                <div className="h-full bg-orange-500" style={{ width: `${kPercent}%` }} />
                            </div>
                            <span className="text-xs font-bold text-orange-600">{Math.round(kPercent)}%</span>
                        </div>
                    </Card>
                </motion.div>
                <motion.div variants={item}>
                    <Card title="ElevenLabs (Cloud)" value={fmt(data.byModel.elevenlabs)}>
                        <div className="mt-6 flex items-center gap-3">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden dark:bg-white/10">
                                <div className="h-full bg-slate-900 dark:bg-white" style={{ width: `${ePercent}%` }} />
                            </div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">{Math.round(ePercent)}%</span>
                        </div>
                    </Card>
                </motion.div>
            </motion.div>

            {/* Daily Usage Chart */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 dark:bg-zinc-900/50 dark:border-white/5 dark:shadow-none">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Daily Usage</h3>
                        <p className="text-xs text-gray-400 dark:text-zinc-500">Character consumption per day (Last 7 Days)</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-orange-500" />
                            <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">Kokoro</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-xs font-bold text-gray-500 dark:text-zinc-400">ElevenLabs</span>
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
                                <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg whitespace-nowrap z-10 pointer-events-none dark:bg-zinc-800">
                                    <div className="font-bold">{d.date}</div>
                                    <div className="text-orange-300">Kokoro: {fmt(d.kokoro)}</div>
                                    <div className="text-blue-300">ElevenLabs: {fmt(d.elevenlabs)}</div>
                                </div>

                                {/* Stacked Bar */}
                                <div className="w-full max-w-[40px] h-full flex flex-col justify-end rounded-t-lg overflow-hidden bg-gray-50 relative dark:bg-white/5">
                                    <motion.div
                                        initial={{ height: 0 }} animate={{ height: `${hEleven}%` }}
                                        className="w-full bg-blue-500 hover:bg-blue-600 transition-colors"
                                    />
                                    <motion.div
                                        initial={{ height: 0 }} animate={{ height: `${hKokoro}%` }}
                                        className="w-full bg-orange-500 hover:bg-orange-600 transition-colors"
                                    />
                                </div>

                                <span className="text-[10px] font-bold text-gray-400 mt-2 whitespace-nowrap dark:text-zinc-600">{dateLabel}</span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 dark:bg-zinc-900/50 dark:border-white/5 dark:shadow-none">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">Usage History Log</h3>
                </div>

                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-gray-400 text-xs uppercase tracking-wider text-left dark:text-zinc-500">
                            <th className="pb-4 font-normal pl-4">Time</th>
                            <th className="pb-4 font-normal">Model</th>
                            <th className="pb-4 font-normal">Characters</th>
                            <th className="pb-4 font-normal">Status</th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-600 font-medium dark:text-zinc-400">
                        {data.history.length === 0 && (
                            <tr><td colSpan={4} className="py-8 text-center text-gray-400 italic dark:text-zinc-600">No history yet.</td></tr>
                        )}
                        {data.history.slice().reverse().slice(0, 10).map((h, i) => {
                            const date = new Date(h.timestamp)
                            const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                            const timeStr = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

                            return (
                                <tr key={i} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors group dark:border-white/5 dark:hover:bg-white/5">
                                    <td className="py-4 pl-4 text-gray-500 dark:text-zinc-500">
                                        <div className="font-bold text-slate-700 dark:text-zinc-300">{dateStr}</div>
                                        <div className="text-xs text-gray-400 dark:text-zinc-600">{timeStr}</div>
                                    </td>
                                    <td className="py-4 flex items-center gap-2">
                                        <div className={cn("w-2 h-2 rounded-full", h.model === 'kokoro' ? "bg-orange-500" : "bg-blue-500")} />
                                        <span className="text-slate-900 capitalize dark:text-zinc-200">{h.model}</span>
                                    </td>
                                    <td className="py-4 text-slate-900 font-bold dark:text-zinc-200">{fmt(h.chars)}</td>
                                    <td className="py-4">
                                        <span className="px-2 py-1 rounded text-xs font-bold bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400">
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
                <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-lg shadow-gray-200 dark:bg-white/10 dark:shadow-none">
                    <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Total Saved</div>
                    <div className="text-4xl font-bold">{count}</div>
                    <div className="text-slate-300 text-sm mt-2">Articles in Library</div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-3">
                        Saved Articles
                    </h3>
                </div>

                {count === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center bg-white rounded-2xl border border-gray-100 dark:bg-white/5 dark:border-white/5">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 dark:bg-white/10 dark:text-zinc-400">
                            <LayersIcon className="text-gray-300" />
                        </div>
                        <h4 className="text-slate-900 font-bold mb-1 dark:text-white">Library is empty</h4>
                        <p className="text-sm text-gray-500 dark:text-zinc-500">Save articles to read them later.</p>
                    </div>
                ) : (
                    // Masonry Layout without Gaps
                    <div className="columns-1 md:columns-2 xl:columns-3 gap-6 space-y-6">
                        {sortedArticles.map((article) => (
                            <div
                                key={article.id}
                                className="break-inside-avoid bg-white rounded-[20px] border border-gray-100 p-6 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-md transition-all relative group flex flex-col dark:bg-zinc-900/50 dark:border-white/5 dark:shadow-none dark:hover:bg-zinc-900/80"
                            >
                                {/* Header */}
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex gap-3">
                                        {/* Avatar */}
                                        <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-50 dark:bg-white/10 dark:border-transparent">
                                            {article.avatar ? (
                                                <img src={article.avatar} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold bg-gray-50 uppercase text-sm dark:bg-white/5 dark:text-zinc-500">
                                                    {(article.author || article.title)[0]}
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col leading-tight">
                                            <div className="flex items-center gap-1">
                                                <span className="font-bold text-slate-900 text-[15px] dark:text-white">{article.author || "Unknown User"}</span>
                                                {/* Verified Badge */}
                                                <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] text-[#1D9BF0] fill-current">
                                                    <g><path d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.02-3.01-1.09-3.96-1.11-.95-2.73-1.1-3.96-.28C14.35 3.11 13.11 2.22 11.68 2.22c-1.43 0-2.67.89-3.34 2.19-1.23-.82-2.85-.67-3.96.28-1.1.95-1.55 2.57-1.09 3.96C2 9.33 1.12 10.57 1.12 12c0 1.43.89 2.67 2.19 3.34-.46 1.39-.02 3.01 1.09 3.96 1.11.95 2.73 1.1 3.96.28.67 1.31 1.91 2.19 3.34 2.19 1.43 0 2.67-.89 3.34-2.19 1.23.82 2.85.67 3.96-.28 1.1-.95 1.55-2.57 1.09-3.96C21.38 14.67 22.25 13.43 22.25 12zM9.6 17.65l-4.5-4.5 1.76-1.77 2.74 2.74 5.74-5.74 1.76 1.76-7.5 7.5z"></path></g>
                                                </svg>
                                            </div>
                                            <span className="text-gray-500 text-[14px] dark:text-zinc-500">{article.handle || `@${new URL(article.url).hostname}`}</span>
                                        </div>
                                    </div>

                                    {/* X Logo / Delete Action */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                removeArticle(article.id)
                                            }}
                                            className="text-gray-300 hover:text-red-500 transition-colors p-1 opacity-0 group-hover:opacity-100 dark:text-zinc-600 dark:hover:text-red-400"
                                            title="Remove from Library"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-900 fill-current dark:text-zinc-400" aria-hidden="true">
                                            <g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g>
                                        </svg>
                                    </div>
                                </div>

                                {/* Body */}
                                <a href={article.url} target="_blank" className="block flex-1 group/card">
                                    <p className="text-slate-900 text-[15px] leading-6 whitespace-pre-wrap mb-3 font-normal dark:text-zinc-300">
                                        {article.title}
                                    </p>

                                    {/* Image */}
                                    {article.image && (
                                        <div className="rounded-2xl border border-gray-100 overflow-hidden bg-gray-50 mt-2 dark:border-white/5 dark:bg-black/20">
                                            <img src={article.image} alt="Tweet Media" className="w-full h-auto object-cover max-h-[400px]" />
                                        </div>
                                    )}
                                </a>

                                {/* Footer / Metadata (Timestamp Only + Buttons) */}
                                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between dark:border-white/5">
                                    <div className="flex items-center gap-1 text-gray-500 text-[14px] dark:text-zinc-500">
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
                                        className="w-8 h-8 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-sm dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
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
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 dark:bg-zinc-900/50 dark:border-white/5 dark:shadow-none">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
                        <Cloud size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Kokoro TTS (Local)</h3>
                        <p className="text-sm text-gray-500 dark:text-zinc-500">Configure local inference server.</p>
                    </div>
                    <div className="ml-auto">
                        <Toggle checked={isKokoroEnabled} onChange={() => setIsKokoroEnabled(!isKokoroEnabled)} activeColor="bg-orange-500" />
                    </div>
                </div>

                <AnimatePresence>
                    {isKokoroEnabled && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="pt-4 border-t border-gray-50 dark:border-white/5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block dark:text-zinc-500">API Endpoint</label>
                                <input
                                    type="text"
                                    value={kokoroUrl || ""}
                                    onChange={(e) => setKokoroUrl(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all dark:bg-black/40 dark:border-white/10 dark:text-zinc-300 dark:focus:border-orange-500/30"
                                    placeholder="http://localhost:8880"
                                />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 dark:bg-zinc-900/50 dark:border-white/5 dark:shadow-none">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white dark:bg-white dark:text-black">
                        <ElevenLabsIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">ElevenLabs (Cloud)</h3>
                        <p className="text-sm text-gray-500 dark:text-zinc-500">Premium cloud synthesis via API Key.</p>
                    </div>
                    <div className="ml-auto">
                        <Toggle checked={isElevenLabsEnabled} onChange={() => setIsElevenLabsEnabled(!isElevenLabsEnabled)} activeColor="bg-blue-500" />
                    </div>
                </div>

                <AnimatePresence>
                    {isElevenLabsEnabled && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="pt-4 border-t border-gray-50 dark:border-white/5">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block dark:text-zinc-500">API Key</label>
                                <input
                                    type="password"
                                    value={apiKey || ""}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:bg-black/40 dark:border-white/10 dark:text-zinc-300 dark:focus:border-blue-500/30"
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
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition-shadow dark:bg-zinc-900/50 dark:border-white/5 dark:shadow-none">
        <div className="flex justify-between items-start">
            <h4 className="text-sm font-bold text-gray-500 dark:text-zinc-500">{title}</h4>
            <div className="text-gray-300 transform rotate-45 dark:text-zinc-700"><ArrowUpRight size={14} /></div>
        </div>
        <div>
            <div className="flex items-baseline gap-2 mt-2">
                <span className="text-2xl font-bold text-slate-800 dark:text-white">{value}</span>
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




const SetupView = () => {
    const { kokoroUrl } = useSettings()

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-24 pb-24">

            <div className="text-center space-y-6 pt-8">
                <div className="w-20 h-20 bg-orange-50 rounded-[2rem] flex items-center justify-center mx-auto text-orange-600 mb-8 dark:bg-orange-500/10 dark:text-orange-400">
                    <Zap size={40} />
                </div>
                <h2 className="text-5xl font-extrabold text-slate-900 tracking-tight dark:text-white">Unlock Local Intelligence</h2>
                <p className="text-xl text-gray-500 max-w-2xl mx-auto dark:text-zinc-400 leading-relaxed font-medium">
                    To enable <strong>zero-latency</strong>, <strong>private</strong> voice synthesis, you need to run the lightweight Kokoro inference engine on your machine.
                </p>
            </div>

            <div className="space-y-0 relative">
                {/* Central Connector Line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-100 dark:bg-white/5 -ml-px hidden md:block" />

                {/* Step 1: Install Engine */}
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 pb-24">
                    {/* Left: Text */}
                    <div className="text-right space-y-6 pt-8">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full dark:bg-white/10 dark:text-zinc-300">Step 01</span>
                        <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">Launch the Engine</h3>
                        <p className="text-lg text-gray-500 dark:text-zinc-400 leading-relaxed">
                            Clone and run the <strong>Kokoro-FastAPI</strong> server. It downloads the 82M model automatically on first run.
                        </p>
                        <div className="flex justify-end gap-3 pt-2">
                            <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-mono font-medium dark:bg-white/10 dark:text-zinc-300">Python 3.10+</span>
                            <span className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-mono font-medium dark:bg-white/10 dark:text-zinc-300">Docker</span>
                        </div>
                    </div>

                    {/* Center Bubble */}
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center hidden md:flex">
                        <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-[0_0_0_12px_#F9FAFB] dark:bg-white dark:text-black dark:shadow-[0_0_0_12px_#171717]">1</div>
                    </div>

                    {/* Right: Visual */}
                    <div className="pt-2">
                        <div className="bg-[#1E1E1E] rounded-2xl overflow-hidden shadow-2xl border border-white/10 font-mono text-xs md:text-sm relative group w-full hover:-translate-y-1 transition-transform duration-500">
                            <div className="bg-[#2D2D2D] px-4 py-3 flex items-center gap-2 border-b border-white/5">
                                <div className="w-3 h-3 rounded-full bg-[#FF5F56]" />
                                <div className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
                                <div className="w-3 h-3 rounded-full bg-[#27C93F]" />
                                <div className="ml-4 text-gray-500 text-[10px] flex-1 text-center font-sans opacity-50">Terminal</div>
                            </div>
                            <div className="p-6 space-y-4 text-gray-300">
                                <div><span className="text-green-400">➜</span> <span className="text-blue-400">~</span> git clone https://github.com/remsky/Kokoro-FastAPI.git</div>
                                <div><span className="text-green-400">➜</span> <span className="text-blue-400">~</span> cd Kokoro-FastAPI</div>
                                <div><span className="text-green-400">➜</span> <span className="text-blue-400">~/Kokoro-FastAPI</span> uv sync && uv run uvicorn main:app --reload</div>
                                <div className="pt-2 text-gray-500 animate-pulse">INFO:     Uvicorn running on http://127.0.0.1:8880</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Step 2: Verification */}
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 pb-24">
                    {/* Left: Visual */}
                    <div className="flex justify-end pt-2">
                        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 px-8 py-8 flex items-center gap-6 dark:bg-zinc-900 dark:border-white/10 hover:-translate-y-1 transition-transform duration-500">
                            <div className="w-4 h-4 rounded-full bg-green-500 animate-ping shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">API Status</div>
                                <div className="font-mono text-slate-700 truncate font-bold text-lg dark:text-zinc-200">{kokoroUrl || "http://localhost:8880"}</div>
                            </div>
                            <a href={`${kokoroUrl || "http://localhost:8880"}/docs`} target="_blank" className="px-4 py-2 bg-slate-100 text-slate-900 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors dark:bg-white/10 dark:text-white">
                                Check Docs
                            </a>
                        </div>
                    </div>

                    {/* Center Bubble */}
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center hidden md:flex">
                        <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xl shadow-[0_0_0_12px_#F9FAFB] dark:bg-white dark:text-black dark:shadow-[0_0_0_12px_#171717]">2</div>
                    </div>

                    {/* Right: Text */}
                    <div className="text-left space-y-6 pt-8">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full dark:bg-white/10 dark:text-zinc-300">Step 02</span>
                        <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">Verify Connection</h3>
                        <p className="text-lg text-gray-500 dark:text-zinc-400 leading-relaxed">
                            Ensure the API is reachable. By default, it runs on port <strong>8880</strong>. Once connected, Audicle will automatically switch to local inference.
                        </p>
                    </div>
                </div>

                {/* Step 3: Speed Reading (RSVP) */}
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 pb-24">
                    {/* Left: Text */}
                    <div className="text-right space-y-6 pt-8">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full dark:bg-white/10 dark:text-zinc-300">Step 03</span>
                        <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">Active Speed Reading</h3>
                        <p className="text-lg text-gray-500 dark:text-zinc-400 leading-relaxed">
                            Use the <strong>RSVP Reader</strong> to consume content at 2x-3x speed. The red guide helps your eyes focus while listening, reducing strain and increasing retention.
                        </p>
                    </div>

                    {/* Center Bubble */}
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center hidden md:flex">
                        <div className="w-12 h-12 rounded-full bg-white border-2 border-slate-900 text-slate-900 flex items-center justify-center font-bold text-xl shadow-[0_0_0_12px_#F9FAFB] dark:bg-black dark:border-white dark:text-white dark:shadow-[0_0_0_12px_#171717]">3</div>
                    </div>

                    {/* Right: Visual */}
                    <div className="pt-2">
                        <RSVPReaderDemo />
                    </div>
                </div>

                {/* Step 4: Premium Voices (BYOK) */}
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24">
                    {/* Left: Visual */}
                    <div className="flex justify-end pt-2">
                        <div className="w-full max-w-sm bg-gradient-to-br from-slate-900 to-zinc-800 rounded-2xl p-8 text-white shadow-xl hover:-translate-y-1 transition-transform duration-500 relative overflow-hidden dark:from-zinc-800 dark:to-zinc-950">
                            {/* Abstract Shapes */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

                            <div className="relative z-10">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                        <ElevenLabsIcon className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg">ElevenLabs Integration</div>
                                        <div className="text-blue-100 text-xs">Official Partner API</div>
                                    </div>
                                </div>
                                <div className="bg-black/20 rounded-xl p-4 text-sm font-mono text-blue-50 mb-4 truncate border border-white/10 flex items-center justify-between">
                                    <span>sk_live_9a8b...</span>
                                    <span className="text-[10px] bg-green-500/20 text-green-200 px-2 py-0.5 rounded uppercase tracking-wider font-bold">Encrypted</span>
                                </div>
                                <p className="text-sm text-blue-100 leading-relaxed opacity-90">
                                    Your API key is stored locally in your browser's secure storage. We never proxy your requests.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Center Bubble */}
                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center hidden md:flex">
                        <div className="w-12 h-12 rounded-full bg-white border-2 border-blue-500 text-blue-600 flex items-center justify-center font-bold text-xl shadow-[0_0_0_12px_#F9FAFB] dark:bg-black dark:shadow-[0_0_0_12px_#171717]">4</div>
                    </div>

                    {/* Right: Text */}
                    <div className="text-left space-y-6 pt-8">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full dark:bg-white/10 dark:text-zinc-300">Optional</span>
                        <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white">Bring Your Own Key</h3>
                        <p className="text-lg text-gray-500 dark:text-zinc-400 leading-relaxed">
                            Prefer cloud quality? Add your <strong>ElevenLabs API Key</strong> in the Settings tab to access ultra-realistic voices like 'Nicole' and 'Bill'.
                        </p>
                    </div>
                </div>

            </div>

        </motion.div>
    )
}

const Toggle = ({ checked, onChange, activeColor = "bg-slate-900" }: any) => (
    <button
        onClick={onChange}
        className={cn("w-12 h-6 rounded-full transition-colors relative", checked ? activeColor : "bg-gray-300 dark:bg-white/10")}
    >
        <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm", checked ? "left-7" : "left-1")} />
    </button>
)

export default OptionsIndex
