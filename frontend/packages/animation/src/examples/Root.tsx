import React from "react";
import { AbsoluteFill, Composition } from "remotion";
import { Typewriter, TextCycle, TextHighlight, Counter, AnimatedNumber } from "../components/scenes/text";
import { FadeIn, FadeOut, SlideIn, ScaleIn, Stagger, TimelineGate } from "../core/animation_primitives";
import { FramePreset, SafeArea, AbsoluteCenter, Stack, Row } from "../core/layout";
import { Text } from "../core/text";
import { ImageAsset, LogoAsset, LogoWithBrandName } from "../core/assets";
import { SpeedFactorProvider } from "../duration";
import { ASPECT_PRESETS, resolveStyle, AspectPresetProvider, StyleContextProvider } from "../styles";
import { BrandTheme, darkTheme, ThemeProvider } from "../theme";
import { TextStagger } from "../components/scenes/text/TextStagger";
import { AnimatedImage } from "../components/scenes/assets/AnimatedImage";
import { AnimatedVideo } from "../components/scenes/assets/AnimatedVideo";
import { ImagePeel } from "../components/scenes";
import { IconShowcase } from "../components/scenes/assets/IconShowcase";


const BRAND: BrandTheme = {
    ...darkTheme,
    primary: "#6366f1",
    secondary: "#ec4899",
    text: "#ffffff"
};

const STYLE_ID = "clean";
const PRESET = ASPECT_PRESETS["web"]!;

/* ── helper: wrap each scene in the required providers ── */
export const Scene: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const styleConfig = resolveStyle(STYLE_ID);
    return (
        <FramePreset preset={PRESET}>
            <div style={{ width: "100%", height: "100%", background: BRAND.bg }}>
                <ThemeProvider theme={BRAND}>
                    <AspectPresetProvider preset={PRESET}>
                        <StyleContextProvider style={styleConfig}>
                            <SpeedFactorProvider factor={1}>
                                {children}
                            </SpeedFactorProvider>
                        </StyleContextProvider>
                    </AspectPresetProvider>
                </ThemeProvider>
            </div>
        </FramePreset>
    );
};

/* ─────────────────────────────────────────────────────────
   1 · Fade & Slide – basic entrance primitives
   ───────────────────────────────────────────────────────── */
const FadeSlideScene: React.FC = () => (
    <Scene>
        <SafeArea>
            <AbsoluteCenter axis="both">
                <Stack gap={24} align="center">
                    <FadeIn id="fade-title" startAt={0} durationInFrames={20}>
                        <Text id="t-fade" variant="heading">FadeIn + SlideIn</Text>
                    </FadeIn>

                    <SlideIn id="slide-left" startAt={15} durationInFrames={25} from="left" distance={120}>
                        <Text id="t-sl" variant="body">← slides from left</Text>
                    </SlideIn>

                    <SlideIn id="slide-right" startAt={30} durationInFrames={25} from="right" distance={120}>
                        <Text id="t-sr" variant="body">slides from right →</Text>
                    </SlideIn>

                    <SlideIn id="slide-bottom" startAt={45} durationInFrames={25} from="bottom">
                        <Text id="t-sb" variant="body">↑ slides from bottom</Text>
                    </SlideIn>

                    <FadeOut id="fade-all" startAt={100} durationInFrames={30}>
                        <Text id="t-fo" variant="caption">…then fades out</Text>
                    </FadeOut>
                </Stack>
            </AbsoluteCenter>
        </SafeArea>
    </Scene>
);

/* ─────────────────────────────────────────────────────────
   2 · Scale + Stagger – list entrance
   ───────────────────────────────────────────────────────── */
const ScaleStaggerScene: React.FC = () => (
    <Scene>
        <SafeArea>
            <AbsoluteCenter axis="both">
                <Stack gap={20} align="center">
                    <FadeIn id="stag-title" startAt={0} durationInFrames={15}>
                        <Text id="t-stag" variant="heading">ScaleIn + Stagger</Text>
                    </FadeIn>

                    <Stagger id="stag-list" startAt={20} staggerDelay={8}>
                        <ScaleIn id="sc-0" durationInFrames={20}>
                            <Text id="t-s0" variant="body">Feature One</Text>
                        </ScaleIn>
                        <ScaleIn id="sc-1" durationInFrames={20}>
                            <Text id="t-s1" variant="body">Feature Two</Text>
                        </ScaleIn>
                        <ScaleIn id="sc-2" durationInFrames={20}>
                            <Text id="t-s2" variant="body">Feature Three</Text>
                        </ScaleIn>
                    </Stagger>
                </Stack>
            </AbsoluteCenter>
        </SafeArea>
    </Scene>
);

