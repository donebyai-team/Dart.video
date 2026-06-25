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

    Populate props values using:
    1. Scene Content
    2. Brand Details (Only when needed, eg the prop field mention brandName, tagline etc)
    3. If a value is a placeholder url, don't replace it. Keep it as it is.

    ## Special components and Their Props
    Some components use pre-existing, non-responsive templates and hence their props has sample values.
    - Sample prop values are examples only. They define the expected schema, format, and content style—not the literal content.
    - Preserve the props schema exactly. Do not add, remove, or rename fields.
    - Preserve array lengths exactly.
    - Generate replacement values that match the format and style of the sample values.
    - Preserve the visual footprint of the content as closely as possible (e.g. word count, text length, number of lines, item counts). These templates are non-responsive, so significantly longer or shorter content may overflow or break the layout.

    Examples:
    - If a sample array contains 10 items, generate exactly 10 items.
    - If each sample label contains 1–2 words, generate labels of similar length.
    - If a field contains a short headline, generate a short headline—not a paragraph.
    - If a field contains a date, currency, percentage, or statistic, generate a replacement in the same format.

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