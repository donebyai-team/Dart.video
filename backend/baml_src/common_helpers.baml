enum SceneCategory {
  TITLE
  OUTRO
  SINGLE_STAT
  COMPARISON
  TREND
  BREAKDOWN
  FEATURE_HIGHLIGHT
  FEATURE_LIST
  WORKFLOW
  TESTIMONIAL
  LOGO_WALL
  CASE_STUDY_STAT
  PROBLEM
  SOLUTION
  HOW_IT_WORKS
}

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
  background BackgroundGradient? @description("background gradient for scene")
  thinkingSummary string? @skip()
}

class SceneElement {
  component string
  props string @description("required props in VALID JSON format as per the scene")
  children SceneElement[]
}

class BackgroundGradient {
   color1 string @description("valid hex code")
   position1 int @description("0–100")

   color2 string @description("valid hex code")
   position2 int @description("0–100")

   angle int @description("0–360")
}