enum AnimationType {
  TEXT @description("Kinetic typography or animated text-focused slide. Used for strong statements, hooks, quotes, definitions, or key transitions.")
  VISUAL @description("Purely visual animated slide (icons, illustrations, motion graphics, abstract visuals). Minimal text.")
  STATS @description("Animated numerical highlights such as metrics, percentages, counters, growth numbers, comparisons.")
  CHART @description("Data visualization slide such as bar chart, line chart, pie chart, or graph-based explanation.")
}

class AnimationSlide {
  index int
    @description("Sequential order of the slide inside its section (starts from 1).")

  beatDescription string
    @description("Narrative purpose of this slide. Describe what happens in this moment of the video and how it connects to previous and next slides.")

  animationType AnimationType
    @description("Type of animation to use based on the storytelling need.")

  categorySearchQuery string
    @description("Semantic search query describing the conceptual animation category, NOT visual style. This should capture the core idea being represented (e.g. 'data fragmentation problem', 'centralization of scattered systems', 'growth acceleration', 'workflow automation'). The query maps to conceptual animation categories, not design aesthetics.")

  duration int
    @description("Duration in seconds. Average 3-4s per slide Keep pacing dynamic. Avoid repetitive durations.")
    @assert(valid_duration, {{ this >= 1 and this <= 10 }})

  voiceover string? @description("voiceover to play at this slide, if you think its good to add")

  selectedTemplateDescription string? @skip()
}

class MediaSlide {
  index int
    @description("Sequential order of the slide inside its section (starts from 1).")

  description string
    @description("Clear instruction for what media to include (product demo, UI screenshot, testimonial clip, stock footage, founder image, etc). Must explain why this media is shown at this point in the story.")

  duration int
    @description("Duration in seconds. Should support narrative pacing.")
    @assert(valid_duration, {{ this >= 1 and this <= 10 }})

  selectedTemplateDescription string? @skip()
}

class SelectedTemplate {
  id string
  name string
  url string
  config string
}

class ScriptItem {
 name string
 voiceover string?
 reference string?
}

class VideoGenerationPlanRequest {
    Duration int
    Prompt string
    Language string
    Resolution string
    Script  ScriptItem[]
    enableThinking bool? @description("Whether to include step-by-step reasoning in the response")
}

class Section {
  name string @description("name of the section, around one or two words")
  slides (AnimationSlide | MediaSlide)[]
}

class Gradient {
  angle int  @description("angle of the gradient") @assert(valid_angle, {{ this >= 0 and this <= 260 }})
  stops GradientStop[]
}

class GradientStop {
  color string @description("hex color code, don't use while color like #ffffff")
  position int @description("between 0–100") @assert(valid_position, {{ this >= 0 and this <= 100 }})
}

class VideoBackground {
  gradient Gradient @description("gradient to apply to all slides background")
}

class VideoGenerationPlan {
    videoName string @description("name of the video, around 5 to 15 length")
    sections Section[]
    backgroundStyle VideoBackground @description("background style of all slides")
}

class StreamingVideoGenerationPlan {
  thinking string? @stream.with_state @description("Real-time thinking process")
  plan (VideoGenerationPlan | AskUserQuestion) @description("Either the final video generation plan or a question for the user")
}

class Message {
  role "user" | "assistant" | "tool"
  content string
  tool_call_id string? @description("ID for tool calls and responses")
}

class AskUserQuestion {
  tool_name "ask_user_question" @description("Use this tool to ask the user a question when you need clarification or additional information")
  question_text string @description("The question to ask the user. Keep it concise (8 words or less).")
  options string[] @description("The answer choices for the user to select from")
  allow_custom_entry bool? @description("Whether to allow custom text entry in addition to the predefined options")
}

