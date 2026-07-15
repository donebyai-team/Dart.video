class AnimationCategories {
  entranceAnimations string[]
}

class VideoGenerationPlanRequest {
    Duration int
    Prompt string
    Language string
    Resolution string
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
}

function GeneratePlan(input: VideoGenerationPlanRequest, conversation_history: Message[]) -> GeneratedVideoPlan {
  client SmartBoyGPTSOL
  prompt #"
    You are a cinematic video planning director. Your job is to decompose a script into a sequence of scenes.
    You decide WHAT appears in each scene, HOW it behaves, and WHAT data it shows.
    Use only scenes from the available scene list given below:

    {{ input.ComponentList }}

    ## SCENE DESIGN PRINCIPLES

    - All scenes should feel connected, forming a continuous flow that maintains visual rhythm and tone.
    - NEVER duplicate the same text across scenes
    - Always use Logo scenes to introduce/revel the brand and the supporting text before the scene.
    - Always finish with CTA scene.
    - **Target 12-15 scenes total when possible, but avoid forcing unnecessary scenes and force fitting. Distribute across sections naturally based on
      how much the script emphasizes each section. Do not pad sections artificially.**

    ## SCENE SELECTION

    - Choose scenes based on how well they visually communicate each script segment.
    - Select scenes using visual and usage description and underlying script meaning.
    - *DO NOT repeat scenes.*
    - *Use scenes tagged with TEXT to build up the storyline*
    - *DO NOT force-fit scenes. Use a scene only if it supports the script visually and contextually.*
    - If needed, divide/Split script text into scenes at logical sentence breaks. Do not split mid-sentence.
        **Good**
        * `AI is changing how teams work`
        * `Most workflows are still manual`
        **Bad**
        * `AI is changing`
        * `how teams work`

    ## VOICEOVER
    - Use the input script as the source for scene voiceovers.
    - The voiceover should describe or reinforce what is shown in the scene.
    - It does not need to match the on-screen text verbatim; it should communicate the same idea naturally.
    - Not every scene requires a voiceover. Omit it when silence or visuals alone are more effective.
    - If an idea naturally continues across consecutive scenes.
    - Split the voiceover at a natural pause or sentence boundary(Max 8 words). Avoid cutting a sentence awkwardly just to fit the duration.
    - Use voicover budget provided per scene as reference to split. Shorter voiceover works best

    ## Data
    Define scene props in `SceneElement` using JSON format.
    - Use placeholder values when actual data is unavailable.
    - Remove trailing commas, periods, and special characters from text.
    - Never ever place large text blocks in a single scene. Limit each scene to:
        **Max 2 lines**
        **Max 10 words**
        **50–55 characters maximum**
    - For image or video placeholders, use: `https://placehold.co/{width}x{height}.png` where `width` and `height` are pixel values.
    - Use <attachments> and <user_note> to decide which attachment to use with Asset components, pass the url as per props shape.

    ## Assets
    - Icons format → `icon:<icon-name>` eg. `icon:meta`, `icon:google`, `icon:home`, `icon:phone`
    - Some Icons are also LucidReact component names
    - Images, logos, and media → use placeholders or provided brand assets

    ## Special Scenes and Their Props

    Some scenes use pre-existing, non-responsive templates.

    - Sample prop values are examples only. They define the expected schema, format, and content style—not the literal content.
    - Preserve the props schema exactly. Do not add, remove, or rename fields.
    - Preserve array lengths exactly.
    - Generate replacement values that match the format and style of the sample values.
    - Preserve the visual footprint of the content as closely as possible (e.g. word count, text length, number of lines, item counts). These templates are non-responsive, so significantly longer or shorter content may overflow or break the layout.

    Examples:
    - If a sample array contains 10 items, generate exactly 10 items.
    - If each sample label contains 1–2 words, generate labels of similar length.
    - If a field contains a short headline, generate a short headline—not a paragraph.
    - If a field contains a date, currency, percentage, or statistic, generate a replacement in the same format.

    Text Formatting Conventions:
    If a text prop contains formatting markers, eg. { "title": "Launch {AI}\nWith {Remotion}" }:
    - `\n` represents a line break. Preserve the line-break structure whenever possible.
    - `{text}` marks text that should be highlighted. Replace only the text inside the braces while preserving the `{}` markers.

    ## CRITICAL (Non-negotiable)
    - Strictly follow the props schema and all its constraints.
    - Keep the generated text length close to the original to fit the template props (±10% words/characters).
    - Reuse relevant wording from the script whenever it naturally fits the template, as the same script will be used for the voiceover.
    - Prefer the template's wording if it fits. For example, if the template says "Meet" and the script says "Introducing", keep "Meet" as it fits best.

    Overall, Balance the script and the template props. Prioritize fitting the template's structure and text constraints, while reusing relevant wording from the script whenever it fits naturally.

    ## PLAN BEFORE EXECUTING
    Before outputting scenes, reason through:
      1. Which scenes can communicate the best section and its voiceover.
      2. Sectional tags are just for tagging, if you think a scene can communicate voiceover of an other section, you are free to choose.
      3. Scene selection should not be influenced based on this Voiceover Budget. Usage description is always prioritized
      4. Follow all the instructions above.

      Only begin output after forming a clear plan.
    ---

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

    ### Script:
    {{ input.Prompt }}
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