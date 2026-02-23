enum AnimationType {
  TEXT @description("A kind of slide in the video where some kind of animation is shown")
  VISUAL @description("")
  STATS @description("")
  CHART @description("")
}

class AnimationSlide {
  index int @description("index/position of the slide under a section")
  beatDescription string @description("outline or concept that goes into this slide")
  animationType AnimationType
  categorySearchQuery string @description("semantic search query to search category of animation to be used in theis slide")
  duration int @description("duration of the slide")  @assert(valid_duration, {{ this >= 1 and this <= 10 }})
  selectedTemplateDescription string?
}

class MediaSlide {
  index int @description("index/position of the slide under a section")
  description string @description("suggest user what feature media to add")
  duration int @description("duration of the slide") @assert(valid_duration, {{ this >= 1 and this <= 10 }})
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
  name string @description("name of the section")
  slides (AnimationSlide | MediaSlide)[]
}

class Gradient {
  angle int  @description("angle of the gradient") @assert(valid_angle, {{ this >= 0 and this <= 260 }})
  stops GradientStop[]
}

class GradientStop {
  color string @description("hex color code eg #ffffff")
  position int @description("between 0–100") @assert(valid_position, {{ this >= 0 and this <= 100 }})
}

class VideoBackground {
  gradient Gradient @description("gradient to apply to all slides background")
}

class VideoGenerationPlan {
    videoName string @description("name of the video") @assert(length_video_name, {{ this|length >= 5 and this|length <= 15 }})
    sections Section[]
    backgroundStyle VideoBackground @description("background style of all slides")
}

class StreamingVideoGenerationPlan {
  thinking string? @stream.with_state @description("Real-time thinking process wrapped in <thinking></thinking> tags")
  plan (VideoGenerationPlan | AskUserQuestion) @stream.done @description("Either the final video generation plan or a question for the user")
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
  client "openai-responses/gpt-4o-mini"
  prompt #"
    #Video Generation Agent

    You are a video generation planning assistant. Your goal is to create comprehensive video plans, but you may need to ask clarifying questions first.

    ## Original Request
    Duration: {{ input.Duration }} seconds
    Prompt: {{ input.Prompt }}
    Language: {{ input.Language }}
    Resolution: {{ input.Resolution }}

    {% if input.Script %}
    Script Items:
    {% for item in input.Script %}
    - {{ item.name }}: {{ item.voiceover }}
    {% if item.reference %}
      Reference: {{ item.reference }}
    {% endif %}
    {% endfor %}
    {% endif %}

    ## Instructions

    1. **Thinking Process**: Always wrap your reasoning in `<thinking></thinking>` tags
    2. **Decision Making**:
       - If you have enough information, generate the complete VideoGenerationPlan
       - If you need clarification, use the ask_user_question tool
    3. **Question Guidelines**:
       - Keep questions concise (8 words or less)
       - Provide 2-3 clear answer options
       - Only ask when absolutely necessary
    4. **Consider Context**: Use any conversation history to avoid repeating questions

    ## Tool Usage

    When you need clarification, use the ask_user_question tool with:
    - `question_text`: A concise question (8 words or less)
    - `options`: 2-4 clear, specific answer choices
    - `allow_custom_entry`: Set to true if you want to allow free-form responses

    Examples of good questions:
    - "Video style preference?"
    - "Do you want to show more product slides vs more animations. More product slides means more media slides"

    ## Response Format

    Always start with your thinking process:

    <thinking>
    Let me analyze the request...
    - Duration: [analyze duration]
    - Prompt: [analyze prompt clarity]
    - Missing information: [list what's unclear]
    - Decision: [ask question OR generate plan]
    </thinking>

    Then provide either:
    1. A complete VideoGenerationPlan if you have sufficient information
    2. An AskUserQuestion if you need clarification

    ## Video Plan Requirements

    When generating the final plan:
    - Create meaningful section names
    - Balance slide types (animation vs media)
    - Ensure durations add up correctly
    - Use appropriate animation types for content
    - Generate relevant search queries for animations
    - Create cohesive background styling


    {% if conversation_history %}
    ## Conversation History
    {% for message in conversation_history %}
    {{ _.role(message.role) }} {{ message.content }}
    {% endfor %}
    {% endif %}

    {{ ctx.output_format }}
  "#
}