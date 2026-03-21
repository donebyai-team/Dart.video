enum AnimationType {
  BRAND @description("Used for brand-led moments such as logo reveals, identity motion, or signature visual language. Typically placed at the beginning, end, or both to establish and reinforce brand recall.")
  // PRODUCT @description("Used when showcasing real-world tools or interfaces like Slack, WhatsApp, CRM systems, dashboards, or any software relevant to the narrative. Helps ground the story in practical, relatable workflows.")
  TEXT @description("kinetic text, typewriter effects, text animations, word carousels, animated titles, text-heavy content slide. Used for strong statements, hooks, quotes, definitions, or key transitions.")
  // VISUAL @description("Purely visual animated slide (icons, illustrations, motion graphics, abstract visuals). Minimal text.")
  // STATS @description("Animated numerical highlights such as metrics, percentages, counters, growth numbers, comparisons.")
  // CHART @description("Data visualization slide such as data visualizations, graphs, histograms, bar charts, pie charts, progress bars, statistics, metrics.")
  SIMPLE_TEXT @description("Used when you need to show a short 1–2 line message without heavy animation. Ideal for pauses, emphasis, or clean statements.")
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
    @description("Duration in seconds. Average 4-8s per slide Keep pacing dynamic. Avoid repetitive durations.")

  voiceover string? @description("voiceover to play at this slide, if you think its good to add")

  selectedTemplateDescription string? @skip()
}

class MediaSlide {
  index int
    @description("Sequential order of the slide inside its section (starts from 1).")

  beatDescription string
    @description("Clear instruction for what media to include (product demo, UI screenshot, testimonial clip, stock footage, founder image, etc). Must explain why this media is shown at this point in the story.")

  duration int
    @description("Duration in seconds. Should support narrative pacing.")

  selectedTemplateDescription string? @skip()
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
    VideoBranding VideoBranding
    BrandLibraryID string? @skip // Just needed to store the request as it is
    AvailableAnimationTypes AnimationType[]
}

class VideoGenerationPlan {
    videoName string @description("name of the video, around 5 to 15 length")
    sections Section[]
    thinkingSummary string? @skip()
}

class Section {
  name string @description("name of the section, around one or two words")
  slides (AnimationSlide | MediaSlide)[]
}

class VideoBranding {
  brandGuideLines string? @skip @description("user provided brand guidelines")
  attachments string? 
}

class StreamingVideoGenerationPlan {
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
  thinkingSummary string? @skip()
}

function GeneratePlanStreaming(input: VideoGenerationPlanRequest, conversation_history: Message[]) -> StreamingVideoGenerationPlan {
  client CustomOpenAI5WithThinkingSummary
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
    - Use the voiceover to understand the context
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
    Slides must connect in a smooth flow.

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

    ## Slide Type Balance Rules
    When generating slides, follow these constraints:
    1. Use **AnimationSlides** primarily to explain concepts, frameworks, or abstract ideas.
    2. Use **MediaSlides** for product demonstrations where the user will upload screenshots or video clips to showcase features.
    3. Maintain a healthy balance between slide types. Do not overuse any single type.
    4. Avoid excessive use of **VISUAL-type animations**.
    5. Voiceovers are optional. Not every slide requires one, but the overall flow must feel smooth and continuous.
    6. Ensure that **more than 50% of the total slides are MediaSlides** to avoid producing a fully motion-based video.
    7. Do not place more than **two MediaSlides consecutively**.

    Ensure these constraints are strictly enforced during slide generation.

    ## 6. Sections
    - Divide video into meaningful narrative phases.
    - Sections should represent storytelling shifts.
    - Do not create arbitrary sections.

    ## 7. Animation Slide Repeatability Rules
     - BRAND: Should not be overused. Use either at start, end, or both. Avoid repeating frequently and do not insert mid-story unless intentional brand recall is needed.
     - PRODUCT: Not more than once, used only when showcasing different tools, workflows, or steps across the narrative.
     - TEXT: Can be used multiple times throughout the story for hooks, transitions, and key statements.
     - SIMPLE_TEXT: Can be used multiple times for short 1–2 line emphasis moments or pauses.
     - VISUAL: Can be used multiple times to support storytelling through motion, icons, or abstract visuals.
     - STATS: Can be used once or twice, only needed when highlighting different metrics or numerical insights.
     - CHART: Can be used once or twice, only when explaining different datasets or comparisons.
    ---

    ## PLAN
    You MUST create a plan before starting execution.
    You perform best when you explicitly outline your reasoning in structured thinking messages.
    - If the user’s prompt is complex, use the available tools to gather necessary information and create a structured todo list before execution.
    - Do not begin execution without first forming a clear plan.
    ---

    # Ask Questions Rules
    If you do not have clarity on what should appear visually in the **`bearDescription`** of a slide, you must ask a clarifying question before proceeding.
    Do **not assume** missing creative direction.

    ### When to Ask
    Ask if:
    * A **BRAND** slide is appropriate but brand name is unknown
    * A **PRODUCT** slide is needed but tools/platforms are unknown
    * A visual depends on user workflow, stack, or positioning
    * The script implies something specific but lacks clarity
    * Any key visual storytelling decision is ambiguous

    Example triggers:
    * Intro/Outro suggests brand presence → ask brand name
    * Workflow mention → ask which tool (Slack? CRM? WhatsApp? etc)
    * Metrics mentioned → ask if real or placeholder
    * Interface implied → ask which platform to visualize
    ---

    ## INPUT CONTEXT

    Total duration should be close to {{ input.Duration }} seconds.
    Allowed variance: +/- 10%.

    Language: {{ input.Language }}
    Resolution: {{ input.Resolution }}

    {{ BrandGuidelines(input.VideoBranding) }}

    ### Prompt:
    {{ input.Prompt }}

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


    {% if input.AvailableAnimationTypes|length > 0 %}
    ### IMPORTANT: User wants to only have these animations, You must ONLY use these animation types:
    {% for animType in input.AvailableAnimationTypes %}
     - {{ animType }}
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