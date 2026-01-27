"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Menu, Mic2, Eye, Plus, Pencil, Volume2, RefreshCw, Video, Home, Settings, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import VoiceoverPanel from "@/components/editor/VoiceoverPanel";
import ResolutionSelector from "@/components/editor/ResolutionSelector";
import StoryboardPanel from "@/components/editor/StoryboardPanel";
import ToolsSettingsPanel from "@/components/editor/ToolsSettingsPanel";
import RemotionPlayer, { RemotionPlayerHandle } from "@/components/editor/canvas/RemotionPlayer";
import { type EditorConfig, type EditorCallbacks, VideoConfig } from "@/types/editor";
import { sampleVideoConfig } from "@/data/videoConfig";
import { defaultEditorConfig } from "@/data/editorConfig";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useVideoStore } from "@/stores/video";
import { Slide, SlideType, StackSlideContent } from "@coasterai/pb/coasterai/core/v1/slide_pb";


// Icon mapping for dynamic rendering
const iconMap: Record<string, React.ElementType> = {
  Home,
  Settings,
  HelpCircle,
  Video
};
interface EditorPageProps {
  config?: EditorConfig;
  videoConfig?: VideoConfig;
  onConfigChange?: EditorCallbacks["onConfigChange"];
  onSave?: EditorCallbacks["onSave"];
  onExport?: EditorCallbacks["onExport"];
}
const EditorPage = ({
  config = defaultEditorConfig,
  videoConfig = sampleVideoConfig,
  onConfigChange,
  onSave,
  onExport
}: EditorPageProps) => {

  const router = useRouter();
  const playerRef = useRef<RemotionPlayerHandle>(null);
  const initializationRef = useRef<{ config?: EditorConfig; videoConfig?: VideoConfig }>({});

  // ---- Values (reactive) ----
  const initialize = useVideoStore(s => s.initialize);
  const isInitialized = useVideoStore(s => s.isInitialized);

  const setShowVoiceover = useVideoStore(s => s.setShowVoiceover);
  const sections = useVideoStore(s => s.sections);
  const selectedSlide = useVideoStore(s => s.selectedSlide);

  const activeTool = useVideoStore(s => s.activeTool);
  const selectedObjectId = useVideoStore(s => s.selectedObjectId);
  const selectedStackItemId = useVideoStore(s => s.selectedStackItemId);
  const editingSectionId = useVideoStore(s => s.editingSectionId);
  const editingSectionTitle = useVideoStore(s => s.editingSectionTitle);
  const generatingSlideVoiceover = useVideoStore(s => s.generatingSlideVoiceover);

  // ---- Getters (non-reactive functions) ----
  const createSlideEntityId = useVideoStore(s => s.createSlideEntityId);
  const createStackItemEntityId = useVideoStore(s => s.createStackItemEntityId);
  const createOverlayEntityId = useVideoStore(s => s.createOverlayEntityId);

  // ---- Setters / Actions (stable functions) ----
  const setEditingSectionId = useVideoStore(s => s.setEditingSectionId);
  const setEditingSectionTitle = useVideoStore(s => s.setEditingSectionTitle);

  // ---- Handlers / Actions ----
  const updateSectionTitle = useVideoStore(s => s.updateSectionTitle);
  const updateSlideTranscript = useVideoStore(s => s.updateSlideTranscript);
  const handleGenerateSlideVoiceover = useVideoStore(s => s.handleGenerateSlideVoiceover);
  const handleCloseTool = useVideoStore(s => s.handleCloseTool);
  const updateCanvasObject = useVideoStore(s => s.updateCanvasObject);
  const deleteCanvasObject = useVideoStore(s => s.deleteCanvasObject);
  const updateSpotlight = useVideoStore(s => s.updateSpotlight);
  const updateSlide = useVideoStore(s => s.updateSlide);
  const handleSelectEntity = useVideoStore(s => s.handleSelectEntity);
  const openEntitySettings = useVideoStore(s => s.openEntitySettings);


  useEffect(() => {
    // Prevent re-initialization with the same configs
    const lastInit = initializationRef.current;
    if (lastInit.config === config && lastInit.videoConfig === videoConfig) {
      console.log("Skipping re-init - same configs");
      return;
    }

    console.log("EditorPage: Calling initialize with:", {
      config: !!config,
      videoConfig: !!videoConfig,
      sections: videoConfig?.sections?.length
    });

    initialize(config, videoConfig, { onConfigChange });

    // Store references to prevent re-initialization
    initializationRef.current = { config, videoConfig };
  }, [config, videoConfig, initialize, onConfigChange]);

  // Centralized preview handler - plays a slide from start and pauses at end
  const handlePreviewSlide = (slideId: string) => {
    console.log("DEBUG", "playing preview slide:", slideId, playerRef.current)
    playerRef.current?.playFromSlideStart(slideId);
  };

  // Centralized fullscreen handler
  const handleFullscreenChange = (isFullscreen: boolean) => {
    if (isFullscreen) {
      // Auto-play when entering fullscreen
      setTimeout(() => {
        playerRef.current?.play();
      }, 150);
    }
  };

  // Early return if not initialized
  if (!isInitialized || !selectedSlide) {
    return (
      <div className="h-screen flex items-center justify-center bg-muted/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading editor...</p>
        </div>
      </div>
    );
  }

  return <div className="h-screen flex flex-col bg-muted/30">
    {/* Header */}
    <header className="h-14 bg-card border-b border-border flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-4">
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
              <Menu className="w-5 h-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetHeader className="p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Video className="w-4 h-4 text-primary-foreground" />
                </div>
                <SheetTitle className="text-lg">CoasterAI</SheetTitle>
              </div>
            </SheetHeader>
            <nav className="p-4 space-y-1">
              {config.navigation.menuItems.map(item => {
                const Icon = iconMap[item.icon] || Home;
                return <button key={item.id} onClick={() => item.path && router.push(item.path)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>;
              })}
            </nav>
          </SheetContent>
        </Sheet>
        <div className="h-6 w-px bg-border" />
        <span className="font-semibold">{videoConfig.project.name}</span>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full capitalize">
          {videoConfig.project.status}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <ResolutionSelector />
        <Button variant="outline" size="sm" onClick={() => setShowVoiceover(true)} className="gap-2">
          <Mic2 className="w-4 h-4" />
          Voiceover
        </Button>
        <Button className="btn-accent-gradient gap-2">
          <Eye className="w-4 h-4" />
          Export
        </Button>
      </div>
    </header>

    {/* Main Editor Area */}
    <div className="flex-1 flex overflow-hidden">
      {/* Left Sidebar - Storyboard Timeline OR Settings Panel */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-96 bg-card border-r border-border flex flex-col"
      >
        <AnimatePresence mode="wait">
          {activeTool ? (
            <ToolsSettingsPanel
              onPreviewTemplate={() => handlePreviewSlide(selectedSlide.slide.id)}
              onUpdateCanvasObject={(updates) => {
                if (selectedObjectId) {
                  updateCanvasObject(selectedObjectId, updates);
                }
              }}
              onUpdateSpotlight={(updates) => {
                if (selectedObjectId) {
                  updateSpotlight(selectedObjectId, updates);
                }
              }}             
              onDeleteCanvasObject={() => {
                if (selectedObjectId) {
                  deleteCanvasObject(selectedObjectId);
                }
              }}
              onSpotlightApply={() => {
                // Apply spotlight - just close the panel
                handleCloseTool();
              }}
              onSpotlightPlay={() => handlePreviewSlide(selectedSlide.slide.id)}
              selectedStackItemId={selectedStackItemId}
              onSelectStackItem={(itemId) => {
                // Use unified selection handler for stack items
                handleSelectEntity(createStackItemEntityId(selectedSlide.slide.id, itemId));
                // No need to seek - StackSlide will show the selected item when paused
              }}
            />
          ) : (
            <motion.div
              key="storyboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full flex flex-col"
            >
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="font-semibold">Storyboard</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{sections.length} sections</span>
                  <span>•</span>
                  <span>{sections.reduce((acc, s) => acc + s.slides.length, 0)} slides</span>
                </div>
              </div>

              <StoryboardPanel
                onSelectSlide={(section, slide) => {
                  console.log(`[EditorPage] Manual slide selection from slide card: ${slide.id}`);
                  // Use unified selection handler
                  const entityId = createSlideEntityId(slide.id);
                  handleSelectEntity(entityId);
                  // Use manual slide selection behavior - seek to end and prepare for restart
                  playerRef.current?.selectSlideManually(slide.id);
                  // For stack slides, auto-open settings (slide-level settings)
                  if (slide.type === SlideType.STACK) {
                    openEntitySettings(entityId);
                  }
                }}
                onStartEditTitle={(id, title) => {
                  setEditingSectionId(id);
                  setEditingSectionTitle(title);
                }}
                onSaveTitle={() => {
                  if (editingSectionId) {
                    updateSectionTitle(editingSectionId, editingSectionTitle);
                  }
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.aside>

      {/* Right - Full Preview with Remotion Player and optional props panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Main player area */}
        <div className="flex-1 flex flex-col min-w-0">
          <RemotionPlayer
            ref={playerRef}
            onSlideChange={slideId => {
              // Use unified selection handler
              handleSelectEntity(createSlideEntityId(slideId));
            }}
            onStackItemChange={(itemId) => {
              // Update stack item selection during playback
              if (itemId && selectedSlide.slide.type === SlideType.STACK) {
                handleSelectEntity(createStackItemEntityId(selectedSlide.slide.id, itemId));
              }
            }}
            onFullscreenChange={handleFullscreenChange}
            onSelectOverlayFromTimeline={(overlayId, slideId) => {
              // Use unified selection handler
              handleSelectEntity(createOverlayEntityId(slideId, overlayId));
            }}
            // Duration change handler
            onDurationChange={(slideId, newDuration) => {
              updateSlide({ duration: newDuration });
            }}
            onSelectTemplate={(slideId) => {
              console.log("DEBUG", "selected templated slide: ", slideId)
              const entityId = createSlideEntityId(slideId);
              handleSelectEntity(entityId);
              // Open template settings when clicking on template
              openEntitySettings(entityId);
            }}
            transcriptPanel={
              (() => {
                // Safety check - should not happen due to early return above
                if (!selectedSlide) return null;

                // If a stack item is selected, show its transcript
                let currentTranscript = selectedSlide.slide.transcript;
                let handleTranscriptChange = updateSlideTranscript;

                if (selectedSlide.slide.type === SlideType.STACK && selectedStackItemId) {
                  const content = selectedSlide.slide.content.value as StackSlideContent;
                  const items = content?.items || [];
                  const selectedItem = items.find((item: Slide) => item.id === selectedStackItemId);
                  if (selectedItem) {
                    currentTranscript = selectedItem.transcript;
                    handleTranscriptChange = (newTranscript: string) => {
                      // Update the specific item's transcript
                      const updatedItems = items.map((item: Slide) =>
                        item.id === selectedStackItemId
                          ? { ...item, transcript: newTranscript }
                          : item
                      );
                      updateSlide({
                        content: {
                          case: "stack",
                          value: {
                            ...content,
                            items: updatedItems
                          }
                        }
                      });
                    };
                  }
                }

                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Voiceover Script
                        {selectedSlide.slide.type === SlideType.STACK && selectedStackItemId && " (Item)"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 max-w-xl">
                        <Textarea
                          value={currentTranscript}
                          onChange={e => handleTranscriptChange(e.target.value)}
                          placeholder="Enter slide transcript..."
                          className="text-sm min-h-[40px] resize-none"
                          rows={1}
                          onInput={e => {
                            const target = e.target as HTMLTextAreaElement;
                            target.style.height = "auto";
                            target.style.height = `${target.scrollHeight}px`;
                          }}
                        />
                      </div>
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 flex-shrink-0"
                              onClick={handleGenerateSlideVoiceover}
                              disabled={generatingSlideVoiceover === selectedSlide.slide.id}
                            >
                              {generatingSlideVoiceover === selectedSlide.slide.id ? (
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                >
                                  <RefreshCw className="w-4 h-4" />
                                </motion.div>
                              ) : (
                                <Mic2 className="w-4 h-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-xs">
                            {selectedSlide.slide.voiceoverGenerated ? "Regenerate" : "Generate"} voiceover
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                );
              })()
            }
          />
        </div>

        {/* Template props are now shown in the left storyboard/settings panel for consistency */}
      </div>
    </div>

    {/* Modals */}
    {/* <ScreenshotLibrary /> */}
    <VoiceoverPanel />


  </div>;
};
export default EditorPage;