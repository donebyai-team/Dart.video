template_string RemotionSkillChart() ##"
{% raw %}
---
name: charts
description: Chart and data visualization patterns for Remotion. Use when creating bar charts, pie charts, line charts, stock graphs, or any data-driven animations.
metadata:
  tags: charts, data, visualization, bar-chart, pie-chart, line-chart, stock-chart, svg-paths, graphs
---

# Charts in Remotion

Create charts using React code - HTML, and SVG are all supported.

Disable all animations from third party libraries - they cause flickering.
Drive all animations from `useCurrentFrame()`.

## Bar Chart

```tsx
const STAGGER_DELAY = 5;
const frame = useCurrentFrame();
const { fps } = useVideoConfig();

const bars = data.map((item, i) => {
  const height = spring({
    frame,
    fps,
    delay: i * STAGGER_DELAY,
    config: { damping: 200 },
  });
  return <div style={{ height: height * item.value }} />;
});
```

## Pie Chart

Animate segments using stroke-dashoffset, starting from 12 o'clock:

```tsx
const progress = interpolate(frame, [0, 100], [0, 1]);
const circumference = 2 * Math.PI * radius;
const segmentLength = (value / total) * circumference;
const offset = interpolate(progress, [0, 1], [segmentLength, 0]);

<circle
  r={radius}
  cx={center}
  cy={center}
  fill="none"
  stroke={color}
  strokeWidth={strokeWidth}
  strokeDasharray={`${segmentLength} ${circumference}`}
  strokeDashoffset={offset}
  transform={`rotate(-90 ${center} ${center})`}
/>;
```

## Line Chart / Path Animation

Use `@remotion/paths` for animating SVG paths (line charts, stock graphs, signatures).

### Convert data points to SVG path

```tsx
type Point = { x: number; y: number };

const generateLinePath = (points: Point[]): string => {
  if (points.length < 2) return "";
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
};
```

### Draw path with animation

```tsx
import { evolvePath } from "@remotion/paths";

const path = "M 100 200 L 200 150 L 300 180 L 400 100";
const progress = interpolate(frame, [0, 2 * fps], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
  easing: Easing.out(Easing.quad),
});

const { strokeDasharray, strokeDashoffset } = evolvePath(progress, path);

<path
  d={path}
  fill="none"
  stroke="#FF3232"
  strokeWidth={4}
  strokeDasharray={strokeDasharray}
  strokeDashoffset={strokeDashoffset}
/>;
```

### Follow path with marker/arrow

```tsx
import {
  getLength,
  getPointAtLength,
  getTangentAtLength,
} from "@remotion/paths";
const pathLength = getLength(path);
const point = getPointAtLength(path, progress * pathLength);
const tangent = getTangentAtLength(path, progress * pathLength);
const angle = Math.atan2(tangent.y, tangent.x);
<g
  style={{
    transform: `translate(${point.x}px, ${point.y}px) rotate(${angle}rad)`,
    transformOrigin: "0 0",
  }}
>
  <polygon points="0,0 -20,-10 -20,10" fill="#FF3232" />
</g>;
{% endraw %}
"##

template_string RemotionSkillMeasureDOMNode() #"
{% raw %}
---
name: measuring-dom-nodes
description: Measuring DOM element dimensions in Remotion
metadata:
  tags: measure, layout, dimensions, getBoundingClientRect, scale
---

# Measuring DOM nodes in Remotion

Remotion applies a `scale()` transform to the video container, which affects values from `getBoundingClientRect()`. Use `useCurrentScale()` to get correct measurements.

## Measuring element dimensions

```tsx
import { useCurrentScale } from "remotion";
import { useRef, useEffect, useState } from "react";

export const MyComponent = () => {
  const ref = useRef<HTMLDivElement>(null);
  const scale = useCurrentScale();
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setDimensions({
      width: rect.width / scale,
      height: rect.height / scale,
    });
  }, [scale]);

  return <div ref={ref}>Content to measure</div>;
};
```
{% endraw %}
"#

template_string RemotionSkillMeasureText() #"
{% raw %}
---
name: measuring-text
description: Measuring text dimensions, fitting text to containers, and checking overflow
metadata:
  tags: measure, text, layout, dimensions, fitText, fillTextBox
---

# Measuring text in Remotion
```

## Measuring text dimensions

Use `measureText()` to calculate the width and height of text:

```tsx
import { measureText } from "@remotion/layout-utils";

const { width, height } = measureText({
  text: "Hello World",
  fontFamily: "Arial",
  fontSize: 32,
  fontWeight: "bold",
});
```

Results are cached - duplicate calls return the cached result.

## Fitting text to a width

Use `fitText()` to find the optimal font size for a container:

