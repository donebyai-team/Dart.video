import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ColorPickerInputProps {
  label?: string;
  value: string;
  onChange: (color: string) => void;
  presets?: string[];
}

const defaultPresets = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff", "#000000",
];

const ColorPickerInput = ({
  label,
  value,
  onChange,
  presets = defaultPresets,
}: ColorPickerInputProps) => {
  const [hexInput, setHexInput] = useState(value);

  // Sync hex input when value changes externally
  useEffect(() => {
    if (value !== hexInput) {
      setHexInput(value);
    }
  }, [value]);

  const handleHexChange = (newValue: string) => {
    setHexInput(newValue);
    // Validate hex format before applying
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue) || /^#[0-9A-Fa-f]{3}$/.test(newValue)) {
      onChange(newValue);
    }
  };

  const handleHexBlur = () => {
    // On blur, if invalid, revert to last valid value
    if (!/^#[0-9A-Fa-f]{6}$/.test(hexInput) && !/^#[0-9A-Fa-f]{3}$/.test(hexInput)) {
      setHexInput(value);
    }
  };

  return (
    <div className="space-y-1.5">
      {label && <Label className="text-xs">{label}</Label>}
      
      {/* Preset colors */}
      <div className="flex flex-wrap gap-1">
        {presets.map((color) => (
          <button
            key={color}
            onClick={() => {
              onChange(color);
              setHexInput(color);
            }}
            className={`w-5 h-5 rounded border transition-all hover:scale-110 ${
              value.toLowerCase() === color.toLowerCase()
                ? "border-primary ring-1 ring-primary/30"
                : "border-transparent hover:border-border"
            }`}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>

      {/* Custom color input */}
      <div className="flex gap-1.5 items-center">
        <input
          type="color"
          value={value.startsWith("#") ? value : "#000000"}
          onChange={(e) => {
            onChange(e.target.value);
            setHexInput(e.target.value);
          }}
          className="w-7 h-7 rounded border border-border cursor-pointer bg-transparent"
        />
        <Input
          value={hexInput}
          onChange={(e) => handleHexChange(e.target.value)}
          onBlur={handleHexBlur}
          placeholder="#000000"
          className="flex-1 h-7 text-xs font-mono"
        />
      </div>
    </div>
  );
};

export default ColorPickerInput;
