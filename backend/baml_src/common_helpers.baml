class Message {
  role "user" | "assistant" | "tool"
  content string
  tool_call_id string? @description("ID for tool calls and responses")
}

enum AskUserQuestionType {
  GENERIC @description("general clarification")
  ATTACHMENT_CLARIFICATION @description("when you need some clarification on an attached attachment")
  UPLOAD_ATTACHMENT @description("when you need to ask user to upload")
}

class AskUserQuestion {
  tool_name "ask_user_question" @description("Use this tool to ask the user a question when you need clarification or additional information")
  questionType AskUserQuestionType
  question_text string @description("The question to ask the user. Keep it concise (8 words or less).")
  options string[] @description("The answer choices for the user to select from")
  allow_custom_entry bool? @description("Whether to allow custom text entry in addition to the predefined options")
  attachmentUrl string? @description("attachment to get the clarification")
  thinkingSummary string? @skip()
}

class VideoBranding {
  brandGuideLines string? @description("user provided brand guidelines")
  brandColors string? @description("user provided brand tokens")
  attachments string?
}

class Scene {
  index int
  elements SceneElement[]
  background Background? @description("optional background")
  thinkingSummary string? @skip()
}

class SceneElement {
  component string
  props string @description("required props in VALID JSON format as per the scene")
  children SceneElement[]
}

enum ColorToken {
  PRIMARY
  SECONDARY
}

class Background {
   solid ColorToken | string
}