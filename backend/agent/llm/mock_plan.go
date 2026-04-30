package llm

const mockGeneratePlanV2ResponseJSON = `{
    "videoName": "Cursor Workflow",
    "sections": [
      {
        "name": "Hook",
        "slides": [
          {
            "index": 0,
            "elements": [
              {
                "component": "TextHookStagger",
                "props": "{\"text\":\"Can your AI work with you?\"}",
                "children": []
              }
            ],
            "background": {
              "solid": "PRIMARY"
            }
          },
          {
            "index": 1,
            "elements": [
              {
                "component": "TitleSplit",
                "props": "{\"topText\":\"REAL AI\",\"bottomText\":\"TEAMMATE\"}",
                "children": []
              }
            ],
            "background": null
          }
        ]
      },
      {
        "name": "Problem",
        "slides": [
          {
            "index": 2,
            "elements": [
              {
                "component": "ProblemHeadline",
                "props": "{\"text\":\"Teams are stretched\"}",
                "children": []
              }
            ],
            "background": {
              "solid": "SECONDARY"
            }
          },
          {
            "index": 3,
            "elements": [
              {
                "component": "TextCardStack",
                "props": "{\"texts\":[\"Competition keeps accelerating\",\"Hiring takes too long\",\"Talent is getting expensive\"]}",
                "children": []
              }
            ],
            "background": null
          },
          {
            "index": 4,
            "elements": [
              {
                "component": "ProblemCollage",
                "props": "{\"text\":\"More competition. Less bandwidth.\",\"images\":[\"https://placehold.co/800x400.png?text=Task+Overflow\",\"https://placehold.co/800x400.png?text=Missed+Deadlines\",\"https://placehold.co/800x400.png?text=Too+Many+Tools\",\"https://placehold.co/800x400.png?text=Hiring+Pipeline\",\"https://placehold.co/800x400.png?text=Team+Burnout\"]}",
                "children": []
              }
            ],
            "background": null
          },
          {
            "index": 5,
            "elements": [
              {
                "component": "TextLeadStagger",
                "props": "{\"text\":\"Hiring won't scale\"}",
                "children": []
              }
            ],
            "background": null
          }
        ]
      },
      {
        "name": "Solution",
        "slides": [
          {
            "index": 6,
            "elements": [
              {
                "component": "LogoWithBrandName",
                "props": "{\"text\":\"Cursor\"}",
                "children": []
              }
            ],
            "background": {
              "solid": "PRIMARY"
            }
          },
          {
            "index": 7,
            "elements": [
              {
                "component": "TextHighlight",
                "props": "{\"text\":\"The best way to code with {AI}\"}",
                "children": []
              }
            ],
            "background": null
          },
          {
            "index": 8,
            "elements": [
              {
                "component": "TextStagger",
                "props": "{\"text\":\"Your personal AI assistant for building software\"}",
                "children": []
              }
            ],
            "background": null
          }
        ]
      },
      {
        "name": "Product",
        "slides": [
          {
            "index": 9,
            "elements": [
              {
                "component": "TextWithImageScene",
                "props": "{\"textComponent\":\"textwithwordcycle\",\"textComponentProps\":{\"text\":\"Jump between\",\"cyclingWords\":[\"agent\",\"plan\",\"debug\",\"ask\"]},\"image\":\"https://placehold.co/1280x720.png?text=Cursor+Modes\"}",
                "children": []
              }
            ],
            "background": null
          },
          {
            "index": 10,
            "elements": [
              {
                "component": "PillCarousel",
                "props": "{\"text\":\"Modes for every moment\",\"pills\":[{\"icon\":\"bot\",\"text\":\"Agent\"},{\"icon\":\"map\",\"text\":\"Plan\"},{\"icon\":\"bug\",\"text\":\"Debug\"},{\"icon\":\"message-square\",\"text\":\"Ask\"}]}",
                "children": []
              }
            ],
            "background": null
          },
          {
            "index": 11,
            "elements": [
              {
                "component": "TextWithImageScene",
                "props": "{\"textComponent\":\"textwithwordcycle\",\"textComponentProps\":{\"text\":\"Work with\",\"cyclingWords\":[\"OpenAI\",\"Anthropic\",\"more\"]},\"image\":\"@asset/cavxyj/0.png\"}",
                "children": []
              }
            ],
            "background": null
          },
          {
            "index": 12,
            "elements": [
              {
                "component": "IconShowcase",
                "props": "{\"text\":\"Latest models, your choice\",\"icons\":[\"sparkles\",\"brain\",\"cpu\"]}",
                "children": []
              }
            ],
            "background": null
          },
          {
            "index": 13,
            "elements": [
              {
                "component": "TextWithVideoScene",
                "props": "{\"textComponent\":\"texthighlight\",\"textComponentProps\":{\"text\":\"Add custom {plugins}\"},\"video\":\"@asset/qfbbfw/1.mp4\"}",
                "children": []
              }
            ],
            "background": null
          },
          {
            "index": 14,
            "elements": [
              {
                "component": "TextStagger",
                "props": "{\"text\":\"Connect the tools you already love\"}",
                "children": []
              }
            ],
            "background": null
          }
        ]
      },
      {
        "name": "Proof",
        "slides": [
          {
            "index": 15,
            "elements": [
              {
                "component": "LogoShowcase",
                "props": "{\"text\":\"Used by brands building fast\",\"logos\":[\"https://placehold.co/320x160.png?text=Shopify\",\"https://placehold.co/320x160.png?text=Midjourney\",\"https://placehold.co/320x160.png?text=1000%2B+Startups\"]}",
                "children": []
              }
            ],
            "background": null
          },
          {
            "index": 16,
            "elements": [
              {
                "component": "StatCounter",
                "props": "{\"label\":\"productivity gain\",\"from\":0,\"to\":10,\"suffix\":\"X\"}",
                "children": []
              }
            ],
            "background": null
          }
        ]
      },
      {
        "name": "CTA",
        "slides": [
          {
            "index": 17,
            "elements": [
              {
                "component": "LogoWithCTA",
                "props": "{\"brandName\":\"Cursor\",\"ctaText\":\"Try Cursor free today\"}",
                "children": []
              }
            ],
            "background": {
              "solid": "PRIMARY"
            }
          }
        ]
      }
    ]
  }`
