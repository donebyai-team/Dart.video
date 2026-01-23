import { CanvasObjectType } from "./slides";

export type InsertToolType = CanvasObjectType;

export enum ActiveToolType {
  BACKGROUND = "background",
  INSERT = "insert",
  TEXT_ANIMATION_TEMPLATE = "text-animation-template",
  VISUAL_ANIMATION_SETTINGS = "visual-animation-settings",
  TEXT_ANIMATION_SETTINGS = "text-animation-settings",
  STACK_SETTINGS = "stack-settings",
}

export type ActiveTool =
  | { type: ActiveToolType.BACKGROUND }
  | { type: ActiveToolType.TEXT_ANIMATION_TEMPLATE }
  | { type: ActiveToolType.VISUAL_ANIMATION_SETTINGS }
  | { type: ActiveToolType.TEXT_ANIMATION_SETTINGS }
  | { type: ActiveToolType.STACK_SETTINGS }
  | { type: ActiveToolType.INSERT; tool: InsertToolType }
  | null;

  export type LeftPanelTool =
      | ActiveTool
      | { type: ActiveToolType.TEXT_ANIMATION_TEMPLATE }
      | { type: ActiveToolType.VISUAL_ANIMATION_SETTINGS }
      | { type: ActiveToolType.TEXT_ANIMATION_SETTINGS };