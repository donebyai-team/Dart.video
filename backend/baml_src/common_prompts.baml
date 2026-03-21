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

template_string AnimationTypes() #"
    ## Available Animation types
    BRAND = Used for brand-led moments such as logo reveals, identity motion, or signature visual language.
    TEXT = kinetic text, typewriter effects, text animations, word carousels, animated titles, text-heavy content slide with icons, sections etc. Used for strong statements, hooks, quotes, definitions, or key transitions
"#

template_string AllAnimationTypes() #"
    ## Available Animation types
    BRAND = Used for brand-led moments such as logo reveals, identity motion, or signature visual language.
    PRODUCT = Used when showcasing real-world tools or interfaces like Slack, WhatsApp, CRM systems, dashboards, or any software relevant to the narrative. Helps ground the story in practical, relatable workflows
    TEXT = kinetic text, typewriter effects, text animations, word carousels, animated titles, text-heavy content slide with icons, sections etc. Used for strong statements, hooks, quotes, definitions, or key transitions
    VISUAL = Purely visual animated slide (icons, illustrations, motion graphics, abstract visuals). Minimal text
    STATS = Animated numerical highlights such as metrics, percentages, counters, growth numbers, comparisons
    CHART = Data visualization slide such as data visualizations, graphs, histograms, bar charts, pie charts, progress bars, statistics, metrics
    SIMPLE_TEXT= Used when you need to show a short 1–2 line message without heavy animation. Ideal for pauses, emphasis, or clean statements
"#

template_string AskQuestionGuidelines() #"
    ### Question Guidelines
    Questions must:
    * Be asked **only when critical information is missing**
    * Be **max 8-15 words**
    * Include **2–3 options**
    * Always guide visual direction
    * Avoid open-ended questions
"#
