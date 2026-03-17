# Paused Editing With Transitions

## Problem

`TransitionSeries` mounts overlapping slide DOM during transitions. That is correct for playback, but it breaks editor hit-testing in paused mode because the animation edit layer can end up targeting the wrong slide's DOM.

This was most visible in `AnimationEditLayer` inside the portal player:

- playback looked correct
- paused editing during or near transitions could not reliably select elements
- disabling transitions made editing work again

## Approach

When the player is paused, the renderer does not use `TransitionSeries`.

Instead, `RemotionSlideshow` renders a plain `Series` timeline for edit mode:

- each slide still uses its normal `durationInFrames`
- if a slide transitions to the next slide, its edit-mode visible duration is reduced by `transitionDurationFrames`
- no overlap is rendered in edit mode

This keeps only one slide DOM subtree mounted at a time, which makes editor hit-testing stable.

## Why This Still Syncs

`TransitionSeries` effective timeline length is:

`sum(slide durations) - sum(transition overlap durations)`

The paused edit-mode `Series` matches that by shortening each transitioning slide by the same overlap duration.

Important detail:

- do not add spacer sequences for the removed overlap
- spacers make the paused edit timeline longer than playback and cause frame drift

## Code Paths

Renderer:

- [RemotionSlideshow.tsx](/Users/shank/Documents/code/streamingfast/CoasterAI/frontend/packages/renderer/src/RemotionSlideshow.tsx)
- playback uses `TransitionSeries`
- paused edit mode uses `Series`

Portal player:

- [PlayerCanvas.tsx](/Users/shank/Documents/code/streamingfast/CoasterAI/frontend/portal/src/components/editor/canvas/PlayerCanvas.tsx)
- passes `isEditing: isEditing && !isPlaying` into the slideshow input props

Frame math:

- [frame_calculations.ts](/Users/shank/Documents/code/streamingfast/CoasterAI/frontend/portal/src/components/editor/frame_calculations.ts)
- `calculateRealTotalFrames()` matches playback overlap math
- `getSlideVisualEndFrame()` matches playback seek behavior
- `getSlideEditPreviewFrame()` matches paused edit-mode seek behavior

Player seeking:

- [RemotionPlayer.tsx](/Users/shank/Documents/code/streamingfast/CoasterAI/frontend/portal/src/components/editor/canvas/RemotionPlayer.tsx)
- when paused, slide selection seeks with `getSlideEditPreviewFrame()`
- when playing, slide selection keeps using playback frame helpers

## Invariants

These rules must stay aligned:

1. The renderer and frame helpers must use the same definition of `hasTransition`.
2. A transition only counts if the slide is not the last slide.
3. Paused edit mode must not render overlapping slide DOM.
4. Paused edit-mode seek helpers must mirror the paused renderer timeline, not the playback timeline.

Current `hasTransition` rule:

```ts
const hasTransition =
  index < allSlides.length - 1 &&
  slide.transition !== TransitionType.TRANSITION_NONE
```

## What Changed

1. Paused editing now switches to a non-overlapping `Series` timeline in the renderer.
2. Transitioning slides are shortened in paused edit mode by `transitionDurationFrames`.
3. The portal player uses paused-only frame helpers when seeking while not playing.
4. Playback mode remains unchanged and still uses real transition rendering.

## Tradeoff

Paused edit mode is no longer a pixel-exact view of the transition overlap itself. It is a stable editing view of the slide content on the same effective timeline.

That tradeoff is intentional because editing is only allowed while paused, and stable hit-testing matters more than previewing the overlap DOM structure.
