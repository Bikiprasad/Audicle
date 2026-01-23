import { motion, AnimatePresence } from "framer-motion"
import { useState } from "react"
import { cn } from "~lib/utils"

export const Tooltip = ({ children, text, className }: { children: React.ReactNode, text: string, className?: string }) => {
    const [show, setShow] = useState(false)
    return (
        <div className={cn("relative flex items-center justify-center", className)} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
            {children}
            <AnimatePresence>
                {show && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: -5 }}
                        exit={{ opacity: 0 }}
                        className="absolute bottom-full mb-2 px-2 py-1 bg-black/90 text-white text-[10px] rounded shadow-xl border border-white/10 whitespace-nowrap z-50 pointer-events-none"
                    >
                        {text}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
