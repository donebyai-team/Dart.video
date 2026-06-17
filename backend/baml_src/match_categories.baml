class Category {
  name string
  description string
}

class MatchCategoriesRequest {
  categories Category[]
  content string
  edits string?
}

class MatchCategoriesResponse {
  categories string[]
}

function MatchCategories(resume: MatchCategoriesRequest) -> MatchCategoriesResponse {
  client SmallBoyFastGPT
  prompt #"
    You are a content classification engine.

    Analyze the final intended message of the scene.

    Use the original scene JSON and, if provided, the user edits. User edits override the original content.

    Categories:
    {% for category in resume.categories %}
    - {{ category.name }}: {{ category.description }}
    {% endfor %}

    Tasks:

    1. Understand the final message being communicated.
    2. Evaluate all provided categories.
    3. Rank the categories from best match to worst match.

    Rules:

    - Consider every category.
    - Always Return **ALL CATEGORIES* ordered by relevance.
    - The first category must be the strongest match.
    - Categories should be ranked relative to each other.
    - Do not explain your reasoning.

    Scene Content:
    {{ resume.content }}

    --------------------------------------------------
    OUTPUT FORMAT
    --------------------------------------------------

    {{ ctx.output_format }}
  "#
}