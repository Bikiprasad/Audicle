import { useState, useEffect } from "react"
import { useSettings } from "~hooks/useSettings"
import { getVoices, type Voice } from "~services/elevenlabs"
import { Loader2, RefreshCw, Power } from "lucide-react"
import { cn } from "~lib/utils"
import "./style.css"

function IndexPopup() {
  const { apiKey, voiceId, showOverlay, setApiKey, setVoiceId, setShowOverlay } = useSettings()
  const [localKey, setLocalKey] = useState("")
  const [isSaved, setIsSaved] = useState(false)

  // Voice State
  const [voices, setVoices] = useState<Voice[]>([])
  const [isLoadingVoices, setIsLoadingVoices] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)

  useEffect(() => {
    if (apiKey) setLocalKey(apiKey)
  }, [apiKey])

  // Fetch voices when API key is set or saved
  useEffect(() => {
    if (apiKey) {
      fetchVoices(apiKey)
    }
  }, [apiKey])

  const fetchVoices = async (key: string) => {
    setIsLoadingVoices(true)
    setVoiceError(null)
    try {
      const fetched = await getVoices(key)
      setVoices(fetched)
    } catch (e: any) {
      setVoiceError("Failed to load voices. Check API Key.")
      console.error(e)
    } finally {
      setIsLoadingVoices(false)
    }
  }

  const handleSave = () => {
    setApiKey(localKey)
    setIsSaved(true)
    setTimeout(() => setIsSaved(false), 2000)
    // Trigger voice fetch on save
    if (localKey) fetchVoices(localKey)
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
      <div className="relative z-10 flex-1 px-6 py-4 space-y-6">

        {/* API Key */}
        <div className="space-y-2">
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

        {/* Voice Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
              Voice Persona
            </label>
            <button
              onClick={() => fetchVoices(apiKey || localKey)}
              disabled={isLoadingVoices}
              className="text-[10px] text-zinc-600 hover:text-white transition-colors flex items-center gap-1 group"
            >
              <RefreshCw size={10} className={cn("group-hover:rotate-180 transition-transform duration-500", isLoadingVoices ? "animate-spin" : "")} />
              {isLoadingVoices ? "SYNCING..." : "SYNC"}
            </button>
          </div>

          <div className="relative group">
            <select
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              disabled={isLoadingVoices || voices.length === 0}
              className="w-full appearance-none bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-[12px] font-medium text-zinc-300 focus:outline-none focus:border-blue-500/50 focus:bg-black/60 transition-all shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)]"
            >
              {voices.length === 0 && <option value={voiceId}>Select Voice...</option>}
              {voices.map(v => (
                <option key={v.voice_id} value={v.voice_id} className="bg-neutral-900 text-zinc-300">
                  {v.name}
                </option>
              ))}
            </select>
            {/* Custom Arrow */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-600 group-hover:text-zinc-400 transition-colors">
              {isLoadingVoices ? (
                <Loader2 size={14} className="animate-spin text-blue-500" />
              ) : (
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="opacity-60"><path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </div>
          </div>
          {voiceError && (
            <div className="text-[10px] text-red-400 font-mono mt-1 bg-red-900/10 border border-red-500/10 p-1.5 rounded text-center">
              {voiceError}
            </div>
          )}
        </div>

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
          <span>v2.0.0 PRO</span>
          <span>Audicle</span>
        </div>
      </div>
    </div>
  )
}

export default IndexPopup
