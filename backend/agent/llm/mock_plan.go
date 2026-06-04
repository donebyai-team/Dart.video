package llm

const mockGeneratePlanV2ResponseJSON = `{
  "videoName": "Jisr ATS Offer Generation",
  "sections": [
    {
      "name": "Intro",
      "slides": [
        {
          "element": {
            "component": "TextLeadStagger",
            "props": "{\"text\":\"Are your recruiters still sending offers manually\"}"
          },
          "background": {
            "solid": "#0F172A"
          }
        }
      ]
    },
    {
      "name": "Problem",
      "slides": [
        {
          "element": {
            "component": "AnimatedText",
            "props": "{\"text\":\"Struggling with manual edits\\nerrors\\ncandidate follow-ups\",\"splitBy\":\"line\"}"
          },
          "background": null
        },
        {
          "element": {
            "component": "Typewriter",
            "props": "{\"text\":\"Dont let offer delays cost you top candidates\"}"
          },
          "background": {
            "solid": "#111827"
          }
        }
      ]
    },
    {
      "name": "Solution",
      "slides": [
        {
          "element": {
            "component": "IntroText",
            "props": "{\"intro_label\":\"Introducing\",\"intro_body\":\"offer generation in Jisr ATS\"}"
          },
          "background": {
            "solid": "PRIMARY"
          }
        },
        {
          "element": {
            "component": "LogoWithBrandName",
            "props": "{\"brandname\":\"Jisr ATS\"}"
          },
          "background": {
            "solid": "PRIMARY"
          }
        }
      ]
    },
    {
      "name": "Product Info",
      "slides": [
        {
          "element": {
            "component": "TextWithMediaScene",
            "props": "{\"textComponent\":\"animatedtext\",\"textComponentProps\":{\"text\":\"Send offer letters in minutes\",\"splitBy\":\"word\"},\"src\":\"https://placehold.co/1280x720.png\"}"
          },
          "background": null
        },
        {
          "element": {
            "component": "TextHookStagger",
            "props": "{\"text\":\"Win top candidates faster\"}"
          },
          "background": {
            "solid": "#0B1020"
          }
        },
        {
          "element": {
            "component": "MultiImageStack",
            "props": "{\"headline\":\"Create professional offer letter templates\",\"cyclingWords\":[\"English\",\"Arabic\"],\"images\":[\"https://placehold.co/1200x800.png\",\"https://placehold.co/1200x800.png\"]}"
          },
          "background": null
        },
        {
          "element": {
            "component": "MediaWithFeatures",
            "props": "{\"src\":\"https://placehold.co/1280x720.png\",\"features\":[{\"icon\":\"user\",\"text\":\"Name\"},{\"icon\":\"briefcase\",\"text\":\"Job tittle\"},{\"icon\":\"wallet\",\"text\":\"Salary\"},{\"icon\":\"plus\",\"text\":\"More\"}]}"
          },
          "background": null
        },
        {
          "element": {
            "component": "PillCarousel",
            "props": "{\"text\":\"Send personalised offer letters\",\"pills\":[{\"icon\":\"users\",\"text\":\"To candidates\"},{\"icon\":\"send\",\"text\":\"Directly\"},{\"icon\":\"layout-dashboard\",\"text\":\"From your ATS\"}]}"
          },
          "background": null
        },
        {
          "element": {
            "component": "AnimatedMedia",
            "props": "{\"text\":\"From headcount planning to sending offers\",\"src\":\"https://placehold.co/1280x720.png\"}"
          },
          "background": null
        },
        {
          "element": {
            "component": "TimelineCardStack",
            "props": "{\"features\":[\"Headcount planning\",\"Candidate review\",\"Send offers\"]}"
          },
          "background": null
        },
        {
          "element": {
            "component": "TextCardStack",
            "props": "{\"texts\":[\"Run you entire hiring process\",\"with Jisr ATS\"]}"
          },
          "background": {
            "solid": "#F8FAFC"
          }
        },
        {
          "element": {
            "component": "TextWithWordCycle",
            "props": "{\"text\":\"All in one\",\"cyclingWords\":[\"HR\",\"Talent\",\"Spend\"]}"
          },
          "background": {
            "solid": "PRIMARY"
          }
        }
      ]
    },
    {
      "name": "Social Proof",
      "slides": [
        {
          "element": {
            "component": "StatCounter",
            "props": "{\"label\":\"businesses trusted\",\"from\":0,\"to\":4700,\"suffix\":\"+\"}"
          },
          "background": {
            "solid": "#0F172A"
          }
        },
        {
          "element": {
            "component": "SocialProofList",
            "props": "{\"proofs\":[\"Trusted by 500K+ employees\",\"10B+ SAR in payroll\",\"Built for modern KSA businesses\"]}"
          },
          "background": null
        }
      ]
    },
    {
      "name": "CTA",
      "slides": [
        {
          "element": {
            "component": "LogoWithCTA",
            "props": "{\"brandName\":\"Jisr\",\"ctaText\":\"Book a demo\"}"
          },
          "background": {
            "solid": "PRIMARY"
          }
        }
      ]
    }
  ]
}`
