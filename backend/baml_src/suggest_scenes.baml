class SuggestScenesRequest {
  VideoBranding VideoBranding
  ComponentList string
  before string
  current string
  after string
}

class SuggestScenesResponse {
  scenes Scene[]
}


function SuggestScenes(input: SuggestScenesRequest) -> SuggestScenesResponse {
  client CustomOpenAI5WithLowThinkingSummary

  prompt #"
    You are an expert cinematic video editor.

    Your task is to suggest alternative scenes for the current scene.

    You are given:
    - the current scene
    - optionally the previous scene
    - optionally the next scene
    - a list of available components
    ---

    ## AVAILABLE COMPONENTS

    {{ input.ComponentList }}

    ---

    ## RULES

    ### Scene Structure
    Each scene MUST follow this exact structure:

    ```json
    {
      "element": {
        "component": "ComponentName",
        "props": "{...json string...}"
      }
    }
    ```

    ### Props Rules
    - `props` MUST be a valid JSON string
    - Only use components from the available component list

    ### Image Rules
    For placeholder images use:
    https://placehold.co/{width}x{height}.png

    ### Output Rules
    - Primarily use the text, media assets, and data already present in the CURRENT scene props(eg. text, words, src etc)
    - If some data is missing, you may derive or infer it using the previous or next scenes
    - NEVER copy text directly from the previous or next scenes, previous and next scenes are only for contextual understanding
    - Generate 3-5 scene suggestions
    - DO NOT return duplicate component irrespective of props.

    ---

    ## EXAMPLE

    [
      {
        "element": {
          "component": "AnimatedNumber",
          "props": "{\"startText\":\"Solving\",\"endText\":\"incidents\",\"from\":0,\"to\":100}"
        }
      },
      {
        "element": {
          "component": "AnimatedImage",
          "props": "{\"src\":\"@generated/ectplz/0.png\"}"
        }
      }
    ]

    ---

    {{ BrandGuidelines(input.VideoBranding) }}

    ## INPUT

    ### Current Scene
    {{ input.current }}

    {% if input.before %}
    ### Previous Scene
    {{ input.before }}
    {% endif %}

    {% if input.after %}
    ### Next Scene
    {{ input.after }}
    {% endif %}

    ---

    {{ ctx.output_format }}
  "#
}
