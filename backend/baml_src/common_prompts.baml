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

    - Define exactly one module-level constant: `DEFAULT_DATA`.
    - `DEFAULT_DATA` must be declared before the component.
    - Store all customizable user-facing content in `DEFAULT_DATA`, including:
      - Text
      - Labels
      - Placeholder Images (Except logo or logoIcon)
      - Content-driven icons

    - A content-driven icon is an icon whose meaning comes from the data being displayed and is expected to change when the content changes.
      - Example: a list of categories where each category has its own icon.
      - Example: feature cards with a matching icon for each feature.
      - These icons MUST be stored in `DEFAULT_DATA`.
      - Follow the icon format defined in the `### Icons` section.

    - UI or functional icons are NOT user-facing content and should NOT be stored in `DEFAULT_DATA`.
      - Example: submit button icon.
      - Example: search icon inside an input.
      - Example: close, menu, play, pause, next, previous, chevron, arrow, or navigation icons.
      - These icons should be defined inline in JSX or as internal component logic.

    - Never hardcode user-facing text or content-driven icons in JSX.
    - Any constant other than `DEFAULT_DATA` must be declared inside the component body, after hooks.

    This allows users to customize the animation by modifying only the content (text, images, and content-driven icons) without touching the implementation.
"#

template_string AnimationPrimitives(resume: VideoBranding) #"

    ## Typography
    ### Text

    - Use `Text` for all static text.
    - Never use `span`, `p`, `h1-h6`, or other text elements.
    - Every `Text` component MUST have an `id`.
    - The `id` MUST start with `textasset-`, eg: `textasset-1`.

    {% raw %}
    ```tsx
    <Text
      id="textasset-1"
      text="Hello"
      style={{}}
    />
    ```
    {% endraw %}

    ### parseText()

    - When text spans multiple lines or contains highlighted words, store it as a single `text` string and use `parseText()` to parse it.
    - Use `\n` for explicit line breaks.
    - Wrap highlighted text in `{}`.
    - Do not split text into arrays, words, or line objects in `DEFAULT_DATA`.
    - Do not implement custom text parsing logic.
    - `parseText()` preserves the original whitespace and returns an array of lines. Each line contains one or more text parts. Every part has:
      - `text`: The text to render.
      - `highlight`: Whether the text is highlighted.
    - `parseText()` only parses the text. Decide independently how the parsed output should be laid out or animated based on the desired design.
    - Preserve the original whitespace from `parseText()`. Render adjacent text parts as continuous inline text on the same baseline, without adding spacing (e.g. `gap`, margins, or padding) unless intentionally required by the animation.

    {% raw %}
    ```tsx
    const DEFAULT_DATA = {
      title: "Launch {AI}\nwith {Remotion}",
    };

    const lines = parseText(DEFAULT_DATA.title);

    {lines.map((line, lineIndex) => (
      <div
        key={lineIndex}
        style={{
          display: "flex",
          alignItems: "baseline",
        }}
      >
        {line.map((part, partIndex) => (
          <Text
            key={partIndex}
            id={`textasset-${lineIndex}-${partIndex}`}
            text={part.text}
            style={{
              color: part.highlight
                ? theme.colors.primary
                : theme.colors.foreground,
            }}
          />
        ))}
      </div>
    ))}
    ```
    {% endraw %}

    ## Image, Video, Icon and Logo:
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

    ## Icons

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

    ## Sound Effects (optional)
    - Use **only** these built-in sound effects when they meaningfully enhance the animation:
    - `mouse-click.wav` (clicks)
    - `whoosh.wav` or `whip.wav` (swipe, or reveal). Use them sparingly and synchronize them with the visual event.
    - Limit sound effects to at most 3 per scene, never use it in loops or maps. (MOST CRITICAL)

    ```tsx
    <Sequence from={eventFrame}>
      <Audio src="https://remotion.media/mouse-click.wav" />
    </Sequence>
    ```
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
    theme.logo.url // use it to show bigger logo
    theme.logo.width
    theme.logo.height

    theme.logoIcon.url // use it show the icon of the brand
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

    ### Placeholders

    - Use placeholders only in the format: `https://placehold.co/{width}x{height}.png`
    - Replace `{width}` and `{height}` with numeric dimensions.
    - Do not append colors, text, query parameters, paths, or any additional URL segments.
    - Do not use external image URLs, Unsplash, logos, CDNs, or stock image services.
    {% endif %}
    ```
"#
