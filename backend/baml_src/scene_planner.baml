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
    ComponentList string
}

class SceneSection {
  name string @description("name of the section, around one or two words")
  slides Scene[]
}

class GeneratedVideoPlan {
    videoName string @description("name of the video, around 5 to 15 length")
    sections SceneSection[]
    thinkingSummary string? @skip()
}

class VideoGenerationPlan {
  plan (GeneratedVideoPlan | AskUserQuestion)
}

function GeneratePlan(input: VideoGenerationPlanRequest, conversation_history: Message[]) -> VideoGenerationPlan {
  client CustomOpenAI5WithThinkingSummary
  prompt #"
    You are a cinematic video planning director. Your job is to decompose a video brief into a sequence of scenes.
    You decide WHAT appears in each scene, HOW it behaves, and WHAT data it shows.
    You do NOT write code.

    {{ input.ComponentList }}

    ## SCENE DESIGN PRINCIPLES

    - One idea per scene. Never combine two components in one scene.
    - NEVER duplicate the same text across scenes
    - Don't add too many similar scenes one after each other. Shuffle them in the best way
    - Finish the last slide with LogoAsset scene
    - Keep the pacing of the video fast as most of the scenes like text, numbers etc are quite fast. Around 2 frames per char, average 25-70 frames.
      Except ones which requires attachments. So add as many scenes as possible.
    - Image/Logo related scenes takes around 80-100 frames
    - Video related scenes will be equal to the duration of the video (duration*fps)
    - A 60s video need around 15-20 scenes

    ## PLANNING RULES

    ### Structure
    - Every scene has a single clear purpose. One idea per scene.
    - Each scene must stand alone. No siblings.
    - **Define the props of scenes in SceneElement props in JSON format**

    ### Data
    - props is whatever shape the data needs — number, string, array, object, URL.
    - Use placeholder values if real data is not provided.
    - For images, you can use https://placehold.co/{width}x{height}.png width/height in px.

    ## ASK QUESTIONS RULES

    If you lack clarity on what should visually appear in a scene, ask before proceeding.
    Use the ask tool — do not assume missing creative direction.

    Ask if:
    - A scene implies brand presence but no brand name is provided, ask user add a brand identity
    - Metrics are mentioned but it is unclear if they are real or placeholder
    - An attachment is provided but you are not clear on where and how to use it using *ATTACHMENT_CLARIFICATION*
    - If you think a scene needs an attachment, ask user to upload using *UPLOAD_ATTACHMENT* or use a placeholder
    - Any key visual storytelling decision is ambiguous from script or attachments
    - if the script is not clear or brief enough to create a video of at-least 10 scenes.
    - If you do not have enough context to create 15-20 slides.
    - If a **script is provided**, confirm whether to **use it exactly as written**.
    - If the **script is too short to generate enough slides**, ask whether to **expand it or add new content**.
    - Overall ask questions to get as much context to get the best set of scenes.


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
            "props": "{\"startText\": \"Solving\", \"endText\": \"incidents\", \"from\": 0, \"to\": 100}"
          }
        ]
      },
      {
        "index": 1,
        "elements": [
          {
            "component": "TextHighlight",
            "props": "{\"text\": \"Everything else is just {noise}\"}"
          }
        ]
      },
      {
              "index": 3,
              "elements": [
                {
                  "component": "AnimatedImage",
                  "props": "{\"src\": \"@generated/ectplz/0.png\"}"
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
       in props src.

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

test Test_GeneratePlanV2 {
  functions [GeneratePlanV2]
  args {
    input {
      BrandLibraryID "54d0140d-b235-42e6-8ab6-f33b87100898"
      AvailableAnimationTypes [
      ]
      Duration 1800
      Prompt #"
      Hook	Can your AI actually work with you?
      Problem	All teams are stretched thin. Competetion is growing faster than ever. Hiring is slow and expensive
      Product Intro	Introducing Cursor.
      	The personal AI assistant built everything at work.
      Feature 1	Use cursor in agent, plan, debug, ask modes,
      Feature 2	Work with the latest models from Open AI, Anthropic and everyone else.
      Feature 3	Add custom plugins to supercharge cursor with your favourite tools
      Social proof	Shopify, Midjourney, and thousands of startups are using cursor to see 10X productivity
      CTA	Try Cursor free today.
      "#
      Language "English"
      Resolution "16:9"
      Script [
      ]
      VideoBranding {
        brandGuideLines #"
        <brand_details>
          <name>Cursor</name>
          <tagline>The best way to code with AI</tagline>
          <description>Built to make you extraordinarily productive, Cursor is the best way to build software with AI.</description>
        </brand_details>

        "#
        attachments #"
        <attachments>
          <attachment>
            <url>@generated/ectplz/0.png</url>
            <width>2818</width>
            <height>1490</height>
            <media_type>MEDIA_TYPE_IMAGE</media_type>
            <mime_type>image/png</mime_type>
            <description>A Cursor website landing page is shown with a top navigation bar, a large headline about coding with AI, a download button, and a prominent product screenshot of the Cursor app interface below.</description>
            <tags>landing-page,software,ai-code-editor,product-screenshot</tags>
            <user_note>Show it after feature 3</user_note>
          </attachment>
          <attachment>
            <url>@generated/tdhlnn/1.png</url>
            <width>2758</width>
            <height>1316</height>
            <media_type>MEDIA_TYPE_IMAGE</media_type>
            <mime_type>image/png</mime_type>
            <description>A marketing-style webpage showing Cursor’s agentic development feature, with a large embedded app mockup for planning a Mission Control interface and a task list/document editor on the right.</description>
            <tags>product-page,app-mockup,ui-design,developer-tool</tags>
            <user_note>Show it after feature 3</user_note>
          </attachment>
          <attachment>
            <url>@generated/dexxak/2.png</url>
            <width>2826</width>
            <height>1380</height>
            <media_type>MEDIA_TYPE_IMAGE</media_type>
            <mime_type>image/png</mime_type>
            <description>A browser window shows an Acme Research Dashboard in an agent-style interface, with a sidebar of projects, a chat-like task summary, a video preview, and marketing text about autonomous cloud agents on the right.</description>
            <tags>dashboard,browser-ui,ai-agent,product-landing</tags>
            <user_note>Show it after feature 3</user_note>
          </attachment>
          <attachment>
            <url>@generated/shgabo/3.png</url>
            <width>2826</width>
            <height>1578</height>
            <media_type>MEDIA_TYPE_IMAGE</media_type>
            <mime_type>image/png</mime_type>
            <description>A dark-themed desktop app window showing an AI agent chat workspace on the left, an empty browser tab panel on the right, and a terminal docked at the bottom.</description>
            <tags>desktop-app,ai-assistant,browser,terminal</tags>
            <user_note>use it in feature 1</user_note>
          </attachment>
          <attachment>
            <url>@generated/rzzsmx/4.mp4</url>
            <width>0</width>
            <height>0</height>
            <media_type>MEDIA_TYPE_VIDEO</media_type>
            <mime_type>video/mp4</mime_type>
            <user_note>use it in feature 3</user_note>
          </attachment>
        </attachments>

        "#
      }
    }
    conversation_history [
    ]
  }
}
