import { motion, AnimatePresence } from "framer-motion"
import { Globe, User } from "lucide-react"
import { useState, useEffect } from "react"
import { cn } from "~lib/utils"

interface SarvamVoiceSelectorProps {
    currentVoiceId: string
    onVoiceSelect: (voiceId: string) => void
    disabled?: boolean
}

const SARVAM_LANGUAGES = [
    { code: "hi-IN", name: "Hindi" },
    { code: "bn-IN", name: "Bengali" },
    { code: "kn-IN", name: "Kannada" },
    { code: "ml-IN", name: "Malayalam" },
    { code: "mr-IN", name: "Marathi" },
    { code: "od-IN", name: "Odia" },
    { code: "pa-IN", name: "Punjabi" },
    { code: "ta-IN", name: "Tamil" },
    { code: "te-IN", name: "Telugu" },
    { code: "gu-IN", name: "Gujarati" },
    { code: "en-IN", name: "English (Indian)" }
]

const SARVAM_SPEAKERS = {
    male: [
        { id: "shubh", name: "Shubh", description: "Conversational, friendly (Default)" },
        { id: "aditya", name: "Aditya", description: "Warm, professional" },
        { id: "rahul", name: "Rahul", description: "Clear, articulate" },
        { id: "rohan", name: "Rohan", description: "Energetic, youthful" },
        { id: "amit", name: "Amit", description: "Calm, reassuring" },
        { id: "dev", name: "Dev", description: "Confident, modern" },
        { id: "ratan", name: "Ratan", description: "Mature, authoritative" },
        { id: "varun", name: "Varun", description: "Dynamic, engaging" },
        { id: "manan", name: "Manan", description: "Conversational, consistent" },
        { id: "sumit", name: "Sumit", description: "Smooth, pleasant" },
        { id: "kabir", name: "Kabir", description: "Deep, commanding" },
        { id: "aayan", name: "Aayan", description: "Gentle, soothing" },
        { id: "ashutosh", name: "Ashutosh", description: "Professional, clear" },
        { id: "advait", name: "Advait", description: "Thoughtful, measured" },
        { id: "anand", name: "Anand", description: "Cheerful, upbeat" },
        { id: "tarun", name: "Tarun", description: "Versatile, natural" },
        { id: "sunny", name: "Sunny", description: "Bright, optimistic" },
        { id: "mani", name: "Mani", description: "Steady, reliable" },
        { id: "gokul", name: "Gokul", description: "Rich, expressive" },
        { id: "vijay", name: "Vijay", description: "Strong, confident" },
        { id: "mohit", name: "Mohit", description: "Friendly, approachable" },
        { id: "rehan", name: "Rehan", description: "Sophisticated, polished" },
        { id: "soham", name: "Soham", description: "Balanced, neutral" }
    ],
    female: [
        { id: "shreya", name: "Shreya", description: "News, authoritative" },
        { id: "ritu", name: "Ritu", description: "Warm, nurturing" },
        { id: "priya", name: "Priya", description: "Sweet, melodious" },
        { id: "neha", name: "Neha", description: "Bright, cheerful" },
        { id: "pooja", name: "Pooja", description: "Gentle, soothing" },
        { id: "simran", name: "Simran", description: "Elegant, refined" },
        { id: "kavya", name: "Kavya", description: "Expressive, vibrant" },
        { id: "ishita", name: "Ishita", description: "Entertainment, dynamic" },
        { id: "roopa", name: "Roopa", description: "Professional, clear" },
        { id: "amelia", name: "Amelia", description: "Modern, cosmopolitan" },
        { id: "sophia", name: "Sophia", description: "Sophisticated, polished" },
        { id: "tanya", name: "Tanya", description: "Energetic, youthful" },
        { id: "shruti", name: "Shruti", description: "Calm, reassuring" },
        { id: "suhani", name: "Suhani", description: "Pleasant, friendly" },
        { id: "kavitha", name: "Kavitha", description: "Articulate, confident" },
        { id: "rupali", name: "Rupali", description: "Versatile, natural" }
    ]
}

const ALL_SPEAKERS = [...SARVAM_SPEAKERS.male, ...SARVAM_SPEAKERS.female]

