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
