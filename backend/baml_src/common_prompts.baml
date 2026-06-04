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
    - Use IconAsset for icons.
    - Use LogoAsset for logos.
    - Use MediaAsset for image or video.
    - For `lucide-react` icons, import the icon component and pass it via the `Icon` prop.
    - Every `IconAsset`, `LogoAsset`, `MediaAsset` component MUST have an `id` which start with `iconasset-`, `logoasset-`, `mediaasset-` respectively.
    - Examples: `iconasset-1`, `logoasset-1`, `mediaasset-1`.

    {% raw %}
    ```tsx
     import { Heart } from "lucide-react";
     <IconAsset id="iconasset-1" Icon={Heart} size={48} style={{}} />
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

    ### Branding
    - Use useTheme() to access brand assets and color tokens.
    - Use LogoAsset to render the logo or icon by passing the corresponding URL to src.
    {% raw %}
    ```tsx
     const theme = useTheme();

     // Brand colors
     theme.colors.foreground // Primary text color
     theme.colors.primary    // Brand/highlight color

     // Brand assets
     theme.logo.url
     theme.logo.width
     theme.logo.height

     theme.logoIcon.url
     theme.logoIcon.width
     theme.logoIcon.height
     ```
    {% endraw %}

    - Prefer theme.colors.foreground for text and theme.colors.primary for accents, highlights, and primary actions.
    - Use theme.logo for the full logo and theme.logoIcon for compact/icon-only branding.
"#
