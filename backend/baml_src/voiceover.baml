class GenerateVideoNarrationRequest {
  description string
}

class NarrationSegment {
  text string
}

class VideoNarration {
  segments NarrationSegment[]
}

function GenerateVideoNarration(input: GenerateVideoNarrationRequest) -> VideoNarration {
  client SmallBoyFastGPT
  prompt #"
    You are writing a professional voiceover for a product marketing video.

    The video consists of multiple short animated scenes with fixed durations.

    Write ONE continuous narration for the entire video.

    Guidelines:
    - Tell a cohesive story across the entire video.
    - Use the visuals and on-screen text as context, not a script. Assume the audience can already see the visuals.
    - Do not simply read all on-screen text.
    - Read on-screen text verbatim only when it is a product name, tagline, important statistic, key claim, or call to action.
    - Connect ideas naturally across scene boundaries.
    - Match the pace of the visuals so the narration comfortably fits the total video duration.
    - Keep the tone clear, confident, modern, and engaging.
    - Avoid filler, hype, and marketing clichés.
    - Write for speech, not for reading. Use natural sentence structure and punctuation so the narration sounds natural when spoken.
    - Split the narration into logical paragraphs. Each paragraph should represent one coherent idea or thought and should read naturally on its own.
    - Do not split in the middle of a sentence or idea.
    - Return only the requested output format.
    - Prefer explaining why something matters over describing what is visible.

   Avoid:
   - Do not describe obvious on-screen text unless it is important for the narration.
   - Do not read menus, buttons, URLs, file names, or UI labels unless they are essential to understanding the story.

    {{ input.description }}

    --------------------------------------------------
    OUTPUT FORMAT
    --------------------------------------------------

    {{ ctx.output_format }}
  "#
}