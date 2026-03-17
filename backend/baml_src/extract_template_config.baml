class TemplateConfigExtractorInput {
  schema string
  beatDescription string
  templateDescription string
  branding VideoBranding
}

class TemplateConfigExtractorOutput {
  config string
    @description("Strictly valid JSON object that fully conforms to the provided schema. Must not contain explanations, comments, or extra fields.")
}

function ExtractTemplateConfig(input: TemplateConfigExtractorInput) -> TemplateConfigExtractorOutput {
  client CustomOpenAI5
  prompt #"
  ```markdown
  # Template Configuration Generator (Strict Mode)
  You are a strict JSON configuration generator.

  Your task is to transform a **beat description** into a **valid configuration object** for a given template.

  The output must:
  - EXACTLY conform to the provided JSON schema
  - Contain ONLY fields defined in the schema
  - Be fully valid, parseable JSON
  - Contain NO explanations or extra text

  ---

  ## Definitions

  **Beat Description**
  Describes the narrative intent of the slide — what is happening, what message is conveyed, and what should be emphasized.

  **Template Description**
  Describes how the template behaves — including layout, animation logic, supported fields, and how configuration values affect rendering.

  ---

  ## Input

  **Schema:**
  ```

  {{ input.schema }}

  ```

  **Beat Description:**
  ```

  {{ input.beatDescription }}

  ```

  **Template Description(how the template looks like in behavior):**
  ```

  {{ input.templateDescription }}

  ```

  {{ BrandGuidelines(input.branding) }}

  ---

  ## Generation Strategy (IMPORTANT)

  Follow this exact order:

  1. **Understand the template first**
     - Identify what each schema field represents visually or behaviorally
     - Use templateDescription as the primary source of truth

  2. **Extract intent from the beat**
     - Identify key message, tone, emphasis, and content elements
     - Ignore irrelevant narrative details

  3. **Map beat → schema fields**
     - Every field must be populated using:
       - Direct content from beatDescription, OR
       - Logical inference based on templateDescription

  4. **Resolve ambiguity**
     - If the beat does not specify a value:
       - Use reasonable defaults consistent with template behavior
       - Do NOT invent unrelated content

  5. **Respect constraints strictly**
     - Follow types, enums, required fields, nesting, and array structures exactly

  ---

  ## 🔹 Hard Rules

  1. Do NOT add fields not in the schema
  2. Do NOT omit required fields
  3. Do NOT change field names
  4. Do NOT output null unless schema allows it
  5. Do NOT include placeholder text like "TBD"
  6. Keep values concise and presentation-ready
  7. Ensure output aligns with BOTH:
     - beatDescription (content)
     - templateDescription (behavior)

  ---

  ## Output Rules (Strict)

  - Output ONLY a JSON object
  - No markdown
  - No backticks
  - No comments
  - No explanations
  - No trailing commas
  - Must be valid JSON
  ```

  --------------------------------------------------
  OUTPUT FORMAT
  --------------------------------------------------

  {{ ctx.output_format }}
  "#
}

