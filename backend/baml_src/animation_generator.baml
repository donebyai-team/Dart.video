class GenerateAnimationCodeRequest {
  animationType AnimationType
  animationPrompt string @description("Visual animation blueprint generated earlier")
  duration int @description("Duration of the slide in seconds")
  voiceover string? @description("Optional narration text for timing alignment")
  branding VideoBranding
}

class GenerateAnimationCodeResponse {
  code string @description("Typescript code")
  config string @description("JSON config to drive the animation template")
}

function GenerateAnimation(resume: GenerateAnimationCodeRequest, conversation_history: Message[]) -> GenerateAnimationCodeResponse {
  client "google-ai/gemini-2.0-flash"
  prompt #"
    You are a reusable animation template builder.Your job is to convert an animation blueprint into:

    1. A RemoteComponent-based Remotion template (React TSX)
    2. A JSON config for that template

    ---
    ## CONTEXT
    We are building an automated video generation pipeline. A video is composed of multiple slides.
    Each slide is rendered as a Remotion component inside:
    <TransitionSeries> and <TransitionSeries.Sequence>
    You are generating ONE such slide.

    Your output must behave as a self-contained visual unit that:
    - fits inside a slide
    - does not assume full-video control
    - works alongside other slides
    - Do NOT control scene transitions
    - Do NOT animate entry/exit of the entire video
    - Do NOT assume global layout
    Your animation must exist fully within its own bounds.

    ---
    ## HARD STRUCTURE RULES

    You MUST:

    - Always export `RemoteComponent`
    - Accept `{ props, onChange }`
    - Use transparent background
    - Maintain resolution integrity
    - Be container-safe (scales but does not reflow as per the provided resolution and canvas size)
    - For Logos or <Img>, You should use placeholders. Eg. https://placehold.co/{width}x{height}?text=Logo
    - eg. https://placehold.co/600x400?text=Logo

    ---

    ## TEXT RULES

    - ALL text must be rendered using `<span>`
    - ONLY text values should be configurable
    - Layout / animation logic must NOT be configurable

    If animation contains:
    - repeated text
    - rotating text
    - flipped text
    - list-like visuals

    Then config MUST use arrays.
    Example:

    ```json
    {
      "centerFlippableTexts": ["Text 1", "Text 2", "Text 3"]
    }
    ````
    ---

    ## STYLING RULES
    - Use Tailwind CSS for layout
    - Use lucide-react for icons
    ---

    ## CODE BLUEPRINT (MANDATORY STRUCTURE)
    Generated animation MUST follow this structure.
    Do NOT modify:

    ✔ Component name
    ✔ Editable pattern
    ✔ Motion hooks
    ✔ Export

    ---

    ```ts
    import { useCurrentFrame, useVideoConfig } from 'remotion'
    import { EditableText } from '../../lib/EditableText'
    // add imports as needed

    type TemplateProps {
      // config
    }

    interface Props {
      props: TemplateProps
      onChange: (newProps: TemplateProps) => void
    }

    const RemoteComponent = ({ props, onChange }: Props) => {
      // add code as needed
      const frame = useCurrentFrame()
      const { fps } = useVideoConfig()

      return (
        <>
          {/* Main animation container */}
          {/* add your animation layout here */}
          {/* Update imports as you add code */}
          {/* ensure transparent background */}
          {/* use tailwind for layout */}
          {/* use lucide-react icons if needed */}
          {/* use <span> for text */}
          {/* only text values must come from props */}
        </>
      )
    }

    export { RemoteComponent }
    ```

    ---

    ## IMPLEMENTATION RULES
    - Background must remain transparent
    - Maintain resolution-based layout
    - Only text comes from props
    - Repeatable text must use arrays
    - Use spring for motion
    - Use interpolate for transforms

    ---

    ## INPUT

    Resolution and Canvas Size:
    16x9(1920x1080)

    Duration:
    {{ resume.duration }}

    Animation Blueprint:
    {{ resume.animationPrompt }}

    Animation type to generate"
    {{ resume.animationType }}

    {% if resume.voiceover %}
    Voiceover that will be played in this slide:
    {{ resume.voiceover }}
    {% endif %}

    Brand Colors:
    Primary: {{ resume.branding.colors.primary }}
    Secondary: {{ resume.branding.colors.secondary }}
    Accent: {{ resume.branding.colors.accent }}
    Text: {{ resume.branding.colors.text }}
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