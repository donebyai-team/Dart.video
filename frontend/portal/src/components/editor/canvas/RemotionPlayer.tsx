import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { PlayerRef } from "@remotion/player";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Maximize,
  Minus,
  Plus,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import PlayerCanvas from "./PlayerCanvas";
import PlayerTimeline from "../timeline/PlayerTimeline";
import PlayerToolbar from "../PlayerToolbar";
import { usePlayerControls, type PlayerControls } from "@/hooks/usePlayerControls";
import { useRemotionPlayerEvents } from "@/hooks/useRemotionPlayerEvents";
import { useSlideSelection } from "@/hooks/useSlideSelection";
import { calculateRealTotalFrames, calculateTotalFrames, getSlideVisualEndFrame } from "../frame_calculations";
import { useVideoStore } from "@/stores/video";

interface RemotionPlayerProps {
  onSlideChange?: (slideId: string) => void;
  onStackItemChange?: (itemId: string | null) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  transcriptPanel?: React.ReactNode;
  onSelectOverlayFromTimeline?: (overlayId: string, slideId: string) => void;
  onDurationChange?: (slideId: string, newDuration: number) => void;
  onSelectTemplate?: (slideId: string) => void;
}

export interface RemotionPlayerHandle extends PlayerControls {
  getCurrentFrame: () => number;
  isPlaying: () => boolean;
}

