// Default editor configuration - all hardcoded values as JSON
// This configuration drives the entire editor

import type { EditorConfig } from "@/types/editor";
import { SlideType, TransitionType } from "@coasterai/pb/coasterai/core/v1/slide_pb";
import { TRANSITION_OPTIONS } from "@coasterai/renderer";

export const defaultEditorConfig: EditorConfig = { 

    // ==========================================
    // Resolution Configuration
    // ==========================================
    resolution: {
        options: [
            { $typeName: "coasterai.core.v1.Resolution", id: "16:9", name: "Landscape", aspect: "16/9", width: 1920, height: 1080 },
            // { $typeName: "coasterai.core.v1.Resolution", id: "4:3", name: "Standard", aspect: "4/3", width: 1440, height: 1080 },
            // { $typeName: "coasterai.core.v1.Resolution", id: "9:16", name: "Portrait", aspect: "9/16", width: 1080, height: 1920 },
            // { $typeName: "coasterai.core.v1.Resolution", id: "1:1", name: "Square", aspect: "1/1", width: 1080, height: 1080 },
        ],
        default: "16:9",
    },

    // ==========================================
    // Slide Types Configuration (Unified)
    // ==========================================
    slideTypes: {
        defaultSlideType: SlideType.ANIMATION,
        types: [
            {
                id: SlideType.MEDIA,
                name: "Image/Screenshot",
                description: "Add screen with annotations",
                icon: "ImageIcon",
                color: "#10b981",
                defaultDuration: 5,
                defaultTranscript: "Add your script here...",
                defaultBackground: "#0f172a",
                supportedFormats: ["jpg", "jpeg", "png", "gif", "webp"],
                maxFileSize: 10,
                canvasEnabled: true,
                availableTools: ["callout"],
                availableEffects: ["spotlight", "zoom"],
                supportsContent: true,  // Image can be resized/repositioned
            },
            {
                id: SlideType.ANIMATION,
                name: "Text Animation",
                description: "Animated typography",
                icon: "Type",
                color: "#3b82f6",
                defaultDuration: 3,
                defaultTranscript: "Add your script here...",
                defaultBackground: "#0f172a",
                availableTools: [],
                availableEffects: [],
                supportsContent: false,
                templates: {
                    defaultTemplateId: "number-counter",
                    categoryLabels: {
                        numbers: "Numbers",
                        text: "Text",
                        effects: "Effects",
                    },
                    categoryIcons: {
                        numbers: "Hash",
                        text: "Type",
                        effects: "Sparkles",
                    },
                    templates: [
                        {
                            id: "number-counter",
                            name: "Number Counter",
                            description: "Animate a number from start to end value",
                            category: "numbers",
                            preview: "bg-gradient-to-br from-blue-500 to-purple-600",
                            properties: [
                                { key: "startNumber", label: "Start Number", type: "number", default: 0 },
                                { key: "endNumber", label: "End Number", type: "number", default: 100 },
                                { key: "prefix", label: "Prefix", type: "text", default: "" },
                                { key: "suffix", label: "Suffix", type: "text", default: "%" },
                                { key: "fontSize", label: "Font Size", type: "number", default: 120, min: 24, max: 300 },
                                { key: "color", label: "Color", type: "color", default: "#ffffff" },
                            ],
                        },
                        {
                            id: "countdown",
                            name: "Countdown",
                            description: "Countdown from a number to zero",
                            category: "numbers",
                            preview: "bg-gradient-to-br from-red-500 to-orange-500",
                            properties: [
                                { key: "startNumber", label: "Start From", type: "number", default: 10, min: 1, max: 100 },
                                { key: "fontSize", label: "Font Size", type: "number", default: 150, min: 48, max: 300 },
                                { key: "color", label: "Color", type: "color", default: "#ffffff" },
                            ],
                        },
                        {
                            id: "text-reveal",
                            name: "Text Reveal",
                            description: "Text reveals with a smooth slide animation",
                            category: "text",
                            preview: "bg-gradient-to-br from-emerald-500 to-teal-600",
                            properties: [
                                { key: "text", label: "Display Text", type: "text", default: "Hello World" },
                                {
                                    key: "direction", label: "Direction", type: "select", default: "up", options: [
                                        { value: "up", label: "From Bottom" },
                                        { value: "down", label: "From Top" },
                                        { value: "left", label: "From Right" },
                                        { value: "right", label: "From Left" },
                                    ]
                                },
                                { key: "fontSize", label: "Font Size", type: "number", default: 72, min: 24, max: 200 },
                                { key: "color", label: "Color", type: "color", default: "#ffffff" },
                            ],
                        },
                        {
                            id: "typewriter",
                            name: "Typewriter",
                            description: "Text types out letter by letter",
                            category: "text",
                            preview: "bg-gradient-to-br from-gray-700 to-gray-900",
                            properties: [
                                { key: "text", label: "Display Text", type: "text", default: "Type your message..." },
                                {
                                    key: "showCursor", label: "Show Cursor", type: "select", default: "true", options: [
                                        { value: "true", label: "Yes" },
                                        { value: "false", label: "No" },
                                    ]
                                },
                                { key: "fontSize", label: "Font Size", type: "number", default: 56, min: 24, max: 150 },
                                { key: "color", label: "Color", type: "color", default: "#22c55e" },
                            ],
                        },
                        {
                            id: "word-by-word",
                            name: "Word by Word",
                            description: "Words appear one at a time with spring animation",
                            category: "text",
                            preview: "bg-gradient-to-br from-indigo-500 to-blue-600",
                            properties: [
                                { key: "text", label: "Display Text", type: "text", default: "Each word fades in" },
                                { key: "fontSize", label: "Font Size", type: "number", default: 64, min: 24, max: 150 },
                                { key: "color", label: "Color", type: "color", default: "#ffffff" },
                            ],
                        },
                        {
                            id: "letter-cascade",
                            name: "Letter Cascade",
                            description: "Letters drop in with a cascade effect",
                            category: "text",
                            preview: "bg-gradient-to-br from-pink-500 to-rose-600",
                            properties: [
                                { key: "text", label: "Display Text", type: "text", default: "CASCADE" },
                                { key: "fontSize", label: "Font Size", type: "number", default: 80, min: 24, max: 200 },
                                { key: "color", label: "Color", type: "color", default: "#ffffff" },
                            ],
                        },
                        {
                            id: "scale-bounce",
                            name: "Scale Bounce",
                            description: "Words scale up with a bouncy effect",
                            category: "effects",
                            preview: "bg-gradient-to-br from-amber-500 to-yellow-500",
                            properties: [
                                { key: "text", label: "Display Text", type: "text", default: "BOUNCE!" },
                                { key: "fontSize", label: "Font Size", type: "number", default: 96, min: 32, max: 200 },
                                { key: "color", label: "Color", type: "color", default: "#ffffff" },
                            ],
                        },
                        {
                            id: "blur-in",
                            name: "Blur In",
                            description: "Text blurs in from invisible",
                            category: "effects",
                            preview: "bg-gradient-to-br from-cyan-500 to-blue-500",
                            properties: [
                                { key: "text", label: "Display Text", type: "text", default: "Blur In Effect" },
                                { key: "fontSize", label: "Font Size", type: "number", default: 64, min: 24, max: 150 },
                                { key: "color", label: "Color", type: "color", default: "#ffffff" },
                            ],
                        },
                        {
                            id: "gradient-text",
                            name: "Gradient Text",
                            description: "Text with animated gradient fill",
                            category: "effects",
                            preview: "bg-gradient-to-br from-purple-500 via-pink-500 to-red-500",
                            properties: [
                                { key: "text", label: "Display Text", type: "text", default: "GRADIENT" },
                                { key: "colorStart", label: "Start Color", type: "color", default: "#8b5cf6" },
                                { key: "colorEnd", label: "End Color", type: "color", default: "#ec4899" },
                                { key: "fontSize", label: "Font Size", type: "number", default: 96, min: 32, max: 200 },
                            ],
                        },
                        {
                            id: "split-text",
                            name: "Split Text",
                            description: "Text splits and rejoins",
                            category: "effects",
                            preview: "bg-gradient-to-br from-violet-600 to-indigo-600",
                            properties: [
                                { key: "text", label: "Display Text", type: "text", default: "SPLIT" },
                                { key: "fontSize", label: "Font Size", type: "number", default: 100, min: 48, max: 200 },
                                { key: "color", label: "Color", type: "color", default: "#ffffff" },
                            ],
                        },
                    ],
                },
            },           
        ],
    },
};

export default defaultEditorConfig;
