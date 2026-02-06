import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface BackgroundSettingsProps {
  currentColor: string;
  globalBackgroundColor?: string; // Global background if "apply to all" is enabled
  onChange: (color: string, applyToAll: boolean) => void;
  onClose: () => void;
}

const presetColors = [
  { name: "Slate Dark", value: "#0f172a" },
  { name: "Slate", value: "#1e293b" },
  { name: "Zinc Dark", value: "#18181b" },
  { name: "Neutral", value: "#262626" },
  { name: "Indigo", value: "#4f46e5" },
  { name: "Purple", value: "#7c3aed" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Emerald", value: "#10b981" },
  { name: "Green", value: "#22c55e" },
  { name: "Yellow", value: "#eab308" },
  { name: "Orange", value: "#f97316" },
  { name: "Red", value: "#ef4444" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
];

const gradientPresets = [
  { name: "Midnight", value: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" },
  { name: "Purple Haze", value: "linear-gradient(135deg, #581c87 0%, #7c3aed 50%, #4f46e5 100%)" },
  { name: "Ocean", value: "linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)" },
  { name: "Forest", value: "linear-gradient(135deg, #134e4a 0%, #14b8a6 100%)" },
  { name: "Sunset", value: "linear-gradient(135deg, #7f1d1d 0%, #ef4444 50%, #f97316 100%)" },
  { name: "Gold", value: "linear-gradient(135deg, #713f12 0%, #f59e0b 100%)" },
  { name: "Rose", value: "linear-gradient(135deg, #831843 0%, #ec4899 100%)" },
  { name: "Deep Blue", value: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)" },
];

const BackgroundSettings = ({ currentColor, globalBackgroundColor, onChange, onClose }: BackgroundSettingsProps) => {
  // Determine initial state: if globalBackgroundColor is set, "apply to all" is enabled
  const initialApplyToAll = !!globalBackgroundColor;
  const initialColor = globalBackgroundColor || currentColor;
  console.debug("open background setting")
  
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const [applyToAll, setApplyToAll] = useState(initialApplyToAll);
  const [activeTab, setActiveTab] = useState<"solid" | "gradient">(initialColor.startsWith("linear") ? "gradient" : "solid");
  const [hexInput, setHexInput] = useState(initialColor.startsWith("#") ? initialColor : "#0f172a");

  // Apply changes immediately when color changes
  useEffect(() => {
    if (selectedColor !== currentColor) {
      onChange(selectedColor, applyToAll);
    }
  }, [selectedColor, applyToAll, onChange, currentColor]);

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    if (color.startsWith("#")) {
      setHexInput(color);
    }
  };

  const handleHexChange = (value: string) => {
    setHexInput(value);
    // Validate and apply hex color
    if (/^#[0-9A-Fa-f]{6}$/.test(value) || /^#[0-9A-Fa-f]{3}$/.test(value)) {
      setSelectedColor(value);
    }
  };

  const handleHexBlur = () => {
    // On blur, if invalid hex, revert to last valid color
    if (!/^#[0-9A-Fa-f]{6}$/.test(hexInput) && !/^#[0-9A-Fa-f]{3}$/.test(hexInput)) {
      setHexInput(selectedColor.startsWith("#") ? selectedColor : "#0f172a");
    }
  };

  const handleApplyToAllChange = (checked: boolean) => {
    setApplyToAll(checked);
    // Re-apply current color with new applyToAll setting
    onChange(selectedColor, checked);
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-sm">Change Background</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Apply to all toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="apply-all" className="text-sm">Apply to all slides</Label>
          <Switch
            id="apply-all"
            checked={applyToAll}
            onCheckedChange={handleApplyToAllChange}
          />
        </div>

        {/* Tab selector */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => setActiveTab("solid")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "solid"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Solid Colors
          </button>
          <button
            onClick={() => setActiveTab("gradient")}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === "gradient"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Gradients
          </button>
        </div>

        {/* Color grid */}
        {activeTab === "solid" ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Select a color</p>
            <div className="grid grid-cols-6 gap-1.5">
              {presetColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleColorSelect(color.value)}
                  className={`w-8 h-8 rounded-md border-2 transition-all hover:scale-110 ${
                    selectedColor === color.value
                      ? "border-primary ring-1 ring-primary/30"
                      : "border-transparent hover:border-border"
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Select a gradient</p>
            <div className="grid grid-cols-4 gap-1.5">
              {gradientPresets.map((gradient) => (
                <button
                  key={gradient.name}
                  onClick={() => handleColorSelect(gradient.value)}
                  className={`h-8 rounded-md border-2 transition-all hover:scale-110 ${
                    selectedColor === gradient.value
                      ? "border-primary ring-1 ring-primary/30"
                      : "border-transparent hover:border-border"
                  }`}
                  style={{ background: gradient.value }}
                  title={gradient.name}
                />
              ))}
            </div>
          </div>
        )}

        {/* Custom color input with hex */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Custom color</p>
          <div className="flex gap-2">
            <input
              type="color"
              value={selectedColor.startsWith("#") ? selectedColor : "#0f172a"}
              onChange={(e) => handleColorSelect(e.target.value)}
              className="w-10 h-9 rounded border border-border cursor-pointer bg-transparent"
            />
            <Input
              value={hexInput}
              onChange={(e) => handleHexChange(e.target.value)}
              onBlur={handleHexBlur}
              placeholder="#000000"
              className="flex-1 font-mono text-sm h-9"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackgroundSettings;
