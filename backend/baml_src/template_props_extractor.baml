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
    You are an expert at populating animation component props from the provided Scene Content and Brand Details.

    Your task is to generate props for each component while preserving the exact schema.

    # How to populate props
    Every component is one of two types.

    ## Type 1: Schema-only component

    Example:

    ```json
    {
      "title": "string",
      "subtitle": "string"
    }
    ```

    Values like `"string"`, `"number"`, `"boolean"` and `"enum"` are **type placeholders**, not sample content.

    Generate appropriate values using:

    1. Scene Content
    2. Brand Details (only when the field requires brand information)
    3. Field hints and constraints

    ---

    ## Type 2: Template component

    Example:

    ```json
    {
      "title": "Acme Corporation",
      "tagline": "Innovating the future, today."
    }
    ```

    These values are **sample content**, not final content.

    Replace them using the Scene Content while preserving:

    - schema
    - array lengths
    - formatting
    - writing style
    - approximate text length (±10%)

    Do **not** copy sample text unless the Scene Content naturally requires the same wording.

    Every visible text should relate to the Scene Content.

    ---

    # General Rules

    Props must be returned as a JSON-encoded string. Only modify values.

    Never:
    - add fields
    - remove fields
    - rename fields
    - change nesting
    - convert arrays to objects
    - convert objects to arrays

    Keep the schema exactly the same.

    ---

    # Value Generation

    Use information in this priority order:

    1. Scene Content
    2. Brand Details (only when needed, such as brand name, tagline, website or logo)
    3. Generate a reasonable value that fits the Scene Content if nothing is explicitly provided.

    # Scene Text Limits

    Unless a component's own constraints are stricter, keep text concise.
    Never place large text blocks in a single scene.

    Target limits per scene:
    - Maximum 2 lines
    - Maximum 10 words
    - Maximum 50–55 characters
    If the Scene Content is longer, rewrite or shorten it while preserving the core message.
    Always respect a component's own constraints if they are more restrictive.

    ---

    # Visual Footprint

    Some templates are not responsive.
    For template components, preserve the visual footprint as closely as possible.
    Keep approximately the same:
    - number of words
    - number of characters
    - number of lines
    - array length

    Examples:
    - short title → short title
    - feature list → feature list with the same number of items
    - 2-word label → another 2-word label
    - percentage → percentage
    - date → date
    - statistic → statistic

    Avoid significantly longer or shorter text.

    ---

    # Formatting

    Preserve formatting.

    If text contains:

    ```
    Launch {AI}
    With {Remotion}
    ```

    then:
    - preserve `\n`
    - preserve `{}` markers
    - replace only the text inside `{}`

    ---

    # Assets

    Icons:

    ```
    icon:<icon-name>
    ```

    Images, logos and media:
    - keep existing placeholder URLs unchanged
    - otherwise use provided brand assets when appropriate

    Placeholder format:
    ```
    https://placehold.co/{width}x{height}.png
    ```

    Never invent image URLs.
    ---

    # Component Constraints

    Always follow:
    - field hints
    - enums
    - defaults
    - required fields
    - min/max limits
    - formatting requirements

    ---

    ## Scene Content:

    {{ input.content }}

    {{ BrandGuidelines(input.VideoBranding) }}

    ## Component Schemas ({{ input.scenes|length }} total)

    {% for scene in input.scenes %}
    ### Component: {{ scene.component }}

    Props Schema:
    {{ scene.props }}

    {% endfor %}


    # Final Checklist

    Before returning the answer, verify:
    ✓ Output scene count MUST be exactly {{ input.scenes|length }}.
    ✓ Same component order
    ✓ Same component names
    ✓ Props are valid JSON strings
    ✓ Schema unchanged
    ✓ Arrays unchanged
    ✓ Only values modified
    ✓ Template sample text replaced
    ✓ Placeholder URLs preserved
    ✓ Constraints satisfied

   ---

    ## OUTPUT FORMAT
    {{ ctx.output_format }}
  "#
}