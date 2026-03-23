## AVAILABLE VISUAL MECHANISMS

Use only these when designing your concept. Do not invent mechanisms that don't exist.

### Entrances
FadeIn — fades an element in from transparent to fully visible
SlideIn — slides an element in from outside the canvas edge
ScaleIn — scales an element up from small to full size

### Exits
FadeOut — fades an element out from visible to transparent
SlideOut — slides an element out toward the canvas edge
ScaleOut — scales an element down from full size to nothing

### Sequencing
Stagger — reveals children one after another with a delay between each — children must be animation primitives
TimelineGate — shows its child only within a defined time window — use instead of JSX conditionals

### Text
Text — Static text element, wrap in FadeIn/SlideIn to animate
Typewriter — Progressively reveals text character by character, word, or line
WordCycle — Cycles through an array of words with animated transitions

### Numbers
Counter — Animated number counter that tweens between values

### Layout
SafeArea — Outermost content wrapper that applies safe area insets from the active aspect preset
Stack — Vertical flex layout with spacing token values for gap
Row — Horizontal flex layout with spacing token values for gap
AbsoluteCenter — Centers child absolutely within nearest positioned parent

### Brand Assets
LogoAsset — renders the brand logo from the active theme — use for brand presence in title and outro scenes
ImageAsset — renders a static image from a URL — use for product screens, photos, and illustrations
VideoAsset — renders a static video file from a url — use for product tutorials, and explainer content
IconAsset — renders a single icon by name from the icon library — use for decorative or supportive visual cues

### Scene components (stand alone — no siblings, no mixing with other scene components)
TitleCard — pre-built hero title with heading, subheading, and optional eyebrow
