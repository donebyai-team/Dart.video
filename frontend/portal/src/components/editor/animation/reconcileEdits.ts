import { RegistryEntry } from "@coasterai/renderer"
import { ElementEdit } from "@coasterai/renderer/src/types/ast"

/*
## All Cases Now
```
fontWeight in prev + next, prev value matches with edit value, user edited it and hence keep it
so no llm override allowed
fontWeight in prev + next, same type   →  kept
fontWeight in prev, gone from next     →  dropped (LLM removed it)
fontWeight not in prev, not in next    →  kept   (user manually added)
fontWeight not in prev, in next        →  kept   (LLM added it, user edited it)
fontWeight animated→static             →  dropped (type changed)
*/
export function reconcileEdits(
    prevRegistry: Record<string, RegistryEntry>,
    nextRegistry: Record<string, RegistryEntry>,
    currentEdits: Record<string, ElementEdit>
): Record<string, ElementEdit> {
    // console.debug(
    //     "reconciling",
    //     JSON.stringify(prevRegistry, null, 2),
    //     JSON.stringify(nextRegistry, null, 2),
    //     JSON.stringify(currentEdits, null, 2)
    // )

    const result: Record<string, ElementEdit> = {}

    for (const [eid, edit] of Object.entries(currentEdits)) {
        const prevEntry = prevRegistry[eid]
        const nextEntry = nextRegistry[eid]

        // Element no longer exists in new code — drop it
        if (!nextEntry) continue

        // Element type changed — drop entire edit
        if (prevEntry?.elementType !== nextEntry.elementType) continue

        const reconciledEdit: ElementEdit = {}

        // Reconcile text
        if (edit.text != null) {
            if (nextEntry.textType === 'static' ||
                nextEntry.textType === 'letter-cascade' ||
                nextEntry.textType === 'typewriter') {

                // Drop if sourceText changed — LLM wrote new text
                if (prevEntry?.sourceText === nextEntry.sourceText) {
                    reconciledEdit.text = edit.text
                }
            }
        }

        // if (edit.typewriterSource != null) {
        //     if (nextEntry.textType === 'typewriter') {
        //         if (prevEntry?.sourceText === nextEntry.sourceText) {
        //             reconciledEdit.typewriterSource = edit.typewriterSource
        //         }
        //     }
        // }

        if (edit.words != null) {
            if (nextEntry.textType === 'word-cycle') {
                // Drop if word list changed in new code
                const prevWords = JSON.stringify(prevEntry?.words ?? [])
                const nextWords = JSON.stringify(nextEntry.words ?? [])
                if (prevWords === nextWords) {
                    reconciledEdit.words = edit.words
                }
            }
        }

        // Reconcile style — keep only props that exist in new registry
        // with the same type (editable/animated/nonEditable)
        if (edit.style) {
            const reconciledStyle: Record<string, string | number> = {}
            for (const [prop, value] of Object.entries(edit.style)) {
                const prevProp = prevEntry?.editableProps?.[prop]
                const nextProp = nextEntry.editableProps?.[prop]

                // Prop existed in prev code but gone from new code — drop it
                if (prevProp && !nextProp) continue

                // Prop not in new code AND not in prev code
                // → was manually added by user → always keep it
                if (!prevProp && !nextProp) {
                    reconciledStyle[prop] = value
                    continue
                }

                // Prop exists in new registry — apply normal reconcile
                // Prop exists in new registry — apply normal reconcile
                if (!nextProp.editable) continue

                // if the prev style matches the edit store style
                // user edited it, llm should not override it
                const prevDefault = prevEntry?.staticStyle?.[prop]
                if (prevDefault !== undefined && value === prevDefault) continue

                const prevIsAnimated = !!prevEntry?.animatedProps?.[prop]
                const nextIsAnimated = !!nextEntry.animatedProps?.[prop]
                if (prevIsAnimated !== nextIsAnimated) continue


                reconciledStyle[prop] = value
            }            
            if (Object.keys(reconciledStyle).length > 0) {
                reconciledEdit.style = reconciledStyle
            }
        }

        // Reconcile ranges
        if (edit.ranges) {
            const reconciledRanges: Record<string, any[]> = {}
            for (const [prop, range] of Object.entries(edit.ranges)) {
                const nextAnimated = nextEntry.animatedProps?.[prop]
                if (nextAnimated?.type === 'interpolate') {
                    reconciledRanges[prop] = range
                }
            }
            if (Object.keys(reconciledRanges).length > 0) {
                reconciledEdit.ranges = reconciledRanges
            }
        }

        // Reconcile springs
        if (edit.springs) {
            const reconciledSprings: Record<string, Record<string, number>> = {}
            for (const [prop, spring] of Object.entries(edit.springs)) {
                const nextAnimated = nextEntry.animatedProps?.[prop]
                if (nextAnimated?.type === 'spring') {
                    reconciledSprings[prop] = spring
                }
            }
            if (Object.keys(reconciledSprings).length > 0) {
                reconciledEdit.springs = reconciledSprings
            }
        }

        // Reconcile counter
        if (edit.counter != null) {
            if (nextEntry.textType === 'counter') {
                reconciledEdit.counter = edit.counter
            }
        }

        // Reconcile transform — keep if element still exists and same type
        if (edit.transform != null) {
            reconciledEdit.transform = edit.transform
        }

        // Reconcile asset
        if (edit.asset != null) {
            if (nextEntry.assetType === prevEntry?.assetType && nextEntry.assetType === 'image') {
                reconciledEdit.asset = edit.asset
            }
        }

        // Reconcile words
        if (edit.words != null) {
            if (nextEntry.textType === 'word-cycle') {
                reconciledEdit.words = edit.words
            }
        }

        // Only keep eid if there's something left
        if (Object.keys(reconciledEdit).length > 0) {
            result[eid] = reconciledEdit
        }
    }

    return result
}