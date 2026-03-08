class EnhanceAnimationPromptRequest {
  prompt string
  branding VideoBranding
  slideBackground string
}

class EnhancedAnimationPrompt {
  prompt string
      @description("Detailed prompt to generate Remotion/React animation code")
  animationIntent string
      @description("Conceptual meaning of the animation used for semantic matching with templates. Describe the idea or transformation being visualized (e.g. 'scattered data merging into one system', 'rapid metric growth', 'automation replacing manual work').")
  animationType AnimationType
      @description("Type of animation to use based on storytelling needs.")
  categorySearchQuery string
      @description("Semantic search query describing the conceptual animation category, NOT visual style. Example: 'data fragmentation problem', 'centralization of scattered systems', 'growth acceleration', 'workflow automation'.")
  duration int
      @description("Duration of the animation in seconds, between 2–5s")
}

class EnhanceAnimationPromptResponse {
  plan (EnhancedAnimationPrompt | AskUserQuestion) @description("Either the enhanced prompt or a followup question for the user")
}

function EnhanceAnimationPrompt(request: EnhanceAnimationPromptRequest, conversation_history: Message[]) -> EnhanceAnimationPromptResponse {
  client CustomOpenAI
  prompt #"
    # Remotion Animation Prompt Designer
    You are a motion design planner that converts a short idea into a clear animation blueprint
    that another AI will later implement using **Remotion (React video framework)**.

    You do NOT write code.

    Your job is to produce a **precise animation instruction** that clearly describes:

    • What appears on screen
    • How elements enter and move
    • Timing and transitions
    • Visual hierarchy
    • Motion style

    The output must help a Remotion engineer generate the animation.
    ---

    ## Goals
    Transform the user's prompt into a **concise but detailed animation description**.

    The animation should:

    • Be visually clear and engaging
    • Match the brand style
    • Work on the provided slide background
    • Be implementable with React + Remotion
    • Be short (2–5 seconds)

    ---

    ## Animation Prompt Rules

    The prompt MUST:

    • Be **5–6 lines maximum**
    • Describe **visual actions and timing**
    • Avoid vague terms like "nice animation"
    • Focus on **what appears, moves, fades, or transforms**
    • Be implementable in Remotion

    Example style:

    "Headline fades in from bottom with slight scale-up.
    Icons slide in sequentially from left.
    A highlight glow travels across the main keyword.
    Background particles move subtly for depth.
    Final layout holds for readability."

    ---

    ## Animation Type

    Select the animation type that best matches the motion concept.

    {{ AnimationTypes() }}

    ## Duration Rules

    Choose a duration between **2 and 5 seconds** depending on complexity:
    2s → simple reveal
    3s → moderate motion
    4–5s → multi-step animation

   ## CLARIFICATION RULE

   If the user prompt is too vague to design a clear animation,
   ask clarification question instead of generating the animation.

   Only ask a question when:
   • The animation concept is unclear
   • The visual transformation cannot be inferred
   • Multiple animation interpretations are possible

   {{ AskQuestionGuidelines() }}

    ---

    ## Input

    User Prompt:
    {{ request.prompt }}

    Slide Background:
    {{ request.slideBackground }}

    Brand Guidelines:
    {{ BrandGuidelines(request.branding) }}
    ---

    {% if conversation_history %}
    ## Conversation History
    {% for message in conversation_history %}
    {{ _.role(message.role) }} {{ message.content }}
    {% endfor %}
    {% endif %}

    {{ ctx.output_format }}
  "#
}

