import { useState } from "react";
import {
    Image as ImageIcon,
    Film,
    Clock,
    Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


/* ---------------- Video Intent Composer Component ---------------- */

const RESOLUTIONS = [
    { label: "Landscape (1920x1080)", value: "1920x1080" },
    { label: "Square (1080x1080)", value: "1080x1080" },
    { label: "Portrait (1080x1920)", value: "1080x1920" },
];

const DURATIONS = [
    { label: "60s", value: "5" },
    { label: "90s", value: "10" },
];

const VideoIntentComposer = () => {
    const [prompt, setPrompt] = useState("");
    const [resolution, setResolution] = useState("1920x1080");
    const [duration, setDuration] = useState("5");

    return (
        <div className="w-full min-h-[70vh] flex flex-col items-center justify-center">

            {/* Header */}
            <div className="w-full max-w-3xl mb-8 text-center">
                <h1 className="text-3xl font-bold">Your AI video designer</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your videos and create new content
                </p>
            </div>
            <Card className="
  mb-8
  border-0
  shadow-lg
  rounded-2xl
  bg-gradient-to-b from-background to-muted/40
  w-full
  max-w-3xl
  mx-auto
">

                <CardContent className="p-6">
                    <div className="flex flex-col gap-4">
                        {/* Top Controls */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Film className="w-6 h-6" />
                                <Select value={resolution} onValueChange={setResolution}>
                                    <SelectTrigger className="h-8 text-xs bg-background">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {RESOLUTIONS.map((r) => (
                                            <SelectItem key={r.value} value={r.value}>
                                                {r.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

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

                        {/* Prompt Box */}
                        <div className="relative">
                            <div className="rounded-2xl border bg-background shadow-sm focus-within:ring-2 focus-within:ring-primary/30 transition">
                                {/* Tabs Row */}
                                <div className="flex items-center gap-4 px-4 pt-3 pb-2 text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2 hover:text-foreground cursor-pointer">
                                        <ImageIcon className="w-3.5 h-3.5" />
                                        Image reference
                                    </div>
                                    <div className="flex items-center gap-2 hover:text-foreground cursor-pointer">
                                        <Film className="w-3.5 h-3.5" />
                                        Video reference
                                    </div>
                                </div>

                                {/* Text Area */}
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Create a cinematic product launch video with floating UI elements and soft lighting..."
                                    className="w-full min-h-[140px] resize-none bg-transparent px-4 pb-16 pt-2 text-sm focus:outline-none"
                                />

                                {/* Bottom Toolbar */}
                                <div className="absolute bottom-2 right-2 flex items-center justify-end">
                                    <Button className="btn-accent-gradient h-9 w-9 rounded-xl flex items-center justify-center">
                                        <Sparkles className="w-2 h-2" />
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

