// Default editor configuration - all hardcoded values as JSON
// This configuration drives the entire editor

import type { VideoConfig } from '@/types/editor'
import { MetaData, SlideType, SpotlightEffect, TransitionType } from '@coasterai/pb/coasterai/core/v1/slide_pb'

// Create stable date references
const SAMPLE_CREATED_DATE = '2024-01-01T00:00:00.000Z'
const SAMPLE_UPDATED_DATE = '2024-01-01T00:00:00.000Z'

export const sampleVideoConfig: VideoConfig = {
  // ==========================================
  // Project Metadata
  // ==========================================
  project: {
    id: 'project-1',
    name: 'Product Launch Explainer',
    status: 'draft',
    createdAt: SAMPLE_CREATED_DATE,
    updatedAt: SAMPLE_UPDATED_DATE,
    author: 'John Doe',
    description: 'Explainer video for product launch'
  },
  fps: 30,

  // ==========================================
  // Content - Sections & Slides
  // ==========================================
  sections: [
    {
      $typeName: 'coasterai.core.v1.Section',
      id: 'hook',
      title: 'Hook',
      color: 'bg-screen-hook',
      slides: [
        {
          $typeName: 'coasterai.core.v1.Slide',
          id: 'hook-1',
          type: SlideType.TEXT_ANIMATION,
          transcript: 'Are you tired of losing important files? Your documents deserve better.',
          duration: 2,
          transition: TransitionType.TRANSITION_FADE,
          transitionDuration: 0.3,
          subSlides: [],
          spotlights: [],
          zooms: [],
          content: {
            case: 'animation',
            value: {
              $typeName: 'coasterai.core.v1.AnimationSlideContent',
              templateId: 'textCascade',
              meta: {
                x: 192,
                y: 108,
                width: 1536,
                height: 864
              } as MetaData,
              templateConfig: {
                centerText: {
                  keyName: 'centerText',
                  text: 'I am a center text',
                  styles: {
                    fontSize: 72,
                    color: '#ffffff',
                    lineHeight: 1.5
                  }
                },

                topLeftText: {
                  keyName: 'topLeftText',
                  text: 'I am a top left text',
                  styles: {
                    fontSize: 72,
                    color: '#ffffff',
                    lineHeight: 1.5
                  }
                }
              }
            }
          }
        },
        {
          id: 'hook-2',
          $typeName: 'coasterai.core.v1.Slide',
          type: SlideType.TEXT_ANIMATION,
          transcript: "Introducing DocuFlow, the smarter way to manage your team's knowledge.",
          duration: 2,
          transition: TransitionType.TRANSITION_FADE,
          transitionDuration: 0.3,
          spotlights: [],
          zooms: [],
          subSlides: [],
          content: {
            case: 'animation',
            value: {
              $typeName: 'coasterai.core.v1.AnimationSlideContent',
              templateId: 'text-reveal',
              meta: {
                x: 192,
                y: 108,
                width: 1536,
                height: 864
              } as MetaData,
              templateConfig: {
                text: 'Meet DocuFlow',
                direction: 'up',
                fontSize: 72,
                color: '#ffffff'
              }
            }
          }
        }
      ]
    },
    {
      id: 'solution',
      title: 'Solution',
      color: 'bg-screen-solution',
      $typeName: 'coasterai.core.v1.Section',
      slides: [
        {
          id: 'solution-1',
          $typeName: 'coasterai.core.v1.Slide',
          type: SlideType.TEXT_ANIMATION,
          transcript: 'DocuFlow brings everything together in one powerful platform.',
          duration: 2,
          transition: TransitionType.TRANSITION_FADE,
          transitionDuration: 0.3,
          spotlights: [],
          zooms: [],
          subSlides: [],
          content: {
            case: 'animation',
            value: {
              $typeName: 'coasterai.core.v1.AnimationSlideContent',
              templateId: 'word-by-word',
              meta: {
                x: 192,
                y: 108,
                width: 1536,
                height: 864
              } as MetaData,
              templateConfig: {
                text: 'One platform. All your docs.',
                fontSize: 64,
                color: '#ffffff',
                // Template positioning (80% of 1920x1080, centered)
                x: 192,
                y: 108,
                width: 1536,
                height: 864
              }
            }
          }
        },
        {
          id: 'solution-2',
          $typeName: 'coasterai.core.v1.Slide',
          type: SlideType.IMAGE,
          transcript: 'Organize everything in smart folders that adapt to how your team works.',
          duration: 4, // Extended to 4 seconds to fit multiple spotlights
          transition: TransitionType.TRANSITION_SLIDE_UP,
          transitionDuration: 0.3,
          subSlides: [],
          content: {
            case: 'image',
            value: {
              $typeName: 'coasterai.core.v1.ImageSlideContent',
              src: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=240&fit=crop',
              x: 192, // 10% margin (1920 * 0.1)
              y: 108, // 10% margin (1080 * 0.1)
              width: 1536, // 80% of 1920
              height: 864, // 80% of 1080
              rotation: 0
            }
          },
          spotlights: [
            {
              id: 'spotlight-1',
              x: 400,
              y: 200,
              width: 300,
              height: 250,
              blurAmount: 10,
              borderRadius: 8,
              startTime: 0.5,
              endTime: 1.5
            } as SpotlightEffect,
            {
              id: 'spotlight-2',
              x: 1100,
              y: 600,
              width: 400,
              height: 300,
              blurAmount: 10,
              borderRadius: 8,
              startTime: 2.5,
              endTime: 3.5
            } as SpotlightEffect
          ],
          zooms: []
        }
      ]
    },
    {
      id: 'problem',
      title: 'Problem',
      color: 'bg-screen-problem',
      $typeName: 'coasterai.core.v1.Section',
      slides: [
        {
          id: 'problem-1',
          $typeName: 'coasterai.core.v1.Slide',
          type: SlideType.VISUAL_ANIMATION,
          transcript: 'Teams waste over 5 hours every week just searching for files scattered across different tools.',
          duration: 2.5,
          transition: TransitionType.TRANSITION_SLIDE_LEFT,
          transitionDuration: 0.3,
          spotlights: [],
          zooms: [],
          subSlides: [],
          content: {
            case: 'animation',
            value: {
              $typeName: 'coasterai.core.v1.AnimationSlideContent',
              templateId: 'visual-default',
              templateConfig: {
                // Template positioning (80% of 1920x1080, centered)
                x: 192,
                y: 108,
                width: 1536,
                height: 864
              }
            }
          }
        },
        {
          id: 'problem-2',
          $typeName: 'coasterai.core.v1.Slide',
          type: SlideType.INFOGRAPHIC,
          transcript: 'In fact, 67% of projects get delayed because of lost or misplaced documents.',
          duration: 2.5,
          transition: TransitionType.TRANSITION_FADE,
          transitionDuration: 0.3,
          spotlights: [],
          zooms: [],
          subSlides: [],
          content: {
            case: 'animation',
            value: {
              $typeName: 'coasterai.core.v1.AnimationSlideContent',
              templateId: 'infographic-default',
              templateConfig: {
                // Template positioning (80% of 1920x1080, centered)
                x: 192,
                y: 108,
                width: 1536,
                height: 864
              }
            }
          }
        }
      ]
    },

    {
      id: 'feature1',
      title: 'AI Search',
      color: 'bg-screen-feature',
      $typeName: 'coasterai.core.v1.Section',
      slides: [
        {
          id: 'feature1-1',
          $typeName: 'coasterai.core.v1.Slide',
          type: SlideType.VISUAL_ANIMATION,
          transcript: 'Our AI-powered search finds exactly what you need in seconds.',
          duration: 2.5,
          transition: TransitionType.TRANSITION_FADE,
          spotlights: [],
          zooms: [],
          subSlides: [],
          transitionDuration: 0.3,
          content: {
            case: 'animation',
            value: {
              $typeName: 'coasterai.core.v1.AnimationSlideContent',
              templateId: 'visual-default',
              templateConfig: {
                // Template positioning (80% of 1920x1080, centered)
                x: 192,
                y: 108,
                width: 1536,
                height: 864
              }
            }
          }
        },
        {
          id: 'feature1-2',
          $typeName: 'coasterai.core.v1.Slide',
          type: SlideType.IMAGE,
          transcript: 'Just ask in natural language, like talking to a colleague.',
          duration: 2.5,
          transition: TransitionType.TRANSITION_SLIDE_LEFT,
          spotlights: [],
          zooms: [],
          subSlides: [],
          content: {
            case: 'image',
            value: {
              $typeName: 'coasterai.core.v1.ImageSlideContent',
              src: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=400&h=240&fit=crop',
              x: 192,
              y: 108,
              width: 1536,
              height: 864,
              rotation: 0
            }
          }
        }
        // {
        //   id: "feature1-3",
        //   type: SlideType.STACK,
        //   transcript: "See how our interface makes finding documents effortless across multiple views.",
        //   duration: 5,
        //   transition: TransitionType.FADE,
        //   backgroundColor: "linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)",
        //   content: {
        //     type: "stack",
        //     animationMode: StackAnimationMode.Stack,
        //     items: [
        //       {
        //         id: "feature1-3-item-1",
        //         type: SlideType.IMAGE,
        //         transcript: "Dashboard view showing all documents",
        //         duration: 2.5,
        //         backgroundColor: "linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)",
        //         content: {
        //           type: "image",
        //           src: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=800&h=600&fit=crop",
        //           x: 192,
        //           y: 108,
        //           width: 1536,
        //           height: 864,
        //           rotation: 0,
        //         },
        //         effects: [],
        //         annotations: [],
        //       },
        //       {
        //         id: "feature1-3-item-2",
        //         type: SlideType.IMAGE,
        //         transcript: "Search results with AI-powered suggestions",
        //         duration: 2.5,
        //         backgroundColor: "linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)",
        //         content: {
        //           type: "image",
        //           src: "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800&h=600&fit=crop",
        //           x: 192,
        //           y: 108,
        //           width: 1536,
        //           height: 864,
        //           rotation: 0,
        //         },
        //         effects: [],
        //         annotations: [],
        //       },
        //       {
        //         id: "feature1-3-item-3",
        //         type: SlideType.IMAGE,
        //         transcript: "Collaboration features in action",
        //         duration: 2.5,
        //         backgroundColor: "linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%)",
        //         content: {
        //           type: "image",
        //           src: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=600&fit=crop",
        //           x: 192,
        //           y: 108,
        //           width: 1536,
        //           height: 864,
        //           rotation: 0,
        //         },
        //         effects: [],
        //         annotations: [],
        //       }
        //     ] as Slide[]
        //   }
        // } as Slide,
      ]
    },
    {
      id: 'feature2',
      title: 'Collaboration',
      color: 'bg-screen-feature',
      $typeName: 'coasterai.core.v1.Section',
      slides: [
        {
          id: 'feature2-1',
          type: SlideType.TEXT_ANIMATION,
          $typeName: 'coasterai.core.v1.Slide',
          transcript: 'Collaboration has never been easier.',
          duration: 2,
          transition: TransitionType.TRANSITION_FADE,
          subSlides: [],
          spotlights: [],
          zooms: [],
          transitionDuration: 0.3,
          content: {
            case: 'animation',
            value: {
              $typeName: 'coasterai.core.v1.AnimationSlideContent',
              templateId: 'letter-cascade',
              meta: {
                x: 192,
                y: 108,
                width: 1536,
                height: 864
              } as MetaData,
              templateConfig: {
                text: 'Work together. Seamlessly.',
                fontSize: 72,
                color: '#ffffff',
                // Template positioning (80% of 1920x1080, centered)
                x: 192,
                y: 108,
                width: 1536,
                height: 864
              }
            }
          }
        },
        {
          id: 'feature2-2',
          type: SlideType.IMAGE,
          $typeName: 'coasterai.core.v1.Slide',
          transcript: 'Edit together in real-time, leave comments, and track every change.',
          duration: 2.5,
          transition: TransitionType.TRANSITION_FADE,
          subSlides: [],
          spotlights: [],
          zooms: [],
          transitionDuration: 0.3,
          content: {
            case: 'image',
            value: {
              $typeName: 'coasterai.core.v1.ImageSlideContent',
              src: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=240&fit=crop',
              x: 192,
              y: 108,
              width: 1536,
              height: 864,
              rotation: 0
            }
          }
        }
      ]
    },
    {
      id: 'proof',
      title: 'Social Proof',
      color: 'bg-screen-proof',
      $typeName: 'coasterai.core.v1.Section',
      slides: [
        {
          id: 'proof-1',
          $typeName: 'coasterai.core.v1.Slide',
          type: SlideType.INFOGRAPHIC,
          transcript: 'Over ten thousand teams trust DocuFlow, including Stripe, Notion, and Linear.',
          duration: 3,
          transition: TransitionType.TRANSITION_SLIDE_UP,
          spotlights: [],
          zooms: [],
          subSlides: [],
          transitionDuration: 0.3,
          content: {
            case: 'animation',
            value: {
              $typeName: 'coasterai.core.v1.AnimationSlideContent',
              templateId: 'infographic-default',
              templateConfig: {}
            }
          }
        }
      ]
    },
    {
      id: 'cta',
      title: 'CTA',
      color: 'bg-screen-cta',
      $typeName: 'coasterai.core.v1.Section',
      slides: [
        {
          id: 'cta-1',
          type: SlideType.TEXT_ANIMATION,
          $typeName: 'coasterai.core.v1.Slide',
          transcript: 'Ready to transform how your team works?',
          duration: 2,
          transition: TransitionType.TRANSITION_SLIDE_UP,
          spotlights: [],
          zooms: [],
          subSlides: [],
          transitionDuration: 0.3,
          content: {
            case: 'animation',
            value: {
              $typeName: 'coasterai.core.v1.AnimationSlideContent',
              templateId: 'scale-bounce',
              meta: {
                x: 192,
                y: 108,
                width: 1536,
                height: 864
              } as MetaData,
              templateConfig: {
                text: 'Start free today',
                fontSize: 96,
                color: '#ffffff'
              }
            }
          }
        },
        {
          id: 'cta-2',
          $typeName: 'coasterai.core.v1.Slide',
          type: SlideType.VISUAL_ANIMATION,
          transcript: 'Try DocuFlow free for 14 days. No credit card required.',
          duration: 2.5,
          transition: TransitionType.TRANSITION_NONE,
          spotlights: [],
          zooms: [],
          subSlides: [],
          content: {
            case: 'animation',
            value: {
              $typeName: 'coasterai.core.v1.AnimationSlideContent',
              templateId: 'visual-default',
              templateConfig: {}
            }
          }
        }
      ]
    }
  ],

  // ==========================================
  // Section Configuration
  // ==========================================
  sectionConfig: {
    colors: [
      { id: 'hook', name: 'Hook', className: 'bg-screen-hook' },
      { id: 'problem', name: 'Problem', className: 'bg-screen-problem' },
      { id: 'solution', name: 'Solution', className: 'bg-screen-solution' },
      { id: 'feature', name: 'Feature', className: 'bg-screen-feature' },
      { id: 'proof', name: 'Social Proof', className: 'bg-screen-proof' },
      { id: 'cta', name: 'CTA', className: 'bg-screen-cta' },
      { id: 'primary', name: 'Primary', className: 'bg-primary' }
    ],
    defaultColor: 'bg-primary',
    defaultTitle: 'New Section'
  }
}

// Helper to create a new empty project config
export const createEmptyProjectConfig = (name: string): VideoConfig => {
  const now = new Date().toISOString()
  return {
    ...sampleVideoConfig,
    project: {
      ...sampleVideoConfig.project,
      id: `project-${Date.now()}`,
      name,
      createdAt: now,
      updatedAt: now
    },
    sections: []
  }
}

export default sampleVideoConfig
