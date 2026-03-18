enum AnimationCodeEditType {
  TARGETED_EDITS @description("")
  FULL_REWRITE @description("")
}

class EditAnimationCodeRequest {
  code string
  prompt string
}

class EditAnimationCodeResponse {
  type AnimationCodeEditType
  edits EditString[]
}

class EditString {
  description string @description("Brief description of this edit")
  oldString string @description("The exact string to find (must match exactly, including whitespace)")
  newString string @description("The replacement string")
}

function EditAnimationCode(resume: EditAnimationCodeRequest, conversation_history: Message[]) -> EditAnimationCodeResponse {
  client CustomOpenAI5
  prompt #"
    You are an expert at making targeted edits to React components.

    Given the current code and a user request, decide whether to:
    1. Use targeted edits (for small, specific changes)
    2. Provide full replacement code (for major restructuring)

    ## WHEN TO USE TARGETED EDITS (type: TARGETED_EDITS)
    - Changing colors, text, numbers, timing values
    - Adding or removing a single element
    - Modifying styles or properties
    - Small additions (new variable, new element)
    - Changes affecting <30% of the code

    ## WHEN TO USE FULL REPLACEMENT (type: FULL_REWRITE)
    - Completely different animation style
    - Major structural reorganization
    - User asks to "start fresh" or "rewrite"
    - Changes affect >50% of the code

    ## EDIT FORMAT
    For targeted edits, each edit needs:
    - old_string: The EXACT string to find (including whitespace/indentation)
    - new_string: The replacement string

    CRITICAL:
    - old_string must match the code EXACTLY character-for-character
    - Include enough surrounding context to make old_string unique
    - If multiple similar lines exist, include more surrounding code
    - Preserve indentation exactly as it appears in the original

    --------------------------------------------------
    INPUT
    --------------------------------------------------

    ## CURRENT CODE
    {{ resume.code }}

    ## USER REQUEST:
    {{ resume.prompt }}

    --------------------------------------------------

    {% if conversation_history %}
    ## Conversation History
    {% for message in conversation_history %}
    {{ _.role(message.role) }} {{ message.content }}
    {% endfor %}
    {% endif %}

    {{ ctx.output_format }}

  "#
}