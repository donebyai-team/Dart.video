import { motion } from "framer-motion";
import { Sparkles, Hash, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect } from "react";
import type {
    TextAnimationTemplate,
    TextAnimationTemplateId,
    TextAnimationTemplatesConfig,
} from "@/types/editor";
import { AnimationSlideContent, Section, Slide } from "@coasterai/pb/coasterai/core/v1/slide_pb";

interface TextAnimationSelectorProps {
    selectedSlide: { slide: Slide; section: Section };
    onClose: () => void;
    onApply: (templateId: TextAnimationTemplateId) => void;
    config: TextAnimationTemplatesConfig;
}

const iconMap = {
    Hash,
    Type,
    Sparkles,
};

const TextAnimationSelector = ({
    selectedSlide,
    onClose,
    onApply,
    config,
}: TextAnimationSelectorProps) => {
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

    const { templates, categoryLabels, categoryIcons } = config;

    const groupedTemplates = templates.reduce((acc, template) => {
        if (!acc[template.category]) {
            acc[template.category] = [];
        }
        acc[template.category].push(template);
        return acc;
    }, {} as Record<string, TextAnimationTemplate[]>);

    const getCategoryIcon = (category: string) => {
        const iconName = categoryIcons[category] as keyof typeof iconMap;
        return iconMap[iconName] || Hash;
    };

    // Get template ID from content (new architecture)
    const textContent = selectedSlide.slide.content.value as AnimationSlideContent
    const currentTemplateId = textContent.templateId

    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold text-sm">Edit Text Animation</h2>
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

                    {/* Templates */}
                    <div className="space-y-6">
                        {Object.entries(groupedTemplates).map(([category, categoryTemplates]) => {
                            const CategoryIcon = getCategoryIcon(category);
                            return (
                                <div key={category}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <CategoryIcon className="w-3 h-3 text-muted-foreground" />
                                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            {categoryLabels[category] || category}
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {categoryTemplates.map((template) => {
                                            const isSelected = currentTemplateId === template.id;
                                            return (
                                                <button
                                                    key={template.id}
                                                    onClick={() => onApply(template.id)}
                                                    className={`group relative text-left rounded-md overflow-hidden border transition-all ${isSelected
                                                        ? "border-primary ring-2 ring-primary/20"
                                                        : "border-border hover:border-primary/50"
                                                        }`}
                                                >
                                                    {/* Preview */}
                                                    <div className={`h-20 ${template.preview} flex items-center justify-center bg-muted/50`}>
                                                        <span className="text-foreground/80 font-bold text-sm drop-shadow-sm">
                                                            {template.name}
                                                        </span>
                                                    </div>
                                                    {/* Selected indicator */}
                                                    {isSelected && (
                                                        <div className="absolute top-2 right-2 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                                                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
                                                                <polyline points="20 6 9 17 4 12"></polyline>
                                                            </svg>
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </ScrollArea>
        </div>
    );
};

export default TextAnimationSelector;
