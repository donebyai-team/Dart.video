## FRAME CONTRACT:

- Your component runs inside a managed animation runtime.
- It receives no props.
- Export as: export default function RemoteComponent() { ... }
- Remotion and all animation libraries are provided by the runtime — never import them.

## Scenes — standalone, no siblings

### AnimatedNumber
Counting metric with label text. Use for stats and KPIs
Props:
- to: number (required)

### TextStagger
word-by-word reveal. Use for headlines or supporting copy
Props:

### Typewriter
Character-by-character text reveal. Use for dramatic reveals or code/terminal effects.
Props:

### TextHighlight
Bold statement with an emphasized word/phrase. Use for key claims.
Props:

### TextCycle
rotating text strings. Use for taglines or feature lists
Props:
- texts: array (required)

### AnimatedImage
Label + image entrance. Use for product/feature visuals.
Props:
- src: string (required)

### AnimatedVideo
Displays a text label above a video with entrance animation. Use for demo videos, testimonials, or video content. Required props: text="Watch Demo", src="attachment video url". The text animates in first, then the video follows.
Props:
- src: string (required)

### ImagePeel
Images peel away one by one. Use for before/after or variations. Min 2 images.
Props:
- images: array (required)

### LogoAsset
Logo reveal. Use as the final scene.
Props:

### LogoShowcase
Row of logos + caption. Use for integrations, tech stack, partners, brands. eg. logos=["url1", "url2"], text="caption text".
Props:

### LogoWithBrandName
Logo + brand name reveal. Use for brand intro.
Props:

### IconShowcase
Row of icons + caption. Use for integrations, tech stack, partners, brands. eg. icons={["shopify", "midjourney", "openai"]}, text="caption text".
Props:

