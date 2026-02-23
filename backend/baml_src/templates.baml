class TemplateItem {
  name string
  description string
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
  client "openai-responses/gpt-5-mini"
  prompt #"
You are a template selection engine.
Your task is to filter and select the most relevant templates from a predefined list,
based only on the sections and slides that have already been selected.
You must ONLY choose templates from the provided list.
Never invent new templates.
You may remove any templates that do not clearly match.
Only keep templates that are strongly relevant to the selected sections.
If no template clearly matches, return an empty list.
-------------------------
INPUT
-------------------------
Selected Slides:
{% for section in resume.sections %}
Slides:
  {% for slide in section.slides %}
  - Slide {{ slide.index }}:
    Description: {{ slide.selectedTemplateDescription }}
    Duration: {{ slide.duration }}s
  {% endfor %}
{% endfor %}

Available Templates:
{% for template in resume.templates %}
- {{ template.name }}: {{ template.description }}
{% endfor %}
-------------------------
INSTRUCTIONS
-------------------------
1. Analyze the selected sections carefully.
2. Understand the intent, theme, structure, tone, and narrative progression of the slides so far.
3. Compare each available template against the selected sections.
4. Remove templates that:
   - Do not logically follow the existing narrative
   - Do not align with the topic or tone
   - Add no structural or storytelling value
5. Keep only templates that:
   - Naturally extend or enhance the flow
   - Provide meaningful continuation (e.g., summary, CTA, comparison, insight, expansion)
6. If multiple templates are relevant, return them ordered by relevance (most relevant first).
7. If none clearly fit, return an empty array.
-------------------------
IMPORTANT RULES
-------------------------
- Only return templates from the provided list.
- Do not modify template names or descriptions.
- Do not create new templates.
- Do not explain reasoning outside the structured output.
- Keep thinking concise and wrapped in <thinking></thinking> tags.
- Be conservative: when unsure, exclude the template.
-------------------------
OUTPUT FORMAT
-------------------------
{{ ctx.output_format }}
"#
}

