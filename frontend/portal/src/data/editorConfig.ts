// Default editor configuration - all hardcoded values as JSON
// This configuration drives the entire editor

import type { EditorConfig } from "@/types/editor";
import { SlideType, TransitionType } from "@/types/slides";

export const defaultEditorConfig: EditorConfig = {
    // ==========================================
    // Background Configuration
    // ==========================================
    background: {
        solidColors: [
            { name: "Slate Dark", value: "#0f172a" },
            { name: "Slate", value: "#1e293b" },
            { name: "Zinc Dark", value: "#18181b" },
            { name: "Neutral", value: "#262626" },
            { name: "Indigo", value: "#4f46e5" },
            { name: "Purple", value: "#7c3aed" },
            { name: "Blue", value: "#3b82f6" },
            { name: "Cyan", value: "#06b6d4" },
            { name: "Teal", value: "#14b8a6" },
            { name: "Emerald", value: "#10b981" },
            { name: "Green", value: "#22c55e" },
            { name: "Yellow", value: "#eab308" },
            { name: "Orange", value: "#f97316" },
            { name: "Red", value: "#ef4444" },
            { name: "Pink", value: "#ec4899" },
            { name: "Rose", value: "#f43f5e" },
        ],
        gradients: [
            { name: "Midnight", value: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)" },
            { name: "Purple Haze", value: "linear-gradient(135deg, #581c87 0%, #7c3aed 50%, #4f46e5 100%)" },
            { name: "Ocean", value: "linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)" },
            { name: "Forest", value: "linear-gradient(135deg, #134e4a 0%, #14b8a6 100%)" },
            { name: "Sunset", value: "linear-gradient(135deg, #7f1d1d 0%, #ef4444 50%, #f97316 100%)" },
            { name: "Gold", value: "linear-gradient(135deg, #713f12 0%, #f59e0b 100%)" },
            { name: "Rose", value: "linear-gradient(135deg, #831843 0%, #ec4899 100%)" },
            { name: "Deep Blue", value: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)" },
        ],
        defaultColor: "#0f172a",
    },

    // ==========================================
    // Typography Configuration
    // ==========================================
    typography: {
        fonts: [
            { value: "Inter", label: "Inter" },
            { value: "Plus Jakarta Sans", label: "Plus Jakarta Sans" },
            { value: "Roboto", label: "Roboto" },
            { value: "Open Sans", label: "Open Sans" },
            { value: "Montserrat", label: "Montserrat" },
            { value: "Poppins", label: "Poppins" },
            { value: "Playfair Display", label: "Playfair Display" },
            { value: "Space Grotesk", label: "Space Grotesk" },
        ],
        styles: [
            { value: "normal", label: "Normal" },
            { value: "bold", label: "Bold" },
            { value: "italic", label: "Italic" },
            { value: "bold-italic", label: "Bold Italic" },
        ],
        defaultFont: "Plus Jakarta Sans",
        defaultStyle: "bold",
        defaultSize: 48,
        minSize: 12,
        maxSize: 120,
    },

    // ==========================================
    // Animation Configuration
    // ==========================================
    animation: {
        textAnimations: [
            { value: "fade-in", label: "Fade In" },
            { value: "slide-up", label: "Slide Up" },
            { value: "slide-down", label: "Slide Down" },
            { value: "slide-left", label: "Slide Left" },
            { value: "slide-right", label: "Slide Right" },
            { value: "scale-up", label: "Scale Up" },
            { value: "scale-down", label: "Scale Down" },
            { value: "typewriter", label: "Typewriter" },
            { value: "bounce", label: "Bounce" },
            { value: "blur-in", label: "Blur In" },
            { value: "letter-by-letter", label: "Letter by Letter" },
            { value: "word-by-word", label: "Word by Word" },
        ],
        defaultTextAnimation: {
            fontFamily: "Plus Jakarta Sans",
            fontStyle: "bold",
            fontSize: 48,
            animation: "fade-in",
            duration: 1,
        },
        transitionDuration: {
            min: 0.1,
            max: 5,
            default: 1,
        },
    },

    // ==========================================
    // Insert Tools Configuration
    // ==========================================
    insertTools: {
        tools: [
            { id: "callout", name: "Callout", icon: "Focus" },
            { id: "spotlight", name: "Spotlight", icon: "CircleDot" },
        ],
        defaults: {
            callout: {
                calloutStyle: "pointer",
                color: "#ef4444",
            },
            spotlight: {
                spotlightRadius: 60,
                blurAmount: 10,
                color: "#ffffff",
            }
        },
        colorPresets: [
            "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
            "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff", "#000000",
        ],
        opacityDefault: 100,
        durationDefault: 2,
    },

    // ==========================================
    // Voiceover Configuration
    // ==========================================
    voiceover: {
        enabled: true,
        defaultVoice: "alloy",
        voices: [
            { id: "alloy", name: "Alloy", language: "en-US", gender: "neutral" },
            { id: "echo", name: "Echo", language: "en-US", gender: "male" },
            { id: "fable", name: "Fable", language: "en-GB", gender: "neutral" },
            { id: "onyx", name: "Onyx", language: "en-US", gender: "male" },
            { id: "nova", name: "Nova", language: "en-US", gender: "female" },
            { id: "shimmer", name: "Shimmer", language: "en-US", gender: "female" },
        ],
        speed: 1.0,
        pitch: 1.0,
    },

    // ==========================================
    // Navigation Configuration
    // ==========================================
    navigation: {
        menuItems: [
            { id: "dashboard", label: "Dashboard", icon: "Home", path: "/" },
            { id: "settings", label: "Settings", icon: "Settings" },
            { id: "help", label: "Help", icon: "HelpCircle" },
        ],
        brandName: "CoasterAI",
        brandIcon: "Video",
    },
    // ==========================================
    // Resolution Configuration
    // ==========================================
    resolution: {
        options: [
            { id: "16:9", name: "Landscape", aspect: "16/9", width: 1920, height: 1080 },
            { id: "4:3", name: "Standard", aspect: "4/3", width: 1440, height: 1080 },
            { id: "9:16", name: "Portrait", aspect: "9/16", width: 1080, height: 1920 },
            { id: "1:1", name: "Square", aspect: "1/1", width: 1080, height: 1080 },
        ],
        default: "16:9",
    },

    // ==========================================
    // Transitions Configuration
    // ==========================================
    transitions: {
        options: [
            { id: TransitionType.NONE, name: "None", preview: "bg-muted" },
            { id: TransitionType.FADE, name: "Fade", preview: "bg-gradient-to-r from-muted to-transparent" },
            { id: TransitionType.SLIDE_LEFT, name: "Slide Left", preview: "bg-gradient-to-l from-muted via-primary/20 to-transparent" },
            { id: TransitionType.SLIDE_RIGHT, name: "Slide Right", preview: "bg-gradient-to-r from-muted via-primary/20 to-transparent" },
            { id: TransitionType.SLIDE_UP, name: "Slide Up", preview: "bg-gradient-to-t from-muted via-primary/20 to-transparent" },
        ],
        default: TransitionType.FADE,
    },

    // ==========================================
    // Slide Types Configuration (Unified)
    // ==========================================
    slideTypes: {
        defaultSlideType: SlideType.TEXT_ANIMATION,
        types: [
            {
                id: SlideType.IMAGE,
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
                id: SlideType.TEXT_ANIMATION,
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
            {
                id: SlideType.INFOGRAPHIC,
                name: "Infographic",
                description: "Data-driven visuals",
                icon: "BarChart3",
                color: "#f97316",
                defaultDuration: 5,
                defaultTranscript: "Add your script here...",
                defaultBackground: "#0f172a",
                chartTypes: [
                    { id: "bar", name: "Bar Chart", icon: "BarChart3" },
                    { id: "line", name: "Line Chart", icon: "LineChart" },
                    { id: "pie", name: "Pie Chart", icon: "PieChart" },
                    { id: "donut", name: "Donut Chart", icon: "CircleDot" },
                ],
                dataSourceTypes: ["manual", "csv", "api"],
                availableTools: [],
                availableEffects: [],
                supportsContent: false,
            },
            {
                id: SlideType.VISUAL_ANIMATION,
                name: "Visual Animation",
                description: "AI-generated motion graphics",
                icon: "Sparkles",
                color: "#8b5cf6",
                defaultDuration: 5,
                defaultTranscript: "Add your script here...",
                defaultBackground: "#0f172a",
                aiEnabled: true,
                generationPromptPlaceholder: "Describe the animation you want to create...",
                availableTools: [],
                availableEffects: [],
                supportsContent: false,
            },
            {
                id: SlideType.VIDEO,
                name: "Video Clip",
                description: "Add video content",
                icon: "Film",
                color: "#ef4444",
                defaultDuration: 10,
                defaultTranscript: "Add your script here...",
                defaultBackground: "#000000",
                supportedFormats: ["mp4", "webm", "mov"],
                maxDuration: 300,
                maxFileSize: 100,
                availableTools: ["callout"],
                availableEffects: ["spotlight"],  // Spotlight works on video
                supportsContent: false,  // Video always fills canvas
            },
            {
                id: SlideType.STACK,
                name: "Stack",
                description: "Layered image animation",
                icon: "Layers",
                color: "#06b6d4",
                defaultDuration: 5,
                defaultTranscript: "Add your script here...",
                defaultBackground: "linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)",
                minItems: 2,
                maxItems: 4,
                animationModes: ["Stack", "Reveal"],
                defaultAnimationMode: "Stack",
                availableTools: [],
                availableEffects: [],
                supportsContent: true,
            },
        ],
    },
};

// // Helper to create a new empty project config
// export const createEmptyProjectConfig = (name: string): EditorConfig => ({
//   ...defaultEditorConfig,
//   project: {
//     ...defaultEditorConfig.project,
//     id: `project-${Date.now()}`,
//     name,
//     createdAt: new Date().toISOString(),
//     updatedAt: new Date().toISOString(),
//   },
//   sections: [],
// });

export default defaultEditorConfig;
