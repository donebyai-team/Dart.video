// Comprehensive editor configuration types
// The entire editor is driven by this JSON configuration

import type {
  Section,
  SlideType,
  EffectType,
  TransitionType
} from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { Resolution, Video } from "@coasterai/pb/coasterai/core/v1/video_pb";

// ==========================================
// Project & Metadata
// ==========================================

export interface ProjectMetadata {
  id: string;
  name: string;
  status: "draft" | "published" | "archived";
  createdAt: string;
  updatedAt: string;
  author?: string;
  description?: string;
  tags?: string[];
}

// ==========================================
// Voiceover Configuration
// ==========================================

export interface VoiceOption {
  id: string;
  name: string;
  language: string;
  gender: "male" | "female" | "neutral";
  preview?: string; // URL to voice sample
}

export interface VoiceoverConfig {
  enabled: boolean;
  defaultVoice?: string;
  voices: VoiceOption[];
  speed: number; // 0.5 - 2.0
  pitch: number; // 0.5 - 2.0
}

// ==========================================
// Color & Gradient Presets
// ==========================================

export interface ColorPreset {
  name: string;
  value: string; // hex color
}

export interface GradientPreset {
  name: string;
  value: string; // CSS gradient string
}

export interface BackgroundConfig {
  solidColors: ColorPreset[];
  gradients: GradientPreset[];
  defaultColor: string;
}

// ==========================================
// Typography Configuration
// ==========================================

export interface FontOption {
  value: string;
  label: string;
  url?: string; // Optional Google Fonts URL
}

export interface FontStyleOption {
  value: string;
  label: string;
}

export interface TypographyConfig {
  fonts: FontOption[];
  styles: FontStyleOption[];
  defaultFont: string;
  defaultStyle: string;
  defaultSize: number;
  minSize: number;
  maxSize: number;
}

// ==========================================
// Animation Configuration
// ==========================================

export interface AnimationOption {
  value: string;
  label: string;
  description?: string;
}

export interface TextAnimationDefaults {
  fontFamily: string;
  fontStyle: string;
  fontSize: number;
  animation: string;
  duration: number;
}

// ==========================================
// Text Animation Template Configuration
// ==========================================

export interface TemplateProperty {
  key: string;
  label: string;
  type: "number" | "text" | "color" | "select";
  default: string | number;
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
}

export interface TextAnimationTemplate {
  id: string;
  name: string;
  description: string;
  category: "numbers" | "text" | "effects";
  preview: string;
  properties: TemplateProperty[];
}

export interface TextAnimationTemplateConfig {
  templateId: string;
  props: Record<string, string | number>;
}

export interface TextAnimationTemplatesConfig {
  templates: TextAnimationTemplate[];
  defaultTemplateId: string;
  categoryLabels: Record<string, string>;
  categoryIcons: Record<string, string>;
}

export interface AnimationConfig {
  textAnimations: AnimationOption[];
  defaultTextAnimation: TextAnimationDefaults;
  transitionDuration: {
    min: number;
    max: number;
    default: number;
  };
}

// ==========================================
// Transition Configuration
// ==========================================

export interface TransitionOption {
  id: TransitionType;
  name: string;
  preview: string; // CSS class for preview
}

export interface TransitionsConfig {
  options: TransitionOption[];
  default: TransitionType;
}

// ==========================================
// Resolution Configuration
// ==========================================

export interface ResolutionConfig {
  options: Resolution[];
  default: string; // Resolution id
}

// ==========================================
// Insert/Canvas Tools Configuration
// ==========================================

export interface InsertToolOption {
  id: EffectType;
  name: string;
  icon: string; // Icon name (e.g., "Type", "Square")
}

export interface InsertToolDefaults {
  callout: {
    calloutStyle: "pointer" | "circle" | "box" | "numbered";
    color: string;
  };
  spotlight: {
    spotlightRadius: number;
    blurAmount: number;
    color: string;
  };
}

