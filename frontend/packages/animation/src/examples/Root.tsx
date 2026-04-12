import React from "react";
import { AbsoluteFill, Composition, Sequence } from "remotion";
import { TextCycle, TextHighlight, TextStagger, TextWithWordCycle, Typewriter } from "../components/scenes/text";
import { FadeIn, FadeOut, SlideIn, ScaleIn, Stagger, TimelineGate } from "../core/animation_primitives";
import { FramePreset, SafeArea, AbsoluteCenter, Stack, Row } from "../core/layout";
import { Text } from "../core/text";
import { ImageAsset } from "../core/assets";
import { SpeedFactorProvider } from "../duration";
import { ASPECT_PRESETS, resolveStyle, AspectPresetProvider, StyleContextProvider } from "../styles";
import { BrandTheme, darkTheme, ThemeProvider } from "../theme";
import { AnimatedVideo } from "../components/scenes/assets/AnimatedVideo";
import { ContentAwareScene, ImagePeel, LogoAsset, LogoShowcase } from "../components/scenes";


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
                        <Text text="FadeIn + SlideIn" id="t-fade" variant="heading" />
                    </FadeIn>

                    <SlideIn id="slide-left" startAt={15} durationInFrames={25} from="left" distance={120}>
                        <Text text="← slides from left" id="t-sl" variant="heading" />
                    </SlideIn>

                    <SlideIn id="slide-right" startAt={30} durationInFrames={25} from="right" distance={120}>
                        <Text text="slides from right →" id="t-sr" variant="heading" />
                    </SlideIn>

                    <SlideIn id="slide-bottom" startAt={45} durationInFrames={25} from="bottom">
                        <Text text="↑ slides from bottom" id="t-sb" variant="heading" />
                    </SlideIn>

                    <FadeOut id="fade-all" startAt={100} durationInFrames={30}>
                        <Text text="…then fades out" id="t-fo" variant="heading" />
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
                        <Text text="ScaleIn + Stagger" id="t-stag" variant="heading" />
                    </FadeIn>

                    <Stagger id="stag-list" startAt={20} staggerDelay={8}>
                        <ScaleIn id="sc-0" durationInFrames={20}>
                            <Text text="Feature One" id="t-s0" variant="heading" />
                        </ScaleIn>
                        <ScaleIn id="sc-1" durationInFrames={20}>
                            <Text text="Feature Two" id="t-s1" variant="heading" />
                        </ScaleIn>
                        <ScaleIn id="sc-2" durationInFrames={20}>
                            <Text text="Feature Three" id="t-s2" variant="heading" />
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
                <TextWithWordCycle
                    text="We build amazing products"
                    cyclingWords={['software', 'products', 'solutions', 'Try again']}
                    highlightStyle="background"
                    transition="slideUp"
                    highlightColor="#00FF00"
                />

                {/* <Stack gap={64} align="center"> */}
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

                {/* <TextHighlight
                        id="th-0"
                        text="Everything {noise} is pain "
                    />             */}

                {/* <AnimatedNumber
                        id="an-0"
                        startText="Solved"
                        endText="incidents"
                        from={0}
                        to={12450}
                    />

                    <TextHighlight id="texthighlight-0" text="Can your AI actually work with you?" /> */}

                {/* </Stack> */}
            </AbsoluteCenter>
        </SafeArea>
    </Scene>
);


export const ContentAwareSceneExamples: React.FC = () => {
    return (
        <AbsoluteFill>
            <Sequence from={0} durationInFrames={90}>
                <ContentAwareScene
                    id="content-aware-0"
                    src="https://placehold.co/2800x1400"
                    mediaType="img"
                    // text={{
                    //     content: "Your dashboard, logs, and alerts didn't adapt, because you didn't allow",
                    //     variant: 'heading',
                    // }}
                     textComponent={<TextHighlight
                        text="We build amazing products for now it will be good to know and {all good}"
                        // cyclingWords={['software', 'products', 'solutions', 'Try again']}
                        highlightStyle="background"
                        // {transition="slideUp"
                        highlightColor="#00FF00"
                    />}
                />
            </Sequence>

            <Sequence from={90} durationInFrames={90}>
                <ContentAwareScene
                    id="content-aware-1"
                    src="https://placehold.co/400x600"
                    mediaType="img"
                    textComponent={<TextHighlight
                        text="We build amazing products for now it will be good to know and {all good}"
                        // cyclingWords={['software', 'products', 'solutions', 'Try again']}
                        highlightStyle="background"
                        // {transition="slideUp"
                        highlightColor="#00FF00"
                    />}
                //   text={{
                //     content: 'A vertical image with shorter supporting text',
                //     variant: 'heading',
                //   }}
                />
            </Sequence>

            <Sequence from={180} durationInFrames={90}>
                <ContentAwareScene
                    id="content-aware-2"
                    src="https://placehold.co/900x500"
                    mediaType="img"                    
                />
            </Sequence>

            <Sequence from={270} durationInFrames={90}>
                <ContentAwareScene
                    id="content-aware-3"
                    src="https://placehold.co/350x357"
                    mediaType="img"                
                />
            </Sequence>

            <Sequence from={360} durationInFrames={90}>
                <ContentAwareScene
                    id="content-aware-4"
                    src="https://placehold.co/672x730"
                    mediaType="img"                   
                />
            </Sequence>
            <Sequence from={450} durationInFrames={90}>
                <ContentAwareScene
                    id="content-aware-5"
                    src="https://placehold.co/2000x2000"
                    mediaType="img"                    
                />
            </Sequence>
            <Sequence from={540} durationInFrames={90}>
                <ContentAwareScene
                    id="content-aware-6"
                    src="https://placehold.co/2000x400"
                    mediaType="img"                    
                />
            </Sequence>

            {/* Extremely tall image */}
            <Sequence from={630} durationInFrames={90}>
                <ContentAwareScene
                    id="content-aware-7"
                    src="https://placehold.co/400x2000"
                    mediaType="img"                    
                />
            </Sequence>

            {/* Very small image */}
            <Sequence from={720} durationInFrames={90}>
                <ContentAwareScene
                    id="content-aware-8"
                    src="https://placehold.co/80x80"
                    mediaType="img"                    
                />
            </Sequence>

            {/* Very long paragraph text */}
            <Sequence from={810} durationInFrames={90}>
                <ContentAwareScene
                    id="content-aware-9"
                    src="https://placehold.co/600x400"
                    mediaType="img"                    
                />
            </Sequence>

            {/* Very short text */}
            <Sequence from={900} durationInFrames={90}>
                <ContentAwareScene
                    id="content-aware-10"
                    src="https://placehold.co/600x400"
                    mediaType="img"                    
                />
            </Sequence>

            {/* Emoji / unicode text */}
            <Sequence from={990} durationInFrames={90}>
                <ContentAwareScene
                    id="content-aware-11"
                    src="https://placehold.co/500x500"
                    mediaType="img"                    
                />
            </Sequence>

            {/* Long unbroken word */}
            <Sequence from={1080} durationInFrames={90}>
                <ContentAwareScene
                    id="content-aware-12"
                    src="https://placehold.co/600x400"
                    mediaType="img"                    
                />
            </Sequence>

            {/* Multi-line formatted text */}
            <Sequence from={1170} durationInFrames={90}>
                <ContentAwareScene
                    id="content-aware-13"
                    src="https://placehold.co/606x450"
                    mediaType="img"                    
                />
            </Sequence>
        </AbsoluteFill>
    );
};

