class ScriptItem {
 name string
 voiceover string?
 reference string?
}

class AnimationCategories {
  entranceAnimations string[]
}

class VideoGenerationPlanRequest {
    Duration int
    Prompt string
    Language string
    Resolution string
    Script  ScriptItem[]
    VideoBranding VideoBranding
    ComponentList string
    AnimationCategories AnimationCategories
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

    - **Hook/Intro** — grab attention immediately..
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
    - Never include large amounts of text in a single scene; split it into multiple scenes while preserving meaning
    - Don't stack similar scenes back to back — vary the visual rhythm.
    - Always finish with CTA scene.
    - Target **15-20 scenes total** for a 60s video. Distribute across sections naturally based on
      how much the script emphasizes each section. Do not pad sections artificially.

    Fillers work in any section. Use them to:
    - Develop an idea within a section with scenes
    - Add pacing between scenes
    - Fill out scene count when a section needs more depth
    - **When an appropriate scene is not available**
    - TextStagger can be used back-to-back to maintain flow—for example, showing features as a single word per scene,
      like “Autonomous”, “Precise”, “Reliable” in consecutive filler scenes.

    ## SCENE SELECTION

    - **Prioritize scenes over fillers**; use scenes when the script can be effectively represented, otherwise use fillers
    - Rephrase text as needed to fit scene requirements while preserving the original meaning
    - You may trim, split, or format text (including punctuation) for clarity, rhythm, or scene constraints.
    - Select scenes not only by section tags but also when they effectively visualize the underlying concept

    ## PLANNING RULES

    ### Structure
    - Each scene must stand alone. No siblings.
    - **Define the props of scenes in SceneElement props in JSON format**

    ### Data
    - Use placeholder values if real data is not provided.
    - For images, you can use https://placehold.co/{width}x{height}.png width/height in px.

    ## PLAN BEFORE EXECUTING

    Before outputting scenes, reason through:

    1. **Section mapping** — map or break the script into the appropriate sections?
       Quote the relevant script portion for each section found.
    2. Then break each video section further into multiple scenes or fillers.
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
    - If a scene seems suitable but the mapping from script data is unclear, ask for clarification or use the closest meaningful subset of the script
    - A scene implies brand presence but no brand name is provided — ask user to add brand identity.
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
    Video Tone: **Playful**

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

    {{ EnterAnimation(input.AnimationCategories) }}

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