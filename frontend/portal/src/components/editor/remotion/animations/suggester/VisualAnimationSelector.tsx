import { motion } from "framer-motion";
import { Zap, Clock, Layers, Sparkles, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import { type Slide, type Section } from "@/types/slides";

interface VisualAnimationSelectorProps {
    selectedSlide: { slide: Slide; section: Section; };
    onClose: () => void;
    onApply: (animationId: string) => void;
}

interface AnimationSuggestion {
    id: string;
    thumbnail: string;
    name: string;
}

const aiSuggestions: AnimationSuggestion[] = [
    { id: "ai-1", thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=200&h=120&fit=crop", name: "Iceberg Diagram" },
    { id: "ai-2", thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=200&h=120&fit=crop", name: "Flow Chart" },
    { id: "ai-3", thumbnail: "https://images.unsplash.com/photo-1559028012-481c04fa702d?w=200&h=120&fit=crop", name: "Tree Growth" },
    { id: "ai-4", thumbnail: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=200&h=120&fit=crop", name: "Signpost" },
];

const recentAnimations: AnimationSuggestion[] = [
    { id: "recent-1", thumbnail: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=200&h=120&fit=crop", name: "Team Growth" },
    { id: "recent-2", thumbnail: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=200&h=120&fit=crop", name: "Process Flow" },
];

const categories = [
    { id: "mindmap", name: "Mindmap", icon: Layers },
    // { id: "process", name: "Process", icon: ChevronRight }, // Simplified for panel
    { id: "data", name: "Data", icon: Layers },
    { id: "timeline", name: "Timeline", icon: Clock },
];

const VisualAnimationSelector = ({
    selectedSlide,
    onClose,
    onApply,
}: VisualAnimationSelectorProps) => {
    const [script, setScript] = useState(selectedSlide.slide.transcript || "");
    const [references, setReferences] = useState("");
    const [isRegenerating, setIsRegenerating] = useState(false);

    // Update local script if slide changes
    useEffect(() => {
        setScript(selectedSlide.slide.transcript || "");
    }, [selectedSlide.slide.id, selectedSlide.slide.transcript]);

    const handleRegenerate = () => {
        setIsRegenerating(true);
        // Mock API call
        setTimeout(() => {
            setIsRegenerating(false);
        }, 1500);
    };

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold text-sm">Edit Animation</h2>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                    <span className="sr-only">Close</span>
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="w-4 h-4"
                    >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </Button>
            </div>

            <ScrollArea className="flex-1">
                <div className="pl-8 pr-8 pt-4 pb-8 space-y-6">
                    {/* Inputs */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                Script
                            </label>
                            <Textarea
                                value={script}
                                onChange={(e) => setScript(e.target.value)}
                                placeholder="Enter your script..."
                                className="min-h-[100px] text-xs resize-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                References (Optional)
                            </label>
                            <Textarea
                                value={references}
                                onChange={(e) => setReferences(e.target.value)}
                                placeholder="Add context or references..."
                                className="min-h-[60px] text-xs resize-none"
                            />
                        </div>

                        <Button
                            onClick={handleRegenerate}
                            disabled={isRegenerating || !script.trim()}
                            className="w-full gap-2 text-xs"
                            size="sm"
                        >
                            {isRegenerating ? (
                                <>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    >
                                        <Sparkles className="w-3 h-3" />
                                    </motion.div>
                                    Regenerating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-3 h-3" />
                                    Regenerate
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Suggestions */}
                    <div className="space-y-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Zap className="w-3 h-3 text-primary" />
                                <h3 className="text-xs font-semibold">AI Suggestions</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {aiSuggestions.map((anim) => (
                                    <button
                                        key={anim.id}
                                        onClick={() => onApply(anim.id)}
                                        className="group rounded-md overflow-hidden border border-border hover:border-primary/50 transition-all text-left"
                                    >
                                        <div className="aspect-video bg-muted relative">
                                            <img
                                                src={anim.thumbnail}
                                                alt={anim.name}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                        </div>
                                        <p className="text-[10px] p-1.5 truncate font-medium">{anim.name}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <h3 className="text-xs font-semibold">Recent</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {recentAnimations.map((anim) => (
                                    <button
                                        key={anim.id}
                                        onClick={() => onApply(anim.id)}
                                        className="group rounded-md overflow-hidden border border-border hover:border-primary/50 transition-all text-left"
                                    >
                                        <div className="aspect-video bg-muted relative">
                                            <img
                                                src={anim.thumbnail}
                                                alt={anim.name}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                        </div>
                                        <p className="text-[10px] p-1.5 truncate font-medium">{anim.name}</p>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Categories */}
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <Layers className="w-3 h-3 text-muted-foreground" />
                                <h3 className="text-xs font-semibold">Categories</h3>
                            </div>
                            <div className="space-y-1">
                                {categories.map((category) => (
                                    <button
                                        key={category.id}
                                        className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                                    >
                                        <div className="flex items-center gap-2">
                                            <category.icon className="w-3 h-3 text-muted-foreground" />
                                            <span className="text-xs font-medium">{category.name}</span>
                                        </div>
                                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
};

export default VisualAnimationSelector;
