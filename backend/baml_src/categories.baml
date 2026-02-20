class Category {
  name string
  description string
}

class MatchCategoriesRequest {
  categories Category[]
  query string
}

class MatchCategoriesResponse {
  categories Category[] @description("matched category based on the query, return empty if no match found")
}

function MatchCategories(resume: MatchCategoriesRequest) -> MatchCategoriesResponse {
  // Specify a client as provider/model-name
  // You can also use custom LLM params with a custom client name from clients.baml like "client CustomGPT5" or "client CustomSonnet4"
  client "openai-responses/gpt-5-mini" // Set OPENAI_API_KEY to use this client.
  prompt #"
    Extract from this content:
    {{ resume }}

    {{ ctx.output_format }}
  "#
}