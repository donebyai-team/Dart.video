/**
 * Prompt examples — showing exactly what getAnimationPrompt() produces
 * for different animation types and brand configurations.
 *
 * These are NOT used at runtime. They exist so developers (and LLMs reading
 * the codebase) can see the full prompt shape without running the code.
 *
 * To regenerate: call getAnimationPrompt() with the params shown in each example.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMPLE 1: "text" type, dark brand, 1920×1080
//
// getAnimationPrompt('text', darkBrand, 'clean', { id: 'landscape', width: 1920, height: 1080, safeArea: {...} })
// ═══════════════════════════════════════════════════════════════════════════════

export const EXAMPLE_TEXT_DARK_1080 = `
FRAME CONTRACT:
Your component receives { frame, fps, brand, data } as props.
fps is always 30. frame counts from 0.
Never call useCurrentFrame(), interpolate(), spring(), or any Remotion hook.
Never import from "remotion" or any other library.
Plain React is allowed for static layout and positioning.
Animation timing must always use the provided primitives.

CANVAS: 1920px × 1080px (landscape)

COMPONENTS (only these are available):
  SafeArea — Outermost content wrapper — applies safe area insets from the active aspect preset
  Stack gap? align? justify? — Vertical flex layout — gap must use spacing token values (4|8|12|16|24|32|48|64|96)
  Row gap? align? justify? — Horizontal flex layout — gap must use spacing token values
  AbsoluteCenter axis? — Centers child absolutely within nearest positioned parent — axis: x|y|both
  FadeIn frame delay? duration? — Opacity 0→1 entrance — frame delay? duration?
  FadeOut frame delay? duration? — Opacity 1→0 exit — frame delay? duration?
  SlideIn frame delay? duration? direction? distance? — Translate+fade entrance — frame delay? duration? direction?(up|down|left|right) distance?
  SlideOut frame delay? duration? direction? distance? — Translate+fade exit — frame delay? duration? direction?(up|down|left|right) distance?
  ScaleIn frame delay? duration? origin? — Scale 0→1 entrance — frame delay? duration? origin?(center|top|bottom|left|right)
  ScaleOut frame delay? duration? origin? — Scale 1→0 exit — frame delay? duration? origin?(center|top|bottom|left|right)
  Stagger frame startAt? delayBetween? — List timing orchestrator — frame startAt? delayBetween? — clones children with increasing frame offset
  TimelineGate frame showAfter hideAfter? — Mount/unmount children in frame window — frame showAfter hideAfter? — use instead of JSX conditionals
  Text variant? — Static text — variant?(caption|label|body|subheading|heading|display) — wrap in FadeIn/SlideIn to animate
  Counter frame to delay? duration? from? format? prefix? suffix? — Animated number — frame to delay? duration? from? format? prefix? suffix?
  Typewriter frame text delay? duration? mode? — Progressive text reveal — frame text delay? duration? mode?(char|word|line)
  WordCycle frame words holdDuration? transitionDuration? transition? — Cycling word array — frame words holdDuration? transitionDuration? transition?(flipY|fadeSwap|slideUp)
  TitleCard frame heading subheading? eyebrow? delay? — Hero composition — frame heading subheading? eyebrow? delay?

SPACING (use these values for gap/padding/margin): 4 | 8 | 12 | 16 | 24 | 32 | 48 | 64 | 96

TYPOGRAPHY variants: caption | label | body | subheading | heading | display — never hardcode font sizes

BRAND TOKENS (use these for colors — never hardcode hex):
  brand.primary="#6366f1" brand.secondary="#a5b4fc"
  brand.bg="#0a0a0a" brand.text="#fafafa" brand.font="Inter"

TIMING GUIDANCE (fps=30, so 30 frames = 1 second):
  Typical entrance: 15-25 frames
  Typical exit: 10-15 frames
  Stagger between items: 6-10 frames
  Counter animation: 30-60 frames
  Typewriter per character: 2-3 frames (set duration = text.length * 2)
  Hold before next section: 10-20 frames

RULES:
  Never import from "remotion" or any library.
  Never use useCurrentFrame, interpolate, spring directly.
  Never hardcode hex colors — use brand.primary, brand.secondary, brand.bg, brand.text.
  Never use arbitrary px values — use spacing token values for gap/padding.
  Never hardcode font sizes — use Text variant prop.
  SafeArea must always be the outermost content wrapper.
  Never use JSX conditionals for animated elements — use TimelineGate showAfter instead.
  Pass frame only to animation primitives (FadeIn, SlideIn, ScaleIn, FadeOut, SlideOut, ScaleOut, Stagger, TimelineGate) and content primitives (Counter, Typewriter, WordCycle). Never pass frame to Stack, Row, SafeArea, AbsoluteCenter, Text, or HTML elements.
  Export the component as: export default function RemoteComponent({ frame, fps, brand, data }) { ... }

TEXT TYPE RULES:
  Every text element must use a Text variant — never a plain HTML element with inline font styles.
  Use Typewriter for any text that should be revealed progressively.
  Use WordCycle when cycling between 2+ alternative phrases.
  Never use JSX conditionals for animated elements — use TimelineGate showAfter instead.
  Pass frame only to animation primitives (FadeIn, SlideIn, etc.) and content primitives (Counter, Typewriter, WordCycle). Never pass frame to layout primitives or plain HTML.
`;

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMPLE 2: "data" type, light brand, 1080×1920 (vertical/mobile)
//
// getAnimationPrompt('data', lightBrand, 'clean', { id: 'portrait', width: 1080, height: 1920, safeArea: {...} })
// ═══════════════════════════════════════════════════════════════════════════════

export const EXAMPLE_DATA_LIGHT_VERTICAL = `
FRAME CONTRACT:
Your component receives { frame, fps, brand, data } as props.
fps is always 30. frame counts from 0.
Never call useCurrentFrame(), interpolate(), spring(), or any Remotion hook.
Never import from "remotion" or any other library.
Plain React is allowed for static layout and positioning.
Animation timing must always use the provided primitives.

CANVAS: 1080px × 1920px (portrait)

COMPONENTS (only these are available):
  SafeArea — Outermost content wrapper — applies safe area insets from the active aspect preset
  Stack gap? align? justify? — Vertical flex layout — gap must use spacing token values (4|8|12|16|24|32|48|64|96)
  Row gap? align? justify? — Horizontal flex layout — gap must use spacing token values
  AbsoluteCenter axis? — Centers child absolutely within nearest positioned parent — axis: x|y|both
  FadeIn frame delay? duration? — Opacity 0→1 entrance — frame delay? duration?
  FadeOut frame delay? duration? — Opacity 1→0 exit — frame delay? duration?
  SlideIn frame delay? duration? direction? distance? — Translate+fade entrance — frame delay? duration? direction?(up|down|left|right) distance?
  SlideOut frame delay? duration? direction? distance? — Translate+fade exit — frame delay? duration? direction?(up|down|left|right) distance?
  ScaleIn frame delay? duration? origin? — Scale 0→1 entrance — frame delay? duration? origin?(center|top|bottom|left|right)
  ScaleOut frame delay? duration? origin? — Scale 1→0 exit — frame delay? duration? origin?(center|top|bottom|left|right)
  Stagger frame startAt? delayBetween? — List timing orchestrator — frame startAt? delayBetween? — clones children with increasing frame offset
  TimelineGate frame showAfter hideAfter? — Mount/unmount children in frame window — frame showAfter hideAfter? — use instead of JSX conditionals
  Text variant? — Static text — variant?(caption|label|body|subheading|heading|display) — wrap in FadeIn/SlideIn to animate
  Counter frame to delay? duration? from? format? prefix? suffix? — Animated number — frame to delay? duration? from? format? prefix? suffix?
  Typewriter frame text delay? duration? mode? — Progressive text reveal — frame text delay? duration? mode?(char|word|line)
  WordCycle frame words holdDuration? transitionDuration? transition? — Cycling word array — frame words holdDuration? transitionDuration? transition?(flipY|fadeSwap|slideUp)

SPACING (use these values for gap/padding/margin): 4 | 8 | 12 | 16 | 24 | 32 | 48 | 64 | 96

TYPOGRAPHY variants: caption | label | body | subheading | heading | display — never hardcode font sizes

BRAND TOKENS (use these for colors — never hardcode hex):
  brand.primary="#18181b" brand.secondary="#6366f1"
  brand.bg="#ffffff" brand.text="#0a0a0a" brand.font="Inter"

TIMING GUIDANCE (fps=30, so 30 frames = 1 second):
  Typical entrance: 15-25 frames
  Typical exit: 10-15 frames
  Stagger between items: 6-10 frames
  Counter animation: 30-60 frames
  Typewriter per character: 2-3 frames (set duration = text.length * 2)
  Hold before next section: 10-20 frames

RULES:
  Never import from "remotion" or any library.
  Never use useCurrentFrame, interpolate, spring directly.
  Never hardcode hex colors — use brand.primary, brand.secondary, brand.bg, brand.text.
  Never use arbitrary px values — use spacing token values for gap/padding.
  Never hardcode font sizes — use Text variant prop.
  SafeArea must always be the outermost content wrapper.
  Never use JSX conditionals for animated elements — use TimelineGate showAfter instead.
  Pass frame only to animation primitives (FadeIn, SlideIn, ScaleIn, FadeOut, SlideOut, ScaleOut, Stagger, TimelineGate) and content primitives (Counter, Typewriter, WordCycle). Never pass frame to Stack, Row, SafeArea, AbsoluteCenter, Text, or HTML elements.
  Export the component as: export default function RemoteComponent({ frame, fps, brand, data }) { ... }

DATA TYPE RULES:
  Use Counter for any animated numeric value.
  Use StatBlock for a single KPI with label and trend.
  Never build bar animation manually — use BarChartLogic.
  Never use JSX conditionals for animated elements — use TimelineGate showAfter instead.
`;

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMPLE 3: What the LLM should output given the "text" prompt above
// ═══════════════════════════════════════════════════════════════════════════════

export const EXAMPLE_LLM_OUTPUT_TEXT = `
export default function RemoteComponent({ frame, fps, brand, data }) {
  return (
    <SafeArea>
      <AbsoluteCenter axis="both">
        <Stack gap={16} align="center">

          <SlideIn frame={frame} startAt={0} durationInFrames={25} from="bottom">
            <Text variant="display">Phase 2 Complete</Text>
          </SlideIn>

          <FadeIn frame={frame} startAt={20} durationInFrames={20}>
            <Text variant="subheading">Animation system built on primitives</Text>
          </FadeIn>

          <FadeIn frame={frame} startAt={45} durationInFrames={20}>
            <Row gap={32} align="center">
              <Counter frame={frame} startAt={50} durationInFrames={40} from={0} to={12} suffix=" components" />
              <Counter frame={frame} startAt={55} durationInFrames={40} from={0} to={3} suffix=" presets" />
            </Row>
          </FadeIn>

          <TimelineGate frame={frame} showAfter={70}>
            <Stagger frame={frame} startAt={70} delayBetween={8}>
              <FadeIn frame={frame} durationInFrames={15}>
                <Text variant="body">✓ Non-destructive editing via patches</Text>
              </FadeIn>
              <FadeIn frame={frame} durationInFrames={15}>
                <Text variant="body">✓ Click-to-select toolbar</Text>
              </FadeIn>
              <FadeIn frame={frame} durationInFrames={15}>
                <Text variant="body">✓ Brand-aware design tokens</Text>
              </FadeIn>
            </Stagger>
          </TimelineGate>

        </Stack>
      </AbsoluteCenter>
    </SafeArea>
  );
}
`;

// ═══════════════════════════════════════════════════════════════════════════════
// EXAMPLE 4: What the LLM should output for a "data" dashboard animation
// ═══════════════════════════════════════════════════════════════════════════════

export const EXAMPLE_LLM_OUTPUT_DATA = `
export default function RemoteComponent({ frame, fps, brand, data }) {
  return (
    <SafeArea>
      <Stack gap={32}>

        <SlideIn frame={frame} startAt={0} durationInFrames={20} from="top">
          <Text variant="heading">Q4 Performance</Text>
        </SlideIn>

        <TimelineGate frame={frame} showAfter={15}>
          <Row gap={48} align="center">
            <Stack gap={8} align="center">
              <Counter frame={frame} startAt={20} durationInFrames={45} from={0} to={2847} prefix="$" format="0," />
              <FadeIn frame={frame} startAt={30} durationInFrames={15}>
                <Text variant="caption">Revenue (K)</Text>
              </FadeIn>
            </Stack>
            <Stack gap={8} align="center">
              <Counter frame={frame} startAt={25} durationInFrames={45} from={0} to={94} suffix="%" />
              <FadeIn frame={frame} startAt={35} durationInFrames={15}>
                <Text variant="caption">Retention</Text>
              </FadeIn>
            </Stack>
            <Stack gap={8} align="center">
              <Counter frame={frame} startAt={30} durationInFrames={45} from={0} to={156} />
              <FadeIn frame={frame} startAt={40} durationInFrames={15}>
                <Text variant="caption">New Customers</Text>
              </FadeIn>
            </Stack>
          </Row>
        </TimelineGate>

        <TimelineGate frame={frame} showAfter={80}>
          <FadeIn frame={frame} startAt={80} durationInFrames={20}>
            <Text variant="subheading">Best quarter on record</Text>
          </FadeIn>
        </TimelineGate>

      </Stack>
    </SafeArea>
  );
}
`;
