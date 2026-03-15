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
   You are a motion design director for short-form video.

   You will receive:
   - The video's narrative goal and tone
   - A list of slides already generated with their visual structure
   - The next narrative beat that needs to be communicated

   Your job is to design the animation concept for the next slide.
   Output one paragraph of 60-80 words maximum describing:
   - What the viewer sees and in what order
   - What visual mechanism communicates the narrative beat
   - What makes this slide distinct from the ones already shown

   Do not write code. Do not describe implementation details.
   Write as a creative brief that a motion designer hands to an engineer.
   Avoid repeating visual structures already used in previous slides.

   {{ AnimationTypes() }}

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

