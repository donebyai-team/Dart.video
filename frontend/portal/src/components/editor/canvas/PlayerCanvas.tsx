import { useRef, useEffect } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { motion } from "framer-motion";
import CanvasOverlay from "./CanvasOverlay";
import { Slideshow } from "../RemotionSlideshow";
import { useVideoStore } from "@/stores/video";

interface PlayerCanvasProps {
  playerRef: React.RefObject<PlayerRef>;
  totalFrames: number;
  fps: number;
  isFullscreen: boolean;
  scale: number;
  canvasSize: { width: number; height: number };
  onSetScale: (scale: number) => void;
  isPlaying?: boolean;
  onSelectTemplate?: (slideId: string) => void;
}

const PlayerCanvas = ({
  playerRef,
  totalFrames,
  fps,
  isFullscreen,
  scale,
  canvasSize,
  onSetScale,
  onSelectTemplate,
  isPlaying = false,
}: PlayerCanvasProps) => {
  const sections = useVideoStore(s => s.sections);
  const resolution = useVideoStore(s => s.resolution);

  const selectedSlide = useVideoStore(s => s.selectedSlide);
  const selectedObjectId = useVideoStore(s => s.selectedObjectId);
  const handleSelectObject = useVideoStore(s => s.handleSelectObject);

  const updateEffect = useVideoStore(s => s.updateEffect);
  const updateAnnotation = useVideoStore(s => s.updateAnnotation);
  const updateCanvasObject = useVideoStore(s => s.updateCanvasObject);
  const containerRef = useRef<HTMLDivElement>(null);

  // Early return if no data
  if (!sections || !resolution || !selectedSlide) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">Loading...</div>;
  }

  // Get effective canvas objects from store
  const effects = selectedSlide.slide.effects || [];

  // Pinch to zoom handler
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        onSetScale(Math.min(3, Math.max(0.25, scale + delta)));
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [scale, onSetScale]);

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex items-center justify-center overflow-hidden touch-none min-h-0 ${isFullscreen ? "bg-black" : "bg-muted/50"
        }`}
      style={{ touchAction: "none" }}
    >
      <motion.div
        className={`relative overflow-hidden ${isFullscreen ? "bg-transparent" : "bg-background shadow-2xl"
          }`}
        style={{
          width: isFullscreen ? canvasSize.width : canvasSize.width * scale,
          height: isFullscreen ? canvasSize.height : canvasSize.height * scale,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        {/* Remotion Player */}
        <div style={{
          position: "relative",
          zIndex: isPlaying ? 2 : 25,
          width: "100%",
          height: "100%",
          pointerEvents: 'auto' // Always allow pointer events to reach templates
        }}>
          <Player
            ref={playerRef}
            component={Slideshow as any}
            inputProps={{
              fps,
              isEditing: !isPlaying, // Only enable editing when NOT playing
              onSelectTemplate,
            }}
            durationInFrames={totalFrames || 1}
            compositionWidth={resolution.width}
            compositionHeight={resolution.height}
            fps={fps}
            style={{
              width: "100%",
              height: "100%",
            }}
            playbackRate={1}
          />
        </div>

        {/* Canvas overlay - always rendered for click handling and displaying objects */}
        {handleSelectObject && (
          <div
            className="absolute inset-0"
            style={{ zIndex: 20, pointerEvents: "auto" }}
          >
            <CanvasOverlay
              resolution={resolution}
              effects={effects}
              selectedObjectId={selectedObjectId || null}
              onSelectObject={handleSelectObject}
              onUpdateEffect={(id, updates) => updateEffect(id, updates)}
              onUpdateAnnotation={(id, updates) => updateAnnotation(id, updates)}
              onUpdateObject={(id, updates) => updateCanvasObject(id, updates)}
              containerWidth={canvasSize.width * scale}
              containerHeight={canvasSize.height * scale}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default PlayerCanvas;