```tsx
import { fitText } from "@remotion/layout-utils";
const { fontSize } = fitText({
  text: "Hello World",
  withinWidth: 600,
  fontFamily: "Inter",
  fontWeight: "bold",
});
return (
  <div
    style={{
      fontSize: Math.min(fontSize, 80), // Cap at 80px
      fontFamily: "Inter",
      fontWeight: "bold",
    }}
  >
    Hello World
  </div>
);

## Checking text overflow

Use `fillTextBox()` to check if text exceeds a box:

```tsx
import { fillTextBox } from "@remotion/layout-utils";

const box = fillTextBox({ maxBoxWidth: 400, maxLines: 3 });

const words = ["Hello", "World", "This", "is", "a", "test"];
for (const word of words) {
  const { exceedsBox } = box.add({
    text: word + " ",
    fontFamily: "Arial",
    fontSize: 24,
  });
  if (exceedsBox) {
    // Text would overflow, handle accordingly
    break;
  }
}
```

## Best practices

**Load fonts first:** Only call measurement functions after fonts are loaded.

```tsx
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily, waitUntilDone } = loadFont("normal", {
  weights: ["400"],
  subsets: ["latin"],
});

waitUntilDone().then(() => {
  // Now safe to measure
  const { width } = measureText({
    text: "Hello",
    fontFamily,
    fontSize: 32,
  });
});
```

**Use validateFontIsLoaded:** Catch font loading issues early:

```tsx
measureText({
  text: "Hello",
  fontFamily: "MyCustomFont",
  fontSize: 32,
  validateFontIsLoaded: true, // Throws if font not loaded
});
```

**Match font properties:** Use the same properties for measurement and rendering:

```tsx
const fontStyle = {
  fontFamily: "Inter",
  fontSize: 32,
  fontWeight: "bold" as const,
  letterSpacing: "0.5px",
};

const { width } = measureText({
  text: "Hello",
  ...fontStyle,
});

return <div style={fontStyle}>Hello</div>;
```

**Avoid padding and border:** Use `outline` instead of `border` to prevent layout differences:

```tsx
<div style={{ outline: "2px solid red" }}>Text</div>
```
{% endraw %}
"#

template_string RemotionSkillSequencing() #"
{% raw %}
---
name: sequencing
description: Sequencing patterns for Remotion - delay, trim, limit duration of items
metadata:
  tags: sequence, series, timing, delay, trim
---

Use `<Sequence>` to delay when an element appears in the timeline.

```tsx
import { Sequence } from "remotion";

const {fps} = useVideoConfig();

<Sequence from={1 * fps} durationInFrames={2 * fps} premountFor={1 * fps}>
  <Title />
</Sequence>
<Sequence from={2 * fps} durationInFrames={2 * fps} premountFor={1 * fps}>
  <Subtitle />
</Sequence>
```

This will by default wrap the component in an absolute fill element.
If the items should not be wrapped, use the `layout` prop:

```tsx
<Sequence layout="none">
  <Title />
</Sequence>
```

## Premounting

This loads the component in the timeline before it is actually played.
Always premount any `<Sequence>`!

```tsx
<Sequence premountFor={1 * fps}>
  <Title />
</Sequence>
```

## Series

Use `<Series>` when elements should play one after another without overlap.

```tsx
import { Series } from "remotion";

<Series>
  <Series.Sequence durationInFrames={45}>
    <Intro />
  </Series.Sequence>
  <Series.Sequence durationInFrames={60}>
    <MainContent />
  </Series.Sequence>
  <Series.Sequence durationInFrames={30}>
    <Outro />
  </Series.Sequence>
</Series>;
```

Same as with `<Sequence>`, the items will be wrapped in an absolute fill element by default when using `<Series.Sequence>`, unless the `layout` prop is set to `none`.

### Series with overlaps

Use negative offset for overlapping sequences:

```tsx
<Series>
  <Series.Sequence durationInFrames={60}>
    <SceneA />
  </Series.Sequence>
  <Series.Sequence offset={-15} durationInFrames={60}>
    {/* Starts 15 frames before SceneA ends */}
    <SceneB />
  </Series.Sequence>
</Series>
```

## Frame References Inside Sequences

Inside a Sequence, `useCurrentFrame()` returns the local frame (starting from 0):

```tsx
<Sequence from={60} durationInFrames={30}>
  <MyComponent />
  {/* Inside MyComponent, useCurrentFrame() returns 0-29, not 60-89 */}
</Sequence>
```

## Nested Sequences

Sequences can be nested for complex timing:

```tsx
<Sequence from={0} durationInFrames={120}>
  <Background />
  <Sequence from={15} durationInFrames={90} layout="none">
    <Title />
  </Sequence>
  <Sequence from={45} durationInFrames={60} layout="none">
    <Subtitle />
  </Sequence>
</Sequence>
```

## Nesting compositions within another

To add a composition within another composition, you can use the `<Sequence>` component with a `width` and `height` prop to specify the size of the composition.

```tsx
<AbsoluteFill>
  <Sequence width={COMPOSITION_WIDTH} height={COMPOSITION_HEIGHT}>
    <CompositionComponent />
  </Sequence>
</AbsoluteFill>
```
{% endraw %}
"#