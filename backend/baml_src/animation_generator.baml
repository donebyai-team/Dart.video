class GenerateAnimationCodeRequest {
  Prompt string @description("Visual animation blueprint generated earlier")
  VideoBranding VideoBranding
}

class GenerateAnimationCodeResponse {
  code string @description("Typescript code")
  total_frames int @description("total frames for this animation at 30fps")
  manualEdits string? @description("valid json")
}

function GenerateAnimation(input: GenerateAnimationCodeRequest, conversation_history: Message[]) -> GenerateAnimationCodeResponse | AskUserQuestion {
  client CustomGeminiProPreview
  prompt #"
    You are an expert in generating React components for Remotion animations.

    ## COMPONENT STRUCTURE

    1. Start with ES6 imports
    2. Export as: export default function RemoteComponent() { ... }
    3. Component body order:
       - DEFAULT_DATA
       - Multi-line comment description (2-3 sentences)
       - Hooks (useCurrentFrame, useVideoConfig, etc.)
       - Constants (COLORS, TIMING, LAYOUT) - all UPPER_SNAKE_CASE
       - Calculations and derived values
       - return JSX

    ## LAYOUT RULES

    - Use the full canvas with explicit dimensions from `useVideoConfig()`.
    - Use full width of the canvas with appropriate padding.
    - Never constrain content to a small centered webpage-like box.
    - **Keep layouts responsive and readable: use sufficient `lineHeight` to prevent overlap or overflow.**
    - Do not measure DOM elements or text dimensions for layout or responsiveness.
    - Prefer CSS layout techniques (flexbox, grid, wrapping, scaling) over measuring content dimensions.

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
    import { useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Easing, random } from "remotion";
    import { Audio } from '@remotion/media';
    import { useState, useEffect } from "react";
    import { Text, LogoAsset, IconAsset, useTheme, MediaAsset, parseText } from './';

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
    - **Animate references by default; use them as attachments only when explicitly requested.**

    ## CAMERA RULES

    - Treat the animation as being viewed through a virtual camera.
    - Available movements: Push In, Pull Back, Pan, Tilt, Orbit, Follow, Dolly Through, Parallax.
    - Use at most one primary camera movement per scene. Combine movements only when they transition naturally and never reduce readability.
    - Camera movement complements object animations; do not replace element animations with camera motion.
    - If a reference image or video is provided, replicate any clear camera entrance, exit, or continuous movement. Otherwise, use camera movement only when it meaningfully improves the animation; keep the camera static if unnecessary.
    - Camera movement affects the entire scene, while object animations affect individual elements.

    ## DURATION
    - - **Keep the overall animation fast, avoid long or empty frames between stagger delays**
    - If needed use the duration of the reference attachment. 1s = 30 frames.
    - Keep hold durations betwwen stagger small around 20frames

    ## RESERVED NAMES (CRITICAL)

    NEVER use these as variable names - they shadow imports:
    - spring, interpolate, useCurrentFrame, useVideoConfig, Sequence
    **NEVER use any import outside the AVAILABLE IMPORTS, the build will fail**

    ## STYLING RULES

    - Use inline styles only
    - **There is already background on the canvas.**
    - **Don't add any background on the root, even if the reference image/video has it. Keep it transparent**

    {{ AnimationPrimitives(input.VideoBranding) }}

    {{ BrandUsageInstructions(input.VideoBranding) }}
    {{ BrandGuidelines(input.VideoBranding) }}

    {% if not input.VideoBranding.brandColors %}
    ## TEMPLATING RULES (Non-Negotiable)

    - Remember: you are generating a reusable animation template, not a one-off animation.
    - **Design layouts to accommodate realistic variations in content length, arrays.**
    - **Text in text heavy animations should auto wrap to next line and text align to center**
    - Prefer CSS layout techniques (flexbox, grid, wrapping, scaling) over measuring content dimensions.
    - Treat `DEFAULT_DATA` like component props: it should contain only customizable content, not internal logic, styling, animation settings, or implementation details.
    - Do NOT store element IDs, colors, React keys, or other implementation details in `DEFAULT_DATA`, use **array index for ids** if needed.

    {% endif %}

    ## ASK QUESTIONS RULES

    Ask before proceeding if:
    - The prompt is ambiguous or visual details are unclear.
    - The user added a reference of an image or video, but it's unclear whether it should be recreated as an animation or incorporated as an asset inside an animation. [Must ask]
    - A key creative decision is unclear.
    - It's unclear what should be animated.
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
    {% if message.images and message.images|length > 0 %}
    {{ message.images }}
    {% endif %}
    {% if message.videos and message.videos|length > 0 %}
    {{ message.videos }}
    {% endif %}
    {% endfor %}
    {% endif %}

    ---
    {{ ctx.output_format }}
  "#
}