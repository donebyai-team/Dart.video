// Unified slide types used across the editor

export enum SlideType {
  IMAGE = "image",
  TEXT_ANIMATION = "text-animation",
  INFOGRAPHIC = "infographic",
  VISUAL_ANIMATION = "visual-animation",
  VIDEO = "video",
  STACK = "stack",
}

// Stack Animation Mode
export enum StackAnimationMode {
  Stack = "Stack",
  Reveal = "Reveal",
}

// ========== NEW ARCHITECTURE: Content, Effects, Annotations ==========

// Slide Content Types (type-specific content for each slide)
export type SlideContent =
  | ImageSlideContent
  | VideoSlideContent
  | TextAnimationSlideContent
  | InfographicSlideContent
  | VisualAnimationSlideContent
  | StackSlideContent;

export interface ImageSlideContent {
  type: "image";
  src: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
}

export interface VideoSlideContent {
  type: "video";
  src: string;
  startTime?: number;
  endTime?: number;
}

export interface TextAnimationSlideContent {
  type: "text-animation";
  template_id: string; // e.g., "text-reveal", "word-by-word", "letter-cascade"
  template_config: {
    text: string;
    fontSize?: number;
    color?: string;
    direction?: string;
    // Template positioning (defaults to 80% centered if not provided)
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    [key: string]: any; // Allow additional template-specific properties
  };
}

export interface InfographicSlideContent {
  type: "infographic";
  template_id: string; // e.g., "bar-chart", "pie-chart", "stats-grid"
  template_config: {
    // Template positioning (defaults to 80% centered if not provided)
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    [key: string]: any; // Template-specific properties
  };
}

export interface VisualAnimationSlideContent {
  type: "visual-animation";
  template_id: string; // e.g., "particles", "waves", "geometric"
  template_config: {
    // Template positioning (defaults to 80% centered if not provided)
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    [key: string]: any; // Template-specific properties
  };
}

export interface StackSlideContent {
  type: "stack";
  animationMode: StackAnimationMode;
  items: Slide[]; // Array of full Slide objects (typically IMAGE or VIDEO type)
}

// Effect Types (canvas-level effects)
export type SlideEffect = SpotlightEffect | ZoomEffect;

export interface SpotlightEffect {
  id: string;
  type: "spotlight";
  x: number;
  y: number;
  width: number;
  height: number;
  blurAmount: number;
  borderRadius: number;
  startTime: number; // Seconds from slide start
  endTime: number;   // Seconds from slide start
}

export interface ZoomEffect {
  id: string;
  type: "zoom";
  x: number;
  y: number;
  zoomLevel: number;
  startTime: number;
  endTime: number;
}

// Annotation Types (overlay annotations like text, shapes)
export type AnnotationObject = | CalloutAnnotation


export interface CalloutAnnotation {
  id: string;
  type: "callout";
  x: number;
  y: number;
  color?: string;
  opacity?: number;
  calloutStyle?: "pointer" | "circle" | "box" | "numbered";
}

// ========== OLD ARCHITECTURE (DEPRECATED, for backward compatibility) ==========

// Canvas object types for annotations
export type CanvasObjectType = "callout" | "spotlight";

export interface CanvasObject {
  id: string;
  type: CanvasObjectType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  // Common properties
  color?: string;
  opacity?: number;
  duration?: number; // Duration in seconds for this object's animation
  // Text specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: "normal" | "bold" | "italic";
  // Text animation specific
  animation?: string;
  // Rectangle specific
  borderWidth?: number;
  borderRadius?: number;
  fill?: boolean;
  // Arrow specific
  points?: number[]; // [x1, y1, x2, y2]
  arrowSize?: number;
  arrowStyle?: "solid" | "dashed" | "dotted";
  // Callout specific
  calloutStyle?: "pointer" | "circle" | "box" | "numbered";
  // Spotlight specific
  spotlightRadius?: number;
  blurAmount?: number;
  // Spotlight timing (in seconds, relative to slide start)
  spotlightStartTime?: number;
  spotlightEndTime?: number;
  // Zoom specific
  zoomLevel?: number;
}

export interface Slide {
  id: string;
  type: SlideType;
  transcript: string; // Voiceover script (audio narration)
  duration: number;
  transition?: TransitionType;
  transitionDuration?: number;
  backgroundColor?: string; // Background color for the slide (hex or hsl)

  // Slide architecture
  content?: SlideContent;           // Type-specific content (image, video, etc.)
  effects?: SlideEffect[];          // Canvas-level effects (spotlight, zoom)
  annotations?: AnnotationObject[]; // Overlay annotations (text, shapes, arrows)

  // Additional properties
  voiceoverGenerated?: boolean;
  isNested?: boolean;
  subSlides?: Slide[];
}

export interface Section {
  id: string;
  title: string;
  color: string;
  slides: Slide[];
  voiceoverGenerated?: boolean;
}

export interface Resolution {
  id: string;
  name: string;
  aspect: string;
  width: number;
  height: number;
}

export const resolutions: Resolution[] = [
  { id: "16:9", name: "Landscape", aspect: "16/9", width: 1920, height: 1080 },
  { id: "4:3", name: "Standard", aspect: "4/3", width: 1440, height: 1080 },
  { id: "9:16", name: "Portrait", aspect: "9/16", width: 1080, height: 1920 },
  { id: "1:1", name: "Square", aspect: "1/1", width: 1080, height: 1080 },
];

// Transition types
export enum TransitionType {
  NONE = "none",
  FADE = "fade",
  SLIDE_LEFT = "slide-left",
  SLIDE_RIGHT = "slide-right",
  SLIDE_UP = "slide-up",
}

export const transitions = [
  { id: TransitionType.NONE, name: "None", preview: "bg-muted" },
  { id: TransitionType.FADE, name: "Fade", preview: "bg-gradient-to-r from-muted to-transparent" },
  { id: TransitionType.SLIDE_LEFT, name: "Slide Left", preview: "bg-gradient-to-l from-muted via-primary/20 to-transparent" },
  { id: TransitionType.SLIDE_RIGHT, name: "Slide Right", preview: "bg-gradient-to-r from-muted via-primary/20 to-transparent" },
  { id: TransitionType.SLIDE_UP, name: "Slide Up", preview: "bg-gradient-to-t from-muted via-primary/20 to-transparent" },
];

export const slideTypeOptions: { id: SlideType; name: string; description: string }[] = [
  { id: SlideType.IMAGE, name: "Image/Screenshot", description: "Add screen with annotations" },
  { id: SlideType.TEXT_ANIMATION, name: "Text Animation", description: "Animated typography" },
  { id: SlideType.INFOGRAPHIC, name: "Infographic", description: "Data-driven visuals" },
  { id: SlideType.VISUAL_ANIMATION, name: "Visual Animation", description: "AI-generated motion graphics" },
  { id: SlideType.VIDEO, name: "Video Clip", description: "Add video content" },
];
