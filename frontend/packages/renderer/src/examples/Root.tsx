import React, { useMemo } from "react";
import { Composition } from "remotion";
import {
    AbsoluteCenter,
    ASPECT_PRESETS,
    AspectPresetProvider,
    BrandTheme,
    FadeIn,
    FramePreset,
    lightTheme,
    resolveStyle,
    SafeArea,
    ScaleIn,
    SpeedFactorProvider,
    Stack,
    StyleContextProvider,
    ThemeProvider,
    Text,
    WordCycle,
    darkTheme
} from "@coasterai/animation";

const EXAMPLE_BRAND: BrandTheme = {
    ...darkTheme,
    primary: "#6366f1",
    secondary: "#ec4899",
    text: "#ffffff"
};

const EXAMPLE_STYLE_ID = "clean";
const EXAMPLE_PRESET = ASPECT_PRESETS["web"]!;

export const RemotionRoot: React.FC = () => {

    return (
        <>
            <Composition
                id={`preset-${EXAMPLE_PRESET.id}`}
                component={ExampleComposition}
                durationInFrames={300}
                fps={30}
                width={1920}
                height={1080}
            />
        </>
    );
};

const ExampleComposition: React.FC = () => {
    const styleConfig = resolveStyle(EXAMPLE_STYLE_ID);

    return (
        <FramePreset preset={EXAMPLE_PRESET}>
            <div style={{ width: "100%", height: "100%", background: EXAMPLE_BRAND.bg }}>
                <ThemeProvider theme={EXAMPLE_BRAND}>
                    <AspectPresetProvider preset={EXAMPLE_PRESET}>
                        <StyleContextProvider style={styleConfig}>
                            <SpeedFactorProvider factor={1}>
                                <SafeArea>
                                    <AbsoluteCenter axis="both">
                                        <Stack gap={16} align="center">
                                            <FadeIn id="fadein-0" startAt={0} durationInFrames={20}>
                                                <Text id="text-0" variant="subheading">Use Cursor in</Text>
                                            </FadeIn>
                                            <ScaleIn id="scalein-0" startAt={26} durationInFrames={24}>
                                                <WordCycle id="wordcycle-0"
                                                    startAt={26}
                                                    words={["Agent", "Plan", "Debug", "Ask"]}
                                                    holdDuration={120}
                                                    transitionDuration={10}
                                                    transition="slideUp"
                                                    variant="display" />

                                            </ScaleIn>
                                            <WordCycle id="wordcycle-0"
                                                    startAt={26}
                                                    words={["Agent", "Plan", "Debug", "Ask"]}
                                                    holdDuration={120}
                                                    transitionDuration={10}
                                                    transition="slideUp"
                                                    variant="display" />
                                        </Stack>
                                    </AbsoluteCenter>
                                </SafeArea>
                            </SpeedFactorProvider>
                        </StyleContextProvider>
                    </AspectPresetProvider>
                </ThemeProvider>
            </div>
        </FramePreset>
    );
};