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
  category SceneCategory
  elements SceneElement[]
  brief string @description("a short description explaining the scene, used for semantic search for existing templates and the animation generator")
  dataPoints DataPoint[] @description("generator will use this data to convert selected SceneElements into animation")
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
    You do NOT write code. You do NOT decide timing values. You do NOT choose props.

    {{ AllComponentsList() }}

    ## SCENE DESIGN PRINCIPLES

    - One idea per scene. Never combine two components in one scene.

    ## PLANNING RULES

    ### Structure
    - Every scene has a single clear purpose. One idea per scene.
    - SafeArea is always the implicit outermost wrapper. Do not include it in elements.
    - Scene components (TitleCard, StatBlock etc) must stand alone. No siblings.
    - Animation primitives wrap a single content or asset element. Never wrap layout directly.

    ### Data
    - dataPoint is an ordered list. Each entry has a description and a value.
    - description explains what the value is for in plain English.
    - value is whatever shape the data needs — number, string, array, object, URL.
    - Order matters — generator maps data entries to content components in tree
      traversal order.
    - Use placeholder values if real data is not provided.
    - Asset URLs go directly in value — use the attachment handle or URL as the value.

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
    - If you think a scene needs an attachment, ask user to upload using UPLOAD_ATTACHMENT
    - Any key visual storytelling decision is ambiguous from script or attachments
    - if the script is not clear or brief enough to create a video of at-least 10 scenes.

    Do not ask about:
    - Props or component internals — the generator handles these

    ## EXAMPLE SCENES
    ```json
    [
      {
        "index": 1,
        "category": "TITLE",
        "brief": "Premium slow open. Headline fades in centered, tagline follows with a beat. Slow and confident — nothing rushes.",
        "durationBudget": [60, 80],
        "elements": [
          {
            "component": "Stack",
            "children": [
              {
                "component": "FadeIn",
                "children": [{ "component": "Text" }]
              },
              {
                "component": "FadeIn",
                "children": [{ "component": "Text" }]
              }
            ]
          }
        ],
        "dataPoints": [
          { "description": "main headline", "value": "CoasterAI" },
          { "description": "supporting tagline below headline", "value": "Video generation, automated." }
        ]
      },
      {
        "index": 2,
        "category": "SINGLE_STAT",
        "brief": "Counter is the hero. Label slides in first, counter follows immediately with focus. Give the counter room to breathe. Fast clean exit.",
        "durationBudget": [90, 130],
        "elements": [
          {
            "component": "Stack",
            "children": [
              {
                "component": "SlideIn",
                "children": [{ "component": "Text" }]
              },
              {
                "component": "SlideIn",
                "children": [{ "component": "Counter" }]
              }
            ]
          }
        ],
        "dataPoints": [
          { "description": "label above the counter", "value": "Total Revenue" },
          { "description": "hero metric shown in counter", "value": 1240000 }
        ]
      },
      {
        "index": 3,
        "category": "FEATURE_HIGHLIGHT",
        "brief": "Product screen dominates the right. Two feature points stagger in on the left. Screen slides in from right edge. Confident and product-led.",
        "durationBudget": [130, 180],
        "elements": [
          {
            "component": "Row",
            "children": [
              {
                "component": "Stack",
                "children": [
                  {
                    "component": "Stagger",
                    "children": [
                      {
                        "component": "FadeIn",
                        "children": [{ "component": "Text" }]
                      },
                      {
                        "component": "FadeIn",
                        "children": [{ "component": "Text" }]
                      }
                    ]
                  }
                ]
              },
              {
                "component": "SlideIn",
                "children": [{ "component": "ImageAsset" }]
              }
            ]
          }
        ],
        "dataPoints": [
          { "description": "first feature point on the left", "value": "Real-time Analytics" },
          { "description": "second feature point on the left", "value": "Zero setup required" },
          { "description": "product screen shown on the right", "value": "@generated/mixect/0.png" }
        ]
      },
      {
        "index": 4,
        "category": "OUTRO",
        "brief": "Logo scales in centered, CTA fades in below. Unhurried and brand-forward. Logo is the hero.",
        "durationBudget": [55, 70],
        "elements": [
          {
            "component": "Stack",
            "children": [
              {
                "component": "ScaleIn",
                "children": [{ "component": "LogoAsset" }]
              },
              {
                "component": "FadeIn",
                "children": [{ "component": "Text" }]
              }
            ]
          }
        ],
        "dataPoints": [
          { "description": "call to action text below the logo", "value": "Try CoasterAI free today" }
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