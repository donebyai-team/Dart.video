class ExtractTemplateConfigRequest {
  content string
  scenes SceneElement[]
  VideoBranding VideoBranding
}

class ExtractTemplateConfigResponse {
  scenes SceneElement[]
}

function ExtractTemplateConfig(input: ExtractTemplateConfigRequest) -> ExtractTemplateConfigResponse {
  client CustomGPTNano
  prompt #"
    You are an expert at populating template configuration objects from the provided Scene Content.

    Your task is to fill the values in the provided Schema using information from the Scene Content.

    Rules:
    * Return JSON that exactly matches the provided Schema structure.
    * Do not add new fields.
    * Do not remove fields.
    * Preserve all object nesting and array structures exactly as provided.
    * Only modify field values.
    * If a field value cannot be determined from the Scene Content, generate a reasonable value that fits the context.
    * If a field requires an icon, return a value in the format:
      "icon:<icon-name>"
      Example:
      "icon:rocket"
    * If a field requires a logo or media or image, use placeholder not icons.

    Array Rules:
    * Preserve the exact array or object structure from the Schema.
    * If an array contains objects, return the same number of objects as provided in the Schema.
    * If an array contains arrays of objects, preserve the same number of nested arrays and objects.
    * Never add or remove array items.

    Image Rules:

    * For placeholder images use:
      https://placehold.co/{width}x{height}.png

    Scene Content:
    {{ input.content }}

    {{ BrandGuidelines(input.VideoBranding) }}

    Schemas:
    {% for scene in input.scenes %}
     Component: {{ scene.component }}
     Props: {{ scene.props }}
     {% endfor %}
    ---

    ## OUTPUT FORMAT

    {{ ctx.output_format }}

  "#
}