/* ─────────────────────────────────────────────────────────
   3 · Text components – Typewriter, Counter, WordCycle
   ───────────────────────────────────────────────────────── */
const TextComponentsScene: React.FC = () => (
    <Scene>
        <SafeArea>
            <AbsoluteCenter axis="both">
                <Stack gap={64} align="center">
                    {/* <Counter
                        id="ctr-0"
                        suffix=" incidents"
                        from={0}
                        to={12450}
                        prefix="Solved "
                    /> */}
                    {/* 
                    <Row gap={2} >
                        <Text id="t-txt" variant="heading">Your dashboard, has</Text>
                        <TextCycle
                            id="wc-0"
                            texts={["Design Me", "Build Me", "Ship Me", "Iterate Me"]}
                        />
                    </Row> */}

                    {/* <AnimatedNumber
                        id="an-0"
                        startText="Solved"
                        endText="incidents"
                        from={0}
                        to={12450}
                        animation="slideUp"
                    /> */}

                    {/* <TextHighlight
                        id="th-0"
                        text="This is a {highlighted} text."
                    />

                    <Typewriter
                        id="tw-0"
                        text="Your dashboard, logs, and alerts didn't adapt"
                        mode="char"
                    />

                    <TextStagger
                        text="Your dashboard, logs, and alerts didn't adapt."
                    /> */}

                    <TextHighlight
                        id="th-0"
                        text="Everything else is just {noise}"
                    />            
                </Stack>
            </AbsoluteCenter>
        </SafeArea>
    </Scene>
);

/* ─────────────────────────────────────────────────────────
   4 · Assets + TimelineGate – logo, image, gated visibility
   ───────────────────────────────────────────────────────── */
const AssetsScene: React.FC = () => (
    <Scene>
        <SafeArea>
            <AbsoluteCenter axis="both">
                <Stack gap={24} align="center">
                    <FadeIn id="asset-title" startAt={0} durationInFrames={15}>
                        <Text id="t-asset" variant="heading">Assets + TimelineGate</Text>
                    </FadeIn>

                    <ScaleIn id="logo-in" startAt={10} durationInFrames={20}>
                        <LogoAsset id="logo-0" />
                    </ScaleIn>

                    <TimelineGate id="gate-img" showAfter={35} hideAfter={180}>
                        <FadeIn id="img-fade" startAt={35} durationInFrames={20}>
                            <ImageAsset id="img-0" width={400} height={250} />
                        </FadeIn>
                    </TimelineGate>

                    <TimelineGate id="gate-caption" showAfter={60}>
                        <SlideIn id="cap-slide" startAt={60} durationInFrames={20} from="bottom">
                            <Text id="t-cap" variant="caption">Image visible from frame 35–180</Text>
                        </SlideIn>
                    </TimelineGate>
                </Stack>
            </AbsoluteCenter>
        </SafeArea>
    </Scene>
);

const AnimatedImageScene: React.FC = () => (
    <Scene>
        <AbsoluteFill style={{ backgroundColor: 'white' }}>
            <SafeArea>
                <AbsoluteCenter axis="both">
                    {/* <AnimatedImage style={ { color: "#000"}} id="animated-image-0" text="Your dashboard, logs, and alerts didn't adapt" src="https://storage.googleapis.com/coasterai-public/assets/66a225f2-5ca6-433a-9d27-2aca804e3a1d/1774173924-cuser.png" /> */}
                    <ImagePeel
                        id="animated-peel-0"
                        sources={[
                            "https://storage.googleapis.com/coasterai-public/assets/66a225f2-5ca6-433a-9d27-2aca804e3a1d/1774173924-cuser.png",
                            "https://storage.googleapis.com/coasterai-public/assets/66a225f2-5ca6-433a-9d27-2aca804e3a1d/1774083475-add_this_person_to_the_back_of_t-0.jpg",
                            "https://storage.googleapis.com/coasterai-public/assets/66a225f2-5ca6-433a-9d27-2aca804e3a1d/1774173924-cuser.png",
                            "https://storage.googleapis.com/coasterai-public/assets/66a225f2-5ca6-433a-9d27-2aca804e3a1d/1774083475-add_this_person_to_the_back_of_t-0.jpg"
                        ]}
                    >
                    </ImagePeel>
                </AbsoluteCenter>
            </SafeArea>
        </AbsoluteFill>
    </Scene>
);

const AnimatedIconShowcaseScene: React.FC = () => (
    <Scene>
        <AbsoluteFill >
            <SafeArea>
                <AbsoluteCenter axis="both">
                    <IconShowcase
                        icons={["shopify", "midjourney", "openai"]}
                        text="Startups are getting 10× productivity with Cursor"
                    />
                </AbsoluteCenter>
            </SafeArea>
        </AbsoluteFill>
    </Scene>
);