const AnimatedImageScene: React.FC = () => (
    <Scene>
        <AbsoluteFill >
            <SafeArea>
                {/* <AbsoluteCenter axis="both"> */}
                {/* <AnimatedImage style={ { color: "#000"}} id="animated-image-0" text="Your dashboard, logs, and alerts didn't adapt" src="https://storage.googleapis.com/coasterai-public/assets/66a225f2-5ca6-433a-9d27-2aca804e3a1d/1774173924-cuser.png" /> */}
                <ContentAwareScene
                    id="content-aware-0"
                    src="https://storage.googleapis.com/coasterai-public/assets/66a225f2-5ca6-433a-9d27-2aca804e3a1d/1774503450-screenshot-2026-03-26-at-11.06.54am.png"
                    mediaType="img"                    
                />

                {/* </AbsoluteCenter> */}
            </SafeArea>
        </AbsoluteFill>
    </Scene>
);

const AnimatedIconShowcaseScene: React.FC = () => (
    <Scene>
        <AbsoluteFill style={{ backgroundColor: 'white' }}>
            <SafeArea>
                <AbsoluteCenter axis="both">
                    {/* <IconShowcase
                        icons={["shopify", "midjourney", "openai"]}
                        text="Startups are getting 10× productivity with Cursor"
                    /> */}
                    <LogoShowcase
                        text="Building with unber companies"
                        images={[
                            "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/google/wordmark.svg",
                            "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/openai/wordmark-light.svg",
                            "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/razorpay/default.svg",
                            "https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/netflix/wordmark.svg",
                            "https://storage.googleapis.com/coasterai-public/assets/66a225f2-5ca6-433a-9d27-2aca804e3a1d/1774173924-cuser.png"
                        ]}
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
                    <AnimatedVideo id="animated-video-0" text="Your dashboard, logs, and alerts didn't adapt" src="https://storage.googleapis.com/coasterai-public/assets/66a225f2-5ca6-433a-9d27-2aca804e3a1d/1774173924-cur.mp4" />
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
                    <LogoAsset id="logo-0" src="https://storage.googleapis.com/coasterai-public/assets/66a225f2-5ca6-433a-9d27-2aca804e3a1d/1774240200-inline.svg" />
                    {/* <LogoWithBrandName
                        style={{ color: "#000" }}
                        variant="heading"
                        src="https://storage.googleapis.com/coasterai-public/assets/66a225f2-5ca6-433a-9d27-2aca804e3a1d/1774240201-apple-touch-icon.png" id="logo-with-brand-name-0"
                        brandName="Cursor" /> */}
                </AbsoluteCenter>
            </SafeArea>
        </AbsoluteFill>
    </Scene>
);



/* ══════════════════════════════════════════════════════════
   Remotion Root – registers each scene as a composition
   ══════════════════════════════════════════════════════════ */
export const RemotionRoot: React.FC = () => (
    <>
        <Composition id="fade-slide" component={FadeSlideScene} durationInFrames={150} fps={30} width={1920} height={1080} />
        <Composition id="scale-stagger" component={ScaleStaggerScene} durationInFrames={150} fps={30} width={1920} height={1080} />
        <Composition id="text-components" component={TextComponentsScene} durationInFrames={200} fps={30} width={1920} height={1080} />
        <Composition id="animated-image" component={AnimatedImageScene} durationInFrames={180} fps={30} width={1920} height={1080} />
        <Composition id="animated-video" component={AnimatedVideoScene} durationInFrames={180} fps={30} width={1920} height={1080} />
        <Composition id="logo" component={LogoScene} durationInFrames={80} fps={30} width={1920} height={1080} />
        <Composition id="icon-showcase" component={AnimatedIconShowcaseScene} durationInFrames={180} fps={30} width={1920} height={1080} />
        <Composition id="content-aware-scene" component={ContentAwareSceneExamples} durationInFrames={1260} fps={30} width={1920} height={1080} />
    </>
);