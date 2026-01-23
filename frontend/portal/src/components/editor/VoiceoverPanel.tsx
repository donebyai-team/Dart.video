import { useState } from "react";
import { motion } from "framer-motion";
import { Play, Pause, Volume2, Music, Check, RefreshCw, Globe } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useVideoStore } from "@/stores/video";

const voices = [
  { id: "emma", name: "Emma", style: "Warm & Professional", gender: "Female" },
  { id: "james", name: "James", style: "Confident & Clear", gender: "Male" },
  { id: "sarah", name: "Sarah", style: "Friendly & Energetic", gender: "Female" },
  { id: "michael", name: "Michael", style: "Deep & Authoritative", gender: "Male" },
];

const languages = [
  { id: "en-US", name: "English (US)" },
  { id: "en-GB", name: "English (UK)" },
  { id: "es-ES", name: "Spanish" },
  { id: "fr-FR", name: "French" },
  { id: "de-DE", name: "German" },
  { id: "it-IT", name: "Italian" },
  { id: "pt-BR", name: "Portuguese (Brazil)" },
  { id: "ja-JP", name: "Japanese" },
  { id: "ko-KR", name: "Korean" },
  { id: "zh-CN", name: "Chinese (Simplified)" },
  { id: "hi-IN", name: "Hindi" },
  { id: "ar-SA", name: "Arabic" },
];

const musicTracks = [
  { id: "upbeat", name: "Upbeat Corporate", duration: "2:30" },
  { id: "minimal", name: "Minimal Tech", duration: "2:15" },
  { id: "inspiring", name: "Inspiring Journey", duration: "2:45" },
];

const VoiceoverPanel = () => {
  const open = useVideoStore(s => s.showVoiceover);
  const onOpenChange = useVideoStore(s => s.setShowVoiceover);

  const [selectedVoice, setSelectedVoice] = useState("emma");
  const [selectedLanguage, setSelectedLanguage] = useState("en-US");
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [voiceVolume, setVoiceVolume] = useState([80]);
  const [musicVolume, setMusicVolume] = useState([30]);

  const script = `What if you could ship product videos in hours, not weeks?

Product marketing managers waste 6 to 8 weeks coordinating with agencies for a simple explainer video.

Introducing Explainer — AI-powered video creation built for product marketers.

With template-based editing, you think in slides, not timelines. And with AI animations, just describe what you want and get professional motion graphics instantly.

Already trusted by over 500 product marketing managers at companies like Notion, Figma, and Linear.

Start your free video today. No credit card required.`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Voiceover & Audio
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-8">
          {/* Full Script */}
          <div>
            <h3 className="font-semibold mb-3">Generated Script</h3>
            <div className="bg-muted rounded-xl p-4 text-sm leading-relaxed max-h-[200px] overflow-y-auto">
              {script}
            </div>
            <Button variant="outline" size="sm" className="mt-3 gap-2">
              <RefreshCw className="w-4 h-4" />
              Regenerate script
            </Button>
          </div>

          {/* Language Selection */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Language
            </h3>
            <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang.id} value={lang.id}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Voice Selection */}
          <div>
            <h3 className="font-semibold mb-3">AI Voice</h3>
            <div className="grid grid-cols-2 gap-3">
              {voices.map((voice, index) => (
                <motion.button
                  key={voice.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`p-4 rounded-xl text-left transition-all ${selectedVoice === voice.id
                    ? "bg-primary/10 ring-2 ring-primary"
                    : "bg-muted hover:bg-muted/80"
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{voice.name}</span>
                    {selectedVoice === voice.id && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{voice.style}</p>
                </motion.button>
              ))}
            </div>

            {/* Voice volume */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Voice volume</Label>
                <span className="text-sm text-muted-foreground">{voiceVolume[0]}%</span>
              </div>
              <Slider
                value={voiceVolume}
                onValueChange={setVoiceVolume}
                max={100}
                step={1}
              />
            </div>

            {/* Preview */}
            <Button
              variant="outline"
              className="w-full mt-4 gap-2"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              Preview voiceover
            </Button>
          </div>

          {/* Background Music */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Music className="w-4 h-4" />
                Background Music
              </h3>
              <Switch
                checked={musicEnabled}
                onCheckedChange={setMusicEnabled}
              />
            </div>

            {musicEnabled && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-3"
              >
                {musicTracks.map((track, index) => (
                  <motion.button
                    key={track.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => setSelectedMusic(track.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all ${selectedMusic === track.id
                      ? "bg-primary/10 ring-2 ring-primary"
                      : "bg-muted hover:bg-muted/80"
                      }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center">
                      <Music className="w-4 h-4 text-accent" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{track.name}</p>
                      <p className="text-xs text-muted-foreground">{track.duration}</p>
                    </div>
                    {selectedMusic === track.id && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </motion.button>
                ))}

                {/* Music volume */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Music volume</Label>
                    <span className="text-sm text-muted-foreground">{musicVolume[0]}%</span>
                  </div>
                  <Slider
                    value={musicVolume}
                    onValueChange={setMusicVolume}
                    max={100}
                    step={1}
                  />
                </div>
              </motion.div>
            )}
          </div>

          <Button onClick={() => onOpenChange(false)} className="w-full btn-primary-gradient">
            Apply audio settings
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default VoiceoverPanel;
