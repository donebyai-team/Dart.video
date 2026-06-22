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
    Questions map<string, string>
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
    - Always use Logo scenes to introduce/revel the brand and the supporting text before the scene.
    - Always finish with CTA scene.
    - **Target 15–20 scenes total when possible, but avoid forcing unnecessary scenes and force fitting. Distribute across sections naturally based on
      how much the script emphasizes each section. Do not pad sections artificially.**

    Fillers work in any section. Use them to:
    - Develop an idea within a section with scenes
    - Add pacing between scenes
    - Fill out scene count when a section needs more depth
    - **When an appropriate scene is not available**

    ## SCENE SELECTION

    - Choose scenes/fillers based on how well they visually communicate each script segment.
    - Select scenes using both section tags and underlying script meaning.
    - *DO NOT repeat scenes.*
    - *DO NOT force-fit scenes. Use a scene only if it supports the script visually and contextually.*
    - Use `<attachments>` for image or video scenes. Use placeholders only when no attachments are provided.
    - Divide/Split script text into scenes at logical sentence breaks. Do not split mid-sentence.
        **Good**
        * `AI is changing how teams work`
        * `Most workflows are still manual`
        **Bad**
        * `AI is changing`
        * `how teams work`

    ### Data
    Define scene props in `SceneElement` using JSON format.
    - Use placeholder values when actual data is unavailable.
    - Remove trailing commas, periods, and special characters from text.
    - Never ever place large text blocks in a single scene. Limit each scene to:
        **Max 2 lines**
        **Max 10 words**
        **50–55 characters maximum**
    - For image or video placeholders, use: `https://placehold.co/{width}x{height}.png` where `width` and `height` are pixel values.

    ## Special Props:
    - Some props may contain sample values. Treat them as examples that indicate the expected structure, format, and content style.
    - Preserve the schema structure exactly.
    - Preserve array lengths.
    - Match the format of sample values when generating replacements.
    - Preserve content shape whenever possible (e.g. word count, text length etc).

    Examples:
    - If a sample array contains 10 items, generate 10 items.
    - If each sample text contains 1–2 words, generate replacement text with a similar length.
    - If a field contains a short headline, generate a short headline rather than a paragraph.

    ## PLAN BEFORE EXECUTING

    Before outputting scenes, reason through:

    1. **Section mapping** — map or break the script into the appropriate sections?
       Quote the relevant script portion for each section found.
    2. Then break each video section further into multiple scenes or fillers.
    3. **Narrative arc** — does the section order tell a coherent story?
    4. **Hero vs supporting scenes** — which scenes carry the main message vs add pacing?
    5. **Assets** — do any attachments match scene intent?
    6. Use <attachments> and <user_note> to decide which attachment to use with Asset components.
       pass the url as per props shape.

    Only begin output after forming a clear plan.

    ---

    ## ASK QUESTIONS RULES

    Ask before proceeding if:
    - Missing critical sections would weaken the video (e.g., no Hook/CTA): ask whether to add them or proceed as-is.
    - **Script is provided**: ask whether to use it exactly or allow light edits.
    - Script-to-scene mapping is unclear: ask for clarification, or use the closest meaningful script subset.
    - Brand presence is implied but no brand name/identity is provided: ask for brand identity.
    - Attachment is provided but usage is unclear: use **ATTACHMENT_CLARIFICATION**.
    - Scene requires a missing attachment: use **UPLOAD_ATTACHMENT or a placeholder**.
    - A key visual storytelling decision is ambiguous.

    Do not ask about:
    - Props or component internals — the generator handles these.
    - Sections the user clearly and intentionally omitted.

    ## EXAMPLE SCENES
    ```json
    [
      {
        "element":
          {
            "component": "AnimatedNumber",
            "props": "{\"startText\": \"Solving\", \"endText\": \"incidents\", \"from\": 0, \"to\": 100}"
          }
      },
      {
         "element":
          {
            "component": "AnimatedImage",
             "props": "{\"src\": \"@generated/ectplz/0.png\"}"
           }
       }
    ]
    ```

    {{ BrandGuidelines(input.VideoBranding) }}

    {{ EnterAnimation(input.AnimationCategories) }}

    ---

    ## INPUT
    Video FPS: 30 frames/second
    Language: {{ input.Language }}

    ### User provided prompt/script:
    {{ input.Prompt }}

    {%- if input.Questions -%}
    ### Questions answered by the user:
    {% for question in input.Questions -%}
      {%- if input.Questions[question] %}
      Q: {{ question }}
      A: {{ input.Questions[question] }}
      {%- endif %}
    {%- endfor %}
    {%- endif %}

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