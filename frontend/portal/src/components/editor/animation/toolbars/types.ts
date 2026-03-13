/** Common props passed to every sub-toolbar component. */
export interface ToolbarProps {
  /** Element ID, e.g. "fadein-0" */
  id: string
  /** Component name, e.g. "FadeIn" */
  componentName: string
  /** Current prop values from the overlay (initial LLM values + user edits) */
  currentProps: Record<string, unknown>
  /** Apply a single prop value change */
  onValuePatch: (prop: string, value: unknown) => void
}
