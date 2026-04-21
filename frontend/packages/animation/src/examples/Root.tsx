import React from "react";
import { AbsoluteFill, Composition, Sequence } from "remotion";
import { TextCycle, TextHighlight, TextStagger, TextWithWordCycle, Typewriter } from "../components/scenes/text";
import { FramePreset, SafeArea, AbsoluteCenter, Stack, Row } from "../core/layout";
import { SpeedFactorProvider } from "../duration";
import { ASPECT_PRESETS, resolveStyle, AspectPresetProvider, StyleContextProvider } from "../styles";
import { BrandTheme, darkTheme, ThemeProvider } from "../theme";
import { AnimatedVideo } from "../components/scenes/assets/AnimatedVideo";
import { TextWithImageScene, ImagePeel, LogoAsset, LogoShowcase, ProblemCollage, TextLeadStagger, ProblemHeadline } from "../components/scenes";


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
   3 · Text components – Typewriter, Counter, WordCycle
   ───────────────────────────────────────────────────────── */
const TextComponentsScene: React.FC = () => (
    <Scene>
        <SafeArea>
            <AbsoluteCenter axis="both">
                <TextLeadStagger />
                {/* <TextWithWordCycle
                    text="We build amazing products"
                    cyclingWords={['software', 'products', 'solutions', 'Try again']}
                    highlightStyle="background"
                    textCycleTransition="slideUp"
                    highlightColor="#00FF00" 
                    holdDuration={0} 
                    transitionDuration={0} variant={"heading"} style={undefined} className={undefined}                /> */}

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
                <TextWithImageScene id="content-aware-0" />
            </Sequence>

            <Sequence from={90} durationInFrames={90}>
                <TextWithImageScene id="content-aware-1" />
            </Sequence>

            <Sequence from={180} durationInFrames={90}>
                <TextWithImageScene id="content-aware-2" />
            </Sequence>

            <Sequence from={270} durationInFrames={90}>
                <TextWithImageScene id="content-aware-3" />
            </Sequence>

            <Sequence from={360} durationInFrames={90}>
                <TextWithImageScene id="content-aware-4" />
            </Sequence>

            <Sequence from={450} durationInFrames={90}>
                <TextWithImageScene id="content-aware-5" />
            </Sequence>

            <Sequence from={540} durationInFrames={90}>
                <TextWithImageScene id="content-aware-6" />
            </Sequence>

            {/* Extremely tall image */}
            <Sequence from={630} durationInFrames={90}>
                <TextWithImageScene id="content-aware-7" />
            </Sequence>

            {/* Very small image */}
            <Sequence from={720} durationInFrames={90}>
                <TextWithImageScene id="content-aware-8" />
            </Sequence>

            {/* Very long paragraph text */}
            <Sequence from={810} durationInFrames={90}>
                <TextWithImageScene id="content-aware-9" />
            </Sequence>

            {/* Very short text */}
            <Sequence from={900} durationInFrames={90}>
                <TextWithImageScene id="content-aware-10" />
            </Sequence>

            {/* Emoji / unicode text */}
            <Sequence from={990} durationInFrames={90}>
                <TextWithImageScene id="content-aware-11" />
            </Sequence>

            {/* Long unbroken word */}
            <Sequence from={1080} durationInFrames={90}>
                <TextWithImageScene id="content-aware-12" />
            </Sequence>

            {/* Multi-line formatted text */}
            <Sequence from={1170} durationInFrames={90}>
                <TextWithImageScene id="content-aware-13" />
            </Sequence>
        </AbsoluteFill>
    );
};

const AnimatedImageScene: React.FC = () => (
    <Scene>
        <AbsoluteFill >
            <SafeArea>
                <TextWithImageScene id="content-aware-0" />
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
                    <LogoShowcase />
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
                    <AnimatedVideo />
                </AbsoluteCenter>
            </SafeArea>
        </AbsoluteFill>
    </Scene>
);

const ProblemCollageScene: React.FC = () => (
    <Scene>
        <AbsoluteFill  style={{ backgroundColor: 'white' }}>
            <SafeArea>
                <AbsoluteCenter >
                    <ProblemHeadline style={ { color: "#000" }}/>
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
        <Composition id="text-components" component={TextComponentsScene} durationInFrames={200} fps={30} width={1920} height={1080} />
        <Composition id="animated-image" component={AnimatedImageScene} durationInFrames={180} fps={30} width={1920} height={1080} />
        <Composition id="animated-video" component={AnimatedVideoScene} durationInFrames={180} fps={30} width={1920} height={1080} />
        <Composition id="problem-collage" component={ProblemCollageScene} durationInFrames={66} fps={30} width={1920} height={1080} />
        <Composition id="logo" component={LogoScene} durationInFrames={80} fps={30} width={1920} height={1080} />
        <Composition id="icon-showcase" component={AnimatedIconShowcaseScene} durationInFrames={180} fps={30} width={1920} height={1080} />
        <Composition id="content-aware-scene" component={ContentAwareSceneExamples} durationInFrames={1260} fps={30} width={1920} height={1080} />
    </>
);
