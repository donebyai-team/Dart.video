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
    {{ _.read_file("prompts/AgentV1.md") }}

    {% if conversation_history %}
    ## Conversation History
    {% for message in conversation_history %}
    {{ _.role(message.role) }} {{ message.content }}
    {% endfor %}
    {% endif %}

    {{ ctx.output_format }}
  "#
}