class Message {
  role "user" | "assistant" | "tool"
  content string
  images image[]
  videos video[]
}

enum AskUserQuestionType {
  GENERIC @description("general clarification")
  UPLOAD_ATTACHMENT @description("when you need to ask user to upload")
}

class AskUserQuestion {
  tool_name "ask_user_question" @description("Use this tool to ask the user a question when you need clarification or additional information")
  questionType AskUserQuestionType
  question_text string @description("The question to ask the user. Keep it concise (8 words or less).")
  options string[] @description("The answer choices for the user to select from")
  allow_custom_entry bool? @description("Whether to allow custom text entry in addition to the predefined options")
  attachmentUrl string? @description("attachment to get the clarification")
}

class ToolExtractContent {
 tool_name "extract_content" @description("Use this tool to extract content from a link/website")
 links string[]
}

class VideoBranding {
  brandGuideLines string? @description("user provided brand guidelines")
  brandColors string? @description("user provided brand tokens")
  attachments string?
}

class Scene {
  element SceneElement
  voiceover string?
  thinkingSummary string? @skip()
}

class SceneElement {
  component string
  props MapOrArray @description("required props in VALID JSON format as per the scene")
}

type JSON = string | int | float | null | JSON[] | map<string, JSON>

type MapOrArray = map<string, JSON>[] | map<string, JSON>

enum ColorToken {
  PRIMARY
}

class Background {
   solid ColorToken | string
}