export interface ElementEdit {
    style?: Record<string, string | number>   // CSS property overrides
    text?: string;                   // static text replacement
    asset?: string;                   // image src replacement (CDN URL)
    icon?: string;                   // icon component name
    ranges?: Record<string, any[]>;    // interpolate output range overrides
    springs?: Record<string, Record<string, number>>; // spring config overrides
    transform?: {                       // position/size from drag handles
        translateX?: number;
        translateY?: number;
        scaleX?: number;
        scaleY?: number;
    };
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
    textType: "static" | "dynamic" | "animated" | "mixed" | "none";
    staticText?: string;
    assetType: "image" | "icon" | "none";
    staticSrc?: string;
    iconName?: string;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type VarEntry =
    | { type: "interpolate"; frameRange: number[]; outputRange: unknown[]; raw: unknown }
    | { type: "spring"; config: Record<string, unknown>; raw: unknown }
    | { type: "static"; value: string | number; raw: unknown }
    | { type: "computed" }
    | { type: "unknown" };

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