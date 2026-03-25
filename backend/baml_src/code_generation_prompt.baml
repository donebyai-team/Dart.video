template_string AllComponentsListWithProps() #"
## FRAME CONTRACT:

- Your component runs inside a managed animation runtime.
- It receives no props.
- Export as: export default function RemoteComponent() { ... }
- Remotion and all animation libraries are provided by the runtime — never import them.

## Available CANVAS size:
1920px × 1080px (web)

## LAYOUT

### SafeArea
Outermost content wrapper that applies safe area insets from the active aspect preset
Props:

### Stack
Vertical flex layout with spacing token values for gap
Props:
- gap: number (optional)
- align: string (optional)
- justify: string (optional)

### Row
Horizontal flex layout with spacing token values for gap
Props:
- gap: number (optional)
- align: string (optional)
- justify: string (optional)

### AbsoluteCenter
Centers child absolutely within nearest positioned parent
Props:
- axis: enum(x|y|both) (optional)


## ANIMATION PRIMITIVES

### FadeIn
Fade-in entrance animation (opacity 0 to 1)
Props:
- startAt: number (optional)
- durationInFrames: number (optional)

### FadeOut
Fade-out exit animation (opacity 1 to 0)
Props:
- startAt: number (optional)
- durationInFrames: number (optional)

### SlideIn
Slide-in entrance with translation and fade
Props:
- startAt: number (optional)
- durationInFrames: number (optional)
- direction: enum(up|down|left|right) (optional)
- distance: number (optional)

### SlideOut
Slide-out exit with translation and fade
Props:
- startAt: number (optional)
- durationInFrames: number (optional)
- direction: enum(up|down|left|right) (optional)
- distance: number (optional)

### ScaleIn
Scale-in entrance animation (scale 0 to 1)
Props:
- startAt: number (optional)
- durationInFrames: number (optional)
- origin: enum(center|top|bottom|left|right) (optional)

### ScaleOut
Scale-out exit animation (scale 1 to 0)
Props:
- startAt: number (optional)
- durationInFrames: number (optional)
- origin: enum(center|top|bottom|left|right) (optional)

### Stagger
Staggers children animations with increasing delay offsets
Props:
- startAt: number (optional)
- staggerDelay: number (optional)

### TimelineGate
Mounts/unmounts children within a frame window, use instead of JSX conditionals
Props:
- showAfter: number (required)
- hideAfter: number (optional)


## CONTENT

### Text
Static text element, wrap in FadeIn/SlideIn to animate
Props:
- variant: enum(caption|label|body|subheading|heading|display) (optional)

### Counter
Animated number counter that tweens between values
Props:
- startAt: number (optional)
- durationInFrames: number (optional)
- from: number (optional)
- to: number (required)
- format: string (optional)
- prefix: string (optional)
- suffix: string (optional)
- variant: enum(caption|label|body|subheading|heading|display) (optional)

### Typewriter
Progressively reveals text character by character, word, or line
Props:
- startAt: number (optional)
- durationInFrames: number (optional)
- text: string (required)
- mode: enum(char|word|line) (optional)
- variant: enum(caption|label|body|subheading|heading|display) (optional)

### WordCycle
Cycles through an array of words with animated transitions
Props:
- startAt: number (optional)
- words: array (required)
- holdDuration: number (optional)
- transitionDuration: number (optional)
- transition: enum(flipY|fadeSwap|slideUp) (optional)
- variant: enum(caption|label|body|subheading|heading|display) (optional)


## SCENES

### TitleCard
Pre-built hero title card composition with heading, subheading, and eyebrow
Props:
- heading: string (required)
- subheading: string (optional)
- eyebrow: string (optional)
- startAt: number (optional)


## BRAND

### LogoAsset
Brand logo from ThemeProvider. Falls back to a placeholder if no logo is configured. Wrap in any animation primitive (FadeIn, SlideIn, ScaleIn etc.) to animate. the logo always keeps its aspect ratio.
Props:
- src: string (optional)
- width: number (optional)
- height: number (optional)

