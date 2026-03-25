## FRAME CONTRACT:

- Your component runs inside a managed animation runtime.
- It receives no props.
- Export as: export default function RemoteComponent() { ... }
- Remotion and all animation libraries are provided by the runtime — never import them.

## Scenes — standalone, no siblings

### AnimatedNumber
animated number counter with start/end text and highlight effects
Props:
- startText: string (required)
- endText: string (required)
- to: number (required)

### TextStagger
reveals words with staggered delays — use for multi-line or multi-word text
Props:
- text: string (required)

### Typewriter
reveals text character by character — use for dramatic or progressive text reveals
Props:
- text: string (required)

### TextHighlight
highlights text with zoom effect — use for emphasis
Props:
- text: string (required)

### TextCycle
cycles through text array with transitions — use for rotating messages
Props:
- texts: array (required)

### AnimatedImage
text label above an image with entrance animation (slide, fade, scale)
Props:
- text: string (required)
- src: string (required)

### AnimatedVideo
text label above a video with entrance animation (slide, fade, scale)
Props:
- text: string (required)
- src: string (required)

### ImagePeel
stacked images that peel away one by one to reveal the next image
Props:
- sources: array (required)

### LogoAsset
logo image with entrance animations (fade, zoom, bounce, spin, drop)
Props:

### LogoWithBrandName
logo with brand name text that fades in character by character
Props:
- brandName: string (required)

