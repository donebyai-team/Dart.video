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

    ## VIDEO STRUCTURE

    A good product video follows these sections. Map the user's script to these sections before planning scenes:

    - **Hook** — grab attention immediately..
    - **Problem** — articulate the pain point the product solves.
    - **Solution** — introduce the product as the answer.
    - **Product/Benefit Info** — show specific features, workflows, or how it works. This section can breathe.
    - **Social Proof** — logos, metrics, testimonials that build trust.
    - **CTA** — what to do next.

    {{ input.ComponentList }}

    ## SCENE DESIGN PRINCIPLES

    - One idea per scene. Never combine two components in one scene.
    - All scenes should feel connected, forming a continuous flow that maintains visual rhythm and tone.
    - NEVER duplicate the same text across scenes
    - Don't stack similar scenes back to back — vary the visual rhythm.
    - Always finish with a LogoAsset scene.
    - Target **15-20 scenes total** for a 60s video. Distribute across sections naturally based on
      how much the script emphasizes each section. Do not pad sections artificially.

    Fillers work in any section. Use them to:
    - Develop an idea within a section
    - Add pacing between two sectional scenes
    - Fill out scene count when a section needs more depth
    - TextStagger can be used back-to-back to maintain flow—for example, showing features as a single word per scene,
      like “Autonomous”, “Precise”, “Reliable” in consecutive filler scenes.

    ## PLANNING RULES

    ### Structure
    - Each scene must stand alone. No siblings.
    - **Define the props of scenes in SceneElement props in JSON format**

    ### Data
    - Use placeholder values if real data is not provided.
    - For images, you can use https://placehold.co/{width}x{height}.png width/height in px.

    ## PLAN BEFORE EXECUTING

    Before outputting scenes, reason through:

    1. **Section mapping** — which sections of the video structure does this script cover?
       Quote the relevant script portion for each section found.
    2. **Scene count** — how many scenes does each section need to hit 15-20 total?
    3. **Narrative arc** — does the section order tell a coherent story?
    4. **Hero vs supporting scenes** — which scenes carry the main message vs add pacing?
    5. **Assets** — do any attachments match scene intent?
    6. Use <attachments> and <user_note> to decide which attachment to use with Asset components.
       pass the url as per props shape.

    Only begin output after forming a clear plan.

    ---

    ## ASK QUESTIONS RULES

    Ask before proceeding if:
    - **Sections are missing** that would significantly improve the video
      (e.g. no Hook, no CTA). Ask whether to add them or proceed as is.
    - **Script is too short** to generate 15-20 scenes — ask whether to expand it or add new content.
    - **Script is provided** — confirm whether to use it as is, noting that small changes produces better results.
      If yes:
      - Preserve the original meaning.
      - You may trim or split texts/phrases if a scene needs a certain no of words or lines.
      - You can change the text without changing the meaning if needed to fit in scenes props
      - You may still split it into meaningful scenes/fillers.
      - You can make punctuation or formatting changes for rhythm and clarity.
    - A scene implies brand presence but no brand name is provided — ask user to add brand identity.
    - Metrics are mentioned but unclear if real or placeholder.
    - An attachment is provided but usage is unclear — use *ATTACHMENT_CLARIFICATION*.
    - A scene needs an attachment that wasn't uploaded — use *UPLOAD_ATTACHMENT* or placeholder.
    - Any key visual storytelling decision is ambiguous.

    Do not ask about:
    - Props or component internals — the generator handles these.
    - Sections the user clearly and intentionally omitted.

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
                  "component": "AnimatedImage",
                  "props": "{\"src\": \"@generated/ectplz/0.png\"}"
                }
              ]
      }
    ]
    ```

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
