// Comprehensive editor configuration types
// The entire editor is driven by this JSON configuration
import { Resolution } from "@coasterai/pb/coasterai/core/v1/video_pb";



// ==========================================
// Resolution Configuration
// ==========================================

export interface ResolutionConfig {
  options: Resolution[];
  default: string; // Resolution id
}


// ==========================================
// Complete Editor Configuration
// ==========================================

export interface EditorConfig {
  // Settings & Options
  resolution: ResolutionConfig;
}