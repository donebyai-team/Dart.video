class TemplateConfigExtractorInput {
  schema string
    @description("JSON Schema definition describing the exact structure, fields, types, and constraints required in the output configuration.")

  beatDescription string
    @description("Narrative intent of this slide. Explains what happens in this moment of the video and what message it conveys.")

  templateDescription string
    @description("Explanation of how this template behaves, including expected config fields, animation logic, and customization options.")

  branding VideoBranding
  slideBackground string
}

class TemplateConfigExtractorOutput {
  config string
    @description("Strictly valid JSON object that fully conforms to the provided schema. Must not contain explanations, comments, or extra fields.")
}

function ExtractTemplateConfig(input: TemplateConfigExtractorInput) -> TemplateConfigExtractorOutput {
  client "google-ai/gemini-2.0-flash"
  prompt #"
  # Template Configuration Generator

  You are a strict JSON configuration generator.

  Your task is to generate a JSON configuration object that:
  - EXACTLY follows the provided JSON schema
  - Uses values derived from the beat description
  - Aligns with the template description
  - Contains NO extra fields
  - Contains NO explanations
  - Is valid JSON
  - Is a single JSON object

  --------------------------------------------------
  INPUT
  --------------------------------------------------

  Schema:
  {{ input.schema }}

  Beat Description:
  {{ input.beatDescription }}

  Template Description:
  {{ input.templateDescription }}

  --------------------------------------------------
  GENERATION RULES
  --------------------------------------------------

  1. The output MUST strictly conform to the provided schema.
  2. Do NOT add properties not defined in the schema.
  3. Do NOT omit required fields.
  4. Respect field types (string, number, boolean, array, object).
  5. Respect enum constraints if present.
  6. Respect required/optional definitions.
  7. If the schema defines nested objects, generate valid nested objects.
  8. If arrays are required, generate valid array entries.
  9. Use values derived from the beatDescription narrative intent.
  10. Ensure values logically align with templateDescription behavior.

  --------------------------------------------------
  STRICT OUTPUT RULES
  --------------------------------------------------

  - Output ONLY a valid JSON object.
  - No markdown.
  - No backticks.
  - No commentary.
  - No explanation.
  - No thinking.
  - No trailing commas.
  - Must be parseable JSON.

    Slide Background:
    {{ input.slideBackground }}

    Brand Colors:
    Primary: {{ input.branding.colors.primary }}
    Secondary: {{ input.branding.colors.secondary }}
    Accent: {{ input.branding.colors.accent }}
    Text: {{ input.branding.colors.text }}

  --------------------------------------------------
  OUTPUT FORMAT
  --------------------------------------------------

  {{ ctx.output_format }}
  "#
}

