class ExtractTemplateConfigRequest {
  content string
  scenes SceneElement[]
  VideoBranding VideoBranding
}

class ExtractTemplateConfigResponse {
  scenes SceneElement[]
}

function ExtractTemplateConfig(input: ExtractTemplateConfigRequest) -> ExtractTemplateConfigResponse {
  client SmallBoyFastGPT
  prompt #"
    You are an expert at populating component props from the provided Scene Content and Brand Details.

    Your task is to generate prop values for each component using the provided component schemas.
    component are templates of animations with their props.

    ## Props Rules

    Props must be returned as a JSON-encoded string.
    The JSON encoded in props must exactly match the structure of the provided Props Schema, including arrays, objects, nesting, and field names.

    Never:
    - convert arrays to objects
    - convert objects to arrays
    - change nesting

    ## Value Generation

    Populate values using:
    1. Scene Content
    2. Brand Details (Only when needed, eg the prop field mention brandName, tagline etc)
    3. If a value is a placeholder url, don't replace it. Keep it as it is.

    Rules:
    - The Props Schema may contain sample values. Treat them as examples that indicate the expected structure, format, and content style.
    - Preserve the schema structure exactly.
    - Preserve array lengths unless the schema explicitly allows otherwise.
    - Match the format of sample values when generating replacements.
    - Preserve content shape whenever possible (e.g. word count, text length etc).

    Examples:
    - If a sample array contains 10 items, generate 10 items.
    - If each sample text contains 1–2 words, generate replacement text with a similar length.
    - If an array contains an array of words, generate replacement words using Scene Contentb
    - If a field contains a short headline, generate a short headline rather than a paragraph.

    If a value cannot be determined from the scene content or brand details, generate a reasonable value that fits the context.

    ## Assets

    * Icons → `icon:<icon-name>`
    * Images, logos, and media → use placeholders or provided brand assets
    * Placeholder format:

    ```text
    https://placehold.co/{width}x{height}.png
    ```

    ## Component Constraints
    Follow all field hints, ranges, defaults, and requirements defined in the component schema.

    Scene Content:
    {{ input.content }}

    {{ BrandGuidelines(input.VideoBranding) }}

    ## Component Schemas ({{ input.scenes|length }} total)

    {% for scene in input.scenes %}
    ### Component: {{ scene.component }}

    Props Schema:
    {{ scene.props }}

    {% endfor %}


    ## Critical Requirement
    - Output scene count MUST be exactly {{ input.scenes|length }}.
    - Generate exactly one output scene for each Component Schema above.
    - Preserve the order of Component Schemas.
    - Use the same component names.
    - Never skip a component.
    - Never generate additional components.
    - Do not add or remove fields.
    - Only modify values.

   ---

    ## OUTPUT FORMAT

    {{ ctx.output_format }}
  "#
}