### ImageAsset
Generic image primitive for uploaded or remote media.
Props:
- src: string (optional)
- width: number (optional)
- height: number (optional)

### VideoAsset
Generic video primitive for uploaded media. Width and height define the rendered box; the video always preserves aspect ratio and stays fully visible.
Props:
- src: string (optional)
- width: number (optional)
- height: number (optional)

### IconAsset
Icon asset from the icon library.
Props:
- name: string (required)
- size: number (optional)
- borderRadius: number (optional)
- id: string (optional)


## SPACING (use these values for gap/padding/margin):
 4 | 8 | 12 | 16 | 24 | 32 | 48 | 64 | 96

## TYPOGRAPHY variants:
caption | label | body | subheading | heading | display — never hardcode font sizes
"#

template_string AllScenes() #"
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

### IconShowcase
Displays a row of icons with rotating entrance animations followed by descriptive text. Use for tech stacks ("Built with React and Node.js"), integrations ("Integrates with Slack, GitHub, Jira"), partners ("Trusted by leading companies"), or social proof. Required props: icons={["shopify", "midjourney", "openai"]}, text="Thousands of startups are using cursor to see 10X productivity".
Props:
- icons: array (required)
- text: string (required)
"#

template_string AllComponentsList() #"
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
"#

// RULES
template_string SceneDesignPrinciples() #"
## SCENE DESIGN PRINCIPLES

- One idea per scene. Never combine two messages in one scene.
- One dominant visual element — a single Counter, a single heading, a single logo.
  Everything else is supporting.
- Keep text minimal — at most two key messages per scene, never more than five
  text elements total.
- Stagger reveals — never show all elements at once. Give each element room to enter.
- Prefer a single focal point centered on canvas over busy multi-column layouts.
- Whitespace is intentional — a centered heading with space around it reads better
  than content filling the full canvas.
- Express pacing intent in the brief — "slow and confident", "punchy and fast",
  "let the counter breathe". The generator translates this into frame values.
- Never stack more than three animation layers deep in the element tree.

## ELEMENT TREE RULES

- SafeArea is implicit — never include it in elements.
- Every content element must be inside Stack or Row — never place a content
  component as a direct sibling without a layout wrapper.
- Use Stack for vertical arrangement, Row for horizontal. Nest them for complex layouts.
- AbsoluteCenter for centering a single element on the full canvas.
- Animation primitives (FadeIn, SlideIn etc) always wrap a single content or asset
  element — never wrap layout primitives (Stack, Row, AbsoluteCenter).
- Stagger wraps a list of animation primitives — each child must be an animation
  primitive wrapping content, not content directly.
"#

template_string CodeGenerationRules() #"
## RULES:

The following rules are strict and must always be followed when generating the component.

## Component contract
- Component receives no props — export as: export default function RemoteComponent() { ... }
- Never import from "remotion" or any other library.
- Never use useCurrentFrame, interpolate, spring, or any Remotion hook directly.

## Layout
- SafeArea must always be the outermost wrapper. Nothing renders outside it.
- Every visible element must be a direct child of Stack, Row, or AbsoluteCenter — never place components as siblings without a layout primitive.
- Use Stack for vertical arrangement, Row for horizontal. Nest them for complex layouts.
- Never use position:absolute, position:fixed, or position:relative — AbsoluteCenter is the only component that handles absolute positioning.
- Never create wrapper divs purely for layout — use Stack and Row instead.
- Never animate an empty div — every animation primitive must wrap visible content.
- Plain React divs are allowed only for geometric shapes and decorative elements (circles, dividers, lines). Never for layout.
- Spacing values for gap, padding, margin must be token values only mentioned above

