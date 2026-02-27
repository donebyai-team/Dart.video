class GenerateAnimationPromptRequest {
  animationType AnimationType
  currentBeat string @description("Narrative intent of the slide that needs a new visual structure")
  planSoFar Section[] @description("Sections and slides already generated")
  voiceover string?
  branding VideoBranding
  slideBackground string
}

class GenerateAnimationPromptResponse {
  prompt string @description("detailed prompt to generate remotion/react code animation")
}
function GenerateAnimationPrompt(resume: GenerateAnimationPromptRequest) -> GenerateAnimationPromptResponse {
  client "anthropic/claude-opus-4-6"
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

    1. Understand story so far and provided AnimationType
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

    4. What does each type of animation mean
      BRAND @description("Used for brand-led moments such as logo reveals, identity motion, or signature visual language. Typically placed at the beginning, end, or both to establish and reinforce brand recall.")
      PRODUCT @description("Used when showcasing real-world tools or interfaces like Slack, WhatsApp, CRM systems, dashboards, or any software relevant to the narrative. Helps ground the story in practical, relatable workflows.")
      TEXT @description("Kinetic typography or animated text-focused slide with icons, sections etc. Used for strong statements, hooks, quotes, definitions, or key transitions.")
      VISUAL @description("Purely visual animated slide (icons, illustrations, motion graphics, abstract visuals). Minimal text.")
      STATS @description("Animated numerical highlights such as metrics, percentages, counters, growth numbers, comparisons.")
      CHART @description("Data visualization slide such as bar chart, line chart, pie chart, or graph-based explanation.")
      SIMPLE_TEXT @description("Used when you need to show a short 1–2 line message without heavy animation. Ideal for pauses, emphasis, or clean statements.")
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

    IMP:
    - Whole animation Background must remain transparent[Must have] as we will be placing it over a canvas with existing background
    - If sections inside the animations needs background, it should be visible on the slide background given below


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
    Concept outline/beat:
    {{ resume.currentBeat }}

    Animation type to generate
    {{ resume.animationType }}

    {% if resume.voiceover %}
    Voiceover that will be played in this slide
    {{ resume.voiceover }}
    {% endif %}

    Slide Background:
    {{ resume.slideBackground }}

    Brand Colors:
    Primary: {{ resume.branding.colors.primary }}
    Secondary: {{ resume.branding.colors.secondary }}
    Accent: {{ resume.branding.colors.accent }}
    Text: {{ resume.branding.colors.text }}
    ---

    --------------------------------------------------

    {{ ctx.output_format }}
  "#
}

