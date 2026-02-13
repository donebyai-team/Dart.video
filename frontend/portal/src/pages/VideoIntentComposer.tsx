"use client"

import { useState } from "react";
import {
    Image as ImageIcon,
    Film,
    Clock,
    Sparkles,
    TextIcon,
    X,
    Palette,
    LanguagesIcon
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Script } from "@coasterai/pb/coasterai/core/v1/video_pb";
import ScriptEditorDialog from "@/components/dashboard/ScriptEditorDialog";
import { useClientsContext } from "@coasterai/ui-core/context/ClientContext";
import { getConnectError } from "@/utils/error";
import toast from "react-hot-toast";
import defaultEditorConfig from "@/data/editorConfig";
import { useRouter } from "next/navigation";
import { getDefaultResolution } from "@/stores/video/defaults";


/* ---------------- Video Intent Composer Component ---------------- */

const DURATIONS = [
    { label: "60s", value: "60" },
    { label: "90s", value: "90" },
];

const LANGUAGES = [
    { label: "English(UK)", value: "en" },
];

const brandLibraries = [
    { id: "brand1", name: "Acme Brand" },
    { id: "brand2", name: "Dark Mode Brand" },
];

const NO_BRAND_VALUE = "none";



const MIN_SCRIPT_SECTIONS = 3;
const MIN_PROMPT_LENGTH = 10;

