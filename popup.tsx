import { useState, useEffect } from "react"
import { useSettings } from "~hooks/useSettings"

import { Power, Coffee, BookOpen, Volume2, Settings, Zap, Globe, Server, Sun, Moon } from "lucide-react"
import { AudicleIcon } from "~lib/icons"
import { cn } from "~lib/utils"
import "./style.css"

type AudioProviderType = 'webspeech' | 'elevenlabs' | 'kokoro';

function IndexPopup() {
  const { apiKey, showOverlay, isElevenLabsEnabled, readerMode, kokoroUrl, isKokoroEnabled, setApiKey, setShowOverlay, setIsElevenLabsEnabled, setReaderMode, setKokoroUrl, setIsKokoroEnabled, theme, setTheme } = useSettings()
  const [localKey, setLocalKey] = useState("")
  const [localKokoroUrl, setLocalKokoroUrl] = useState("")
  const [isSaved, setIsSaved] = useState(false)
  const [activeProvider, setActiveProvider] = useState<AudioProviderType>('webspeech')

  useEffect(() => {
    if (apiKey) setLocalKey(apiKey)
    if (kokoroUrl) setLocalKokoroUrl(kokoroUrl)

    // Determine active provider based on flags
    if (isKokoroEnabled) {
      setActiveProvider('kokoro')
    } else if (isElevenLabsEnabled) {
      setActiveProvider('elevenlabs')
    } else {
      setActiveProvider('webspeech')
    }
  }, [apiKey, kokoroUrl, isKokoroEnabled, isElevenLabsEnabled])

  // Apply Theme Class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])


  const handleSave = () => {
    setApiKey(localKey)
    setKokoroUrl(localKokoroUrl)

    // Save provider state
    if (activeProvider === 'kokoro') {
      setIsKokoroEnabled(true)
      setIsElevenLabsEnabled(false)
    } else if (activeProvider === 'elevenlabs') {
      setIsKokoroEnabled(false)
      setIsElevenLabsEnabled(true)
    } else {
      setIsKokoroEnabled(false)
      setIsElevenLabsEnabled(false)
    }

    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <div className={cn(
      "w-[360px] min-h-[500px] font-sans relative overflow-hidden flex flex-col transition-colors duration-300",
      "bg-white text-zinc-900 dark:bg-neutral-950 dark:text-white"
    )}>
      {/* Noise Texture (Dark Mode Only) */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay hidden dark:block" />

      {/* Subtle Background Gradient */}
      <div className="absolute -top-[20%] -left-[20%] w-[140%] h-[140%] pointer-events-none blur-3xl z-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent" />

      {/* Header */}
      <header className="relative z-10 px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-[14px] font-bold font-mono tracking-[0.3em] text-zinc-900 dark:text-white/90">AUDICLE</h1>
          <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-wider mt-0.5">Configuration</p>
        </div>
        <div className="flex items-center gap-2">

          {/* Overlay Toggle (Simplified Icon) */}
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className={cn(
              "w-8 h-8 flex items-center justify-center rounded-full transition-all duration-300",
              showOverlay
                ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400"
                : "bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-600"
            )}
            title={showOverlay ? "Hide Overlay" : "Show Overlay"}
          >
            <div className={cn("w-2 h-2 rounded-full", showOverlay ? "bg-indigo-500" : "bg-zinc-400 dark:bg-zinc-600")} />
          </button>


          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10 transition-colors"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </div>
      </header>

      {/* Separator */}
      <div className="h-px w-full bg-zinc-100 dark:bg-white/5" />

      {/* Content */}
      <div className="relative z-10 flex-1 px-5 pt-4 space-y-4 overflow-y-auto pb-4 custom-scrollbar">

        {/* Highlight Card: Open Dashboard */}
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="w-full flex items-center justify-between p-4 rounded-2xl border transition-all group relative overflow-hidden bg-white border-zinc-200 shadow-sm hover:border-indigo-300 dark:bg-white/5 dark:border-white/5 dark:hover:border-indigo-500/30 dark:shadow-none"
        >
          {/* Hover Gradient (Dark Mode) */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity hidden dark:block" />
          {/* Hover Gradient (Light Mode) */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity dark:hidden" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300 text-white">
              <AudicleIcon size={26} />
            </div>
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-xs font-bold text-zinc-800 dark:text-white uppercase tracking-wider group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">Open Dashboard</span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-300">Voice Studio & Library</span>
            </div>
          </div>

          <div className="w-7 h-7 rounded-full bg-zinc-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-white dark:group-hover:bg-white/10 transition-colors z-10 border border-zinc-200/50 dark:border-transparent">
            <Settings size={12} className="text-zinc-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-300" />
          </div>
        </button>

        {/* Global Settings Card */}
        <div className="rounded-2xl border p-1 border-zinc-200 bg-zinc-50 dark:bg-zinc-900/50 dark:border-white/5">

          {/* Reader Mode Selector */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-xl mb-1 bg-zinc-200/50 dark:bg-black/20">
            <button
              onClick={() => setReaderMode('audio')}
              className={cn(
                "flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                readerMode === 'audio'
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-indigo-500/20 dark:text-indigo-300"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              )}
            >
              <Volume2 size={12} />
              Audio
            </button>
            <button
              onClick={() => setReaderMode('speed-reader')}
              className={cn(
                "flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                readerMode === 'speed-reader'
                  ? "bg-white text-purple-600 shadow-sm dark:bg-purple-500/20 dark:text-purple-300"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300"
              )}
            >
              <BookOpen size={12} />
              Speed Read
            </button>
          </div>

          {/* Audio Engine Selector (Conditional) */}
          {readerMode === 'audio' && (
            <div className="p-3 space-y-4">
              <div className="space-y-2">
                <label className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest ml-1">Audio Engine</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setActiveProvider('webspeech')}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 py-3 rounded-xl border transition-all duration-300",
                      activeProvider === 'webspeech'
                        ? "bg-blue-50 border-blue-200 text-blue-600 shadow-sm dark:bg-blue-500/10 dark:border-blue-500/50 dark:text-blue-400 dark:shadow-[0_0_15px_-3px_rgba(59,130,246,0.3)]"
                        : "bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:bg-zinc-800/50 dark:border-white/5 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:border-white/10"
                    )}
                  >
                    <Globe size={16} />
                    <span className="text-[9px] font-bold">Standard</span>
                  </button>

                  <button
                    onClick={() => setActiveProvider('kokoro')}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 py-3 rounded-xl border transition-all duration-300",
                      activeProvider === 'kokoro'
                        ? "bg-orange-50 border-orange-200 text-orange-600 shadow-sm dark:bg-orange-500/10 dark:border-orange-500/50 dark:text-orange-400 dark:shadow-[0_0_15px_-3px_rgba(249,115,22,0.3)]"
                        : "bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:bg-zinc-800/50 dark:border-white/5 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:border-white/10"
                    )}
                  >
                    <Server size={16} />
                    <span className="text-[9px] font-bold">Kokoro</span>
                  </button>

                  <button
                    onClick={() => setActiveProvider('elevenlabs')}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 py-3 rounded-xl border transition-all duration-300",
                      activeProvider === 'elevenlabs'
                        ? "bg-green-50 border-green-200 text-green-600 shadow-sm dark:bg-green-500/10 dark:border-green-500/50 dark:text-green-400 dark:shadow-[0_0_15px_-3px_rgba(34,197,94,0.3)]"
                        : "bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:bg-zinc-800/50 dark:border-white/5 dark:text-zinc-500 dark:hover:bg-zinc-800 dark:hover:border-white/10"
                    )}
                  >
                    <Zap size={16} />
                    <span className="text-[9px] font-bold">Premium</span>
                  </button>
                </div>
              </div>

              {/* Configuration Inputs based on Selection */}
              <div className="mt-2 min-h-[60px]">
                {activeProvider === 'elevenlabs' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                    <label className="flex items-center gap-2 text-[9px] font-mono text-zinc-500 uppercase tracking-widest pl-1">
                      <Zap size={10} className="text-green-500" />
                      ElevenLabs API Key
                    </label>
                    <input
                      type="password"
                      value={localKey}
                      onChange={(e) => setLocalKey(e.target.value)}
                      placeholder="sk_..."
                      className="w-full rounded-lg px-3 py-2.5 text-[11px] font-mono transition-all focus:outline-none bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-green-500 focus:ring-1 focus:ring-green-500 dark:bg-black/40 dark:border-white/10 dark:text-zinc-300 dark:placeholder:text-zinc-700 dark:focus:border-green-500/50 dark:focus:bg-black/60 dark:focus:ring-0"
                    />
                  </div>
                )}

                {activeProvider === 'kokoro' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                    <label className="flex items-center gap-2 text-[9px] font-mono text-zinc-500 uppercase tracking-widest pl-1">
                      <Server size={10} className="text-orange-500" />
                      API URL (Localhost)
                    </label>
                    <input
                      type="text"
                      value={localKokoroUrl}
                      onChange={(e) => setLocalKokoroUrl(e.target.value)}
                      placeholder="http://localhost:8880"
                      className="w-full rounded-lg px-3 py-2.5 text-[11px] font-mono transition-all focus:outline-none bg-white border border-zinc-300 text-zinc-900 placeholder:text-zinc-400 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:bg-black/40 dark:border-white/10 dark:text-zinc-300 dark:placeholder:text-zinc-700 dark:focus:border-orange-500/50 dark:focus:bg-black/60 dark:focus:ring-0"
                    />
                  </div>
                )}

                {activeProvider === 'webspeech' && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border animate-in fade-in slide-in-from-top-1 duration-300 bg-blue-50 border-blue-100 text-zinc-600 dark:bg-blue-500/5 dark:border-blue-500/10 dark:text-zinc-400">
                    <Globe size={14} className="text-blue-500 dark:text-blue-400" />
                    <span className="text-[10px]">Using browser's built-in voices.</span>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Footer Actions */}
      <div className="relative z-10 px-5 pb-5 pt-3 bg-gradient-to-t from-white to-white/0 dark:from-neutral-950 dark:to-transparent">
        <button
          onClick={handleSave}
          disabled={isSaved}
          className={cn(
            "w-full py-3.5 rounded-xl text-[10px] font-bold tracking-[0.2em] uppercase transition-all duration-300 relative overflow-hidden group border",
            isSaved
              ? "bg-green-100 text-green-600 border-green-200 cursor-default dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20"
              : "bg-zinc-900 text-white border-transparent hover:bg-zinc-800 shadow-lg shadow-zinc-200/50 dark:bg-white/5 dark:text-white dark:border-white/5 dark:hover:bg-white/10 dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)] dark:hover:shadow-[0_4px_25px_rgba(99,102,241,0.2)]"
          )}
        >
          <div className="relative z-10 flex items-center justify-center gap-2">
            {isSaved ? "Saved" : "Save Changes"}
          </div>
          {/* Scanline/Shine Effect */}
          {!isSaved && <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:left-[100%] transition-all duration-700 ease-in-out" />}
        </button>

        <div className="mt-4 flex justify-between items-center text-[9px] text-zinc-500 font-mono uppercase tracking-wider dark:text-zinc-600">
          <span className="bg-zinc-100 px-2 py-1 rounded dark:bg-white/5">v2.1.0 PRO</span>
          <a href="https://buymeacoffee.com/bikiprasad" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-amber-500 transition-colors group dark:hover:text-amber-400">
            <Coffee size={10} className="group-hover:animate-bounce" />
            <span>Support</span>
          </a>
        </div>
      </div>
    </div>
  )
}

export default IndexPopup
