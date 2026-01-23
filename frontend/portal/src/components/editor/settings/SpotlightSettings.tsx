import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import type { CanvasObject } from "@/types/slides";

interface SpotlightSettingsProps {
  settings: Partial<CanvasObject>;
  onChange: <K extends keyof CanvasObject>(key: K, value: CanvasObject[K]) => void;
  slideDuration?: number;
  slideStartTime?: number;
  onPlay?: () => void;
}

const SpotlightSettings = ({
  settings,
  onChange,
  slideDuration = 5,
  slideStartTime = 0,
  onPlay
}: SpotlightSettingsProps) => {
  const spotlightStart = settings.spotlightStartTime ?? 0;
  const spotlightEnd = settings.spotlightEndTime ?? slideDuration;

  return (
    <div className="space-y-4">
      {/* Blur Settings */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Blur Effect</Label>
        <div className="flex items-center gap-2">
          <Label className="text-xs w-16">Amount</Label>
          <Slider
            value={[settings.blurAmount || 10]}
            onValueChange={(values) => onChange("blurAmount", values[0])}
            min={0}
            max={30}
            step={1}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-10">{settings.blurAmount || 10}px</span>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs w-16">Radius</Label>
          <Slider
            value={[settings.borderRadius || 8]}
            onValueChange={(values) => onChange("borderRadius", values[0])}
            min={0}
            max={50}
            step={2}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-10">{settings.borderRadius || 8}px</span>
        </div>
      </div>

      {/* Timing Section */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Timing (Slide: 0s - {slideDuration.toFixed(1)}s)
        </Label>
        <div className="flex items-center gap-2">
          <Label className="text-xs w-16">Start</Label>
          <Slider
            value={[spotlightStart]}
            onValueChange={(values) => onChange("spotlightStartTime", values[0])}
            min={0}
            max={slideDuration}
            step={0.1}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-10">{spotlightStart.toFixed(1)}s</span>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs w-16">End</Label>
          <Slider
            value={[spotlightEnd]}
            onValueChange={(values) => onChange("spotlightEndTime", values[0])}
            min={spotlightStart}
            max={slideDuration}
            step={0.1}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-10">{spotlightEnd.toFixed(1)}s</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Duration: {(spotlightEnd - spotlightStart).toFixed(1)}s
        </p>
      </div>

      {/* Action Button */}
      <div className="pt-2">
        <Button
          variant="default"
          size="sm"
          className="w-full gap-2"
          onClick={onPlay}
        >
          <Play className="w-3.5 h-3.5" />
          Preview
        </Button>
      </div>
    </div>
  );
};

export default SpotlightSettings;
