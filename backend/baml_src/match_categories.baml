class Category {
  name string
  description string
}

class MatchCategoriesRequest {
  categories Category[]
  original string
  edits string?
}

class MatchCategoriesResponse {
  categories Category[]
  summary string
}

function MatchCategories(resume: MatchCategoriesRequest) -> MatchCategoriesResponse {
  client CustomGPTNano
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
    2. Select the categories that best describe that message.
    3. Create a concise summary (1-2 sentences) that captures the scene's intent and can be used to recreate the scene using a different template.
    4. Include important text, product names, company names, features, benefits, problems, claims, and calls-to-action from the scene when relevant.

    Rules:

    - Match categories based on overall meaning and intent.
    - Consider both the original scene and edits together.
    - Prefer information from edits when present.
    - Preserve important wording from the scene when useful for the summary.
    - Only use the provided categories.
    - Do not invent categories.
    - Return categories ordered by relevance.
    - Do not explain your reasoning.

    Original Scene:
    {{ resume.original }}

    {% if resume.edits %}
    Edits:
    {{ resume.edits }}
    {% endif %}

    --------------------------------------------------
    OUTPUT FORMAT
    --------------------------------------------------

    {{ ctx.output_format }}
  "#
}