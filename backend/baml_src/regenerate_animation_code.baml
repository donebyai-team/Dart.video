class ReGenerateAnimationCodeRequest {
  code string
  animationType AnimationType
  prompt string
  duration int
  branding VideoBranding
}

class ReGenerateAnimationCodeResponse {
  code string @description("Typescript code")
}

function ReGenerateAnimation(resume: ReGenerateAnimationCodeRequest, conversation_history: Message[]) -> ReGenerateAnimationCodeResponse {
  client CustomOpenAI
  prompt #"
    You are modifying an existing React animation component for a video slide.

    ---

    ## CONTEXT
    You will receive the current component code and edit instructions.
    Your job is to apply the requested changes while preserving everything else.

    The component runs inside a managed animation runtime with strict rules.
    Any code that violates the rules will be rejected automatically.

    ---

    ## EDITING RULES

    1. Modify the existing code — never rewrite from scratch.
    2. Only change what the edit instructions require. Leave everything else untouched.
    3. Never rename the exported component.
    4. Never remove animation logic unless the edit explicitly requires it.
    5. When adding elements, integrate them into the existing layout naturally.
    6. Keep all existing timing values unless the edit changes them.
    7. All rules from the generation prompt apply here too — no hex colors, no arbitrary px, no Remotion imports, style props for layout only.

    ---

    {{ CodeGeneration() }}
    ---

    ## INPUT

    Resolution and Canvas Size:
    16x9(1920x1080)

   {{ BrandGuidelines(resume.branding) }}

    Animation Duration:
    {{ resume.duration }}

    ## Requested Edits
    {{ resume.prompt }}

    ## Existing Animation Code
    {{ resume.code }}

    ---

    {% if conversation_history %}
    ## Conversation History
    {% for message in conversation_history %}
    {{ _.role(message.role) }} {{ message.content }}
    {% endfor %}
    {% endif %}

    ---
    {{ ctx.output_format }}
  "#
}