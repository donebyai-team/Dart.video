class GenerateAnimationCodeRequest {
  animationType AnimationType
  animationPrompt string @description("Visual animation blueprint generated earlier")
  durationInFrames int @description("Target duration in frames requested for the animation.")
  voiceover string? @description("Optional narration text for timing alignment")
  branding VideoBranding
}

class GenerateAnimationCodeResponse {
  code string @description("Typescript code")
}

function GenerateAnimation(resume: GenerateAnimationCodeRequest, conversation_history: Message[]) -> GenerateAnimationCodeResponse {
  client CustomOpenAI5
  prompt #"
    You are generating a React animation component for a video slide.
    ---

    ## CONTEXT
    A video is composed of multiple slides rendered in sequence.
    You are generating ONE slide component.

    The component runs inside a managed animation runtime — you do not need to know
    how it is composed or rendered. Focus only on writing the component itself.

    Your component must follow the rules and use only the components listed below.
    Any code that violates the rules will be rejected automatically.

    ---

    {{ CodeGeneration() }}
    {{ CodeGenerationExamples() }}
    {{ CodeGenerationMustHave() }}
    {{ FrameDurationRules() }}

    ---
    ## INPUT

    ## Animation Duration In Frames:
    {{ resume.durationInFrames }}

    ## ANIMATION BRIEF:
    {{ resume.animationPrompt }}

    ## Animation type to generate:
    {{ resume.animationType }}

    {% if resume.voiceover %}
    ## Voiceover that will be played in this slide:
    {{ resume.voiceover }}
    {% endif %}

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