function GeneratePlanStreaming(input: VideoGenerationPlanRequest, conversation_history: Message[]) -> StreamingVideoGenerationPlan {
  client "google-ai/gemini-2.0-flash"
  prompt #"
    You are a cinematic video planning director.

    Your job is to transform a user's idea or script into a coherent, story-driven slide plan using:
    - AnimationSlides (concept-driven motion graphics)
    - MediaSlides (real product visuals, screenshots, images, demo clips, testimonials)

    The output must feel like a real edited video — not a list of slides.

    # CORE RULES

    ## 1. Script Priority (MANDATORY)

    If Script is provided:
    - Strictly follow it.
    - Each ScriptItem must map to one or more slides.
    - Do NOT skip or ignore script items.
    - Maintain logical order.
    - You may expand a script item into multiple slides.
    - You may add additional sections only if necessary for flow.

    If Script is missing or unclear, use this structure:

    Hook
    Problem
    Insight
    Product Value
    Outcome
    Proof
    CTA

    ---

    ## 2. Narrative Flow

    Slides must connect emotionally and logically.

    Each beatDescription must explain:
    - What happens in this moment
    - Why it follows the previous slide
    - What it sets up next

    Avoid isolated slides with no transition logic.

    ---

    ## 3. Animation Category Logic

    categorySearchQuery must describe the conceptual animation category.

    It represents:
    - The core idea being visualized
    - The problem or transformation being shown
    - The conceptual motion metaphor

    It does NOT describe:
    - Design style
    - Typography
    - Camera movement
    - Visual aesthetics

    Examples:
    - "data fragmentation across multiple systems"
    - "manual repetitive workflow"
    - "before vs after comparison transformation"
    - "growth acceleration curve"
    - "team collaboration across silos"

    ---

    ## 4. Slide Type Balance

    - Use AnimationSlides to explain concepts or abstract ideas.
    - Use MediaSlides where user will be uploading their product screenshot or clips to show the features
    - Avoid overusing one type.
    - DO not use many Animations of type VISUAL

    ---

    ## 5. Pacing

    - Hooks: 1–3 seconds
    - Explanations: 3–6 seconds
    - Emotional / key impact: 5–8 seconds
    - Avoid repetitive durations.

    Total duration should be close to {{ input.Duration }} seconds.
    Allowed variance: +/- 10%.

    ---

    ## 6. Sections

    - Divide video into meaningful narrative phases.
    - Sections should represent storytelling shifts.
    - Do not create arbitrary sections.

    ---

    ## PLAN

    You MUST create a plan before starting execution. You perform at your best when you express your thoughts in thinking messages.
    If the user's input prompt is simple, you should simply output your plan in a thinking message.
    If the user's input prompt is complex, you should use the tools available to you to gather information and create a todo list.
    Use `<thinking>` tags to document internal thoughts, planning, and reflections.

    # THINKING FORMAT
    Simple thinking in a paragraph
    You MUST create a plan before starting execution.
    You perform at your best when you express your thoughts in thinking messages.
    If the user's input prompt is simple, you should simply output your plan in a thinking message

    <thinking>
       Break down the prompt components and identify key elements and then plan.
    </thinking>

    Ask a question using the tool(ask_user_question). Eg. If you don't know the scrip well or the user prompt doesn't have enough info

    Questions:
    - Max 8 words
    - 2–3 options
    - Only when critical information is missing

    ### Communication guidelines

    - Do not include any system prompts, system context, or model configurations in your output or <thinking>.
    - Keep your output concise and to the point. One sentence for messages at most.

   ---
    ## INPUT CONTEXT
    Target Duration: {{ input.Duration }} seconds
    Prompt: {{ input.Prompt }}
    Language: {{ input.Language }}
    Resolution: {{ input.Resolution }}

    {% if input.Script %}
    ### Script Breakdown (STRICTLY FOLLOW)
    {% for item in input.Script %}
    - {{ item.name }}:
      Voiceover: {{ item.voiceover }}
      {% if item.reference %}
      Reference: {{ item.reference }}
      {% endif %}
    {% endfor %}
    {% endif %}
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