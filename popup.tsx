import { useState, useEffect } from "react"
import { useSettings } from "~hooks/useSettings"

import { Power, Coffee, BookOpen, Volume2 } from "lucide-react"
import { cn } from "~lib/utils"
import "./style.css"

function IndexPopup() {
  const { apiKey, showOverlay, isElevenLabsEnabled, readerMode, kokoroUrl, isKokoroEnabled, setApiKey, setShowOverlay, setIsElevenLabsEnabled, setReaderMode, setKokoroUrl, setIsKokoroEnabled } = useSettings()
  const [localKey, setLocalKey] = useState("")
  const [localKokoroUrl, setLocalKokoroUrl] = useState("")
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    if (apiKey) setLocalKey(apiKey)
    if (kokoroUrl) setLocalKokoroUrl(kokoroUrl)
  }, [apiKey, kokoroUrl])


  const handleSave = () => {
    setApiKey(localKey)
    setKokoroUrl(localKokoroUrl)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
  }

  return (
    <div className="w-[360px] min-h-[500px] bg-neutral-900 text-white font-sans relative overflow-hidden flex flex-col">
      {/* Noise Texture */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />

      {/* Gradient Glow */}
      <div className="absolute -top-[20%] -left-[20%] w-[140%] h-[140%] bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-transparent pointer-events-none blur-3xl z-0" />

      {/* Header */}
      <header className="relative z-10 px-6 pt-6 pb-2 flex items-center justify-between">
        <div className="flex flex-col">
          <h1 className="text-[14px] font-bold font-mono tracking-[0.3em] text-white/90">AUDICLE</h1>
          <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-wider mt-0.5">Configuration</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("text-[9px] font-bold tracking-wider uppercase transition-colors", showOverlay ? "text-blue-400" : "text-zinc-600")}>
            {showOverlay ? "ON" : "OFF"}
          </span>
          <button
            onClick={() => setShowOverlay(!showOverlay)}
            className={cn(
              "w-10 h-5 rounded-full relative transition-all duration-300 shadow-inner",
              showOverlay ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]" : "bg-zinc-800 border border-white/5"
            )}
          >
            <div className={cn(
              "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300",
              showOverlay ? "left-[22px]" : "left-0.5"
            )} />
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 flex-1 px-6 py-4 space-y-4">

        {/* Dashboard Link */}
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/10 hover:border-white/20 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-[10px]">A</span>
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[11px] font-bold text-white uppercase tracking-wider">Open Dashboard</span>
              <span className="text-[9px] text-zinc-500">Voice Studio & Library</span>
            </div>
          </div>
          <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-zinc-400 group-hover:text-white">
              <path d="M7 17l9.2-9.2M17 17V7H7" />
            </svg>
          </div>
        </button>

        {/* Reader Mode Toggle */}
        <div className="p-3 rounded-xl bg-white/5 border border-white/5">
          <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider block mb-2">Reader Mode</span>
          <div className="flex gap-2">
            <button
              onClick={() => setReaderMode('audio')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                readerMode === 'audio'
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-white/5 text-zinc-500 border border-white/5 hover:bg-white/10"
              )}
            >
              <Volume2 size={12} />
              Audio
            </button>
            <button
              onClick={() => setReaderMode('speed-reader')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                readerMode === 'speed-reader'
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : "bg-white/5 text-zinc-500 border border-white/5 hover:bg-white/10"
              )}
            >
              <BookOpen size={12} />
              Speed Read
            </button>
          </div>
        </div>

        {/* Audio Engine - Only show in Audio Mode */}
        {readerMode === 'audio' && (
          <>
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Audio Engine</span>
                <span className="text-[9px] text-zinc-600 font-mono mt-0.5">
                  {isElevenLabsEnabled ? "PREMIUM (ElevenLabs)" : "Standard (WebTTS)"}
                </span>
              </div>
              <button
                onClick={() => setIsElevenLabsEnabled(!isElevenLabsEnabled)}
                className={cn(
                  "w-10 h-5 rounded-full relative transition-all duration-300 shadow-inner",
                  isElevenLabsEnabled ? "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]" : "bg-zinc-700"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300",
                  isElevenLabsEnabled ? "left-[22px]" : "left-0.5"
                )} />
              </button>
            </div>

            {/* API Key (Only show if ElevenLabs is enabled) */}
            <div className={cn("space-y-2 transition-all duration-300", isElevenLabsEnabled ? "opacity-100" : "opacity-30 pointer-events-none grayscale")}>
              <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                <Power size={10} className={apiKey ? "text-green-500" : "text-zinc-600"} />
                ElevenLabs API Key
              </label>
              <div className="group relative">
                <input
                  type="password"
                  value={localKey}
                  onChange={(e) => setLocalKey(e.target.value)}
                  placeholder="sk_..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[12px] font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-blue-500/50 focus:bg-black/60 transition-all shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)]"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-500" />
              </div>
            </div>

            {/* Kokoro Engine */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 mt-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-wider">Kokoro TTS</span>
                <span className="text-[9px] text-zinc-600 font-mono mt-0.5">
                  Self-Hosted / Local
                </span>
              </div>
              <button
                onClick={() => setIsKokoroEnabled(!isKokoroEnabled)}
                className={cn(
                  "w-10 h-5 rounded-full relative transition-all duration-300 shadow-inner",
                  isKokoroEnabled ? "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]" : "bg-zinc-700"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300",
                  isKokoroEnabled ? "left-[22px]" : "left-0.5"
                )} />
              </button>
            </div>

            {/* Kokoro URL */}
            <div className={cn("space-y-2 transition-all duration-300", isKokoroEnabled ? "opacity-100" : "opacity-30 pointer-events-none grayscale")}>
              <label className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                <Power size={10} className={kokoroUrl ? "text-orange-500" : "text-zinc-600"} />
                Kokoro API URL
              </label>
              <div className="group relative">
                <input
                  type="text"
                  value={localKokoroUrl}
                  onChange={(e) => setLocalKokoroUrl(e.target.value)}
                  placeholder="http://localhost:8880"
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[12px] font-mono text-zinc-300 placeholder:text-zinc-700 focus:outline-none focus:border-orange-500/50 focus:bg-black/60 transition-all shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)]"
                />
                <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/10 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-500" />
              </div>
            </div>
            {/* End Kokoro */}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 p-6 pt-2">
        <button
          onClick={handleSave}
          disabled={isSaved}
          className={cn(
            "w-full py-3.5 rounded-xl text-[11px] font-bold tracking-[0.2em] uppercase transition-all duration-300 relative overflow-hidden group border border-white/5",
            isSaved
              ? "bg-green-500/10 text-green-400 border-green-500/20 cursor-default"
              : "bg-white/5 hover:bg-white/10 text-white shadow-[0_10px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_10px_40px_rgba(59,130,246,0.15)]"
          )}
        >
          <div className="relative z-10 flex items-center justify-center gap-2">
            {isSaved ? (
              <>Saved Config</>
            ) : (
              <>Save Configuration</>
            )}
          </div>
          {/* Button Glow Effect */}
          {!isSaved && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />}
        </button>

        <div className="mt-4 flex justify-between items-center text-[9px] text-zinc-700 font-mono uppercase tracking-wider">
          <span>v2.1.0 PRO</span>
          <div className="flex items-center gap-3">
            <a href="https://buymeacoffee.com/bikiprasad" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-zinc-500 hover:text-yellow-400 transition-colors">
              <Coffee size={10} />
              <span>Support</span>
            </a>
            <span>Audicle</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IndexPopup
