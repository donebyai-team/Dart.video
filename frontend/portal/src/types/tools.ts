import { SelectedSection } from "@/stores/video/types";
import { EffectType } from "@coasterai/pb/coasterai/core/v1/slide_pb";

export interface AddOrEditAnimationSettings {
  previousSlide?: SelectedSection // if provided, we're adding an animation to a new slide after this previous slide
}

export interface SelectedTool {
  type: ActiveToolType
  tool?: EffectType
  settings?: AddOrEditAnimationSettings
}

export enum ActiveToolType {
  NONE = "none",
  BACKGROUND = "background",
  INSERT = "insert",
  FIGMA_IMPORT = "figma-import",
  ANIMATION_CODE = "animation-code",
  TEXT_ANIMATION_TEMPLATE = "text-animation-template",
  VISUAL_ANIMATION_SETTINGS = "visual-animation-settings",
  TEXT_ANIMATION_SETTINGS = "text-animation-settings",
  ADD_OR_EDIT_ANIMATION = "add-or-edit-animation",
}

export type SelectedTools =
  | { type: ActiveToolType.BACKGROUND }
  | { type: ActiveToolType.TEXT_ANIMATION_TEMPLATE }
  | { type: ActiveToolType.VISUAL_ANIMATION_SETTINGS }
  | { type: ActiveToolType.TEXT_ANIMATION_SETTINGS }
  | { type: ActiveToolType.INSERT; tool: EffectType }
  | { type: ActiveToolType.FIGMA_IMPORT }
  | { type: ActiveToolType.ANIMATION_CODE }
  | { type: ActiveToolType.TEXT_ANIMATION_TEMPLATE }
  | { type: ActiveToolType.VISUAL_ANIMATION_SETTINGS }
  | { type: ActiveToolType.TEXT_ANIMATION_SETTINGS }
  | { type: ActiveToolType.ADD_OR_EDIT_ANIMATION; settings: AddOrEditAnimationSettings }
  | { type: ActiveToolType.NONE };
