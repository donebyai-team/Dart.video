class GenerateAnimationPromptRequest {
  animationType AnimationType
  currentBeat string @description("Narrative intent of the slide that needs a new visual structure")
  planSoFar Section[] @description("Sections and slides already generated")
  voiceover string?
  branding VideoBranding
}

class GenerateAnimationPromptResponse {
  prompt string @description("detailed prompt to generate remotion/react code animation")
}
function GenerateAnimationPrompt(resume: GenerateAnimationPromptRequest) -> GenerateAnimationPromptResponse {
  client CustomOpenAI
  prompt #"
    # Visual Narrative Gap Filler

    You are a motion design system that invents new animation structures
    when existing templates fail to progress the story.

    Your role is to:

    Understand what has already been visually communicated,
    Understand what the next narrative beat needs,
    Then design a NEW animation concept that visually expresses it.

    You are NOT writing code.
    You are designing the animation blueprint
    that a React engineer will implement.

    --------------------------------------------------
    GOAL
    --------------------------------------------------

    Create a concise animation prompt(around 5-6 lines max) that tells LLM on what to generate:

    - Continues the narrative progression
    - The same prompt will be used to for future slides to know what templates has been generated so far
    - Introduces a new visual storytelling mechanism
    - Avoids repeating past visual structures
    - Matches the tone and flow of the video
    - This will be fed to LLM to generate the code of the remotion animation

    {{ AnimationTypes() }}

    Do NOT reference previous templates directly.
    Do NOT output code.
    Output ONLY the animation design prompt based on the input especially the voiceover and beat to visualize

    --------------------------------------------------
    INPUT
    --------------------------------------------------

    ## Narrative So Far

    {% for section in resume.planSoFar %}
      {% if section.slides|length > 0 %}
    Section: {{ section.name }}
        {% for slide in section.slides %}
    - Concept: {{ slide.beatDescription }}
      Visual Used: {{ slide.selectedTemplateDescription }}
        {% endfor %}
      {% endif %}
    {% endfor %}

    ## Outline/Beat To Visualize
    Concept outline/beat:
    {{ resume.currentBeat }}

    Animation type to generate:
    {{ resume.animationType }}

    {% if resume.voiceover %}
    Voiceover that will be played in this slide:
    {{ resume.voiceover }}
    {% endif %}

    {{ BrandGuidelines(resume.branding) }}

    ---
    --------------------------------------------------

    {{ ctx.output_format }}
  "#
}