const VideoIntentComposer = () => {
    const [prompt, setPrompt] = useState("");
    const [resolutionId, setResolutionId] = useState(defaultEditorConfig.resolution.default);
    const [selectedBrandLibraryId, setSelectedBrandLibraryId] =
        useState<string | undefined>();

    const [duration, setDuration] = useState("60");
    const [language, setLanguage] = useState("en");
    const [scriptDialogOpen, setScriptDialogOpen] = useState(false);
    const [script, setScript] = useState<Script | undefined>();
    const hasScript = !!script?.items?.length;
    const router = useRouter();
    const { portalClient } = useClientsContext();

    const [isSubmitting, setIsSubmitting] = useState(false);
    const removeScript = () => {
        setScript(undefined);
    };

    const handleSubmit = async () => {
        if (!canGenerate || isSubmitting) return;

        try {
            setIsSubmitting(true);
            const selectedResolution =
                defaultEditorConfig.resolution.options.find(
                    r => r.id === resolutionId
                ) ?? getDefaultResolution(defaultEditorConfig);

            const res = await portalClient.createVideo({
                prompt: prompt,
                script: script,
                resolution: selectedResolution,
                duration: Number(duration),
            });

            router.push(`/editor/${res.id}`);

        } catch (err: any) {
            toast.error(getConnectError(err));
        } finally {
            setIsSubmitting(false);
        }
    };


    const scriptVoiceoverCount =
        script?.items?.filter(i => i.voiceover?.trim()).length ?? 0;

    const hasValidScript = scriptVoiceoverCount >= MIN_SCRIPT_SECTIONS;

    const hasPrompt = prompt.trim().length > MIN_PROMPT_LENGTH;

    const canGenerate = hasPrompt || hasValidScript;

    return (
        <div className="w-full min-h-[70vh] flex flex-col items-center justify-center">
            <ScriptEditorDialog
                open={scriptDialogOpen}
                onOpenChange={setScriptDialogOpen}
                initialScript={script}
                onSave={(s: Script) => setScript(s)}
            />

            {/* Header */}
            <div className="w-full max-w-3xl mb-8 mt-[10%] text-center">
                <h1 className="text-3xl font-bold">Your AI video designer</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your videos and create new content
                </p>
            </div>
            <Card className="mb-8 border-0 shadow-lg rounded-2xl bg-gradient-to-b from-background to-muted/40 w-full max-w-3xl mx-auto">

                <CardContent className="p-6">
                    <div className="flex flex-col gap-4">
                        {/* Top Controls */}
                        <div className="flex items-center justify-between text-sm text-muted-foreground">

                            {/* LEFT SIDE */}
                            <div className="flex items-center gap-4">

                                {/* Resolution */}
                                <div className="flex items-center gap-2">
                                    <Film className="w-6 h-6" />

                                    <Select value={resolutionId} onValueChange={setResolutionId}>
                                        <SelectTrigger className="h-8 text-xs bg-background">
                                            <SelectValue />
                                        </SelectTrigger>

                                        <SelectContent>
                                            {defaultEditorConfig.resolution.options.map((r) => (
                                                <SelectItem key={r.id} value={r.id}>
                                                    {r.name} ({r.height}x{r.width})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Duration */}
                                <div className="flex items-center gap-2">
                                    <Clock className="w-6 h-6" />

                                    <Select value={duration} onValueChange={setDuration}>
                                        <SelectTrigger className="h-8 text-xs bg-background">
                                            <SelectValue />
                                        </SelectTrigger>

                                        <SelectContent>
                                            {DURATIONS.map((d) => (
                                                <SelectItem key={d.value} value={d.value}>
                                                    {d.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                            </div>

                            {/* RIGHT SIDE — LANGUAGE */}
                            <div className="flex items-center gap-2">
                                <LanguagesIcon className="w-6 h-6" />

                                <Select value={language} onValueChange={setLanguage}>
                                    <SelectTrigger className="h-8 text-xs bg-background">
                                        <SelectValue />
                                    </SelectTrigger>

                                    <SelectContent>
                                        {LANGUAGES.map((d) => (
                                            <SelectItem key={d.value} value={d.value}>
                                                {d.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Prompt Box */}
                        <div className="relative">
                            <div className="rounded-2xl border bg-background shadow-sm focus-within:ring-2 focus-within:ring-primary/30 transition overflow-hidden">

                                {/* Tabs Row */}
                                <div className="flex items-center gap-2 px-4 pt-3 pb-2 text-xs text-muted-foreground">
                                    <div
                                        className="flex items-center gap-1.5 hover:text-foreground cursor-pointer"
                                        onClick={() => setScriptDialogOpen(true)}
                                    >
                                        <TextIcon className="w-3.5 h-3.5" />
                                        {hasScript ? "Edit Script" : "Add Script"}
                                    </div>

                                    {/* Brand library */}
                                    <div className="flex items-center gap-1.5">

                                        <Select
                                            value={selectedBrandLibraryId ?? NO_BRAND_VALUE}
                                            onValueChange={(v) =>
                                                setSelectedBrandLibraryId(
                                                    v === NO_BRAND_VALUE ? undefined : v
                                                )
                                            }
                                        >

                                            <SelectTrigger
                                                className="
    h-8 text-xs bg-background min-w-[120px]
    flex items-center gap-1
    border border-transparent
    focus:ring-0 focus-visible:ring-0
    focus:outline-none focus-visible:outline-none
    ring-0 ring-offset-0
    shadow-none
  "
                                            >

                                                <Palette className="w-3.5 h-3.5 opacity-70" />
                                                <SelectValue placeholder="Select brand library" />
                                            </SelectTrigger>

                                            <SelectContent>

                                                {/* ONLY ONE "NONE" OPTION */}
                                                <SelectItem value={NO_BRAND_VALUE}>
                                                    Select brand
                                                </SelectItem>

                                                {brandLibraries.map((b) => (
                                                    <SelectItem key={b.id} value={b.id}>
                                                        {b.name}
                                                    </SelectItem>
                                                ))}

                                            </SelectContent>

                                        </Select>

                                    </div>


                                </div>

                                {/* ⭐ Script Attached Indicator */}
                                {hasScript && (
                                    <div
                                        onClick={() => setScriptDialogOpen(true)}
                                        className="
          mx-4 mb-2 flex items-center justify-between
          rounded-xl border bg-primary/5 border-primary/20
          px-3 py-2 text-xs cursor-pointer
          hover:bg-primary/10 transition
        "
                                    >
                                        <div className="flex items-center gap-2 text-primary">
                                            <span className="font-medium">
                                                Script added
                                            </span>
                                            <span className="text-muted-foreground">
                                                • {scriptVoiceoverCount} sections
                                            </span>
                                        </div>

                                        {/* Right Actions */}
                                        <div className="flex items-center gap-2">
                                            <span className="text-muted-foreground text-xs hidden sm:block">
                                                Click to edit
                                            </span>

                                            {/* Remove Script */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();   // ⭐ Prevent opening dialog
                                                    removeScript();
                                                }}
                                                className="
          p-1 rounded-md
          hover:bg-destructive/10
          hover:text-destructive
          transition
        "
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>

                                        </div>
                                    </div>
                                )}

                                {/* Text Area */}
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder={
                                        hasScript
                                            ? "Add additional instructions or style notes (optional)..."
                                            : "Create a cinematic product launch video with floating UI elements and soft lighting..."
                                    }
                                    className="w-full min-h-[140px] resize-none bg-transparent px-4 pb-16 pt-2 text-sm focus:outline-none"
                                />

                                {/* Bottom Toolbar */}
                                <div className="absolute bottom-2 right-2 flex items-center justify-end">
                                    <Button
                                        onClick={handleSubmit}
                                        className="btn-accent-gradient h-9 w-9 rounded-xl flex items-center justify-center"
                                        disabled={!canGenerate}
                                    >
                                        {isSubmitting ? (
                                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <Sparkles className="w-2 h-2" />
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </div>

                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default VideoIntentComposer;

