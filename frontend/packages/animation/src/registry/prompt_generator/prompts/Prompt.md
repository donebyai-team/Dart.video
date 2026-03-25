## FRAME CONTRACT:

- Your component runs inside a managed animation runtime.
- It receives no props.
- Export as: export default function RemoteComponent() { ... }
- Remotion and all animation libraries are provided by the runtime — never import them.

## Scenes — standalone, no siblings

### AnimatedNumber
Animated counter that counts from one number to another with text labels. Use for metrics, statistics, KPIs. Required props: startText="Solved", endText="incidents", to={12450}. Optional: from (default 0), format (e.g. "0,0" for thousands separator).
Props:
- startText: string (required)
- endText: string (required)
- to: number (required)

### TextStagger
Reveals text word-by-word with staggered animation delays. Use for multi-word headlines or body text. Required props: text="Transform your workflow with AI". Each word animates in sequence with configurable delay.
Props:
- text: string (required)

### Typewriter
Reveals text character-by-character like a typewriter. Use for dramatic reveals or code/terminal effects. Required props: text="Building the future of AI". Optional: mode="char" (default), "word", or "line" to control typing granularity.
Props:
- text: string (required)

### TextHighlight
Displays text with highlighted portions that zoom/pulse for emphasis. Use to draw attention to key words or phrases. Required props: text="Increase revenue by 300%", highlightPattern="300%". The pattern can be a word or phrase to highlight within the text.
Props:
- text: string (required)

### TextCycle
Cycles through multiple text strings with smooth transitions. Use for rotating taglines, benefits, or features. Required props: texts={["Build faster with AI", "Deploy with confidence", "Scale without limits"]}. Each text displays briefly then transitions to the next.
Props:
- texts: array (required)

### AnimatedImage
Displays a text label above an image with entrance animation. Use for product showcases, feature highlights, or visual content. Required props: text="New Product Launch", src="attachment url". The text animates in first, then the image follows.
Props:
- text: string (required)
- src: string (required)

### AnimatedVideo
Displays a text label above a video with entrance animation. Use for demo videos, testimonials, or video content. Required props: text="Watch Demo", src="attachment video url". The text animates in first, then the video follows. Note: Total duration depends on video length.
Props:
- text: string (required)
- src: string (required)

### ImagePeel
Stacked images that peel away one-by-one to reveal the next. Use for before/after comparisons, product variations, or image galleries. Required props: sources={["attachment url", "attachment url", "attachment url"]}. Minimum 2 images required.
Props:
- sources: array (required)

### LogoAsset
Displays a logo with entrance animation. Use for brand intros or logo reveals. Optional props: src="attachment url" (uses theme logo if omitted), animation="zoomIn" (options: fadeIn, zoomIn, bounceIn, spinIn, dropIn, none). Set animation="none" for instant display.
Props:

### LogoWithBrandName
Displays a logo alongside brand name text that fades in character-by-character. Use for brand introductions or company presentations. Required props: brandName="CoasterAI". Optional: src for custom logo (uses theme logo if omitted). The brand name animates in one character at a time for dramatic effect.
Props:
- brandName: string (required)

