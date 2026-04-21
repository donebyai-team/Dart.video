import { useRef, useEffect, useState, forwardRef, useImperativeHandle, useMemo, useCallback } from "react";
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
import {
  calculateRealTotalFrames,
  getSlideEditPreviewFrame,
  getSlideVisualEndFrame,
} from "../frame_calculations";
import { useVideoStore } from "@/stores/video";
import Loading from "@/app/loading";
import type { PatchOverlay } from "@coasterai/renderer";

interface RemotionPlayerProps {
  onSlideChange?: (slideId: string) => void;
  onFullscreenChange?: (isFullscreen: boolean) => void;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
  transcriptPanel?: React.ReactNode;
  onSelectOverlayFromTimeline?: (overlayId: string, slideId: string) => void;
  onSlideSpeedChange: (slideId: string, newDuration: number) => void;
  onSelectTemplate?: (slideId: string) => void;
  onDurationChange: (slideId: string, newDuration: number) => void;
  animationEdit: {
    overlay: PatchOverlay
    selectedEid: string | null
    setSelectedEid: (eid: string | null) => void
    animEditVersion: number
    applyValuePatch: (id: string, prop: string, value: unknown) => void
    applyStyleOverride: (id: string, style: Record<string, string | number>) => void
    applyArrayPatch: (source: string, next: Record<string, any>[]) => void
  }
}

export interface RemotionPlayerHandle extends PlayerControls {
  getCurrentFrame: () => number;
  isPlaying: () => boolean;
}

const RemotionPlayerComponent = forwardRef<RemotionPlayerHandle, RemotionPlayerProps>((
  {
    onSlideChange,
    onFullscreenChange,
    onPlaybackStateChange,
    onSelectOverlayFromTimeline,
    onSlideSpeedChange,
    onDurationChange,
    onSelectTemplate,
    animationEdit,
  },
  ref
) => {
  const playerRef = useRef<PlayerRef>(null);
  const fullscreenContainerRef = useRef<HTMLDivElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const videoConfigFromStore = useVideoStore(s => s.videoConfig);
  const selectedSlide = useVideoStore(s => s.selectedSlide)?.slide;
  const onSelectOEffect = useVideoStore(s => s.handleSelectEffect);

  const resolution = videoConfigFromStore?.metadata?.resolution;
  const fps = videoConfigFromStore?.metadata?.fps || 30;

  const getTimelineSlides = useVideoStore(s => s.getTimelineSlides);
  // Recompute allSlides whenever videoConfig changes (e.g. slide duration update).
  // getTimelineSlides is a stable function ref so we depend on videoConfigFromStore directly.
  const allSlides = useMemo(() => getTimelineSlides(), [videoConfigFromStore]);

  const selectedSlideId = selectedSlide?.id || "";

  const [isPlaying, setIsPlaying] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [volume, setVolume] = useState([80]);
  const [isMuted, setIsMuted] = useState(false);
  const BASE_PREVIEW_SCALE = 0.75;
  const [userZoom, setUserZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(1);
  // Auto-hide controls in fullscreen after 3s of no mouse movement
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When set, pressing play seeks to this slide's start before playing.
  // Set whenever the user manually selects a slide (from timeline or settings panel).
  const [playFromSlideId, setPlayFromSlideId] = useState<string | null>(null);

  // When set, playback auto-pauses when the current frame reaches this value.
  // Used by slide preview to stop at the end of the slide.
  const previewEndFrameRef = useRef<number | null>(null);

  // Pause on drag start; stay paused when drag ends (user presses play to resume)
  // while dragging set isPlaying to true so that we can see the changes in the player and effect 
  const handleDraggingChange = useCallback((dragging: boolean) => {
    if (dragging){
      playerRef.current?.pause();
      setIsPlaying(true)
    }else{
       setIsPlaying(false)
    }
  }, []);

  const totalFrames = useMemo(
    () => calculateRealTotalFrames(allSlides, fps),
    [allSlides, fps]
  );
  const totalDuration = totalFrames / fps;
  const currentTime = currentFrame / fps;
  const audioVolume = isMuted ? 0 : volume[0] / 100;

  const controls = usePlayerControls(
    playerRef,
    allSlides,
    currentFrame,
    totalFrames,
    isPlaying,
    playFromSlideId,
    setPlayFromSlideId,
    fps,
    previewEndFrameRef,
  );

  // Seek to frame 1 on mount to avoid blank screen at frame 0
  useEffect(() => {
    controls.seekToFrame(1);
  }, []);

  useEffect(() => {
    if (!canvasContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      setContainerSize({ width: rect.width, height: rect.height });
    });
    observer.observe(canvasContainerRef.current);
    return () => observer.disconnect();
  }, []);

  useRemotionPlayerEvents({
    playerRef,
    allSlides,
    selectedSlideId,
    onSlideChange,
    setIsPlaying,
    setCurrentFrame,
    fps,
    previewEndFrameRef,
  });

  // Ref to track which slide changes were already handled to prevent double-seeking.
  // handleSlideSelect sets this before calling onSlideChange so the effect below skips it.
  const lastHandledSlideRef = useRef(selectedSlideId);

  // Handle external slide changes (e.g. from settings panel) when not playing
  useEffect(() => {
    if (selectedSlideId === lastHandledSlideRef.current) return;
    lastHandledSlideRef.current = selectedSlideId;

    if (!isPlaying && selectedSlideId) {
      const frame = getSlideEditPreviewFrame(allSlides, selectedSlideId, fps);
      playerRef.current?.seekTo(frame);
      setPlayFromSlideId(selectedSlideId);
    }
  }, [selectedSlideId, isPlaying, allSlides, fps]);

  // Called when user clicks a slide tile in the timeline.
  // Pauses playback and seeks to the visual end of the slide (last frame before transition).
  // Sets playFromSlideId so that pressing play restarts from the slide's beginning.
  const handleSlideSelect = useCallback((slideId: string) => {
    lastHandledSlideRef.current = slideId;
    previewEndFrameRef.current = null;
    playerRef.current?.pause();
    const frame = isPlaying
      ? getSlideVisualEndFrame(allSlides, slideId, fps)
      : getSlideEditPreviewFrame(allSlides, slideId, fps);
    playerRef.current?.seekTo(frame);
    setPlayFromSlideId(slideId);
    onSlideChange?.(slideId);
  }, [allSlides, fps, isPlaying, onSlideChange]);

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

  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  }));

  useEffect(() => {
    const handleResize = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      onFullscreenChange?.(isNowFullscreen);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [onFullscreenChange]);

  useEffect(() => {
    onPlaybackStateChange?.(isPlaying);
  }, [isPlaying, onPlaybackStateChange]);

  // Show controls on mouse move in fullscreen; hide after 3s of inactivity
  const handleMouseMove = useCallback(() => {
    if (!isFullscreen) return;
    setControlsVisible(true);
    if (controlsHideTimerRef.current) clearTimeout(controlsHideTimerRef.current);
    controlsHideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
  }, [isFullscreen]);

  // Reset hide timer when entering/leaving fullscreen
  useEffect(() => {
    if (!isFullscreen) {
      setControlsVisible(true);
      if (controlsHideTimerRef.current) clearTimeout(controlsHideTimerRef.current);
    } else {
      // Start the hide timer immediately on entering fullscreen
      controlsHideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
    }
    return () => { if (controlsHideTimerRef.current) clearTimeout(controlsHideTimerRef.current); };
  }, [isFullscreen]);

  if (!videoConfigFromStore?.config || !resolution) {
    return <Loading />;
  }

  const handleZoomIn = () => setUserZoom(prev => Math.min(3, prev + 0.25));
  const handleZoomOut = () => setUserZoom(prev => Math.max(0.25, prev - 0.25));
  const handleZoomReset = () => setUserZoom(1);

  const canvasSize = useMemo(() => {
    if (!resolution) return { width: 0, height: 0 };

    if (isFullscreen) {
      const fitScale = Math.min(viewport.width / resolution.width, viewport.height / resolution.height);
      return { width: resolution.width * fitScale, height: resolution.height * fitScale };
    }

    const fitScale = Math.min(containerSize.width / resolution.width, containerSize.height / resolution.height);
    const finalScale = Math.min(fitScale, 0.75);
    return { width: resolution.width * finalScale, height: resolution.height * finalScale };
  }, [resolution, isFullscreen, viewport, containerSize]);

  // Controls bar — shared between normal and fullscreen mode
  const controlsBar = (
    <div className={`h-14 px-4 flex items-center gap-4 ${isFullscreen ? "bg-black/60 backdrop-blur-sm text-white" : "border-t border-border/50"}`}>
      {/* Playback controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => controls.skipBackward()}
          className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
          title="Skip back 5s"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={() => controls.togglePlayPause()}
          className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <button
          onClick={() => controls.skipForward()}
          className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
          title="Skip forward 5s"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      {/* Time display */}
      <div className={`text-sm font-mono min-w-[100px] ${isFullscreen ? "text-white/70" : "text-muted-foreground"}`}>
        <span className={isFullscreen ? "text-white" : "text-foreground"}>{formatTime(currentTime)}</span>
        <span className="mx-1">/</span>
        <span>{formatTime(totalDuration)}</span>
      </div>

      <div className="flex-1" />

      {/* Zoom + Volume + Fullscreen */}
      <div className="flex items-center gap-1">
        {!isFullscreen && (
          <>
            <button
              onClick={handleZoomOut}
              disabled={userZoom <= 0.25}
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
              {Math.round(userZoom * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              disabled={userZoom >= 3}
              className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors disabled:opacity-40"
              title="Zoom in"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <Separator orientation="vertical" className="h-5 mx-1" />
          </>
        )}

        <Popover>
          <PopoverTrigger asChild>
            <button className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isFullscreen ? "hover:bg-white/10" : "hover:bg-muted"}`}>
              {isMuted || volume[0] === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
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

        <button
          onClick={handleFullscreen}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${isFullscreen ? "hover:bg-white/10" : "hover:bg-muted"}`}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          <Maximize className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div ref={fullscreenContainerRef} className="flex flex-col h-full" onMouseMove={handleMouseMove}>
      {!isFullscreen && (
        <PlayerToolbar
          // onSlideSpeedChange={(newDuration) => onSlideSpeedChange(selectedSlideId, newDuration)}
          onDurationChange={(newDuration) => onDurationChange(selectedSlideId, newDuration)}
          currentFrame={controls.getCurrentFrame()}
        />
      )}

      <div
        ref={canvasContainerRef}
        className="flex-1 flex items-center justify-center overflow-hidden"
      >
        <PlayerCanvas
          playerRef={playerRef}
          totalFrames={totalFrames}
          fps={fps}
          currentFrame={currentFrame}
          audioVolume={audioVolume}
          isFullscreen={isFullscreen}
          isEditing={!isFullscreen}
          canvasSize={canvasSize}
          scale={isFullscreen ? userZoom : BASE_PREVIEW_SCALE * userZoom}
          onSetScale={setUserZoom}
          isPlaying={isPlaying}
          onSelectTemplate={onSelectTemplate}
          animationEdit={animationEdit}
        />
      </div>

      {/* Timeline — hidden in fullscreen */}
      {!isFullscreen && (
        <div className="bg-card border-t border-border">
          <PlayerTimeline
            slides={allSlides}
            currentFrame={currentFrame}
            onSeek={(frame) => controls.seekToFrame(frame)}
            onSelectSlide={handleSlideSelect}
            onDraggingChange={handleDraggingChange}
            onSelectOverlay={(overlayId, slideId) => {
              if (onSelectOverlayFromTimeline) {
                onSelectOverlayFromTimeline(overlayId, slideId);
              } else {
                onSlideChange?.(slideId);
                setTimeout(() => onSelectOEffect?.(overlayId), 0);
              }
            }}
            fps={fps}
          />
          {controlsBar}
        </div>
      )}

      {/* Fullscreen controls overlay — fades out after 3s of inactivity */}
      {isFullscreen && (
        <>
          <div
            className="absolute top-0 inset-x-0 transition-opacity duration-500"
            style={{ opacity: controlsVisible ? 1 : 0, pointerEvents: controlsVisible ? "auto" : "none" }}
          >
            {controlsBar}
          </div>
          {/* Click anywhere on canvas (below controls) to toggle play/pause */}
          <div
            className="absolute inset-x-0 bottom-0"
            style={{ top: "56px", pointerEvents: "auto" }}
            onClick={() => controls.togglePlayPause()}
          />
        </>
      )}
    </div>
  );
});

RemotionPlayerComponent.displayName = "RemotionPlayer";

export default RemotionPlayerComponent;
