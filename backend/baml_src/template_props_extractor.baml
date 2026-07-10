class ExtractTemplateConfigRequest {
  content string
  scenes string[]
  VideoBranding VideoBranding
}

class ExtractTemplateConfigResponse {
  scenes SceneElement[]
  reasoning string @description("provide your chain of thoughts for each scene")
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

    Replace them using the text from **Scene Content** while preserving: [Non-negotiable]
    - Sample prop values are examples only. They define the expected schema, format, and content style—not the literal content.
    - Preserve the props schema exactly. Do not add, remove, or rename fields.
    - Preserve array lengths exactly.
    - Generate replacement values that match the format and style of the sample values.
    - Preserve the visual footprint of the content as closely as possible (e.g. word count, text length, number of lines, item counts).
    - These templates are non-responsive, so significantly longer or shorter content may overflow or break the layout.

    Examples:
    - If a sample array contains 10 items, generate exactly 10 items.
    - **If each sample label contains 1–2 words, generate same no of words of similar length.**
    - If a field contains a short headline, generate a short headline—not a paragraph.
    - If a field contains a date, currency, percentage, or statistic, generate a replacement in the same format.

    Text Formatting Conventions:
    If a text prop contains formatting markers, eg. { "title": "Launch {AI}\nWith {Remotion}" }:
    - `\n` represents a line break. Preserve the line-break structure whenever possible.
    - `{text}` marks text that should be highlighted. Replace only the text inside the braces while preserving the `{}` markers.

    Every visible text should relate to the Scene Content.

    ---

    ## General Rules
    - Props must be returned as a JSON-encoded string. Only modify values.
    - Keep the schema exactly the same.

    ---

    ## Value Generation

    Use information in this priority order:

    1. Scene Content
    2. Brand Details (only when needed, such as brand name, tagline, website or logo)
    3. Generate a reasonable text that fits the **Scene Content** if nothing is explicitly provided.

    ## Component Text Limits

    Unless a component's own constraints are stricter, keep text concise.
    Never place large text blocks in a single scene.

    Target limits per scene:
    - Maximum 2 lines
    - Maximum 10 words
    - Maximum 50–55 characters
    If the Scene Content is longer, rewrite or shorten it while preserving the core message.
    Always respect a component's own constraints if they are more restrictive.

    ## CRITICAL (Non-negotiable)
    - Strictly follow the props schema and all the above constraints.
    - Keep the generated text length close to the original to fit the template props (±10% words/characters).

    ## Assets

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

    ## Scene Content:

    {{ input.content }}

    {{ BrandGuidelines(input.VideoBranding) }}

    ## Component Schemas ({{ input.scenes|length }} total)

    {{ input.scenes | join('\n\n') }}

    # Final Checklist

    Before returning the answer, verify:
    ✓ Output scene count MUST be exactly {{ input.scenes|length }}.
    ✓ Same component order
    ✓ Same component names
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