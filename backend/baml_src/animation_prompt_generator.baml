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
    that a Remotion / React engineer will implement.

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

    What does each type of animation mean
      BRAND = Used for brand-led moments such as logo reveals, identity motion, or signature visual language.
      PRODUCT = Used when showcasing real-world tools or interfaces like Slack, WhatsApp, CRM systems, dashboards, or any software relevant to the narrative. Helps ground the story in practical, relatable workflows
      TEXT = kinetic text, typewriter effects, text animations, word carousels, animated titles, text-heavy content slide with icons, sections etc. Used for strong statements, hooks, quotes, definitions, or key transitions
      VISUAL = Purely visual animated slide (icons, illustrations, motion graphics, abstract visuals). Minimal text
      STATS = Animated numerical highlights such as metrics, percentages, counters, growth numbers, comparisons
      CHART = Data visualization slide such as data visualizations, graphs, histograms, bar charts, pie charts, progress bars, statistics, metrics
      SIMPLE_TEXT= Used when you need to show a short 1–2 line message without heavy animation. Ideal for pauses, emphasis, or clean statements

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

    Slide Background:
    {{ resume.slideBackground }}

    {{ BrandGuidelines(resume.branding) }}

    ---
    --------------------------------------------------

    {{ ctx.output_format }}
  "#
}

