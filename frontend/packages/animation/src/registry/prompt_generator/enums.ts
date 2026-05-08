import { DIRECTIONS,  HIGHLIGHT_STYLES, HIGHLIGHTED_TEXT_ANIMATIONS, LOGO_ANIMATIONS, SPLIT_BY_MODES, TEXT_CYCLE_TRANSITIONS } from "../../components/scenes";
import { ANIMATION_PRESET_ENTRANCE_ANIMATIONS, ANIMATION_PRESET_EXIT_ANIMATIONS } from "../../core/assets/AnimationPreset";
import { TYPOGRAPHY_VARIANT_NAMES } from "../../tokens";

export const AVAILABLE_ENUMS = [
    {
        name: "variant",
        description: "used for changing the font sizes",
        value: TYPOGRAPHY_VARIANT_NAMES
    },
    {
        name: "entranceAnimation",
        description: "used for entrance animations",
        value: ANIMATION_PRESET_ENTRANCE_ANIMATIONS
    },
    {
        name: "exitAnimation",
        description: "used for exit animations",
        value: ANIMATION_PRESET_EXIT_ANIMATIONS
    },
    {
        name: "splitBy",
        value: SPLIT_BY_MODES
    },
    {
        name: "logoAnimation",
        value: LOGO_ANIMATIONS,
    },
    {
        name: "direction",
        value: DIRECTIONS,
    },
    {
        name: "highlightStyle",
        value: HIGHLIGHT_STYLES,
    },
    {
        name: "textCycleTransition",
        value: TEXT_CYCLE_TRANSITIONS,
    },
    {
        name: "highlightedTextAnimation",
        value: HIGHLIGHTED_TEXT_ANIMATIONS,
    },
]
