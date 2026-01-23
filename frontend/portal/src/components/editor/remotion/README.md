# Remotion Components Structure

This directory contains organized Remotion video components used for rendering the slideshow.

## Directory Structure

```
remotion/
├── slides/           # Slide type components
│   ├── ImageSlide.tsx
│   ├── VideoSlide.tsx
│   ├── TextAnimationSlide.tsx (to be created)
│   ├── VisualAnimationSlide.tsx (to be created)
│   ├── InfographicSlide.tsx (to be created)
│   └── index.tsx
├── effects/          # Visual effects for slides
│   ├── SpotlightEffect.tsx
│   └── index.tsx
└── animations/       # Text animation components
    └── TextAnimations.tsx
```

## Components

### Slides

**ImageSlide** - Renders image/screenshot slides with:
- Scale and zoom animations
- Support for spotlight effects
- 92% x 88% centered container with rounded corners

**VideoSlide** - Renders video slides with:
- Play button overlay
- Support for spotlight effects
- Full-size container

### Effects

**SpotlightEffect** - Spotlight overlay effect that:
- Creates a clear spotlight area while darkening/blurring the rest
- Supports custom positioning, sizing, and border radius
- Includes fade-in/fade-out animations (0.3s each)
- Scales coordinates from full resolution to container size
- Timing controlled via `spotlightStartTime` and `spotlightEndTime`

### Animations

**TextAnimations.tsx** - Contains text animation variants:
- WordRevealAnimation
- LetterCascadeAnimation
- TypewriterAnimation
- ScaleBounceAnimation
- BlurInAnimation

## Adding New Effects

To add a new effect (e.g., zoom, blur, etc.):

1. Create a new file in `effects/` folder:
   ```tsx
   // effects/ZoomEffect.tsx
   export const ZoomEffect: React.FC<ZoomEffectProps> = ({ ... }) => {
     // Implementation
   };
   ```

2. Export it from `effects/index.tsx`:
   ```tsx
   export { ZoomEffect } from "./ZoomEffect";
   ```

3. Import and use in slide components:
   ```tsx
   import { ZoomEffect } from "../effects/ZoomEffect";
   ```

## Adding New Slide Types

To add a new slide type:

1. Create a new file in `slides/` folder
2. Import necessary effects from `../effects/`
3. Export from `slides/index.tsx`
4. Import in `RemotionSlideshow.tsx` and add to `SlideComponent` router

## Usage

These components are imported in `RemotionSlideshow.tsx`:

```tsx
import { ImageSlide } from "./remotion/slides/ImageSlide";
import { VideoSlide } from "./remotion/slides/VideoSlide";
```

They are used in the main slideshow composition with proper transitions and timing.
