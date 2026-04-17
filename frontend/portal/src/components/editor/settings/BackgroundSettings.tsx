import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { create } from "@bufbuild/protobuf";


import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import BrandColors from "@/components/editor/settings/BrandColors";
import BackgroundEffectsPicker from "@/components/editor/settings/BackgroundEffectsPicker";
import { DualColorPicker } from "@/components/editor/animation/toolbars/stylers/DualColorPicker";
import { backgroundStyleToCSS } from '@coasterai/renderer';
import { BackgroundStyle, Gradient, GradientSchema, GradientType, GradientStopSchema, BackgroundStyleSchema, BackgroundPattern, BackgroundEffectSchema, BackgroundEffectType } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { gradientToCSS, patternToCSS, PATTERN_OPTIONS } from "@coasterai/renderer/src/backgroundUtils";

interface BackgroundSettingsProps {
  value?: BackgroundStyle | null;
  onChange: (style: BackgroundStyle) => void;
  onClose: () => void;
}

/* ---------------- SOLID PRESETS ---------------- */

const solidPresets = [
  "#0f172a", "#1e293b", "#18181b", "#262626",
  "#4f46e5", "#7c3aed", "#3b82f6", "#06b6d4",
  "#14b8a6", "#10b981", "#22c55e", "#eab308",
  "#f97316", "#ef4444", "#ec4899", "#f43f5e",
];

/* ---------------- MODERN GRADIENT PRESETS ---------------- */

const modernGradients = [
  ["#0f172a", "#1e293b"],        // Midnight
  ["#6366f1", "#8b5cf6"],        // Aurora
  ["#ec4899", "#f43f5e"],        // Candy
  ["#06b6d4", "#3b82f6"],        // Sky
  ["#10b981", "#84cc16"],        // Lime
  ["#f97316", "#ef4444"],        // Sunset
  ["#f59e0b", "#eab308"],        // Gold
  ["#7c3aed", "#4f46e5"],        // Cosmic
  ["#14b8a6", "#0ea5e9"],        // Ocean
  ["#f43f5e", "#f59e0b"],        // Rose Gold
];

/* ---------------- HELPERS ---------------- */

function buildGradient(c1: string, c2: string, angle: number): Gradient {
  return create(GradientSchema, {
    type: GradientType.LINEAR,
    angle,
    stops: [
      create(GradientStopSchema, { color: c1, position: 0 }),
      create(GradientStopSchema, { color: c2, position: 100 }),
    ],
  });
}

export { backgroundStyleToCSS };

function buildBackgroundEffect(type: BackgroundEffectType) {
  if (type === BackgroundEffectType.NONE) {
    return undefined;
  }

  return create(BackgroundEffectSchema, { type });
}

/* ---------------- COMPONENT ---------------- */

