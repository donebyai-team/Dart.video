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
    You are a expert in extracting config of a template as per its schema based on the content provided in Scene Content.

    The input schema can be a json schema or an existing json props. If its existing props, you should
    replace the values derived from the Scene Content.

    - If a field in the prop needs an icon. You should replace it with value "icon:<icon-name>"
    - If a field is an array of array of objects then you should return the same no of objects

    ### Image Rules
    For placeholder images use:
    https://placehold.co/{width}x{height}.png

    Scene Content:
    {{ input.content }}

    {{ BrandGuidelines(input.VideoBranding) }}

    Schema of the props, should be valid JSON string(CRITICAL):
    {{ input.schema }}

    --------------------------------------------------
    OUTPUT FORMAT
    --------------------------------------------------

    {{ ctx.output_format }}
  "#
}