const AnimatedVideoScene: React.FC = () => (
    <Scene>
        <AbsoluteFill style={{ backgroundColor: 'white' }}>
            <SafeArea>
                <AbsoluteCenter axis="both">
                    <AnimatedVideo style={{ color: "#000" }} id="animated-video-0" text="Your dashboard, logs, and alerts didn't adapt" src="https://storage.googleapis.com/coasterai-public/assets/66a225f2-5ca6-433a-9d27-2aca804e3a1d/1774173924-cur.mp4" />
                </AbsoluteCenter>
            </SafeArea>
        </AbsoluteFill>
    </Scene>
);

const LogoScene: React.FC = () => (
    <Scene>
        <AbsoluteFill style={{ backgroundColor: 'white' }}>
            <SafeArea>
                <AbsoluteCenter axis="both">
                    {/* <LogoAsset id="logo-0" src="https://storage.googleapis.com/coasterai-public/assets/66a225f2-5ca6-433a-9d27-2aca804e3a1d/1774240200-inline.svg" /> */}
                    <LogoWithBrandName
                        style={{ color: "#000" }}
                        variant="heading"
                        src="https://storage.googleapis.com/coasterai-public/assets/66a225f2-5ca6-433a-9d27-2aca804e3a1d/1774240201-apple-touch-icon.png" id="logo-with-brand-name-0"
                        brandName="Cursor" />
                </AbsoluteCenter>
            </SafeArea>
        </AbsoluteFill>
    </Scene>
);

/* ─────────────────────────────────────────────────────────
   5 · Layout – Row + Stack combos
   ───────────────────────────────────────────────────────── */
const LayoutScene: React.FC = () => (
    <Scene>
        <SafeArea>
            <AbsoluteCenter axis="both">
                <Stack gap={32} align="center">
                    <FadeIn id="lay-title" startAt={0} durationInFrames={15}>
                        <Text id="t-lay" variant="heading">Layout Primitives</Text>
                    </FadeIn>

                    <Stagger id="lay-stag" startAt={15} staggerDelay={10}>
                        <FadeIn id="row-fade" durationInFrames={20}>
                            <Row gap={8} align="center" justify="center">
                                <LogoAsset id="logo-row" width={60} height={60} />
                                <Stack gap={4}>
                                    <Text id="t-name" variant="body">CoasterAI</Text>
                                    <Text id="t-tag" variant="caption">Animation toolkit</Text>
                                </Stack>
                            </Row>
                        </FadeIn>

                        <FadeIn id="cols-fade" durationInFrames={20}>
                            <Row gap={16} justify="center">
                                <Stack gap={4} align="center">
                                    <Text id="t-m1" variant="display">42</Text>
                                    <Text id="t-l1" variant="caption">Components</Text>
                                </Stack>
                                <Stack gap={4} align="center">
                                    <Text id="t-m2" variant="display">8</Text>
                                    <Text id="t-l2" variant="caption">Primitives</Text>
                                </Stack>
                                <Stack gap={4} align="center">
                                    <Text id="t-m3" variant="display">∞</Text>
                                    <Text id="t-l3" variant="caption">Combos</Text>
                                </Stack>
                            </Row>
                        </FadeIn>
                    </Stagger>
                </Stack>
            </AbsoluteCenter>
        </SafeArea>
    </Scene>
);


/* ══════════════════════════════════════════════════════════
   Remotion Root – registers each scene as a composition
   ══════════════════════════════════════════════════════════ */
export const RemotionRoot: React.FC = () => (
    <>
        <Composition id="fade-slide" component={FadeSlideScene} durationInFrames={150} fps={30} width={1920} height={1080} />
        <Composition id="scale-stagger" component={ScaleStaggerScene} durationInFrames={150} fps={30} width={1920} height={1080} />
        <Composition id="text-components" component={TextComponentsScene} durationInFrames={50} fps={30} width={1920} height={1080} />
        <Composition id="assets" component={AssetsScene} durationInFrames={210} fps={30} width={1920} height={1080} />
        <Composition id="layout" component={LayoutScene} durationInFrames={180} fps={30} width={1920} height={1080} />
        <Composition id="animated-image" component={AnimatedImageScene} durationInFrames={180} fps={30} width={1920} height={1080} />
        <Composition id="animated-video" component={AnimatedVideoScene} durationInFrames={180} fps={30} width={1920} height={1080} />
        <Composition id="logo" component={LogoScene} durationInFrames={80} fps={30} width={1920} height={1080} />
        <Composition id="icon-showcase" component={AnimatedIconShowcaseScene} durationInFrames={180} fps={30} width={1920} height={1080} />
    </>
);