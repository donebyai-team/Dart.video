import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ColorPickerInput from "@/components/editor/ColorPickerInput";
import type { CanvasObject } from "@/types/slides";

interface CalloutSettingsProps {
  settings: Partial<CanvasObject>;
  onChange: <K extends keyof CanvasObject>(key: K, value: CanvasObject[K]) => void;
}

const CalloutSettings = ({ settings, onChange }: CalloutSettingsProps) => {
  return (
    <div className="space-y-2">
      <ColorPickerInput
        value={settings.color || "#ef4444"}
        onChange={(color) => onChange("color", color)}
      />
      <Select
        value={settings.calloutStyle}
        onValueChange={(value) => onChange("calloutStyle", value as "pointer" | "circle" | "box" | "numbered")}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pointer">Pointer</SelectItem>
          <SelectItem value="circle">Circle</SelectItem>
          <SelectItem value="box">Box</SelectItem>
          <SelectItem value="numbered">Numbered</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default CalloutSettings;
