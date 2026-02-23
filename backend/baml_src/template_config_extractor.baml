class TemplateConfigExtractorInput {
  schema string
  beatDescription string
  templateDescription string
}

class TemplateConfigExtractorOutput {
  config string @description("Valid JSON configuration based on the provided schema")
}

function ExtractTemplateConfig(input: TemplateConfigExtractorInput) -> TemplateConfigExtractorOutput {
  client "openai-responses/gpt-4o"
  prompt #"
    You are a configuration generator. Based on the provided schema, beat description, and template description, generate a valid JSON configuration.

    Schema: {{ input.schema }}

    Beat Description: {{ input.beatDescription }}

    Template Description: {{ input.templateDescription }}

    Generate a JSON configuration that:
    1. Follows the provided schema structure
    2. Incorporates elements from the beat description
    3. Aligns with the template description requirements
    4. Returns valid, well-formatted JSON as a string

    {{ ctx.output_format }}
  "#
}
