import { useRef } from "react";
import { Check, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { transitions } from "@/types/slides";

interface TransitionPickerProps {
    currentTransitionId: string;
    isOpen: boolean;
    onToggle: () => void;
    onSelect: (transitionId: string) => void;
    onClose: () => void;
}

const TransitionPicker = ({
    currentTransitionId,
    isOpen,
    onToggle,
    onSelect,
    onClose,
}: TransitionPickerProps) => {
    const currentTransition = transitions.find((t) => t.id === currentTransitionId);

    return (
        <div className="relative flex items-center justify-center py-1">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                }}
                className={`relative z-10 flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium transition-colors ${isOpen
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-muted/80 text-muted-foreground"
                    }`}
            >
                <div className={`w-2 h-2 rounded-sm ${currentTransition?.preview || "bg-muted"}`} />
                {currentTransition?.name || "Transition"}
            </button>

            {isOpen && <div className="fixed inset-0 z-40" onClick={onClose} />}

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute top-full mt-1 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-lg shadow-xl p-2 min-w-[140px]"
                    >
                        <div className="space-y-0.5">
                            {transitions.map((t) => (
                                <button
                                    key={t.id}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onSelect(t.id);
                                    }}
                                    className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${currentTransitionId === t.id
                                            ? "bg-primary/10 text-primary"
                                            : "hover:bg-muted text-foreground"
                                        }`}
                                >
                                    <div className={`w-4 h-4 rounded-sm ${t.preview}`} />
                                    <span className="flex-1 text-left">{t.name}</span>
                                    {currentTransitionId === t.id && <Check className="w-3 h-3" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TransitionPicker;
