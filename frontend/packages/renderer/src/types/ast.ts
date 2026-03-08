/*
## Which Field Maps to Which textType
```
textType          edit field written       __patch function reads
──────────────────────────────────────────────────────────────────
static            text                     __patchText
letter-cascade    text                     __patchVar('eid', 'text', ...)
typewriter        typewriterSource         __patchVar('eid', 'text', ...)
word-cycle        words                    __patchWords
counter           counter.start/end        __patchCounter
animated          —                        (no text edit)
*/
export interface ElementEdit {
    style?: Record<string, string | number>   // CSS property overrides
    text?: string                             // static text / letter-cascade / typewriter source
    asset?: string                            // image src replacement (CDN URL)
    icon?: string                             // icon component name
    ranges?: Record<string, any[]>            // interpolate output range overrides
    springs?: Record<string, Record<string, number>> // spring config overrides
    transform?: {                             // position/size from drag handles
        translateX?: number
        translateY?: number
        scaleX?: number
        scaleY?: number
    }
    // counter
    counter?: {
        start?: number
        end?:   number
    }
    // word-cycle
    words?: string[]
    // typewriter source text
    typewriterSource?: string
}

export interface RegistryEntry {
    eid: string;
    elementType: string;
    label: string;
    isLoopItem: boolean;
    parentEid?: string;
    editableProps: Record<string, EditablePropInfo>;
    staticStyle: Record<string, unknown>;
    animatedProps: Record<string, AnimatedPropInfo>;
    nonEditable: string[];
    lowConfidence: string[];
    textType: "static" | "dynamic" | "animated" | "mixed" | "none" | "counter" | "letter-cascade" | "typewriter" | "word-cycle";
    staticText?: string;
    assetType: "image" | "icon" | "none";
    staticSrc?: string;
    iconName?: string;
    // counter
    counterStart?: number
    counterEnd?: number
    isRounded?: boolean

    // typewriter / word-cycle / letter-cascade
    sourceText?: string
    sourceVar?: string

    // word-cycle
    words?: string[]
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type VarEntry =
    | { type: "interpolate"; frameRange: number[]; outputRange: unknown[]; raw: unknown }
    | { type: "spring"; config: Record<string, unknown>; raw: unknown }
    | { type: "static"; value: string | number; raw: unknown }
    // Array of plain scalars — ["Revenue", "Pipeline"] or [1, 2, 3]
    // Detected when init node is ArrayExpression with all literal elements
    | { type: "static-array"; value: (string | number)[]; raw: unknown }

    // words[Math.floor(frame / N) % words.length]
    // Detected when MemberExpression object → static-array, key → frame-based
    | { type: "word-cycle"; sourceVar: string; words: string[]; raw: unknown }

    // fullText.slice(0, charCount)
    // Detected when CallExpression is .slice/.substring on a static string var
    | { type: "typewriter"; sourceVar: string; sourceText: string; raw: unknown }

    // Math.round(interpolate(progress, [0,1], [staticNum, staticNum]))
    // Detected when output range resolves to two static numbers
    | { type: "counter"; startValue: number; endValue: number; isRounded: boolean; raw: unknown }

    // letters.map(...) where letters = staticString.split('')
    // Container whose text is split into animated children
    | { type: "letter-cascade"; sourceVar: string; sourceText: string; raw: unknown }

    | { type: "computed" }
    | { type: "unknown" }

export interface AnimatedPropInfo {
    type: "interpolate" | "spring";
    outputRange?: unknown[];
    frameRange?: number[];
    config?: Record<string, unknown>;
}

export interface EditablePropInfo {
    editable: boolean;
    confidence: "high" | "low";
    staticValue: unknown;
}

export interface TransformResult {
    transformedCode: string;
    registry: Record<string, RegistryEntry>;
}