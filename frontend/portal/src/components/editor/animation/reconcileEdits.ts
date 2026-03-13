import type { PrimitiveElement, PatchOverlay, ElementPatchEntry } from '@coasterai/renderer'

/**
 * Reconcile user edits across code regeneration.
 *
 * Rules:
 * - Patch survives if the new code has an element with the same ID and same component type.
 * - Patch is dropped if the element ID disappears from the new code.
 * - Patch is dropped if the component type changes (e.g. FadeIn replaced by SlideIn).
 * - Style override patches survive type changes (style is component-agnostic).
 */
export function reconcileEdits(
  prevRegistry: Record<string, PrimitiveElement>,
  nextRegistry: Record<string, PrimitiveElement>,
  currentEdits: PatchOverlay,
): PatchOverlay {
  const result: PatchOverlay = {}

  for (const [id, entry] of Object.entries(currentEdits)) {
    const prevEntry = prevRegistry[id]
    const nextEntry = nextRegistry[id]

    // Element no longer exists in new code — drop it
    if (!nextEntry) continue

    const reconciled: ElementPatchEntry = {}

    // Value patches: keep if same component type, drop if type changed
    if (entry.value && Object.keys(entry.value).length > 0) {
      if (prevEntry?.componentName === nextEntry.componentName) {
        // Keep value patches only for props that the new component still has in editorProps
        const validProps = new Set(nextEntry.editorProps)
        const reconciledValues: Record<string, unknown> = {}
        for (const [prop, val] of Object.entries(entry.value)) {
          // Timing props (startAt, durationInFrames) are always valid
          if (prop === 'startAt' || prop === 'durationInFrames' || validProps.has(prop)) {
            reconciledValues[prop] = val
          }
        }
        if (Object.keys(reconciledValues).length > 0) {
          reconciled.value = reconciledValues
        }
      }
    }

    // Style overrides: always survive (component-agnostic)
    if (entry.styleOverride && Object.keys(entry.styleOverride).length > 0) {
      reconciled.styleOverride = entry.styleOverride
    }

    // Swap: drop if component type changed
    if (entry.swap && prevEntry?.componentName === nextEntry.componentName) {
      reconciled.swap = entry.swap
    }

    if (Object.keys(reconciled).length > 0) {
      result[id] = reconciled
    }
  }

  return result
}
