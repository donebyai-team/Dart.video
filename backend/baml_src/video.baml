enum SideType {
  ANIMATION @description("A kind of slide in the video where some kind of animation is shown")
  MEDIA @description(#"
      A kind of slide in the video where we ask user to upload a image or video clip showcasing
      their product features
     "#)
}

enum AnimationType {
  TEXT @description("A kind of slide in the video where some kind of animation is shown")
  VISUAL @description("")
  STATS @description("")
  CHART @description("")
}

class Slide {
  index int @description("index/position of the slide under a section")
  beatDescription string @description("outline or concept that goes into this slide")
  type SideType
  animationType AnimationType? @description("only needed when slide type is ANIMATION")
  categorySearchQuery string @description("semantic search query to search category of animation to be used in theis slide")
  duration int @description("duration of the slide")
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
}

class Section {
  name string @description("name of the section")
  slides Slide[]
}

class VideoGenerationPlan {
    video_name string @description("name of the video")
    sections Section[]
}

// Create a function to extract the resume from a string.
function GeneratePlan(resume: VideoGenerationPlanRequest) -> VideoGenerationPlan {
  // Specify a client as provider/model-name
  // You can also use custom LLM params with a custom client name from clients.baml like "client CustomGPT5" or "client CustomSonnet4"
  client "openai-responses/gpt-5-mini" // Set OPENAI_API_KEY to use this client.
  prompt #"
    Extract from this content:
    {{ resume }}

    {{ ctx.output_format }}
  "#
}
