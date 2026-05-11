import { EffectType } from "@coasterai/pb/coasterai/core/v1/slide_pb";

export interface AddOrEditAnimationSettings {
  animationElementId?: string
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
  ANIMATION_CODE = "animation-code",
  REIMAGINE = "reimagine",
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
  | { type: ActiveToolType.ANIMATION_CODE }
  | { type: ActiveToolType.VISUAL_ANIMATION_SETTINGS }
  | { type: ActiveToolType.TEXT_ANIMATION_SETTINGS }
  | { type: ActiveToolType.ADD_OR_EDIT_ANIMATION; settings: AddOrEditAnimationSettings }
  | { type: ActiveToolType.NONE };
