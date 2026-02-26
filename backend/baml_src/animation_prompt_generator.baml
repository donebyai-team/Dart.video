class GenerateAnimationPromptRequest {
  currentBeat string @description("Narrative intent of the slide that needs a new visual structure")
  planSoFar Section[] @description("Sections and slides already generated")
}

class GenerateAnimationPromptResponse {
  prompt string @description("detailed prompt to generate remotion/react code animation")
}
function GenerateAnimationPrompt(resume: GenerateAnimationPromptRequest) -> GenerateAnimationPromptResponse {
  client "google-ai/gemini-2.0-flash"
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
    that a Remotion / React engineer will implement.

    --------------------------------------------------
    GOAL
    --------------------------------------------------

    Create a detailed animation prompt that:

    ✔ Continues the narrative progression
    ✔ Introduces a new visual storytelling mechanism
    ✔ Avoids repeating past visual structures
    ✔ Matches the tone and flow of the video

    --------------------------------------------------
    EVALUATION STEPS
    --------------------------------------------------

    1. Understand story so far
    - What has already been introduced?
    - What visual styles have been used?

    2. Understand next beat
    - Is this escalation?
    - Clarification?
    - Contrast?
    - Transformation?
    - Proof?
    - Resolution?

    3. Design a visual structure that:
    - Moves story forward
    - Adds new visual meaning
    - Feels cohesive with existing tone

    --------------------------------------------------
    OUTPUT REQUIREMENTS
    --------------------------------------------------

    Return a production-ready animation design prompt that describes:

    - Scene structure
    - Motion logic
    - Visual metaphor
    - Layout behavior
    - Transition logic
    - Emphasis style

    This prompt will be used to generate Remotion animation code.

    Do NOT reference previous templates directly.
    Do NOT output code.
    Output ONLY the animation design prompt.

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

    ## Next Beat To Visualize

    {{ resume.currentBeat }}

    --------------------------------------------------

    {{ ctx.output_format }}
  "#
}

