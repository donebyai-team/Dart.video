import React from 'react'
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from 'remotion'
import { SpotlightEffectComponent } from '../effects/SpotlightEffect'
import { ImageContent } from './ImageContent'
import { Slide, ImageSlideContent, SpotlightEffect, Resolution } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { templateRegistry } from '../../../../../../packages/template-registery'
import { useEffect } from 'react'
import ImageUploadModal from '../components/ImageUploadModal'
import { useState } from 'react'

interface ImageSlideProps {
  slide: Slide
  width: number
  height: number
  isEditing?: boolean
  onUpdate?: (updates: Partial<Slide>) => void
}

type TemplateModule = {
  RemoteComponent: React.ComponentType<any>
}
/**
 * ImageSlide Component (NEW ARCHITECTURE)
 * Renders an image slide with:
 * - Resizable/movable image content
 * - Canvas-level spotlight effects
 * - Separate from annotations (handled by CanvasOverlay)
 */
export const ImageSlide: React.FC<ImageSlideProps> = ({ slide, width, height, isEditing = false, onUpdate }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // Extract content and effects directly
  const imageContent = slide.content.value as ImageSlideContent
  const templateId = imageContent.templateId
  const props = imageContent.templateConfig
  const [RemoteComponent, setRemoteComponent] = React.useState<TemplateModule | null>(null)
  const [openImageModal, setOpenImageModal] = useState<boolean>(false)

  // Create resolution object from dimensions
  const resolution = {
    id: `${width}x${height}`,
    name: 'Custom',
    aspect: `${width}/${height}`,
    width,
    height
  } as Resolution

  useEffect(() => {
    ;(async () => {
      const loader = templateRegistry[templateId as keyof typeof templateRegistry]
      console.log(loader, 'loadr')
      if (!loader) return

      const mod = await loader()
      setRemoteComponent(mod as TemplateModule)
    })()
  }, [templateId])

  return (
    <AbsoluteFill
      style={{
        backgroundColor: slide.backgroundColor || '#0f172a'
      }}
    >
      {/* Render image content (resizable/draggable in edit mode) */}
      {imageContent.meta && (
        <ImageContent
          image={imageContent.meta}
          resolution={resolution}
          isEditing={isEditing}
          onUpdate={updates => {
            if (onUpdate && imageContent) {
              onUpdate({
                content: {
                  case: 'image',
                  value: {
                    ...imageContent,
                    meta: {
                      ...imageContent.meta,
                      ...updates
                    }
                  } as ImageSlideContent
                }
              } as Slide)
            }
          }}
        >
          {RemoteComponent && (
            <RemoteComponent.RemoteComponent
              onImageChange={() => {
                setOpenImageModal(!openImageModal)
              }}
              onChange={(newProps: any) => {
                if (onUpdate && newProps) {
                  if (onUpdate && imageContent) {
                    onUpdate({
                      content: {
                        case: 'image',
                        value: {
                          ...imageContent,
                          templateConfig: {
                            ...imageContent.templateConfig,
                            ...newProps
                          }
                        } as ImageSlideContent
                      }
                    } as Slide)
                  }
                }
              }}
              props={props}
            />
          )}

          <ImageUploadModal
            open={openImageModal}
            onClose={() => setOpenImageModal(false)}
            onUploadImage={url => {
              if (onUpdate && url) {
                if (onUpdate && imageContent) {
                  onUpdate({
                    content: {
                      case: 'image',
                      value: {
                        ...imageContent,
                        templateConfig: {
                          ...imageContent.templateConfig,
                          src: url
                        }
                      } as ImageSlideContent
                    }
                  } as Slide)
                }
              }
            }}
          />
        </ImageContent>
      )}

      {/* Render spotlight effects at CANVAS level */}
      {slide.spotlights.map(spotlight => (
        <SpotlightEffectComponent
          key={spotlight.id}
          spotlight={spotlight}
          frame={frame}
          fps={fps}
          width={width} // Canvas dimensions
          height={height} // Canvas dimensions
          fullWidth={width}
          fullHeight={height}
          slideDuration={slide.duration}
        />
      ))}
    </AbsoluteFill>
  )
}

export default ImageSlide
