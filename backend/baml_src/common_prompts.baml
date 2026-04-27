template_string BrandGuidelines(resume: VideoBranding) #"
    {% if resume.brandGuideLines %}
    ### Brand Details:
    {{ resume.brandGuideLines }}
    {% endif %}

    {% if resume.attachments %}
    ### Attachments:
    {{ resume.attachments }}
    {% endif %}
"#

template_string BackgroundGuidelines(branding: VideoBranding) #"
   {% if branding.brandColors %}
   ### Brand Color Tokens
   {{ branding.brandColors }}

   ### Background Guidelines
   Background is an optional property. If not specified, `<background>` is used by default.

   Rules:
   - Do NOT include a background field for most scenes.
   - Only specify background for high-impact scenes such as:
     - Hook
     - Problem
     - Key reveal
     - Main insight
     - Strong CTA
   - For these scenes, you may use subtle gradients with `<primary>`, `<secondary>``.
   - Ensure strong contrast with text.
   - Do NOT add background for filler, pacing, or transition scenes.
   - Keep usage minimal and consistent across the video.

   {% endif %}
"#
