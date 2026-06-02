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
   ### Background Guidelines
   Background is an optional property. Most scenes don't need it.
   Only use available color tokens unless user has asked for it.

   Rules:
   - Only specify background for high-impact scenes or when changing sections/topic:
     - Hook
     - Key reveal
     - Main insight
   - Do NOT add background for filler, pacing, or transition scenes.
   - Do NOT apply back to back scenes.
   - Keep usage minimal and consistent across the video.
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


template_string AnimationPrimitives() #"

    ### Typography:
    - Use `Text` for all visible text. Do not use raw `span`, `p`, or `h*`.
    - Always add a unique id to each element, **id naming always starts with component name eg. id=text-1**
    - Prefer variant over manual font styling unless no valid variant found

    {% raw %}
    ```tsx
    <Text id="text-1" text="Hello" variant="heading" style={{}} />
    ```
    {% endraw %}

    Available Variants:
    caption:    { fontSize: 'xs',  fontWeight: 'normal',    lineHeight: 1.4 },
    label:      { fontSize: 'sm',  fontWeight: 'medium',    lineHeight: 1.4 },
    body:       { fontSize: 'base', fontWeight: 'normal',   lineHeight: 1.6 },
    subheading: { fontSize: 'lg',  fontWeight: 'medium',    lineHeight: 1.4 },
    heading:    { fontSize: '2xl', fontWeight: 'bold',      lineHeight: 1.1 },
    headingLg:  { fontSize: '3xl', fontWeight: 'bold',      lineHeight: 1.1 },
    display:    { fontSize: '4xl', fontWeight: 'extrabold', lineHeight: 1.02 },
    displayLg:  { fontSize: '5xl', fontWeight: 'extrabold', lineHeight: 1.04 },
    displayXl:  { fontSize: '6xl', fontWeight: 'extrabold', lineHeight: 1.06 },
    display2xl: { fontSize: '7xl', fontWeight: 'extrabold', lineHeight: 1.08 },
    display3xl: { fontSize: '8xl', fontWeight: 'extrabold', lineHeight: 1.10 },

"#
