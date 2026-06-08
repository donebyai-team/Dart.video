class GenerateAnimationCodeRequest {
  Prompt string @description("Visual animation blueprint generated earlier")
  VideoBranding VideoBranding
}

class GenerateAnimationCodeResponse {
  code string @description("Typescript code")
  total_frames int @description("total frames for this animation at 30fps")
  manualEdits string? @description("valid json")
  thinkingSummary string? @skip()
}

function GenerateAnimation(input: GenerateAnimationCodeRequest, conversation_history: Message[]) -> GenerateAnimationCodeResponse | AskUserQuestion {
  client CustomGeminiProPreview
  prompt #"
    You are an expert in generating React components for Remotion animations.

    ## COMPONENT STRUCTURE

    1. Start with ES6 imports
    2. Export as: export default function RemoteComponent() { ... }
    3. Component body order:
       - Multi-line comment description (2-3 sentences)
       - Hooks (useCurrentFrame, useVideoConfig, etc.)
       - Constants (COLORS, TEXT, TIMING, LAYOUT) - all UPPER_SNAKE_CASE
       - Calculations and derived values
       - Don't add any background color
       - return JSX

    ## LAYOUT RULES

    - Use the full canvas with explicit dimensions from `useVideoConfig()`.
    - Use full width of the canvas with appropriate padding.
    - Never constrain content to a small centered webpage-like box.
    - Use `Math.max(minValue, Math.round(width * percentage))` for responsive sizing.
    - Use `position: "absolute"` for animated elements.

    {% raw %}
    ```tsx

    ### Never generate

    ```tsx
    flex: 1
    ```

    ```tsx
    width: "100%"
    height: "100%"
    ```

    ```tsx
    width: "100vw"
    height: "100vh"
    ```
    {% endraw %}

    Treat Remotion like a fixed-size animation canvas, not a responsive webpage.

    {{ ConstantsRules() }}

    ## AVAILABLE IMPORTS

   - You may import any icon from `lucide-react` if needed.

   {% raw %}
    \`\`\`tsx
    import { useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
    import { useState, useEffect } from "react";
    import { Text, LogoAsset, IconAsset, MediaAsset } from './';

    const DEFAULT_DATA = {
      title: "AI Automation",
      subtitle: "Save 10 hours per week",
      icon: "Bot",
      features: [
        {
          title: "Automation",
          icon: Heart,
        },
        {
          title: "Tool",
          icon: "icon:google-drive",
        },
      ],
    };

    export default function RemoteComponent() {
    const { width, height, fps } = useVideoConfig();

    {/* OTHER CONSTs */}
    const FADE_DURATION = xx;
    const PADDING = xx;

    return (
      <div
        style={{
          width,
          height,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* animation */}
      </div>
    );
    }
    \`\`\`
   {% endraw %}

    ## ANIMATION RULES

    - Prefer spring() for organic motion (entrances, bounces, scaling)
    - Use interpolate() for linear progress (progress bars, opacity fades)
    - Always use { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
    - Add stagger delays for multiple elements

    ## RESERVED NAMES (CRITICAL)

    NEVER use these as variable names - they shadow imports:
    - spring, interpolate, useCurrentFrame, useVideoConfig, Sequence

    ## STYLING RULES

    - Use inline styles only
    - **There is already background on the canvas.**
    - **Don't add any background on the root, even if the reference image/video has it. Keep it transparent**

    {{ AnimationPrimitives() }}

    {{ BrandGuidelines(input.VideoBranding) }}

    ## ASK QUESTIONS RULES

    - If the prompt is ambiguous or visual details are unclear.
    - Use the **ask_user_question** tool — do not assume missing creative direction.

    ## OUTPUT FORMAT (CRITICAL)

    * Always return the **total frame count**, keeping it consistent with the scene timings and FPS. Avoid unnecessary idle or dead frames.
    * If `manualEdits` are provided in follow-up requests, always return the updated `manualEdits` along with the updated code.
    * `manualEdits` reference code and elements by `elementId`. If a code change removes or renames an element so its ID no longer exists, remove the corresponding entry from `manualEdits`.

    ---
    ## INPUT

    Resolution and Canvas Size:
    16x9(1920x1080)

    FPS:
    30

    ---

    {% if conversation_history %}
    ## Conversation History
    {% for message in conversation_history %}
    {{ _.role(message.role) }}
    {{ message.content }}
    {{ message.images }}
    {{ message.videos }}
    {% endfor %}
    {% endif %}

    ---
    {{ ctx.output_format }}
  "#
}