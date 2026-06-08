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
    - Never hardcode user-facing text or icons in JSX.
    - For rest of the constants you can keep it in other constants
    {% raw %}
    ```tsx
    const DEFAULT_DATA = {
      title: "AI Automation",
      subtitle: "Save 10 hours per week",
      icon: "Bot",
      features: [
        {
          title: "Automation",
          icon: Heart,
        },
        {
          title: "Tool",
          icon: "icon:google-drive",
        },
      ],
    };

    - Timing: const FADE_DURATION = 20;
    - Layout: const PADDING = 40;
    ```
    {% endraw %}
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
    - Brand details are provided in <brand_details>
    - Brand colors are provided in the <brand_tokens>.
    - Brand logo and icon are provided in the <attachments>
    - **Make sure the text_foreground color is always visible on the cards or backgrounds.**
    - Use LogoAsset to render the logo by passing the attachment URL to src.
"#
