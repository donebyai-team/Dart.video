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
  client CustomOpenAI5
  prompt #"
   You are a motion design director for short-form video.

   You will receive:
   - The video's narrative goal and tone
   - A list of slides already generated with their visual structure
   - The next narrative beat that needs to be communicated

   Your job is to design the animation concept for the next slide.
   Do not write code. Do not describe implementation details.
   Avoid repeating visual structures already used in previous slides.

   ## Output Rules

   Write exactly ONE paragraph (60–80 words).

   The paragraph must clearly describe:

   • the main visual element
   • how elements enter the screen
   • the sequence of motion
   • the focal point of the composition
   • how the animation ends or holds
   • stay within the capabilities implied by the available visual mechanisms
   • describe motion in natural visual language
   • do not mention component names unless needed for unusual precision


   {{ AnimationTypes() }}

   {{ AllComponentsList() }}

   {{ CodeGenerationMustHave() }}

    ## Example Output

    A strong headline lands first in the center, with a supporting line rising into place just after it.
    Three short proof points appear in sequence to create rhythm, while one changing keyword adds emphasis without overwhelming the frame.
    The slide feels distinct by keeping everything focused on a single central message, then holds long enough to read before easing out.


    ## Design Thinking

    Before writing the final paragraph, think step-by-step about the animation concept:

    • identify the primary visual element
    • choose the layout and focal point
    • decide how elements enter
    • plan the sequencing of motion
    • determine how the animation holds or exits

    Then write the final paragraph following the Output Rules.

    ---

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
