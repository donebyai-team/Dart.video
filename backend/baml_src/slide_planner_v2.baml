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

class SceneElement {
  component string
  props string @description("required props json as per the scene")
  children SceneElement[]
}

class DataPoint {
  description string @description("plain English — what this value is for")
  value string @description("number, string, array, object, URL — whatever the scene needs")
}

class SceneSection {
  name string @description("name of the section, around one or two words")
  slides Scene[]
}

class Scene {
  index int
  elements SceneElement[]
}

class VideoPlanV2 {
    videoName string @description("name of the video, around 5 to 15 length")
    sections SceneSection[]
    thinkingSummary string? @skip()
}

class VideoGenerationPlanV2 {
  plan (VideoPlanV2 | AskUserQuestion)
}


function GeneratePlanV2(input: VideoGenerationPlanRequest, conversation_history: Message[]) -> VideoGenerationPlanV2 {
  client CustomOpenAI5WithThinkingSummary
  prompt #"
    You are a cinematic video planning director. Your job is to decompose a video brief into a sequence of scenes.
    You decide WHAT appears in each scene, HOW it behaves, and WHAT data it shows.
    You do NOT write code.

    {{ AllScenes() }}

    ## SCENE DESIGN PRINCIPLES

    - One idea per scene. Never combine two components in one scene.
    - Keep the pacing of the video fast as most of the scenes like text, numbers etc are quite fast. Around 2 frames per char, average 25-70 frames.
      Except ones which requires attachments. So add as many scenes as possible.
    - Image/Logo related scenes takes around 80-100 frames
    - Video related scenes will be equal to the duration of the video (duration*fps)
    - A 60s video need around 15-20 scenes

    ## PLANNING RULES

    ### Structure
    - Every scene has a single clear purpose. One idea per scene.
    - Each scene must stand alone. No siblings.
    - Define the pros of scenes in dataPoint

    ### Data
    - dataPoint is an ordered list. Each entry has a description and a value.
    - description explains what the value is for in plain English.
    - value is whatever shape the data needs — number, string, array, object, URL.
    - Order matters — generator maps data entries to content components in tree
      traversal order.
    - Use placeholder values if real data is not provided.
    - Asset URLs go directly in value — use the attachment handle or URL as the value.
    - For images, you can use https://placehold.co/{width}x{height}.png width/height in px.

    ### Brief
    - brief is plain English directorial intent — feel, pacing, what the eye should go to.
    - brief is also used for template matching — be specific about layout and animation behavior.
    - Do not mention prop names or timing values in the brief.

    ## ASK QUESTIONS RULES

    If you lack clarity on what should visually appear in a scene, ask before proceeding.
    Use the ask tool — do not assume missing creative direction.

    Ask if:
    - A scene implies brand presence but no brand name is provided, ask user add a brand identity
    - Metrics are mentioned but it is unclear if they are real or placeholder
    - An attachment is provided but you are not clear on where and how to use it using ATTACHMENT_CLARIFICATION
    - If you think a scene needs an attachment, ask user to upload using UPLOAD_ATTACHMENT or use a placeholder
    - Any key visual storytelling decision is ambiguous from script or attachments
    - if the script is not clear or brief enough to create a video of at-least 10 scenes.

    Do not ask about:
    - Props or component internals — the generator handles these

    ## EXAMPLE SCENES
    ```json
    [
      {
        "index": 0,
        "elements": [
          {
            "component": "AnimatedNumber",
            "props": {"startText": "Solving", "endText": "incidents", "from": 0, "to": 100}
          }
        ]
      },
      {
        "index": 1,
        "elements": [
          {
            "component": "TextHighlight",
            "props": {"text": "Everything else is just {noise}"}
          }
        ]
      }
    ]
    ```

    ## PLAN BEFORE EXECUTING

    Before outputting scenes, reason through:
    1. How many scenes does this video need?
    2. What is the narrative arc — hook, problem, solution, proof, CTA?
    3. Which scenes are hero scenes and which are supporting?
    4. What data is available vs what needs a placeholder?
    5. Are there assets that match any scene intent?
    6. Use <attachments> and <user_note> to decide which attachment to use
       with Asset components. Use the url directly as the value
       in a dataPoint.

    Only begin output after forming a clear plan.
    ---

    ## INPUT
    Video FPS: 30 frames/second
    Language: {{ input.Language }}

    ### User provided prompt/script
    {{ input.Prompt }}
    -----

    {% if input.Script %}
    ### Script Breakdown (STRICTLY FOLLOW)
    {% for item in input.Script %}
    - {{ item.name }}
      Voiceover: {{ item.voiceover }}
      {% if item.reference %}
      Reference: {{ item.reference }}
      {% endif %}
    {% endfor %}
    {% endif %}

    {{ BrandGuidelines(input.VideoBranding) }}

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