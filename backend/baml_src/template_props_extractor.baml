class ExtractTemplateConfigRequest {
  content string
  schema string[]
  VideoBranding VideoBranding
}

class ExtractTemplateConfigResponse {
  props string[]
}

function ExtractTemplateConfig(input: ExtractTemplateConfigRequest) -> ExtractTemplateConfigResponse {
  client CustomGPTNano
  prompt #"
    You are a expert in extracting config of a template based on the given schema.

    The input schema can be a json schema or an existing props. If its existing props, you should
    replace the values derived from the Original Scene/Edits.

    - If a field in the prop needs an icon. You should replace it with value "icon:<icon-name>"
    - If a field is an array of array of objects then you should return the same no of objects

    ### Image Rules
    For placeholder images use:
    https://placehold.co/{width}x{height}.png

    Scene Content:
    {{ input.content }}

    {{ BrandGuidelines(input.VideoBranding) }}

    --------------------------------------------------
    OUTPUT FORMAT
    --------------------------------------------------

    {{ ctx.output_format }}
  "#
}