export interface InsertToolConfig {
  tools: InsertToolOption[];
  defaults: InsertToolDefaults;
  colorPresets: string[];
  opacityDefault: number;
  durationDefault: number;
}

// ==========================================
// Slide Type Configuration
// ==========================================

// Base slide type configuration
export interface SlideTypeBase {
  id: SlideType;
  name: string;
  description: string;
  icon: string;
  color: string;
  defaultDuration: number;
  defaultTranscript: string;
  defaultBackground?: string;
  // NEW ARCHITECTURE: Available tools and effects for this slide type
  availableTools?: string[];  // Annotation tools: text, rectangle, arrow, callout
  availableEffects?: string[]; // Canvas effects: spotlight, zoom
  supportsContent?: boolean;   // Whether content (image/video) can be resized/repositioned
}

// Image slide type config
export interface MediaSlideConfig extends SlideTypeBase {
  id: SlideType.MEDIA;
  supportedFormats: string[];
  maxFileSize: number; // in MB
  canvasEnabled: boolean;
}

// Text animation slide type config
export interface TextAnimationSlideConfig extends SlideTypeBase {
  id: SlideType.TEXT_ANIMATION;
  templates: TextAnimationTemplatesConfig;
}

// Infographic slide type config
export interface InfographicSlideConfig extends SlideTypeBase {
  id: SlideType.INFOGRAPHIC;
  chartTypes: { id: string; name: string; icon: string }[];
  dataSourceTypes: string[];
}

// Visual animation slide type config
export interface VisualAnimationSlideConfig extends SlideTypeBase {
  id: SlideType.VISUAL_ANIMATION;
  aiEnabled: boolean;
  generationPromptPlaceholder: string;
}


// Stack slide type config
export interface StackSlideConfig extends SlideTypeBase {
  id: SlideType.STACK;
  minItems: number;
  maxItems: number;
  animationModes: string[];
  defaultAnimationMode: string;
}

// Union of all slide type configs
export type SlideTypeConfig =
  | MediaSlideConfig
  | TextAnimationSlideConfig
  | InfographicSlideConfig
  | VisualAnimationSlideConfig
  | StackSlideConfig;

export interface SlideTypesConfig {
  types: SlideTypeConfig[];
  defaultSlideType: SlideType;
}

// ==========================================
// Section Configuration
// ==========================================

export interface SectionConfig {
  defaultColor: string;
  defaultTitle: string;
}

// ==========================================
// Navigation Menu Configuration
// ==========================================

export interface NavMenuItem {
  id: string;
  label: string;
  icon: string;
  path?: string;
  action?: string;
}

export interface NavigationConfig {
  menuItems: NavMenuItem[];
  brandName: string;
  brandIcon: string;
}

// ==========================================
// Complete Editor Configuration
// ==========================================

export interface EditorConfig {
  // Settings & Options
  resolution: ResolutionConfig;
  transitions: TransitionsConfig;
  slideTypes: SlideTypesConfig;

  // Tool configurations
  background: BackgroundConfig;
  typography: TypographyConfig;
  animation: AnimationConfig;
  insertTools: InsertToolConfig;

  // Voiceover
  voiceover: VoiceoverConfig;

  // Navigation
  navigation: NavigationConfig;
}

// ==========================================
// Editor State (Runtime)
// ==========================================

export interface EditorState {
  selectedSlideId: string | null;
  selectedSectionId: string | null;
  selectedEffectId: string | null;
  activeTool: string | null;
  isPlaying: boolean;
  currentFrame: number;
  scale: number;
}

// ==========================================
// Editor Callbacks/Handlers
// ==========================================

export interface EditorCallbacks {
  onSave?: (config: EditorConfig, videoConfig: Video) => void;
  onExport?: (format: string) => void;
  onPublish?: () => void;
  onConfigChange?: (config: EditorConfig, videoConfig: Video) => void;
}
