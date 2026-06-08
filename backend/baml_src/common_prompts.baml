template_string BrandGuidelines(resume: VideoBranding) #"
    {% if resume.brandGuideLines %}
    ### Brand Details:
    {{ resume.brandGuideLines }}
    {% endif %}

    {% if resume.brandColors %}
    ### Brand Colors:
    {{ resume.brandColors }}
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
   - Use `Text` for all visible text. Never use `span`, `p`, `h1-h6`, or other text elements.
   - Every `Text` component MUST have an `id`.
   - The `id` of a `Text` component MUST start with `textasset-`, eg: `textasset-1`.
   - Do not use any other prefix for `Text` component IDs.

    {% raw %}
    ```tsx
    <Text id="textasset-1" text="Hello" style={{}} />
    ```
    {% endraw %}

    ### Image, Video, Icon and Logo:
    - Never use `img`, `video` or other media tags
    - Use LogoAsset for logos.
    - Use MediaAsset for image or video.
    - Every `LogoAsset`, `MediaAsset` component MUST have an `id` which start with `iconasset-`, `logoasset-`, `mediaasset-` respectively.
    - Examples: `iconasset-1`, `logoasset-1`, `mediaasset-1`.

    {% raw %}
    ```tsx
     <LogoAsset
       id="logoasset-1"
       src="https://placehold.co/200x80.png"
       width={200}
       height={80}
       style={{}}
     />
     <MediaAsset
        id="mediaasset-1"
        src="https://placehold.co/200x80.png"
        width={1200}
        height={800}
        style={{}}
      />
     ```
    {% endraw %}

    ### Icons
    - Always use `IconAsset` to render icons.
    - If the icon exists in `lucide-react`, import it and pass the component to the `Icon` prop.
    - If the icon does not exist in `lucide-react`, pass a string identifier using the format `icon:<icon-name>`. eg. `icon:google`
    - Every `IconAsset` must have a unique `id` starting with `iconasset-`.

    Examples:
    {% raw %}
    ```tsx
    import { Heart } from "lucide-react";

    <IconAsset
      id="iconasset-heart"
      Icon={Heart}
      size={48}
    />

    <IconAsset
      id="iconasset-drive"
      Icon="icon:google-drive"
      size={48}
    />
    ```
    {% endraw %}

    ### Branding
    - Brand details: `<brand_details>`
    - Brand colors: `<brand_tokens>`
    - Brand logo and icon: `<attachments>`
    - Use `text_foreground` for text. If it lacks contrast, use a readable alternative.
    - Use `primary`,  for highlights and emphasis.
    - Use `secondary` for supporting accents and secondary UI elements.
    - Render the logo with `LogoAsset` and set `src` to the logo URL from `<attachments>`.
    - **If an Image/Video is attached, always prioritize the colors from the image**
"#
