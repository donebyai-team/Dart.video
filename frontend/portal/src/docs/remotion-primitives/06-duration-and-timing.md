# 06 — Duration and Timing

→ This spec covers duration computation, the probe render, and user duration controls.
→ For how primitives register end frames: see 03-component-library.md
→ For compiler integration: see 05-compiler-and-ast.md

---

## The Duration Problem

Remotion requires `durationInFrames` to be declared on the Composition before rendering. The LLM does not declare duration. Duration must be computed from the generated component automatically.

In the previous system (raw Remotion code), duration was implicit in scattered `interpolate()` call ranges — fragile to extract via AST analysis and broken by springs, conditional renders, and novel LLM patterns.

In this system, duration is computed via a probe render. Every primitive explicitly registers its end frame. The probe render collects all registrations and takes the max.

---

## DurationCollector

A React context defined in `animation-duration`.

```
DurationCollector context value: (endFrame: number) => void
```

Every primitive calls the collector with its end frame on every render:

```
endFrame = delay + duration
```

Special cases:
- Stagger: `startAt + (childCount - 1) * delayBetween + longestChildDuration`
- WordCycle: `delay + (words.length * (holdDuration + transitionDuration))`
- TimelineGate: `hideAfter` if provided, otherwise `showAfter`
- Scene components: their internal last animation end frame

The collector is a no-op when not wrapped in a Provider — primitives work normally outside the probe render context.

---

## Probe Render

The compiler pipeline (→ see 05-compiler-and-ast.md) runs a probe render before returning the component to Remotion.

### How it works

1. Create a collector array
2. Wrap the generated component in `DurationCollector.Provider` with a collector function that pushes to the array
3. Run `renderToString` with `frame=0`
4. All primitives render and register their end frames
5. Take `Math.max(...collectedEndFrames)`
6. Add a tail buffer of 20 frames
7. Set this value as `durationInFrames` on the Remotion Composition

### Why frame=0

At frame=0, all primitives render their initial state but still execute their registration call. The registration is unconditional — it happens regardless of the current frame value. The probe render does not need to simulate multiple frames.

### Limitation: conditional renders

```jsx
{showExtra && (
  <FadeIn delay={100} duration={20}>
    <Text>Optional element</Text>
  </FadeIn>
)}
```

If `showExtra` is false at probe time, this FadeIn never registers. The probe underestimates duration.

Mitigation: the LLM is instructed to avoid conditional animation renders. If data-driven conditional rendering is needed, use TimelineGate (which always registers its hideAfter) instead of JSX conditionals.

---

## User Duration Controls

Three distinct operations with different mechanisms.

### Speed adjustment

User wants the whole animation to play faster or slower proportionally.

A `speedFactor` is computed:
```
speedFactor = probedDuration / userRequestedDuration
```

Every primitive receives the speedFactor from context and applies it to delay and duration at render time:
```
adjustedDelay = delay / speedFactor
adjustedDuration = duration / speedFactor
```

No code change. No regeneration. Instant. The speedFactor is stored as a speed patch (→ see 05-compiler-and-ast.md).

### Hold adjustment

User wants a specific element to stay on screen longer before the next element appears.

The element's `delay` prop is patched via the standard value patch system. Only that element is affected — downstream elements are not automatically shifted. The user explicitly patches each element they want to shift.

For cases where the user wants downstream elements to shift automatically, this is a regeneration task (send instruction to LLM with the desired timing change).

### Trim

User wants to cut the animation shorter.

Reduce `durationInFrames` on the Composition directly. Remotion clips at that frame naturally. No internal component changes needed. Works without primitives. Available now.

---

## Duration and Aspect Ratio

Duration is independent of aspect ratio. The same durationInFrames value is used regardless of the active AspectPreset.

---

## Timing Guidance for Prompt

The following guidance is included in every generated prompt (→ see 04-animation-types-and-prompt.md):

```
fps: 30
30 frames = 1 second

Typical entrance: 15-25 frames
Typical exit: 10-15 frames
Stagger between items: 6-10 frames
Counter animation: 30-60 frames
Typewriter per character: 2-3 frames
Hold before next section: 10-20 frames
```

The LLM uses these as defaults. Users can adjust via speed patch or hold patch after generation.

---

## Contributor Guide — Duration in New Components

Every new primitive or scene component must:

1. Accept `delay` and `duration` props (or compute an equivalent end frame)
2. Call the DurationCollector with the computed end frame on every render
3. The collector call must be unconditional — not inside an if statement or useEffect
4. Document the end frame formula in the component's schema description

If a component has variable-length animation (e.g. based on array length), document the formula explicitly so the probe render produces accurate results.
