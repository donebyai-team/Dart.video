# Duration Detection

How we compute the total duration of an LLM-generated animation without static AST analysis.

---

## The Solution: DurationCollector at Render Time

Every animation primitive already calls `registerEndFrame(startAt + durationInFrames)` via `useDurationCollector()` during render. This is ground truth — captures actual runtime values including patches, speed factors, and Stagger-injected offsets.

The validate server already renders a still at frame 0 inside a full Remotion environment (browser, composition, hooks — everything). We just need to:

1. Wrap the component in `DurationCollectorProvider`
2. Collect the max end frame during that render

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

We do it inside the validate-server.mjs while renderStill to know the duration of the generated code via LLM. 