import { X, Play } from "lucide-react";
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

interface TextAnimationTemplateSettingsProps {
  templateId: string;
  templates: TextAnimationTemplate[];
  props: Record<string, string | number>;
  onUpdateProps: (props: Record<string, string | number>) => void;
  onClose: () => void;
  onApply?: () => void;
}

const TextAnimationTemplateSettings = ({
  templateId,
  templates,
  props,
  onUpdateProps,
  onClose,
  onApply,
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
    onUpdateProps({ ...props, [key]: value });
  };

  const renderPropertyInput = (property: TemplateProperty) => {
    const currentValue = props[property.key] ?? property.default;

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
        <Button className="w-full gap-2" onClick={onApply}>
          <Play className="w-4 h-4" />
          Preview
        </Button>
      </div>
    </div>
  );
};

export default TextAnimationTemplateSettings;
