class AssetAnalysis {
  description string @description("A one line description of what's in the image")
  tags string[] @description("add 3,4 tags which fits the most eg. dashboard, product-screen etc")
}

function AnalyzeImage(image: image) -> AssetAnalysis {
  client SmallBoyFastGemini
  prompt #"
    Analyze the provided image in detail.

    {{ ctx.output_format }}

    {{ _.role("user") }}
    {{ image }}
  "#
}
