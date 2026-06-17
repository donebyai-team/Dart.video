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

    ## Rules

    * Return the same number of scenes as the input.
    * Preserve the component names.
    * Do not add or remove component.
    * Do not add or remove fields.
    * Only modify values.

    ## Props Rules

    Component props may be defined in different shapes:

    ```text
    - title: string
    - subtitle: string
    ```

    ```json
    [
      {
        "title": "Example"
      }
    ]
    ```

    * Nested objects or arrays

    Props must be returned as a JSON-encoded string.
    The JSON encoded in props must preserve the exact structure of the Props Schema.
    If the Props Schema is an array, return a JSON string containing an array.
    If the Props Schema is an object, return a JSON string containing an object.
    Never convert arrays to objects.
    Never convert objects to arrays.

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

    ## Arrays

    * Preserve the exact number of array items.
    * Never add items.
    * Never remove items.

    ## Component Constraints
    Follow all field hints, ranges, defaults, and requirements defined in the component schema.

   Scene Content:
   {{ input.content }}

   {{ BrandGuidelines(input.VideoBranding) }}

   Component Schemas ({{ input.scenes|length }} total)

   {% for scene in input.scenes %}
   Component: {{ scene.component }}

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

   ---

    ## OUTPUT FORMAT

    {{ ctx.output_format }}
  "#
}