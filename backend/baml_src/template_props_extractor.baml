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
    2. Brand Details

    If a value cannot be determined, generate a reasonable value that fits the context.

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