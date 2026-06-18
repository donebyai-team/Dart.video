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


template_string ConstantsRules() #"
    ## CONSTANTS RULES (CRITICAL)

    - All user-facing elements (text, labels, icons, etc.) must be stored in a single DEFAULT_DATA constant.
    - DEFAULT_DATA must be declared at module scope, before the component.
    - There must be exactly one module-level constant: DEFAULT_DATA.
    - ALL other constants MUST be defined INSIDE the component body, AFTER hooks.
    - **Never hardcode user-facing text or icons in JSX.**
    This allows users to easily customize the animation.
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

    - Always render icons using `IconAsset`.
    - If the icon exists in `lucide-react`, import it and pass the icon component to the `Icon` prop.
    - If it does not exist in `lucide-react`, use a string in the format `icon:<icon-name>` (e.g. `icon:google`, `icon:aws`, `icon:google-drive`).
    - Every `IconAsset` must have a unique `id` prefixed with `iconasset-`.
    - The `Icon` prop accepts:
      * A Lucide icon component
      * A Lucide icon name as a string (e.g. `"Heart"`)
      * A custom icon string in the format `icon:<icon-name>`
    - Never use URLs, CDN links, jsDelivr links, or namespaced icon formats such as `simple-icons:*`, `mdi:*`, or `logos:*`.

    Examples:
    {% raw %}
    ```tsx
    import { Heart } from "lucide-react";

    <IconAsset
      id="iconasset-1"
      Icon={Heart} or {"Heart"} or {"icon:aws"}
      size={48}
      style={{}}
    />
    ```
    {% endraw %}
"#

template_string BrandUsageInstructions(resume: VideoBranding) #"
    ### Branding
    Use `useTheme()` hook for all brand colors and assets at runtime.

    {% if resume.brandColors %}
    Available brand information:
    - Brand details: `<brand_details>`
    - Brand tokens/colors: `<brand_tokens>`
    - Brand assets: `<attachments>`

    Use the provided brand details and tokens to understand the visual identity and make design decisions (e.g. contrast, emphasis, hierarchy),
    but always reference colors and assets through `theme` in generated code.
    {% else %}
    Ensuring the animation works across different themes and backgrounds.
    Hardcode only neutral surface/background colors when necessary (e.g. cards, panels), and ensure sufficient contrast and visibility for all elements.
    {% endif %}

    ```tsx
    const theme = useTheme();

    // Colors
    theme.colors.foreground // Primary text
    theme.colors.primary    // Primary accent/highlight
    theme.colors.secondary  // Secondary accent

    // Assets
    theme.logo.url
    theme.logo.width
    theme.logo.height

    theme.logoIcon.url
    theme.logoIcon.width
    theme.logoIcon.height
    ````

    Guidelines:

    * Use `theme.colors.foreground` for text. If contrast is insufficient, choose a readable alternative.
    * Use `theme.colors.primary` for highlights, emphasis, and primary actions.
    * Use `theme.colors.secondary` for supporting accents and secondary UI elements.
    * Use `theme.logo` for full branding and `theme.logoIcon` for compact/icon-only branding.
    * Render logos/icons with `LogoAsset` using `theme.logo.url` or `theme.logoIcon.url`.
    * Only include logos/icons when they meaningfully support the animation.
    * If an image or video is provided, prioritize its color palette over brand colors when appropriate.

    {% if not resume.brandColors %}
    ### Visibility & Contrast

    * When using hardcoded surfaces (cards, panels, badges, overlays, etc.), ensure all content on that surface has sufficient contrast.
    * Do not assume `theme.colors.foreground` will be readable on a hardcoded surface.
    * If a hardcoded surface could conflict with theme colors (e.g. a white card and a light foreground color), use hardcoded foreground/icon colors that remain clearly visible.
    * Always design surfaces and their contents together: if the background is hardcoded, choose content colors that guarantee readability regardless of the active theme.
    {% endif %}
    ```
"#
