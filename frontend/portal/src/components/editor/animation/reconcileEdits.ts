import {
  resolveComponentFromId,
  type PatchOverlay,
  type ElementPatchEntry,
} from '@coasterai/renderer'

/**
 * Reconcile user edits across code regeneration.
 *
 * prevOverlay: the overlay from the old code (initial + user edits)
 * nextInitialOverlay: the fresh initial overlay from the new code's AST pass
 *
 * Rules:
 * - Value patch survives if the new code has an element with the same ID
 *   and the same component type (derived from ID prefix via COMPONENT_REGISTRY).
 * - Style overrides always survive if the element ID still exists (component-agnostic).
 * - Swap patches survive if same component type.
 * - If element ID disappears in new code, all patches are dropped.
 */
export function reconcileEdits(
  prevOverlay: PatchOverlay,
  nextInitialOverlay: PatchOverlay,
): PatchOverlay {
  const result: PatchOverlay = { ...nextInitialOverlay }

  for (const [id, prevEntry] of Object.entries(prevOverlay)) {
    // Element doesn't exist in new code — drop
    if (!(id in nextInitialOverlay)) continue

    const nextEntry = nextInitialOverlay[id] ?? {}
    const reconciled: ElementPatchEntry = { ...nextEntry }

    // Check if same component type (for primitives, derived from ID prefix)
    const prevReg = resolveComponentFromId(id)
    const nextReg = resolveComponentFromId(id)
    const sameType = prevReg?.name === nextReg?.name // always true since ID prefix is deterministic

    // Value patches: merge user overrides on top of new initial values
    if (prevEntry.value && sameType) {
      const newEditorProps = new Set(nextReg?.editorProps ?? [])
      const mergedValues = { ...(nextEntry.value ?? {}) }
      for (const [prop, val] of Object.entries(prevEntry.value)) {
        // Timing props always survive
        if (prop === 'startAt' || prop === 'durationInFrames') {
          mergedValues[prop] = val
          continue
        }
        // Other props: survive if still in editorProps, and different from new initial value
        if (newEditorProps.has(prop)) {
          const newInitVal = nextEntry.value?.[prop]
          if (newInitVal !== val) {
            // User had changed this prop — keep the user's value
            mergedValues[prop] = val
          }
        }
      }
      reconciled.value = mergedValues
    }

    // Style overrides: always survive (component-agnostic)
    if (prevEntry.styleOverride && Object.keys(prevEntry.styleOverride).length > 0) {
      reconciled.styleOverride = { ...(nextEntry.styleOverride ?? {}), ...prevEntry.styleOverride }
    }

    // Swap: survive if same component type
    if (prevEntry.swap && sameType) {
      reconciled.swap = prevEntry.swap
    }

    result[id] = reconciled
  }

  return result
}
