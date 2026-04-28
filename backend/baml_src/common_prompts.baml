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

template_string EnterAnimation(animation: AnimationCategories) #"
    {% if animation.entranceAnimations %}
    ### Available Entrance Animations:
    {% for anim in animation.entranceAnimations %}
    - {{ anim }}
    {% endfor %}

    ### Instructions:
    Select the prop entranceAnimation for scenes that support it.

    Guidelines:
    - Do NOT invent new animations. Only use the ones provided above.
    - Do NOT select randomly. Choose based on the scene's intent and tone.
    - Keep consistency: use at most 2–3 animation styles across the entire video.
    - Match animation to purpose:
      - Subtle / professional → zoomIn, slideUp, scaleIn, slideDown
      - Reveal / arrival → zoomIn
      - Sequential content → slideUp, slideLeft, slideRight
      - Playful emphasis → zoomIn, elasticScale
      - Dramatic / high impact → rotateIn
    {% endif %}
"#
