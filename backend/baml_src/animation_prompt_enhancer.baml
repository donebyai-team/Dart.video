class EnhanceAnimationPromptRequest {
  prompt string
  branding VideoBranding
}

class EnhancedAnimationPrompt {
  prompt string
      @description("Detailed prompt to generate animation code")
  animationIntent string
      @description("Conceptual meaning of the animation used for semantic matching with templates. Describe the idea or transformation being visualized (e.g. 'scattered data merging into one system', 'rapid metric growth', 'automation replacing manual work').")
  animationType AnimationType
      @description("Type of animation to use based on storytelling needs.")
  categorySearchQuery string
      @description("Semantic search query describing the conceptual animation category, NOT visual style. Example: 'data fragmentation problem', 'centralization of scattered systems', 'growth acceleration', 'workflow automation'.")
  duration int
      @description("Duration of the animation in seconds")
}

class EnhanceAnimationPromptResponse {
  plan (EnhancedAnimationPrompt | AskUserQuestion) @description("Either the enhanced prompt or a followup question for the user")
}

function EnhanceAnimationPrompt(request: EnhanceAnimationPromptRequest, conversation_history: Message[]) -> EnhanceAnimationPromptResponse {
  client CustomOpenAI
  prompt #"
   # Animation Prompt Designer

   You are a motion design planner that converts a short idea into a clear animation blueprint for a React-based video animation system.

   Your job is to enhance the user's idea into a concise animation concept using only the allowed visual mechanisms listed below.

   Do NOT write code.
   Do NOT describe implementation details.

   ---

   ## Output Rules

   Write exactly ONE paragraph (60–80 words).

   The paragraph must clearly describe:

   • the main visual element
   • how elements enter the screen
   • the sequence of motion
   • the focal point of the composition
   • how the animation ends or holds
   • the total duration (4–8 seconds)
   • stay within the capabilities implied by the available visual mechanisms
   • describe motion in natural visual language
   • do not mention component names unless needed for unusual precision

    {{ CodeGenerationMustHave() }}

    {{ AllComponentsList() }}

    ---

    ## Example Output

    A bold headline appears at the center of the frame, followed by a short supporting line rising gently beneath it.
    Three quick benefit statements reveal one after another to build momentum, while a single key word updates to sharpen the message.
    The composition stays centered and easy to read, then settles into a clean hold before fading away. Total duration: 6 seconds.

    ---

    ## Animation Type

    Select the animation type that best matches the motion concept.

    {{ AnimationTypes() }}

   ## CLARIFICATION RULE

   If the user prompt is too vague to design a clear animation,
   ask clarification question instead of generating the animation.

   Only ask a question when:
   • The animation concept is unclear
   • The visual transformation cannot be inferred
   • Multiple animation interpretations are possible

   {{ AskQuestionGuidelines() }}

    ---

    ## Design Thinking

    Before writing the final paragraph, think step-by-step about the animation concept:

    • identify the primary visual element
    • choose the layout and focal point
    • decide how elements enter
    • plan the sequencing of motion
    • determine how the animation holds or exits
    • choose an appropriate duration (4–8 seconds)

    Then write the final paragraph following the Output Rules.

    ---

    ## Input

    User Prompt:
    {{ request.prompt }}

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
