/** Common props passed to every sub-toolbar component. */
export interface ToolbarProps {
  /** Element ID, e.g. "fadein-0" */
  id: string
  /** Component name, e.g. "FadeIn" */
  componentName: string
  /** Merged props: original JSX values + any user value patches applied */
  currentProps: Record<string, unknown>
  /** Current style overrides from the user */
  styleOverride: Record<string, string | number>
  /** Apply a single prop value change */
  onValuePatch: (prop: string, value: unknown) => void
  /** Apply multiple prop value changes at once */
  onValuePatches: (values: Record<string, unknown>) => void
  /** Apply CSS style overrides */
  onStyleOverride: (style: Record<string, string | number>) => void
}
