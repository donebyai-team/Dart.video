import { EffectType } from "@coasterai/pb/coasterai/core/v1/slide_pb";

export interface SelectedTool {
  type: ActiveToolType
  tool?: EffectType
}

export enum ActiveToolType {
  NONE = "none",
  BACKGROUND = "background",
  INSERT = "insert",
  TEXT_ANIMATION_TEMPLATE = "text-animation-template",
  VISUAL_ANIMATION_SETTINGS = "visual-animation-settings",
  TEXT_ANIMATION_SETTINGS = "text-animation-settings",
  STACK_SETTINGS = "stack-settings",
}

export type SelectedTools =
  | { type: ActiveToolType.BACKGROUND }
  | { type: ActiveToolType.TEXT_ANIMATION_TEMPLATE }
  | { type: ActiveToolType.VISUAL_ANIMATION_SETTINGS }
  | { type: ActiveToolType.TEXT_ANIMATION_SETTINGS }
  | { type: ActiveToolType.STACK_SETTINGS }
  | { type: ActiveToolType.INSERT; tool: EffectType }
  | { type: ActiveToolType.TEXT_ANIMATION_TEMPLATE }
  | { type: ActiveToolType.VISUAL_ANIMATION_SETTINGS }
  | { type: ActiveToolType.TEXT_ANIMATION_SETTINGS }
  | { type: ActiveToolType.NONE };