class GenerateAnimationCodeRequest {
  animationPrompt string @description("Visual animation blueprint generated earlier")
  duration int @description("Duration of the slide in seconds")
  voiceover string? @description("Optional narration text for timing alignment")
  branding VideoBranding
}

class GenerateAnimationCodeResponse {
  code string @description("Reusable Remotion animation template component with transparent background")
  config string @description("JSON config to drive the animation template")
}

function GenerateAnimation(resume: GenerateAnimationCodeRequest, conversation_history: Message[]) -> GenerateAnimationCodeResponse {
  client "google-ai/gemini-2.0-flash"
  prompt #"
    # Remotion Remote Template Generator
    You are a reusable animation template builder.
    Your job is to convert the animation blueprint into:

    1. A RemoteComponent-based Remotion template
    2. A JSON config for that template

    ---
    ## HARD STRUCTURE RULES

    You MUST:

    ✔ Always export `RemoteComponent`
    ✔ Accept `{ props, onChange }`
    ✔ Use transparent background
    ✔ Maintain resolution integrity
    ✔ Be container-safe (scales but does not reflow)

    ---

    ## TEXT RULES

    ✔ ALL text must be rendered using `<span>`
    ✔ ONLY text values should be configurable
    ✔ Layout / animation logic must NOT be configurable

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

    ✔ Use Tailwind CSS for layout
    ✔ Use lucide-react for icons
    ✔ Do NOT hardcode inline text styles

    ---

    ## MOTION RULES

    Motion should follow:

    Intro → Build → Emphasis → Resolve

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

    type TemplateProps {
      // config
    }

    interface Props {
      props: TemplateProps
      onChange: (newProps: TemplateProps) => void
    }

    const RemoteComponent = ({ props, onChange }: Props) => {

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

    ✔ Background must remain transparent
    ✔ Maintain resolution-based layout
    ✔ Only text comes from props
    ✔ Repeatable text must use arrays
    ✔ Use spring for motion
    ✔ Use interpolate for transforms

    ---

    ## INPUT

    Resolution:
    16x9

    Duration:
    {{ resume.duration }}

    Animation Blueprint:
    {{ resume.animationPrompt }}

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