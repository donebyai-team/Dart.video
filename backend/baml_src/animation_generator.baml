class GenerateAnimationCodeRequest {
  animationType AnimationType
  animationPrompt string @description("Visual animation blueprint generated earlier")
  duration int @description("Target duration in seconds requested for the animation. The model may suggest a better value via idealDuration if this timing does not suit the animation.")
  voiceover string? @description("Optional narration text for timing alignment")
  branding VideoBranding
  slideBackground string
}

class GenerateAnimationCodeResponse {
  code string @description("Typescript code")
  idealDuration int @description("Recommended animation duration in seconds if the provided duration does not fit the animation content or voiceover pacing. Return the duration that allows the animation to play smoothly without rushing or unnecessary delays.")
}

function GenerateAnimation(resume: GenerateAnimationCodeRequest, conversation_history: Message[]) -> GenerateAnimationCodeResponse {
  client CustomOpenAI
  prompt #"
    You are an expert in generating React components for Remotion animations.

    ---
    ## CONTEXT
    We are building an automated video generation pipeline. A video is composed of multiple slides.
    Each slide is rendered as a Remotion component inside:
    <TransitionSeries> and <TransitionSeries.Sequence>
    You are generating ONE such slide.

    ## COMPONENT STRUCTURE
    1. Start with ES6 imports
    2. Export as: export const RemoteComponent = () => { ... };
    3. Component body order:
       - Multi-line comment description (2-3 sentences)
       - Hooks (useCurrentFrame, useVideoConfig)
       - Named animation constants (interpolate, spring)
       - return JSX with inline styles only

    ## CRITICAL STYLE RULES
    1.  All styles must be inline object literals directly on the JSX element.
        Never use style variables, getStyle() functions, or spread operators in styles.
    2.  Animated values (interpolate, spring) must be declared as named constants.
        - At top level: declare above the return statement.
        - Inside .map(): declare at the top of the callback body, not outside the map.
        Never inline animation calls inside style objects.
    3.  Text children must be plain string literals or a single named const that holds a string or number. No template literals, ternaries, or complex expressions as text content.
    4.  Icons must be the sole child of a wrapper div. No siblings.
    5.  Always use <img src="..."> for images and SVGs. Never use <object>, <embed>, <picture>, or background-image.
    6.  Exactly one return statement. No early returns, no conditional returns.
    7.  Loop items use .map() with an index parameter i always present, even if unused.
    8.  Never store animated values in arrays. Declare interpolate() and spring() inside the .map() callback where used.
    9.  Never use if/else or switch inside .map() to return different elements. Drive all content differences from a data array.
    10. Never build style values using string concatenation or template literals. Use direct style properties with variable values where possible.
    11. Never compute layout values from width or height. Use fixed pixel values directly in styles.
    12. Always export RemoteComponent.


    ## LAYOUT RULES
    Your output must behave as a self-contained visual unit that:
    1. Uses full width and height of the container with appropriate padding. Never constrain content to a small centered box.
    2. Does not assume full-video control.Do NOT control scene transitions.Your animation must exist fully within its own bounds.
    3. Responsive sizing rules — TWO categories, different treatment:
       LAYOUT VALUES (width, height, padding, gap, margin, top, left):
       - Use Math.max(minPx, Math.round(width/height * ratio)) for responsiveness
       - Write these expressions INLINE directly in the style object
       - Never assign them to variables first
       - These will be non-editable in the toolbar — correct behaviour

       VISUAL VALUES (color, fontSize, fontWeight, borderRadius, opacity, fontFamily):
       - Always use fixed static values written directly in the style object
       - Never compute these from width or height
       - These will be editable from the toolbar

    4. Separation example — follow this pattern exactly:
    {% raw %}
       <div style={{
         /* LAYOUT — inline responsive expressions */
         width:      Math.max(600, Math.round(width * 0.5)),
         paddingLeft: Math.max(40, Math.round(width * 0.05)),
         gap:         Math.max(12, Math.round(height * 0.015)),

         /* VISUAL — fixed static values only */
         background:   '#ffffff',
         borderRadius: 16,
         fontFamily:   'Inter, sans-serif',
         fontSize:     48,
         color:        '#111827',
       }}>
    {% endraw %}

   ## ANIMATION RULES
   - Prefer spring() for organic motion (entrances, bounces, scaling)
   - Use interpolate() for linear progress (opacity fades, position)
   - Always include { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
   - Add stagger delays for multiple elements

    ## CONSTANTS & PATTERNS
    - Declare ALL constants inside the component body before return. Never at module level.
    - interpolate() output range must be inline numeric literals: [0, 1] never a variable.
    - spring() config must be inline: { damping: 20, stiffness: 150 } never a variable.
    - Counter: Math.round(interpolate(progress, [0, 1], [0, 100])) — literals only in output range.
    - Typewriter: const text = 'Hello'; const visible = text.slice(0, charCount) — only .slice(), source must be a plain string const declared immediately above.
    - Word cycle: const words = ['A', 'B']; const word = words[Math.floor(frame / 20) % words.length] — plain string array, frame-based index only.
    - Letter cascade: const text = 'Hello'; const letters = text.split('') — only .split('') on a plain string const declared immediately above.

   ## BACKGROUND
   - Component background must be transparent
   - Internal sections may have their own background colors
   - Never set background on the root element

   ## ASSETS
   - Use <img> with placeholder URLs: https://placehold.co/{width}x{height}?text=Label
   - Use provided brand URLs when given

   ## Here are some of the skills you could use:
   ---
    {{ RemotionSkillMeasureDOMNode() }}
   ---

   ---
   {{ RemotionSkillMeasureText() }}
   ---

   ---
   {{ RemotionSkillSequencing() }}
   ---

   {% if resume.animationType == AnimationType.CHART %}
   ---
   {{ RemotionSkillChart() }}
   ---
   {% endif %}


   ## EXAMPLE STRUCTURE
   {% raw %}
   ```tsx
    export const RemoteComponent = () => {
      /* One sentence describing what this slide shows. */
      const frame = useCurrentFrame();
      const { fps, width, height } = useVideoConfig();

      // One variable per animated prop — never inline, never in arrays
      const titleOpacity = interpolate(frame, [0, 20], [0, 1],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      const titleScale = spring({ frame, fps, config: { damping: 14 } });

      // Data arrays drive content — never if/else inside map
      const items = [
        { label: 'First',  color: '#0070F0' },
        { label: 'Second', color: '#111827' },
      ];

      return (
        <div style={{ width: '100%', height: '100%', position: 'relative', background: 'transparent' }}>

          {/* Background in its own div — never on root */}
          <div style={{ position: 'absolute', inset: 0, background: '#EAF2FF' }} />

          {/* LAYOUT values inline responsive, VISUAL values fixed static */}
          <div style={{
            paddingLeft: Math.max(40, Math.round(width * 0.05)),  // layout — inline
            fontSize: 48,                                          // visual — fixed
            color: '#111827',                                      // visual — fixed
          }}>

            {/* Animated values used directly — no string concat */}
            <span style={{ opacity: titleOpacity, transform: `scale(${titleScale})`, fontSize: 48, color: '#111827' }}>
              Title Text
            </span>

            {/* Animation constants declared inside callback */}
            {items.map((item, i) => {
              const itemOpacity = interpolate(frame, [i * 5, i * 5 + 15], [0, 1],
                { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
              return (
                <div key={i} style={{ opacity: itemOpacity, background: '#fff', color: item.color }}>
                  {item.label}
                </div>
              );
            })}

            {/* SVG and images always via img tag */}
            <img src="https://placehold.co/120x120?text=Logo" style={{ width: 120, height: 120 }} />

          </div>
        </div>
      );
    };
   ```
   {% endraw %}

    ## RESERVED NAMES (CRITICAL)

    NEVER use these as variable names - they shadow imports:
    - spring, interpolate, useCurrentFrame, useVideoConfig, AbsoluteFill, Sequence
    - Do not nest animated patterns (e.g. word-cycle value fed into typewriter)

    ## OUTPUT FORMAT (CRITICAL)

    - Response must start with "import" and end with "};"
    - If prompt is ambiguous, make a reasonable choice - do not ask for clarification
    - Maintain responsiveness and resolution-based layout
    - Repeatable text must use arrays
    - Generated animation should always be center to the canvas/resolution
    - Do NOT animate entry/exit of the entire video
    - Do NOT assume global layout
    ---

    ## INPUT

    Resolution and Canvas Size:
    16x9(1920x1080)

    Duration:
    {{ resume.duration }}

    Animation Instructions:
    {{ resume.animationPrompt }}

    Animation type to generate:
    {{ resume.animationType }}

    {% if resume.voiceover %}
    Voiceover that will be played in this slide:
    {{ resume.voiceover }}
    {% endif %}

    Slide Background:
    {{ resume.slideBackground }}

    {{ BrandGuidelines(resume.branding) }}

    ---

    {% if conversation_history %}
    ## Conversation History
    {% for message in conversation_history %}
    {{ _.role(message.role) }} {{ message.content }}
    {% endfor %}
    {% endif %}

    ---
    {{ ctx.output_format }}
  "#
}