import { Wand2 } from "lucide-react";
import { BackgroundEffectType } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { Button } from "@/components/ui/button";

const EFFECT_OPTIONS: { value: BackgroundEffectType; label: string; description: string }[] = [
  {
    value: BackgroundEffectType.NONE,
    label: "None",
    description: "Use the normal CSS background only.",
  },
  {
    value: BackgroundEffectType.AURORA,
    label: "Aurora",
    description: "Soft moving white glow wash.",
  },
  {
    value: BackgroundEffectType.GLOW,
    label: "Glow",
    description: "Breathing ambient light bloom.",
  },
  {
    value: BackgroundEffectType.SWEEP,
    label: "Sweep",
    description: "Slow light sweep across the frame.",
  },
];

interface BackgroundEffectsPickerProps {
  value: BackgroundEffectType;
  disabled?: boolean;
  onChange: (effect: BackgroundEffectType) => void;
}

export default function BackgroundEffectsPicker({
  value,
  disabled = false,
  onChange,
}: BackgroundEffectsPickerProps) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-3">
      <div className="flex items-start gap-2">
        <Wand2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Effects</p>
          <p className="text-xs text-muted-foreground">
            Applies with the selected solid color.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {EFFECT_OPTIONS.map((option) => {
          const isActive = value === option.value;
          return (
            <Button
              key={option.value}
              type="button"
              variant={isActive ? "secondary" : "outline"}
              className="h-auto items-start justify-start px-3 py-2 text-left"
              disabled={disabled}
              onClick={() => onChange(option.value)}
            >
              <div>
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-[11px] text-muted-foreground whitespace-normal">
                  {option.description}
                </div>
              </div>
            </Button>
          );
        })}
      </div>

      {disabled && (
        <p className="text-[11px] text-muted-foreground">
          Effects are available only for solid backgrounds in v1.
        </p>
      )}
    </div>
  );
}
