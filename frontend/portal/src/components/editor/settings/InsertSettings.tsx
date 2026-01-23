import { useState, useEffect, useCallback } from "react";
import { X, Trash2, ZoomIn, Square, Type, ArrowRight, Focus, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import CalloutSettings from "./CalloutSettings";
import SpotlightSettings from "./SpotlightSettings";
import type { CanvasObjectType, CanvasObject, SlideEffect, AnnotationObject } from "@/types/slides";

export type InsertToolType = CanvasObjectType;

interface InsertSettingsProps {
  tool: InsertToolType;
  // NEW ARCHITECTURE: currentObject can be effect or annotation
  currentObject?: CanvasObject | SlideEffect | AnnotationObject;
  // OLD ARCHITECTURE: Single onChange handler
  onChange: (settings: Partial<CanvasObject>) => void;
  // NEW ARCHITECTURE: Separate handlers for effects and annotations
  onChangeEffect?: (settings: Partial<SlideEffect>) => void;
  onChangeAnnotation?: (settings: Partial<AnnotationObject>) => void;
  onDelete?: () => void;
  onClose: () => void;
  canDelete?: boolean;
  // Spotlight-specific props
  slideDuration?: number;
  slideStartTime?: number;
  onApply?: () => void;
  onPlay?: () => void;
}

const toolInfo: Record<InsertToolType, { label: string; icon: React.ElementType }> = {
  callout: { label: "Callout", icon: Focus },
  spotlight: { label: "Spotlight", icon: CircleDot },
};

const InsertSettings = ({
  tool,
  currentObject,
  onChange,
  onChangeEffect,
  onChangeAnnotation,
  onDelete,
  onClose,
  canDelete = true,
  slideDuration = 5,
  slideStartTime = 0,
  onApply,
  onPlay
}: InsertSettingsProps) => {
  // Helper to safely get property with type guard
  const getProperty = <T,>(obj: any, key: string, defaultValue: T): T => {
    return (obj && key in obj) ? obj[key] : defaultValue;
  };

  const [settings, setSettings] = useState<any>({
    color: getProperty(currentObject, 'color', "#ef4444"),
    animation: getProperty(currentObject, 'animation', "fade-in"),
    opacity: getProperty(currentObject, 'opacity', 100),
    duration: getProperty(currentObject, 'duration', 2),
    zoomLevel: getProperty(currentObject, 'zoomLevel', 2),
    borderWidth: getProperty(currentObject, 'borderWidth', 3),
    borderRadius: getProperty(currentObject, 'borderRadius', 0),
    fill: getProperty(currentObject, 'fill', false),
    text: getProperty(currentObject, 'text', "Double-click to edit"),
    fontSize: getProperty(currentObject, 'fontSize', 32),
    fontFamily: getProperty(currentObject, 'fontFamily', "Plus Jakarta Sans"),
    fontStyle: getProperty(currentObject, 'fontStyle', "normal"),
    arrowSize: getProperty(currentObject, 'arrowSize', 24),
    arrowStyle: getProperty(currentObject, 'arrowStyle', "solid"),
    calloutStyle: getProperty(currentObject, 'calloutStyle', "pointer"),
    spotlightRadius: getProperty(currentObject, 'spotlightRadius', 100),
    blurAmount: getProperty(currentObject, 'blurAmount', 10),
    x: getProperty(currentObject, 'x', 100),
    y: getProperty(currentObject, 'y', 100),
    width: getProperty(currentObject, 'width', 200),
    height: getProperty(currentObject, 'height', 150),
    // NEW ARCHITECTURE: startTime/endTime for effects
    startTime: getProperty(currentObject, 'startTime', 0),
    endTime: getProperty(currentObject, 'endTime', slideDuration),
    // OLD ARCHITECTURE: spotlightStartTime/spotlightEndTime
    spotlightStartTime: getProperty(currentObject, 'spotlightStartTime', 0),
    spotlightEndTime: getProperty(currentObject, 'spotlightEndTime', slideDuration),
  });

  const ToolIcon = toolInfo[tool].icon;

  // Sync settings when currentObject changes
  useEffect(() => {
    if (currentObject) {
      setSettings({
        color: getProperty(currentObject, 'color', "#ef4444"),
        opacity: getProperty(currentObject, 'opacity', 100),
        duration: getProperty(currentObject, 'duration', 2),
        zoomLevel: getProperty(currentObject, 'zoomLevel', 2),
        borderWidth: getProperty(currentObject, 'borderWidth', 3),
        borderRadius: getProperty(currentObject, 'borderRadius', 0),
        fill: getProperty(currentObject, 'fill', false),
        text: getProperty(currentObject, 'text', "Double-click to edit"),
        fontSize: getProperty(currentObject, 'fontSize', 32),
        fontFamily: getProperty(currentObject, 'fontFamily', "Plus Jakarta Sans"),
        fontStyle: getProperty(currentObject, 'fontStyle', "normal"),
        arrowSize: getProperty(currentObject, 'arrowSize', 24),
        arrowStyle: getProperty(currentObject, 'arrowStyle', "solid"),
        calloutStyle: getProperty(currentObject, 'calloutStyle', "pointer"),
        spotlightRadius: getProperty(currentObject, 'spotlightRadius', 100),
        blurAmount: getProperty(currentObject, 'blurAmount', 10),
        animation: getProperty(currentObject, 'animation', "fade-in"),
        x: getProperty(currentObject, 'x', 100),
        y: getProperty(currentObject, 'y', 100),
        width: getProperty(currentObject, 'width', 200),
        height: getProperty(currentObject, 'height', 150),
        startTime: getProperty(currentObject, 'startTime', 0),
        endTime: getProperty(currentObject, 'endTime', slideDuration),
        spotlightStartTime: getProperty(currentObject, 'spotlightStartTime', 0),
        spotlightEndTime: getProperty(currentObject, 'spotlightEndTime', slideDuration),
      });
    }
  }, [currentObject?.id, slideDuration]);

  const updateSetting = useCallback((key: string, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    // Determine if we're updating an effect or annotation based on tool type
    const isEffect = tool === "spotlight";

    if (isEffect && onChangeEffect) {
      onChangeEffect({ [key]: value } as Partial<SlideEffect>);
    } else if (!isEffect && onChangeAnnotation) {
      onChangeAnnotation({ [key]: value } as Partial<AnnotationObject>);
    }
  }, [settings, tool, onChange, onChangeEffect, onChangeAnnotation]);

  const renderToolSpecificSettings = () => {
    switch (tool) {
      case "callout":
        return <CalloutSettings settings={settings} onChange={updateSetting} />;
      case "spotlight":
        return (
          <SpotlightSettings
            settings={settings}
            onChange={updateSetting}
            slideDuration={slideDuration}
            slideStartTime={slideStartTime}
            onPlay={onPlay}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-2">
          <ToolIcon className="w-3.5 h-3.5 text-muted-foreground" />
          <h3 className="font-medium text-xs">{toolInfo[tool].label}</h3>
        </div>
        <div className="flex items-center gap-1">
          {canDelete && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={onDelete}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {renderToolSpecificSettings()}
      </div>
    </div>
  );
};

export default InsertSettings;
