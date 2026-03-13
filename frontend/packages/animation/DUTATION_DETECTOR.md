# Duration Detection

How we compute the total duration of an LLM-generated animation without static AST analysis.

---

## The Problem

The old `computeAnimationDuration()` in `ast-transform.ts` statically walked the AST looking for `startAt` and `durationInFrames` numeric literals. Fragile — can't handle dynamic values, computed expressions, or Stagger children with inherited timing.

## The Solution: DurationCollector at Render Time

Every animation primitive already calls `registerEndFrame(startAt + durationInFrames)` via `useDurationCollector()` during render. This is ground truth — captures actual runtime values including patches, speed factors, and Stagger-injected offsets.

The validate server already renders a still at frame 0 inside a full Remotion environment (browser, composition, hooks — everything). We just need to:

1. Wrap the component in `DurationCollectorProvider`
2. Collect the max end frame during that render
3. Read it out via `window.__ANIMATION_DURATION__`

---

## Implementation

### buildRootEntry changes

Current `buildRootEntry` in `validate-server.mjs` creates a static composition with `durationInFrames: 30`. Change it to:

```tsx
import React, { useEffect } from 'react';
import { Composition, registerRoot, useCurrentFrame } from 'remotion';
import { compileRemoteComponent } from '@/compiler';
import {
  DurationCollectorProvider,
  ThemeProvider,
  StyleContextProvider,
  SpeedFactorProvider,
  defaultTheme,
  resolveStyle,
} from '@coasterai/animation';

const __CODE__ = "...";

// Probe component — renders the animation once to collect duration
const ProbeComp = () => {
  const endFrames = [];
  const onRegister = (endFrame) => endFrames.push(endFrame);

  const { Component, error } = compileRemoteComponent(__CODE__);
  if (error || !Component) throw new Error('[compile_error] ' + error);

  // After render, write collected duration to window for the server to read
  useEffect(() => {
    const maxEnd = endFrames.length > 0 ? Math.max(...endFrames) : 90;
    window.__ANIMATION_DURATION__ = maxEnd + 20; // +20 tail buffer
  }, []);

  return (
    <ThemeProvider theme={defaultTheme}>
      <StyleContextProvider style={resolveStyle('clean')}>
        <SpeedFactorProvider factor={1}>
          <DurationCollectorProvider onRegister={onRegister}>
            <Component />
          </DurationCollectorProvider>
        </SpeedFactorProvider>
      </StyleContextProvider>
    </ThemeProvider>
  );
};

const ValidatorRoot = () => (
  <Composition
    id="ValidatorComp"
    component={ProbeComp}
    durationInFrames={300}   // generous — we just render frame 0
    fps={30}
    width={1280}
    height={720}
  />
);

registerRoot(ValidatorRoot);
```

### Reading the duration after renderStill

After `renderStill` completes, the browser page still exists momentarily. But `renderStill` doesn't expose page access.

**Option A — selectComposition with calculateMetadata**:

Remotion's `selectComposition` can run `calculateMetadata` which executes in the browser. We could set the composition to use `calculateMetadata` that reads `window.__ANIMATION_DURATION__` after a probe render.

**Option B — Two renderStill calls**:

1. First `renderStill` at frame 0 → triggers all `registerEndFrame` calls → writes `window.__ANIMATION_DURATION__`
2. But we can't read window between calls...

**Option C — Use `evaluateHandle` on the Puppeteer page** ⭐ SIMPLEST:

Remotion's `renderStill` uses Puppeteer internally. After the render, the page has `window.__ANIMATION_DURATION__` set. We can use `@remotion/renderer`'s lower-level APIs or Puppeteer directly to evaluate JS on the page.

Actually, the simplest approach: **just use `selectComposition` with a `calculateMetadata`** prop:

```tsx
const ValidatorRoot = () => (
  <Composition
    id="ValidatorComp"
    component={ProbeComp}
    durationInFrames={300}
    fps={30}
    width={1280}
    height={720}
    calculateMetadata={async () => {
      // This runs in the browser after the component mounts
      const duration = window.__ANIMATION_DURATION__ || 150;
      return { durationInFrames: duration };
    }}
  />
);
```

Then `selectComposition()` returns the dynamically calculated duration:

```js
const composition = await selectComposition({
  serveUrl: bundleDir,
  id: 'ValidatorComp',
  inputProps: {},
  chromiumOptions,
});

const durationInFrames = composition.durationInFrames; // ← from calculateMetadata
```

---

## What Already Exists

- `DurationCollectorProvider` — `src/duration/DurationCollector.tsx` ✅
- `useDurationCollector()` — called by every primitive ✅
- Every primitive calls `registerEndFrame(startAt + durationInFrames)` via `useMemo` ✅
- Validate server already bundles + renders in Remotion browser ✅
- `selectComposition` already called before `renderStill` ✅

## What Needs To Change

1. `buildRootEntry` — wrap component in DurationCollectorProvider + provider stack
2. Add `calculateMetadata` to the Composition that reads `window.__ANIMATION_DURATION__`
3. Read `composition.durationInFrames` from `selectComposition()` result
4. Remove `computeAnimationDuration()` import from validate-server
5. Return the dynamic duration in the response

## Flow

```
1. preValidateWithBabel(code)               → syntax check
2. compileRemoteComponent(code)             → Component + initialOverlay
3. bundle(rootEntry)                        → Remotion bundle
4. selectComposition(bundle, 'ValidatorComp')
   → browser renders frame 0
   → primitives register end frames
   → useEffect writes window.__ANIMATION_DURATION__
   → calculateMetadata reads it
   → returns composition with correct durationInFrames
5. renderStill(composition, frame: 0)       → validates no runtime errors
6. Return { initialOverlay, gcsPath, durationInFrames }
```

No AST analysis. Duration comes from the actual rendered component.