export default function BackgroundSettings({
  value,
  onChange,
  onClose,
}: BackgroundSettingsProps) {
  /* ---------- SAFE DEFAULT ---------- */

  const safeValue =
    value ??
    create(BackgroundStyleSchema, {
      style: { case: "solid", value: { hex: "transparent" } },
      applyAll: false,
    });

  const activeCase = safeValue.style?.case;
  const activeEffectType = safeValue.effect?.type ?? BackgroundEffectType.NONE;

  /* ---------- CUSTOM GRADIENT STATE ---------- */

  const initialGradient =
    activeCase === "gradient"
      ? safeValue.style?.value
      : buildGradient("#6366f1", "#8b5cf6", 135);

  const [gradientColor1, setGradientColor1] = useState(
    initialGradient.stops[0]?.color ?? "#6366f1"
  );
  const [gradientColor2, setGradientColor2] = useState(
    initialGradient.stops[1]?.color ?? "#8b5cf6"
  );
  const [gradientAngle, setGradientAngle] = useState(
    initialGradient.angle ?? 135
  );

  /* ---------- PATTERN STATE ---------- */
  const [patternOpacity, setPatternOpacity] = useState(
    safeValue.patternOpacity ?? 0.1
  );

  /* ---------- UPDATE HELPERS ---------- */
  const updateStyle = (
    styleCase: "solid" | "gradient",
    styleValue: any
  ) => {
    const updated = create(BackgroundStyleSchema, {
      style: { case: styleCase, value: styleValue },
      applyAll: safeValue.applyAll ?? false,
      pattern: safeValue.pattern,
      patternOpacity: safeValue.patternOpacity,
      effect: styleCase === "solid" ? safeValue.effect : undefined,
    });

    onChange(updated);
  };


  const updateApplyAll = (checked: boolean) => {
    const updated = create(BackgroundStyleSchema, {
      style: safeValue.style,
      applyAll: checked,
      pattern: safeValue.pattern,
      patternOpacity: safeValue.patternOpacity,
      effect: safeValue.effect,
    });

    console.debug("[Update apply all]", updated)
    onChange(updated);
  };

  const updatePattern = (pattern: BackgroundPattern) => {
    console.log('[updatePattern] setting pattern:', pattern, 'opacity:', patternOpacity);
    const updated = create(BackgroundStyleSchema, {
      style: safeValue.style,
      applyAll: safeValue.applyAll ?? false,
      pattern,
      patternOpacity,
      effect: safeValue.effect,
    });
    console.log('[updatePattern] created:', updated.pattern, updated.patternOpacity);
    onChange(updated);
  };

  const updatePatternOpacity = (opacity: number) => {
    setPatternOpacity(opacity);
    const updated = create(BackgroundStyleSchema, {
      style: safeValue.style,
      applyAll: safeValue.applyAll ?? false,
      pattern: safeValue.pattern,
      patternOpacity: opacity,
      effect: safeValue.effect,
    });
    onChange(updated);
  };

  const customGradient = useMemo(
    () => buildGradient(gradientColor1, gradientColor2, gradientAngle),
    [gradientColor1, gradientColor2, gradientAngle]
  );

  const updateEffect = (effectType: BackgroundEffectType) => {
    if (activeCase !== "solid") {
      return;
    }

    onChange(
      create(BackgroundStyleSchema, {
        style: safeValue.style,
        applyAll: safeValue.applyAll ?? false,
        pattern: safeValue.pattern,
        patternOpacity: safeValue.patternOpacity,
        effect: buildBackgroundEffect(effectType),
      })
    );
  };

  /* ---------- RENDER ---------- */

  return (
    <div className="h-full flex flex-col bg-card pb-10">
      {/* Header */}
      <div className="flex items-center justify-between px-5  border-b border-border">
        <h3 className="font-semibold text-sm tracking-tight">
          Background
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">

        {/* Apply to all */}
        <div className="flex items-center justify-between">
          <Label className="text-sm">Apply to all slides</Label>
          <Switch
            checked={safeValue.applyAll ?? false}
            onCheckedChange={updateApplyAll}
          />
        </div>

        <BrandColors
          selectedColor={activeCase === "solid" ? safeValue.style?.value.hex : undefined}
          onSelect={(color) => updateStyle("solid", { hex: color })}
        />

        {/* SOLID */}
        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Solid
          </p>

          <div className="grid grid-cols-10 gap-1">
            {solidPresets.map((color) => {

              const isActive =
                activeCase === "solid" &&
                safeValue.style?.value.hex?.toLowerCase() === color.toLowerCase();
              return (
                <button
                  key={color}
                  onClick={() => updateStyle("solid", { hex: color })}
                  className={`w-6 h-6 rounded-md  transition-all duration-200 hover:scale-110
            ${isActive ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : ""}
          `}
                  style={{ backgroundColor: color }}
                />
              );
            })}
          </div>

          <DualColorPicker
            primaryColor={activeCase === "solid" ? safeValue.style?.value.hex : "#0f172a"}
            onPrimaryColor={(color) => updateStyle("solid", { hex: color })}
            primaryLabel="Color"
          />

          <BackgroundEffectsPicker
            value={activeEffectType}
            disabled={activeCase !== "solid"}
            onChange={updateEffect}
          />
        </div>


        {/* GRADIENT PRESETS */}
        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Gradients
          </p>

          <div className="grid grid-cols-10 gap-1">
            {modernGradients.map(([c1, c2], i) => {
              const preset = buildGradient(c1, c2, 135);

              const isActive =
                activeCase === "gradient" &&
                safeValue.style?.value?.angle === preset.angle &&
                safeValue.style?.value?.stops?.[0]?.color === preset.stops[0].color &&
                safeValue.style?.value?.stops?.[1]?.color === preset.stops[1].color;

              return (
                <button
                  key={i}
                  onClick={() => updateStyle("gradient", preset)}
                  className={`w-6 h-6 rounded-md transition-all duration-200 hover:scale-110
            ${isActive ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : ""}
          `}
                  style={{ background: gradientToCSS(preset) }}
                />
              );
            })}
          </div>
        </div>


        {/* ---------------- CUSTOM GRADIENT BUILDER ---------------- */}
        <div className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Custom Gradient
          </p>

          {/* Compact Card */}
          <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-3">

            {/* Small Preview */}
            <div
              className="h-10 rounded-lg"
              style={{ background: gradientToCSS(customGradient) }}
            />

            {/* Controls Row */}
            <div className="flex items-center gap-3">

              {/* Color 1 */}
              <input
                type="color"
                value={gradientColor1}
                onChange={(e) => setGradientColor1(e.target.value)}
                className="w-8 h-8 rounded-md border border-border cursor-pointer bg-transparent"
              />

              {/* Color 2 */}
              <input
                type="color"
                value={gradientColor2}
                onChange={(e) => setGradientColor2(e.target.value)}
                className="w-8 h-8 rounded-md border border-border cursor-pointer bg-transparent"
              />

              {/* Angle Compact */}
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={gradientAngle}
                  onChange={(e) => setGradientAngle(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-[11px] text-muted-foreground w-8 text-right">
                  {gradientAngle}°
                </span>
              </div>

              {/* Small Apply */}
              <Button
                size="sm"
                onClick={() => updateStyle("gradient", customGradient)}
              >
                Apply
              </Button>

            </div>
          </div>
        </div>

        {/* ---------------- PATTERN OVERLAY ---------------- */}
        <div className="space-y-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Pattern Overlay
          </p>

          {/* Pattern Grid */}
          <div className="grid grid-cols-5 gap-2">
            {PATTERN_OPTIONS.map((option) => {
              const isActive = safeValue.pattern === option.value;
              const previewBg = option.value === BackgroundPattern.NONE
                ? 'transparent'
                : patternToCSS(option.value, '#ffffff', 0.5);

              return (
                <button
                  key={option.value}
                  onClick={() => updatePattern(option.value)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all duration-200 hover:border-primary/50
                    ${isActive ? "border-primary ring-1 ring-primary bg-primary/5" : "border-border bg-muted/20"}
                  `}
                >
                  <div
                    className="w-8 h-8 rounded bg-slate-800"
                    style={{
                      backgroundImage: previewBg,
                      backgroundRepeat: 'repeat',
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Pattern Customization */}
          {safeValue.pattern != null && safeValue.pattern !== BackgroundPattern.NONE && (
            <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-3">
              {/* Pattern Opacity */}
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Opacity</Label>
                <input
                  type="range"
                  min="0.01"
                  max="0.5"
                  step="0.01"
                  value={patternOpacity}
                  onChange={(e) => updatePatternOpacity(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-[11px] text-muted-foreground w-8 text-right">
                  {Math.round(patternOpacity * 100)}%
                </span>
              </div>

              {/* Preview - pattern color auto-contrasts with background */}
              <div
                className="h-16 rounded-lg relative overflow-hidden"
                style={{ background: backgroundStyleToCSS(safeValue) }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: patternToCSS(safeValue.pattern, '#ffffff', patternOpacity),
                    backgroundRepeat: 'repeat',
                  }}
                />
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
