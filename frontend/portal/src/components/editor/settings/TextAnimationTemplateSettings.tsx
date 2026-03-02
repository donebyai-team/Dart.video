import { X, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getTemplateById,
  type TemplateProperty,
  type TextAnimationTemplate,
} from "@/types/textAnimationTemplates";
import { JsonObject } from "@bufbuild/protobuf";

interface TextAnimationTemplateSettingsProps {
  templateId: string;
  templates: TextAnimationTemplate[];
  props: JsonObject;
  onUpdateProps: (props: JsonObject) => void;
  onClose: () => void;
  onApply?: () => void;
  isPreviewPlaying?: boolean;
}

const TextAnimationTemplateSettings = ({
  templateId,
  templates,
  props,
  onUpdateProps,
  onClose,
  onApply,
  isPreviewPlaying = false,
}: TextAnimationTemplateSettingsProps) => {
  const template = getTemplateById(templates, templateId);

  if (!template) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h3 className="text-sm font-medium">Template</h3>
            <p className="text-xs text-muted-foreground">Not found</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="p-4 text-sm text-muted-foreground">Template not found.</div>
      </div>
    );
  }

  const handlePropertyChange = (key: string, value: string | number) => {
    // Creating a shallow copy with the updated key
    console.debug("change", "key", key, "value", value)
    const updatedProps: JsonObject = {
      ...props,
      [key]: value
    };

    onUpdateProps(updatedProps);
  };

  const renderPropertyInput = (property: TemplateProperty) => {
    const plainProps = JSON.parse(JSON.stringify(props)) as Record<string, string | number>;;
    const currentValue = plainProps[property.key] ?? property.default;

    switch (property.type) {
      case "number":
        return (
          <div key={property.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{property.label}</Label>
              <span className="text-xs text-muted-foreground font-mono">{currentValue}</span>
            </div>
            <Slider
              value={[Number(currentValue)]}
              onValueChange={([val]) => handlePropertyChange(property.key, val)}
              min={property.min ?? 0}
              max={property.max ?? 300}
              step={property.step ?? 1}
              className="w-full"
            />
          </div>
        );

      case "text":
        return (
          <div key={property.key} className="space-y-2">
            <Label className="text-xs">{property.label}</Label>
            <Input
              value={String(currentValue)}
              onChange={(e) => handlePropertyChange(property.key, e.target.value)}
              className="h-9 text-sm"
            />
          </div>
        );

      case "color":
        return (
          <div key={property.key} className="space-y-2">
            <Label className="text-xs">{property.label}</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={String(currentValue)}
                onChange={(e) => handlePropertyChange(property.key, e.target.value)}
                className="w-10 h-9 rounded border border-border cursor-pointer"
              />
              <Input
                value={String(currentValue)}
                onChange={(e) => handlePropertyChange(property.key, e.target.value)}
                className="h-9 text-sm flex-1 font-mono"
              />
            </div>
          </div>
        );

      case "select":
        return (
          <div key={property.key} className="space-y-2">
            <Label className="text-xs">{property.label}</Label>
            <Select value={String(currentValue)} onValueChange={(val) => handlePropertyChange(property.key, val)}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {property.options?.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div>
          <h3 className="text-sm font-medium">{template.name}</h3>
          <p className="text-xs text-muted-foreground">Template inputs</p>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">{template.properties.map(renderPropertyInput)}</div>

      {/* Preview button */}
      <div className="p-4 border-t border-border">
        <Button variant="default" size="sm" className="w-full gap-2" onClick={onApply}>
          {isPreviewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          {isPreviewPlaying ? "Stop Preview" : "Preview"}
        </Button>
      </div>
    </div>
  );
};

export default TextAnimationTemplateSettings;
