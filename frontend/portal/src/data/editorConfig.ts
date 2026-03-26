// Default editor configuration - all hardcoded values as JSON
// This configuration drives the entire editor

import type { EditorConfig } from "@/types/editor";

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
};

export default defaultEditorConfig;