export const SarvamVoiceSelector = ({ currentVoiceId, onVoiceSelect, disabled }: SarvamVoiceSelectorProps) => {
    const [selectedLanguage, setSelectedLanguage] = useState('hi-IN')
    const [selectedSpeaker, setSelectedSpeaker] = useState('shubh')
    const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
    const [showSpeakerDropdown, setShowSpeakerDropdown] = useState(false)

    // Parse current voice ID to extract language and speaker
    useEffect(() => {
        if (currentVoiceId.startsWith('sarvam-')) {
            const parts = currentVoiceId.replace('sarvam-', '').split('-')
            if (parts.length >= 3) {
                const lang = `${parts[0]}-${parts[1]}`
                const speaker = parts.slice(2).join('-')
                setSelectedLanguage(lang)
                setSelectedSpeaker(speaker)
            }
        }
    }, [currentVoiceId])

    const handleLanguageChange = (langCode: string) => {
        setSelectedLanguage(langCode)
        const newVoiceId = `sarvam-${langCode}-${selectedSpeaker}`
        onVoiceSelect(newVoiceId)
        setShowLanguageDropdown(false)
    }

    const handleSpeakerChange = (speakerId: string) => {
        setSelectedSpeaker(speakerId)
        const newVoiceId = `sarvam-${selectedLanguage}-${speakerId}`
        onVoiceSelect(newVoiceId)
        setShowSpeakerDropdown(false)
    }

    const currentLanguage = SARVAM_LANGUAGES.find(l => l.code === selectedLanguage)
    const currentSpeaker = ALL_SPEAKERS.find(s => s.id === selectedSpeaker)

    return (
        <div className="w-full mt-6 space-y-3">
            {/* Language Selector */}
            <div className="relative w-full">
                <button
                    onClick={() => !disabled && setShowLanguageDropdown(!showLanguageDropdown)}
                    disabled={disabled}
                    className="w-full flex items-center justify-between bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl px-4 py-3 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0">
                            <Globe size={14} className="text-white" />
                        </div>
                        <div className="text-left">
                            <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Language</p>
                            <p className="text-[13px] text-white font-medium">{currentLanguage?.name || 'Select Language'}</p>
                        </div>
                    </div>
                    <div className={cn("text-zinc-600 transition-transform duration-300", showLanguageDropdown ? "rotate-90" : "")}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </div>
                </button>

                <AnimatePresence>
                    {showLanguageDropdown && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: "auto", opacity: 1, marginTop: 8 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            className="overflow-hidden bg-black/60 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl relative z-50"
                        >
                            <div className="p-2">
                                <div className="max-h-[180px] overflow-y-auto custom-scrollbar space-y-1">
                                    {SARVAM_LANGUAGES.map(lang => (
                                        <button
                                            key={lang.code}
                                            onClick={() => handleLanguageChange(lang.code)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] transition-all",
                                                selectedLanguage === lang.code
                                                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            <span className="font-medium text-[13px]">{lang.name}</span>
                                            {selectedLanguage === lang.code && (
                                                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Speaker Selector */}
            <div className="relative w-full">
                <button
                    onClick={() => !disabled && setShowSpeakerDropdown(!showSpeakerDropdown)}
                    disabled={disabled}
                    className="w-full flex items-center justify-between bg-black/40 hover:bg-black/60 border border-white/10 rounded-xl px-4 py-3 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                            <User size={14} className="text-white" />
                        </div>
                        <div className="text-left overflow-hidden">
                            <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Speaker</p>
                            <div className="flex flex-col">
                                <p className="text-[13px] text-white font-medium truncate w-40">
                                    {currentSpeaker?.name || 'Select Speaker'}
                                </p>
                                {currentSpeaker?.description && (
                                    <p className="text-[10px] text-zinc-400 truncate w-40">{currentSpeaker.description}</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className={cn("text-zinc-600 transition-transform duration-300", showSpeakerDropdown ? "rotate-90" : "")}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </div>
                </button>

                <AnimatePresence>
                    {showSpeakerDropdown && (
                        <motion.div
                            initial={{ height: 0, opacity: 0, marginTop: 0 }}
                            animate={{ height: "auto", opacity: 1, marginTop: 8 }}
                            exit={{ height: 0, opacity: 0, marginTop: 0 }}
                            className="overflow-hidden bg-black/60 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl relative z-50"
                        >
                            <div className="p-2">
                                <div className="max-h-[200px] overflow-y-auto custom-scrollbar space-y-1">
                                    {/* Male Speakers */}
                                    <div className="px-2 py-1 text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Male</div>
                                    {SARVAM_SPEAKERS.male.map(speaker => (
                                        <button
                                            key={speaker.id}
                                            onClick={() => handleSpeakerChange(speaker.id)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] transition-all",
                                                selectedSpeaker === speaker.id
                                                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            <div className="flex flex-col text-left gap-0.5">
                                                <span className="font-medium text-[13px]">{speaker.name}</span>
                                                {speaker.description && <span className="text-[10px] text-zinc-500">{speaker.description}</span>}
                                            </div>
                                            {selectedSpeaker === speaker.id && (
                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                            )}
                                        </button>
                                    ))}

                                    {/* Female Speakers */}
                                    <div className="px-2 py-1 text-[10px] text-zinc-500 uppercase tracking-wider font-bold mt-2">Female</div>
                                    {SARVAM_SPEAKERS.female.map(speaker => (
                                        <button
                                            key={speaker.id}
                                            onClick={() => handleSpeakerChange(speaker.id)}
                                            className={cn(
                                                "w-full flex items-center justify-between px-3 py-2 rounded-lg text-[12px] transition-all",
                                                selectedSpeaker === speaker.id
                                                    ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                                                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            <div className="flex flex-col text-left gap-0.5">
                                                <span className="font-medium text-[13px]">{speaker.name}</span>
                                                {speaker.description && <span className="text-[10px] text-zinc-500">{speaker.description}</span>}
                                            </div>
                                            {selectedSpeaker === speaker.id && (
                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
