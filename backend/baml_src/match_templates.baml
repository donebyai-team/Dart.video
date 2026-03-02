class TemplateItem {
  name string
  description string @description("Clear explanation of what this template visually communicates")
}

class MatchTemplateRequest {
  currentBeat string @description("Narrative intent of the slide being generated")
  planSoFar Section[] @description("Only the sections and slides that have already been generated")
  templates TemplateItem[] @description("Templates available for the NEXT slide")
}

class MatchTemplateResponse {
  templates TemplateItem[] @description("Templates that best continue the narrative progression")
}

function MatchTemplate(resume: MatchTemplateRequest) -> MatchTemplateResponse {
  client CustomOpenAI2
  prompt #"
    ## Narrative Template Continuation Engine

    You are a visual storytelling progression engine.

    Your role is NOT to match keywords.
    Your role is to decide:

    👉 What visual structure best continues the story from what has already been shown.

    You must evaluate:

    1. What narrative stage has already been covered
    2. What emotional / logical progression exists
    3. What the NEXT beat intends to communicate

    Then select ONLY templates that best VISUALLY continue the journey.

    You are choosing:
    NOT what fits the slide
    BUT what moves the story forward.

    --------------------------------------------------
    EVALUATION LOGIC
    --------------------------------------------------

    Step 1: Understand narrative so far
    - What has been introduced?
    - What has been explained?
    - What has been emphasized?

    Step 2: Understand the next beat
    - Is it escalation?
    - Clarification?
    - Contrast?
    - Proof?
    - Resolution?

    Step 3: Choose templates that:
    ✔ Extend progression
    ✔ Add structural value
    ✔ Maintain tone continuity
    ✔ Improve clarity or persuasion

    REMOVE templates that:
    ✘ Repeat what has already been shown
    ✘ Introduce visual regression
    ✘ Break narrative flow
    ✘ Add decorative but non-structural value

    Be strict.
    If unsure → return empty.

    --------------------------------------------------
    OUTPUT RULES
    --------------------------------------------------

    - Return ONLY from provided templates
    - Do NOT modify templates
    - Order by strongest continuation fit
    - If none clearly progress the story → return empty

    --------------------------------------------------
    INPUT
    --------------------------------------------------

    ## Narrative So Far

    {% for section in resume.planSoFar %}
      {% if section.slides|length > 0 %}
    Section: {{ section.name }}
        {% for slide in section.slides %}
    - Concept: {{ slide.beatDescription }}
      Visual: {{ slide.selectedTemplateDescription }}
        {% endfor %}
      {% endif %}
    {% endfor %}

    ## Next Beat To Visualize

    {{ resume.currentBeat }}

    ## Available Visual templates to choose from

    {% for template in resume.templates %}
    - {{ template.name }}:
      {{ template.description }}
    {% endfor %}

    {{ ctx.output_format }}
  "#
}

