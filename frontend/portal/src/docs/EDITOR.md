# PMM Visual Story - Video Editor Platform

A modern video editor platform built with React, TypeScript, Remotion, and Tailwind CSS. Create stunning explainer videos with text animations, image slides, infographics, and visual effects.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Folder Structure](#folder-structure)
- [Slide Architecture](#slide-architecture)
- [Remotion Flow](#remotion-flow)
- [Getting Started](#getting-started)
- [Development](#development)

---

## Overview

PMM Visual Story is a video creation platform that allows users to:

- Create multi-section videos with various slide types (text animations, images, videos, infographics)
- Add canvas-level effects (spotlight, zoom) to highlight specific areas
- Add overlay annotations (text, rectangles, arrows, callouts) to slides
- Customize transitions, backgrounds, and timing
- Generate AI voiceovers (placeholder implementation)
- Export videos using Remotion rendering

### Key Technologies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Remotion** - Video rendering engine
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Shadcn UI** - Component library
- **Framer Motion** - Animations
- **dnd-kit** - Drag and drop

---

## Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        EditorPage                            │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  LeftPanel  │  │ RemotionPlayer│  │  RightPanel  │       │
│  │  (Tools &   │  │   (Preview)   │  │  (Storyboard)│       │
│  │  Settings)  │  │               │  │              │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  State Management: useEditorState                           │
│  Configuration: editorConfig.ts                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  Remotion Slideshow   │
                │  (Video Composition)  │
                └───────────────────────┘
                            │
                ┌───────────┴────────────┐
                ▼                        ▼
        ┌──────────────┐        ┌──────────────┐
        │ Slide Types  │        │   Effects    │
        │ - ImageSlide │        │ - Spotlight  │
        │ - VideoSlide │        │ - Zoom       │
        │ - TextAnim   │        └──────────────┘
        └──────────────┘
```

### Data Flow

1. **Configuration** → `editorConfig.ts` defines default sections, slides, and settings
2. **State Management** → `useEditorState` hook manages all editor state
3. **User Actions** → Triggers state updates via handler functions
4. **Rendering** → Remotion Player renders composition based on current state
5. **Export** → Remotion CLI renders final video

---

## Folder Structure

```
src/
├── components/
│   ├── editor/                      # Main editor components
│   │   ├── EditorPage.tsx           # Main editor container
│   │   ├── LeftPanel.tsx            # Tools & settings panel
│   │   ├── RightPanel.tsx           # Storyboard panel
│   │   ├── RemotionPlayer.tsx       # Video player with controls
│   │   ├── CanvasOverlay.tsx        # SVG overlay for editing objects
│   │   │
│   │   ├── remotion/                # Remotion-specific components
│   │   │   ├── RemotionSlideshow.tsx     # Main composition
│   │   │   ├── slides/                    # Slide type components
│   │   │   │   ├── ImageSlide.tsx         # Image slide renderer
│   │   │   │   ├── ImageContent.tsx       # Resizable image component
│   │   │   │   ├── VideoSlide.tsx         # Video slide renderer
│   │   │   │   ├── TextAnimationSlide.tsx # Text animation renderer
│   │   │   │   ├── InfographicSlide.tsx   # Infographic renderer
│   │   │   │   └── VisualAnimationSlide.tsx
│   │   │   │
│   │   │   ├── effects/                   # Canvas-level effects
│   │   │   │   ├── SpotlightEffect.tsx    # Spotlight overlay
│   │   │   │   └── ZoomEffect.tsx         # Zoom effect
│   │   │   │
│   │   │   └── templates/                 # Text animation templates
│   │   │       ├── NumberCounter.tsx
│   │   │       ├── TextReveal.tsx
│   │   │       ├── Typewriter.tsx
│   │   │       └── ... (more templates)
│   │   │
│   │   ├── settings/                # Settings panels for tools
│   │   │   ├── InsertSettings.tsx   # Generic insert tool settings
│   │   │   ├── SpotlightSettings.tsx
│   │   │   ├── TextSettings.tsx
│   │   │   ├── RectangleSettings.tsx
│   │   │   └── ... (more settings)
│   │   │
│   │   └── overlays/                # Editing overlays
│   │       ├── SpotlightOverlay.tsx # Interactive spotlight editor
│   │       └── ...
│   │
│   └── ui/                          # Reusable UI components (Shadcn)
│       ├── button.tsx
│       ├── input.tsx
│       ├── slider.tsx
│       └── ...
│
├── hooks/
│   └── useEditorState.ts            # Main state management hook
│
├── types/
│   ├── slides.ts                    # Slide type definitions
│   ├── editor.ts                    # Editor configuration types
│   └── textAnimationTemplates.ts   # Template types
│
├── data/
│   └── editorConfig.ts              # Default configuration & data
│
├── lib/
│   └── utils.ts                     # Utility functions
│
└── pages/
    └── EditorPage.tsx               # Main editor page
```

---

## Slide Architecture

### NEW ARCHITECTURE (Current)

The slide architecture separates content, effects, and annotations for clarity:

```typescript
interface Slide {
  id: string;
  type: SlideType;
  transcript: string;        // Voiceover script
  duration: number;          // Duration in seconds
  transition?: TransitionType;
  backgroundColor?: string;

  // NEW ARCHITECTURE:
  content?: SlideContent;           // Type-specific content (image, video, etc.)
  effects?: SlideEffect[];          // Canvas-level effects (spotlight, zoom)
  annotations?: AnnotationObject[]; // Overlay annotations (text, shapes, arrows)

  // Additional properties:
  displayText?: string;             // For text-animation slides
  textAnimationTemplate?: TextAnimationTemplateConfig;
}
```

#### Content Types

**Purpose:** Defines the primary visual content of a slide

```typescript
type SlideContent =
  | ImageSlideContent    // Image with position/size
  | VideoSlideContent    // Video (fills canvas)
  | TextAnimationSlideContent
  | InfographicSlideContent
  | VisualAnimationSlideContent;

// Example: Image Content
interface ImageSlideContent {
  type: "image";
  image: {
    src: string;      // Image URL or base64
    x: number;        // Position on canvas (px)
    y: number;
    width: number;    // Size on canvas (px)
    height: number;
    rotation?: number;
  };
}
```

**Default sizing:** New images are 80% of canvas size, centered (10% margins on all sides)

#### Effect Types

**Purpose:** Canvas-level visual effects that operate independently of content

```typescript
type SlideEffect = SpotlightEffect | ZoomEffect;

// Example: Spotlight Effect
interface SpotlightEffect {
  id: string;
  type: "spotlight";
  x: number;           // Canvas coordinates (px)
  y: number;
  width: number;       // Spotlight dimensions (px)
  height: number;
  blurAmount: number;  // Blur intensity
  borderRadius: number;
  startTime: number;   // Start time in seconds (from slide start)
  endTime: number;     // End time in seconds (from slide start)
}
```

**Key Features:**
- Effects use canvas dimensions, not content dimensions
- Spotlight can be positioned anywhere on canvas, independent of image position
- Effects support timing (startTime/endTime) for animations within a slide
- Works on both IMAGE and VIDEO slides

#### Annotation Types

**Purpose:** Overlay markup elements (text, shapes, arrows) rendered on top of everything

```typescript
type AnnotationObject =
  | TextAnnotation
  | RectangleAnnotation
  | ArrowAnnotation
  | CalloutAnnotation;

// Example: Text Annotation
interface TextAnnotation {
  id: string;
  type: "text";
  x: number;          // Canvas coordinates (px)
  y: number;
  text: string;
  fontSize: number;
  fontFamily?: string;
  fontStyle?: "normal" | "bold" | "italic";
  color?: string;
  opacity?: number;
}
```

### Slide Type Configuration

Each slide type has specific capabilities defined in `editorConfig.ts`:

```typescript
{
  id: SlideType.MEDIA,
  name: "Image/video",
  availableTools: ["text", "rectangle", "arrow", "callout"],  // Annotations
  availableEffects: ["spotlight", "zoom"],                     // Effects
  supportsContent: true  // Image can be resized/repositioned
}
```

---

## Player Controls & Frame Calculations

### Player Control Behavior

The video player provides intuitive controls for navigating and editing your video:

#### Play/Pause Button
- **Simple frame-by-frame playback** - Continues from the current position
- No automatic seeking or jumping
- Standard video player behavior

#### Slide Selection
When you click on a slide (in timeline or storyboard):
- **Automatically seeks to the slide's start**
- **Skips transition effects** to show actual content
- **First slide**: Seeks to frame 0
- **Other slides**: Seeks past the incoming transition (0.3s offset)

This ensures you always see the slide's content, not the transition from the previous slide.

#### Manual Navigation
- **Timeline scrubbing**: Click or drag on the timeline to jump to any frame
- **Skip buttons**: Jump 5 seconds forward/backward
- **Playhead**: Red line shows current position

### Frame Calculation System

The editor uses an **exclusive duration model** with transitions:

#### How It Works

```
Slide 1: 5 seconds (frames 0-149)
  ├─ Content: frames 0-149
  └─ Transition out: frames 141-149 (overlaps with next slide)

Slide 2: 3 seconds (frames 150-239)
  ├─ Transition in: frames 150-158 (0.3s = 9 frames)
  ├─ Content: frames 159-239
  └─ Transition out: frames 231-239

Slide 3: 4 seconds (frames 240-359)
  └─ Content: frames 240-359 (no transition out, last slide)
```

#### Key Concepts

**Exclusive Duration**
- Each slide's `duration` property is its exclusive screen time
- Total video duration = sum of all slide durations
- No overlap subtraction needed

**Transition Handling**
- Transition duration: 0.3 seconds (9 frames at 30 FPS)
- Transitions happen at the START of each slide (except first)
- During transition: both slides are visible (crossfade effect)

**Frame Calculations**
```typescript
// Get slide start frame (technical start, includes transition)
const startFrame = getSlideStartFrame(sections, slideId, FPS);

// For seeking to content (skip transition)
const isFirstSlide = slideIndex === 0;
const seekFrame = isFirstSlide 
  ? startFrame 
  : startFrame + Math.round(0.3 * FPS); // +9 frames
```

#### Why This Matters

When you click a slide:
1. System calculates the slide's start frame
2. For non-first slides, adds 9 frames to skip the transition
3. Seeks to that frame, showing the slide's actual content

This prevents showing the previous slide during the transition period.

### Player Controls Hook

**File:** `src/hooks/usePlayerControls.ts`

Centralized playback control logic:

```typescript
const controls = usePlayerControls(
  playerRef,
  sections,
  selectedSlideId,
  currentFrame,
  totalFrames,
  isPlaying,
  setPreviewingSlideId
);

// Available methods:
controls.play()              // Start playback
controls.pause()             // Pause playback
controls.togglePlayPause()   // Toggle play/pause
controls.seekToFrame(frame)  // Jump to specific frame
controls.seekToSlide(slideId) // Jump to slide start
controls.skipForward()       // +5 seconds
controls.skipBackward()      // -5 seconds
```

### Automatic Slide Detection

During playback, the player automatically detects which slide is currently visible:

```typescript
// In RemotionPlayer.tsx - handleFrameUpdate
let accumulatedFrames = 0;
for (const slide of allSlides) {
  const slideFrames = Math.round(slide.duration * FPS);
  accumulatedFrames += slideFrames;
  
  if (currentFrame < accumulatedFrames) {
    // This is the current slide
    onSlideChange?.(slide.id);
    break;
  }
}
```

This keeps the UI in sync with playback, highlighting the correct slide in the timeline and storyboard.

---

## Remotion Flow

### Overview

Remotion is a framework for creating videos programmatically using React. Here's how it works in our application:

### 1. Composition Structure

```
<RemotionPlayer>
  └── <Player>
      └── <Slideshow>                    // Main composition
          └── <Sequence> (per slide)     // Each slide is a sequence
              ├── <ImageSlide>           // Slide component
              │   ├── <ImageContent>     // Image with positioning
              │   └── <SpotlightEffect>  // Effects rendered at canvas level
              ├── <TextAnimationSlide>
              └── <VideoSlide>
```

### 2. Remotion Player Component

**File:** `src/components/editor/RemotionPlayer.tsx`

**Purpose:** Wrapper around Remotion's Player that provides:
- Video player controls (play, pause, seek)
- Canvas overlay for editing effects/annotations
- Timeline scrubbing
- Volume control

**Key Features:**
```typescript
<Player
  component={Slideshow}           // Main composition
  inputProps={{                   // Data passed to composition
    sections,
    resolution,
    backgroundColor
  }}
  durationInFrames={totalFrames}  // Total video duration
  fps={30}                        // Frames per second
  compositionWidth={resolution.width}
  compositionHeight={resolution.height}
/>
```

### 3. Slideshow Composition

**File:** `src/components/editor/remotion/RemotionSlideshow.tsx`

**Purpose:** Main Remotion composition that orchestrates all slides

**Key Concepts:**

#### Sequences
Each slide is rendered as a `<Sequence>`:

```typescript
sections.flatMap(section =>
  section.slides.map((slide, slideIndex) => {
    const startFrame = getSlideStartFrame(sections, section.id, slideIndex, fps);
    const durationInFrames = Math.round(slide.duration * fps);

    return (
      <Sequence
        key={slide.id}
        from={startFrame}              // When slide starts (frame number)
        durationInFrames={durationInFrames}  // How long it lasts
        name={slide.id}
      >
        <SlideComponent slide={slide} />
      </Sequence>
    );
  })
)
```

#### Frame Calculation
- **FPS (Frames Per Second):** Default is 30
- **Duration in Frames:** `duration (seconds) × fps`
- **Total Frames:** Sum of all slide frames

Example:
```
Slide 1: 2 seconds  = 60 frames  (0-59)
Slide 2: 3 seconds  = 90 frames  (60-149)
Slide 3: 2.5 seconds = 75 frames (150-224)
Total: 7.5 seconds  = 225 frames
```

### 4. Slide Components

Each slide type is a Remotion component that uses Remotion hooks:

**File:** `src/components/editor/remotion/slides/ImageSlide.tsx`

```typescript
export const ImageSlide: React.FC<ImageSlideProps> = ({ slide, width, height }) => {
  const frame = useCurrentFrame();  // Current frame number (0-based)
  const { fps } = useVideoConfig(); // FPS from composition

  // Extract data from slide
  const imageContent = slide.content as ImageSlideContent;
  const effects = slide.effects || [];
  const spotlights = effects.filter(e => e.type === "spotlight");

  return (
    <AbsoluteFill style={{ backgroundColor: slide.backgroundColor }}>
      {/* Render image content */}
      <ImageContent image={imageContent.image} />

      {/* Render effects at canvas level */}
      {spotlights.map(spotlight => (
        <SpotlightEffect
          spotlight={spotlight}
          frame={frame}
          fps={fps}
          width={width}    // Canvas dimensions
          height={height}
        />
      ))}
    </AbsoluteFill>
  );
};
```

**Key Remotion APIs:**
- `useCurrentFrame()` - Returns current frame number (animates from 0 to durationInFrames-1)
- `useVideoConfig()` - Returns composition config (fps, width, height, durationInFrames)
- `AbsoluteFill` - Fills parent container absolutely (essential for layering)
- `spring()` - Creates spring animations
- `interpolate()` - Maps frame ranges to value ranges

### 5. Effects Rendering

**File:** `src/components/editor/remotion/effects/SpotlightEffect.tsx`

Effects use frame-based timing:

```typescript
export const SpotlightEffect: React.FC<SpotlightEffectProps> = ({
  spotlight,
  frame,
  fps,
  width,
  height,
  slideDuration
}) => {
  // Convert time (seconds) to frames
  const startFrame = spotlight.startTime * fps;
  const endFrame = spotlight.endTime * fps;

  // Only render if within time range
  if (frame < startFrame || frame > endFrame) {
    return null;
  }

  // Fade in/out animations based on frame
  let opacity = 1;
  const fadeFrames = fps * 0.3; // 0.3 second fade

  if (frame < startFrame + fadeFrames) {
    // Fade in
    opacity = (frame - startFrame) / fadeFrames;
  } else if (frame > endFrame - fadeFrames) {
    // Fade out
    opacity = (endFrame - frame) / fadeFrames;
  }

  // Render spotlight using SVG mask
  return (
    <div style={{ opacity }}>
      <svg>
        <mask id={maskId}>
          <rect width="100%" height="100%" fill="white" />
          <rect
            x={spotlight.x}
            y={spotlight.y}
            width={spotlight.width}
            height={spotlight.height}
            fill="black"
          />
        </mask>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.6)"
          mask={`url(#${maskId})`}
        />
      </svg>
    </div>
  );
};
```

### 6. Transitions

Transitions are applied between slides using interpolation:

```typescript
const transitionFrames = fps * 0.5; // 0.5 second transition

const opacity = interpolate(
  frame,
  [0, transitionFrames],
  [0, 1],
  { extrapolateRight: "clamp" }
);
```

### 7. Export Process

To render the final video:

```bash
# Render video using Remotion CLI
npx remotion render src/components/editor/remotion/RemotionSlideshow.tsx Slideshow output.mp4

# With custom props
npx remotion render src/components/editor/remotion/RemotionSlideshow.tsx Slideshow output.mp4 \
  --props='{"sections": [...], "resolution": {...}}'
```

### Remotion Rendering Pipeline

```
1. User edits in browser
   ↓
2. State stored in useEditorState
   ↓
3. Remotion Player previews in real-time
   ↓
4. User exports
   ↓
5. Remotion CLI renders each frame
   ↓
6. FFmpeg encodes frames to video
   ↓
7. Final video file (MP4)
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone repository
git clone <repository-url>
cd pmm-visual-story

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts

```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript type checking
```

---

## Development

### Creating a New Slide Type

1. **Add type definition** in `src/types/slides.ts`:
```typescript
export interface MySlideContent {
  type: "my-slide";
  data: {
    // Your custom data
  };
}

// Add to SlideContent union
export type SlideContent = ImageSlideContent | VideoSlideContent | MySlideContent;
```

2. **Create slide component** in `src/components/editor/remotion/slides/MySlide.tsx`:
```typescript
export const MySlide: React.FC<MySlideProps> = ({ slide, width, height }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill>
      {/* Your slide rendering */}
    </AbsoluteFill>
  );
};
```

3. **Register in RemotionSlideshow** in `src/components/editor/remotion/RemotionSlideshow.tsx`:
```typescript
const SlideComponent = ({ slide }: SlideComponentProps) => {
  switch (slide.type) {
    case SlideType.MY_SLIDE:
      return <MySlide slide={slide} />;
    // ... other cases
  }
};
```

4. **Add configuration** in `src/data/editorConfig.ts`:
```typescript
{
  id: SlideType.MY_SLIDE,
  name: "My Slide",
  description: "Description",
  availableTools: ["text", "rectangle"],
  availableEffects: ["spotlight"],
  defaultDuration: 5
}
```

### Creating a New Effect

1. **Add type definition** in `src/types/slides.ts`:
```typescript
export interface MyEffect {
  id: string;
  type: "my-effect";
  // Effect properties
  startTime: number;
  endTime: number;
}

// Add to SlideEffect union
export type SlideEffect = SpotlightEffect | ZoomEffect | MyEffect;
```

2. **Create effect component** in `src/components/editor/remotion/effects/MyEffect.tsx`:
```typescript
export const MyEffect: React.FC<MyEffectProps> = ({
  effect,
  frame,
  fps,
  width,
  height
}) => {
  // Timing logic
  const startFrame = effect.startTime * fps;
  const endFrame = effect.endTime * fps;

  if (frame < startFrame || frame > endFrame) {
    return null;
  }

  return (
    <div>
      {/* Effect rendering */}
    </div>
  );
};
```

3. **Render in slide components**:
```typescript
const myEffects = effects.filter(e => e.type === "my-effect");

myEffects.map(effect => (
  <MyEffect key={effect.id} effect={effect} frame={frame} fps={fps} />
))
```

### State Management Best Practices

1. **Use provided handlers** - Don't modify state directly
2. **Separate concerns** - Use `addEffect` for effects, `addAnnotation` for annotations
3. **Immutable updates** - Always create new objects/arrays
4. **Type safety** - Use TypeScript types for all state

### Canvas Coordinates

All positioning uses canvas coordinates:
- Origin (0, 0) is top-left corner
- Width/Height in pixels based on resolution
- Default resolution: 1920×1080 (16:9)

Example for centering:
```typescript
const centerX = resolution.width / 2 - objectWidth / 2;
const centerY = resolution.height / 2 - objectHeight / 2;
```

---

## Contributing

1. Create a feature branch
2. Make your changes
3. Ensure `npm run build` succeeds
4. Run `npm run type-check` to verify types
5. Submit a pull request

---

## License

MIT License

---

## Support

For issues or questions, please open an issue on GitHub.