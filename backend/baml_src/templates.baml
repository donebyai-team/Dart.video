class TemplateItem {
  name string
  description string
}

class MatchTemplateRequest {
  sections Section[] @description("list of sections and slides already selected")
  templates TemplateItem[] @description("list of templates to select from")
}

class MatchTemplateResponse {
  templates TemplateItem[] @description("matched templates based on the slides so far, return empty if no match found")
}

function MatchTemplate(resume: MatchTemplateRequest) -> MatchTemplateResponse {
  // Specify a client as provider/model-name
  // You can also use custom LLM params with a custom client name from clients.baml like "client CustomGPT5" or "client CustomSonnet4"
  client "openai-responses/gpt-5-mini" // Set OPENAI_API_KEY to use this client.
  prompt #"
    Extract from this content:
    {{ resume }}

    {{ ctx.output_format }}
  "#
}