## Styling
- Never set color, fontSize, fontWeight, letterSpacing, or fontFamily in style props — the design system controls these automatically.
- Never hardcode hex colors or rgba color values.
- Never hardcode font sizes — use Text variant prop instead.

## Animation
- Never use JSX conditionals for animated elements — use TimelineGate instead.
- Never animate an empty or invisible element.
- Always wrap content in an animation primitive to animate it — content primitives (Text, Counter, LogoAsset) never animate themselves.
- Width and height on LogoAsset define its bounding box; the logo remains contained without distortion.

## Safety
- Only use primitives, layout components from the AVAILABLE list. Never invent new component names.
- Never use className for layout or styling — it is not supported in the animation runtime.
"#

template_string PlannerTimingGuidance() #"
## TIMING GUIDANCE (30 frames = 1 second)

### Scene Duration Budgets
  Title / outro           — 60-90 frames
  Single stat             — 90-120 frames
  Comparison              — 120-150 frames
  Feature highlight       — 120-180 frames
  Workflow / how-it-works — 150-210 frames
  Transition              — 30-60 frames

### Content Minimums
  Counter                 — needs at least 90 frames total
  Typewriter              — needs ~2 frames per character minimum
  WordCycle               — needs at least 40 frames per word
  Stagger of 3+ items     — needs at least 90 frames total

### Total Video Budget
  Budgets across all scenes must sum close to total video budget given below.
  Allocate proportionally to scene complexity — a single centered heading needs
  far fewer frames than a staggered multi-element feature highlight.
  Let content density and narrative weight drive the budget, not equal distribution.
"#

template_string TimingAndFrameRules() #"
## TIMING AND FRAME RULES (fps=30, 30 frames = 1 second)

### General
- All timing values are whole numbers only. Never decimals.
  durationInFrames={20} ✓   durationInFrames={0.7} ✗
- Never animate continuously — every scene must have a hold period.
- Never stack entrance duration — if a parent SlideIn runs 20 frames,
  its child startAt is 0, not delayed again.

### Entrance / Exit
- Entrance: 15-25 frames (prefer 20-25 for confident feel, never below 15)
- Exit: 10-15 frames (always faster than entrance)
- ScaleIn: 20-30 frames

### Hold
- Default hold between elements: 6 frames
- Hold between sections (topic change): 15 frames
- Minimum hold before exit: 20 frames preferred 30+
- Every animation must have at least 6 frames of settled state before anything else moves

### Timeline Construction
Build element by element. Each element's startAt is:
  startAt = previous element's (startAt + durationInFrames) + hold

Sequential example:
  Logo fades in       startAt=0,  durationInFrames=20, ends=20
  Heading slides in   startAt=26, durationInFrames=20, ends=46  (6 frame hold)
  Subtext fades in    startAt=52, durationInFrames=20, ends=72  (6 frame hold)

Elements that form one visual unit start together (same startAt):
  Counter and its label
  Heading and eyebrow
  Logo and company name

### Stagger
- Delay between items: 8-10 frames
- All staggered children use same durationInFrames — only startAt shifts
- Last child ends at: startAt + ((childCount - 1) × delayBetween) + childDuration
- Next element startAt = stagger end frame + hold

### Content Duration
- Counter: 60-90 frames (minimum 60, longer for large numbers)
- Typewriter char mode: durationInFrames = text.length × 2
- Typewriter word mode: durationInFrames = wordCount × 10
- WordCycle: durationInFrames = words.length × (holdDuration + transitionDuration)
- Next element after Typewriter/WordCycle: startAt = their startAt + durationInFrames + hold

### settledFrame
settledFrame = max(startAt + durationInFrames) across ALL elements.

Special cases:
  Stagger:   startAt + ((childCount - 1) × delayBetween) + childDuration
  WordCycle: startAt + (words.length × (holdDuration + transitionDuration))

- settledFrame must leave at least 15 frames for exit
- durationInFrames = settledFrame + 20

### Limits
- Never exceed 240 frames for a single scene.
"#
