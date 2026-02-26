class Category {
  name string
  description string @description("Clear explanation of the conceptual animation category. Describes the idea or scenario this category represents (e.g., data fragmentation, growth acceleration, workflow automation, before vs after transformation). Not a visual style.")
}

class MatchCategoriesRequest {
  categories Category[] @description("Predefined conceptual animation categories to choose from. You must select only from this list.")
  query string @description("Concept or idea that needs to be mapped to the most relevant conceptual animation category.")
}

class MatchCategoriesResponse {
  categories Category[] @description("matched category based on the query, return empty if no match found")
}

function MatchCategories(resume: MatchCategoriesRequest) -> MatchCategoriesResponse {
  // Specify a client as provider/model-name
  // You can also use custom LLM params with a custom client name from clients.baml like "client CustomGPT5" or "client CustomSonnet4"
  client "google-ai/gemini-2.0-flash"
  prompt #"
  # Category Matching Engine

  You are a strict semantic classification engine.

  Your task is to match the given query to one or more predefined conceptual categories.

  You must ONLY select from the provided categories.
  You must NEVER invent new categories.
  You must NEVER modify category names or descriptions.

  --------------------------------------------------
  INPUT
  --------------------------------------------------

  Query:
  {{ resume.query }}

  Available Categories:
  {% for category in resume.categories %}
  - {{ category.name }}:
    {{ category.description }}
  {% endfor %}

  --------------------------------------------------
  MATCHING RULES
  --------------------------------------------------

  1. Understand the core concept expressed in the query.
  2. Compare it against category descriptions.
  3. Select categories that clearly represent the same conceptual idea.
  4. Exclude categories that:
     - Only partially match
     - Are loosely related
     - Represent visual style instead of concept
     - Do not strongly align with the core idea

  Be conservative:
  If the match is unclear or weak, return an empty list.

  If multiple categories clearly match, return them ordered by strongest relevance first.

  --------------------------------------------------
  IMPORTANT RULES
  --------------------------------------------------

  - Only return categories from the provided list.
  - Do NOT create new categories.
  - Do NOT explain reasoning.
  - Do NOT include thinking.
  - If none clearly match, return an empty array.

  --------------------------------------------------
  OUTPUT FORMAT
  --------------------------------------------------

  {{ ctx.output_format }}
  "#
}