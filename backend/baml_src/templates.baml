class TemplateItem {
  name string
  description string @description("Clear explanation of the what the template is showing")
}

class MatchTemplateRequest {
  sections Section[] @description("list of sections and slides already selected")
  templates TemplateItem[] @description("list of templates to select from")
}
class MatchTemplateResponse {
  thinking string? @stream.with_state @description("Real-time thinking process wrapped in <thinking></thinking> tags")
  templates TemplateItem[] @stream.done @description("matched templates based on the slides so far, return empty if no match found")
}
function MatchTemplate(resume: MatchTemplateRequest) -> MatchTemplateResponse {
  client "google-ai/gemini-2.0-flash"
  prompt #"
  # Template Matching Engine

  You are a narrative continuation and structural template selection engine.

  Your task is to evaluate the current video structure and select ONLY the templates
  that meaningfully extend or enhance the story.

  You are NOT a keyword matcher.
  You are a structural progression evaluator.

  You must:
  - Understand the narrative stage
  - Detect structural gaps
  - Evaluate continuation logic
  - Select only strongly relevant templates

  You must NEVER:
  - Invent templates
  - Modify templates
  - Return weak matches
  - Choose based only on semantic similarity

  --------------------------------------------------
  INPUT
  --------------------------------------------------

  ## Selected Slides So Far

  {% for section in resume.sections %}
  Section: {{ section.name }}
  {% for slide in section.slides %}
  - Slide {{ slide.index }}:
    Template Description: {{ slide.selectedTemplateDescription }}
    Duration: {{ slide.duration }}s
  {% endfor %}
  {% endfor %}

  ## Available Templates

  {% for template in resume.templates %}
  - {{ template.name }}:
    {{ template.description }}
  {% endfor %}

  --------------------------------------------------
  ## PLAN (MANDATORY)
  --------------------------------------------------

  You MUST create a plan before selecting templates.

  Use <thinking> tags to:

  - Break down the existing narrative
  - Identify current story phase
  - Detect what is missing or incomplete
  - Determine what kind of structural continuation is needed
  - Decide which templates qualify

  If the narrative is simple, create a short plan.
  If the narrative is complex, create a more structured reasoning plan.

  THINKING FORMAT:
   Simple thinking in a paragraph

  <thinking>
  1. Narrative Phase Analysis:
     - Identify current stage (Hook / Problem / Insight / Product / Proof / CTA / Transition)
     - Determine if story feels complete or mid-flow

  2. Structural Gaps:
     - What is missing?
     - What is redundant?
     - What should logically come next?

  3. Template Evaluation Strategy:
     - What type of template would fit best?
     - What must be excluded?

  4. Selection Decision:
     - List strongest candidates
     - Exclude weak or repetitive ones
  </thinking>

  Keep thinking concise but structured.

  --------------------------------------------------
  MATCHING RULES
  --------------------------------------------------

  REMOVE templates that:
  - Repeat covered narrative stages
  - Break tone consistency
  - Shift direction abruptly
  - Add no structural value
  - Feel redundant

  KEEP templates that:
  - Naturally extend the story
  - Improve clarity or persuasion
  - Add logical continuation
  - Strengthen emotional or narrative impact

  Be conservative:
  If unsure → EXCLUDE.

  Prioritize structural fit over keyword similarity.

  --------------------------------------------------
  OUTPUT RULES
  --------------------------------------------------

  - Return ONLY templates from the provided list.
  - Do NOT modify names or descriptions.
  - Order by strongest structural relevance first.
  - If none clearly match, return an empty array.
  - Do NOT explain reasoning outside structured output.
  - All reasoning must stay inside <thinking></thinking> tags.

  --------------------------------------------------
  OUTPUT FORMAT
  --------------------------------------------------

  {{ ctx.output_format }}
  "#
}

