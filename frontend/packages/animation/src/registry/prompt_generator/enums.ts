import { DIRECTIONS, ENTRANCE_ANIMATIONS, HIGHLIGHT_STYLES, LOGO_ANIMATIONS, SPLIT_BY_MODES, TEXT_CYCLE_TRANSITIONS } from "../../components/scenes";
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
        value: ENTRANCE_ANIMATIONS
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
]