## AVAILABLE COMPONENTS

Use only these when designing your concept. Do not invent components that don't exist.

### Scenes - standalone, no siblings
TitleCard — pre-built hero title with heading, subheading, and optional eyebrow

### Layout Primitives - structural only, every visible element must live inside one
SafeArea — Outermost content wrapper that applies safe area insets from the active aspect preset
Stack — arranges children vertically — primary layout primitive for top-to-bottom compositions
Row — arranges children horizontally — use for side-by-side elements
AbsoluteCenter — centers a single child both horizontally and vertically on the full canvas

### Motion Primitives - wraps exactly one child, never wraps Layout
FadeIn — fades an element in from transparent to fully visible
FadeOut — fades an element out from visible to transparent
SlideIn — slides an element in from outside the canvas edge
SlideOut — slides an element out toward the canvas edge
ScaleIn — scales an element up from small to full size
ScaleOut — scales an element down from full size to nothing
Stagger — reveals children one after another with a delay between each — children must be animation primitives
TimelineGate — shows its child only within a defined time window — use instead of JSX conditionals

### Static Primitives - no built-in animation, wrap in Motion to animate
Text — displays a static string — use for headings, labels, and body copy

### Dynamic Primitives - self-animating, never wrap in Motion, use startAt directly
Counter — animates a number incrementing or decrementing to a target value — use for metrics and stats
Typewriter — reveals text character by character — use for dramatic or progressive text reveals
WordCycle — cycles through a list of words in place — use when one slot shows multiple values over time

### Asset Primitives - no built-in animation, wrap in Motion to animate
LogoAsset — renders the brand logo from the active theme — use for brand presence in title and outro scenes
ImageAsset — renders a static image from a URL — use for product screens, photos, and illustrations
VideoAsset — renders a static video file from a url — use for product tutorials, and explainer content
IconAsset — renders a single icon by name from the icon library — use for decorative or supportive visual cues