const RemotionPlayerComponent = forwardRef<RemotionPlayerHandle, RemotionPlayerProps>(({
  onSlideChange,
  onStackItemChange,
  onFullscreenChange,
  transcriptPanel,
  onSelectOverlayFromTimeline,
  onDurationChange,
  onSelectTemplate,
}, ref) => {
  const playerRef = useRef<PlayerRef>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const resolution = useVideoStore(s => s.resolution);
  const selectedSlide = useVideoStore(s => s.selectedSlide)?.slide;
  const selectedStackItemId = useVideoStore(s => s.selectedStackItemId);
  const onSelectOEffect = useVideoStore(s => s.handleSelectEffect);
  const fps = useVideoStore(s => s.getFPS)();
  const selectedSlideId = selectedSlide?.id || "";

  const [isPlaying, setIsPlaying] = useState(false);

  const [volume, setVolume] = useState([80]);
  const [isMuted, setIsMuted] = useState(false);
  const [scale, setScale] = useState(1);
  const [previewingSlideId, setPreviewingSlideId] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);

  // Get all slides flattened with section info and overlay data
  const allSlides = useVideoStore(s => s.getTimelineSlides)()

  const [currentFrame, setCurrentFrame] = useState(getSlideVisualEndFrame(allSlides, selectedSlideId, fps));
  const totalFrames = calculateRealTotalFrames(allSlides, fps); // For Remotion player
  const uiTotalFrames = calculateTotalFrames(allSlides, fps); // For UI timeline

  const totalDuration = totalFrames / fps;
  const uiTotalDuration = uiTotalFrames / fps;
  const currentTime = currentFrame / fps;


  // To start the video player from the first visible slide
  useEffect(() => {
    controls.seekToFrame(currentFrame);
  }, [])

  // Use centralized player controls
  const controls = usePlayerControls(
    playerRef,
    allSlides,
    currentFrame,
    totalFrames,
    isPlaying,
    previewingSlideId,
    setPreviewingSlideId,
    fps,
  );

  // Use custom hooks for event handling and slide selection
  useRemotionPlayerEvents({
    playerRef,
    allSlides,
    selectedSlideId,
    selectedStackItemId,
    previewingSlideId,
    onSlideChange,
    onStackItemChange,
    setIsPlaying,
    setCurrentFrame,
    setPreviewingSlideId,
    isDragging: isDraggingTimeline, // Pass dragging state to prevent interference
    fps,
  });

  useSlideSelection({
    selectedSlideId,
    allSlides,
    isPlaying,
    previewingSlideId,
    controls,
    setCurrentFrame,
    fps,
    isDragging: isDraggingTimeline, // Pass dragging state to prevent interference
  });

  // Expose methods via ref - delegate to centralized controls
  useImperativeHandle(ref, () => controls, [controls]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleFullscreen = () => {
    if (fullscreenContainerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        fullscreenContainerRef.current.requestFullscreen();
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      onFullscreenChange?.(isNowFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [onFullscreenChange]);

  const handleZoomIn = () => setScale(prev => Math.min(3, prev + 0.25));
  const handleZoomOut = () => setScale(prev => Math.max(0.25, prev - 0.25));
  const handleZoomReset = () => setScale(1);

  // Calculate canvas size based on resolution
  const getCanvasSize = () => {
    // In fullscreen, maintain aspect ratio and fit within screen
    if (isFullscreen && fullscreenContainerRef.current) {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      const aspectRatio = resolution.width / resolution.height;
      const screenAspectRatio = screenWidth / screenHeight;

      if (aspectRatio > screenAspectRatio) {
        // Video is wider than screen - fit to width
        return {
          width: screenWidth,
          height: screenWidth / aspectRatio,
        };
      } else {
        // Video is taller than screen - fit to height
        return {
          width: screenHeight * aspectRatio,
          height: screenHeight,
        };
      }
    }

    const aspectRatio = resolution.width / resolution.height;
    const isPortrait = aspectRatio < 1;

    if (isPortrait) {
      const height = 350;
      const width = height * aspectRatio;
      return { width, height };
    }
    const width = 500;
    const height = width / aspectRatio;
    return { width, height };
  };

  const canvasSize = getCanvasSize();

  return (
    <div ref={fullscreenContainerRef} className="flex flex-col h-full">
      {/* Unified Player Toolbar - includes duration control and slide editing tools */}
      {!isFullscreen && onDurationChange && (
        <PlayerToolbar
          onDurationChange={(newDuration) => onDurationChange(selectedSlideId, newDuration)}
        />
      )}

      {/* Player Canvas */}
      <PlayerCanvas
        playerRef={playerRef}
        totalFrames={totalFrames}
        fps={fps}
        isFullscreen={isFullscreen}
        scale={scale}
        canvasSize={canvasSize}
        onSetScale={setScale}
        isPlaying={isPlaying}
        onSelectTemplate={onSelectTemplate}
      />

      {/* Transcript panel - below player, above timeline */}
      {transcriptPanel && !isFullscreen && (
        <div className="bg-card border-t border-border p-3 flex-shrink-0">
          {transcriptPanel}
        </div>
      )}

      {/* Timeline */}
      <div className={`bg-card border-t border-border ${isFullscreen ? "hidden" : ""}`}>
        <PlayerTimeline
          slides={allSlides}
          totalDuration={uiTotalDuration}
          totalFrames={uiTotalFrames}
          currentFrame={currentFrame}
          onSeek={(frame) => controls.seekToFrame(frame)}
          onSelectSlide={onSlideChange}
          onSelectSlideManually={(slideId) => {
            console.log(`[RemotionPlayer] Manual slide selection from timeline: ${slideId}`);
            controls.selectSlideManually(slideId);
            onSlideChange?.(slideId);
          }}
          onSelectOverlay={(overlayId, slideId) => {
            if (onSelectOverlayFromTimeline) {
              onSelectOverlayFromTimeline(overlayId, slideId);
            } else {
              // Fallback to old behavior
              onSlideChange?.(slideId);
              setTimeout(() => {
                onSelectOEffect?.(overlayId);
              }, 0);
            }
          }}
          fps={fps}
          isDragging={isDraggingTimeline}
          onDraggingChange={setIsDraggingTimeline}
        />

        {/* Controls bar */}
        <div className="h-14 px-4 flex items-center gap-4 border-t border-border/50">
          {/* Left: Playback controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => controls.skipBackward()}
              className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
              title="Skip back 5s"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={() => controls.togglePlayPause()}
              className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 ml-0.5" />
              )}
            </button>

            <button
              onClick={() => controls.skipForward()}
              className="w-9 h-9 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
              title="Skip forward 5s"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Time display */}
          <div className="text-sm font-mono text-muted-foreground min-w-[100px]">
            <span className="text-foreground">{formatTime(currentTime)}</span>
            <span className="mx-1">/</span>
            <span>{formatTime(totalDuration)}</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right: Zoom, Volume, Fullscreen */}
          <div className="flex items-center gap-1">
            {/* Zoom */}
            <button
              onClick={handleZoomOut}
              disabled={scale <= 0.25}
              className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors disabled:opacity-40"
              title="Zoom out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleZoomReset}
              className="h-8 px-2 rounded-lg hover:bg-muted flex items-center justify-center transition-colors text-xs font-medium min-w-[44px]"
              title="Reset zoom"
            >
              {Math.round(scale * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              disabled={scale >= 3}
              className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors disabled:opacity-40"
              title="Zoom in"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            <Separator orientation="vertical" className="h-5 mx-1" />

            {/* Volume */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
                >
                  {isMuted || volume[0] === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-36 p-3" side="top">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <Slider
                    value={isMuted ? [0] : volume}
                    onValueChange={(v) => {
                      setVolume(v);
                      if (v[0] > 0) setIsMuted(false);
                    }}
                    max={100}
                    step={1}
                    className="flex-1"
                  />
                </div>
              </PopoverContent>
            </Popover>

            {/* Fullscreen */}
            <button
              onClick={handleFullscreen}
              className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
              title="Fullscreen"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

RemotionPlayerComponent.displayName = "RemotionPlayer";

export default RemotionPlayerComponent;
