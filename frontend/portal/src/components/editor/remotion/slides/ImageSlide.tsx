import { ImageSlideContent, Resolution, Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import React, { useRef, useState } from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { ImagePreview, ImgFadeTemplateProps } from '../components/ImagePreview'
import ImageUploadModal from '../components/ImageUploadModal'
import RetryButton from '../components/RetryButton'
import { SpotlightEffectComponent } from '../effects/SpotlightEffect'
import { ImageContent } from './ImageContent'

interface ImageSlideProps {
  slide: Slide
  width: number
  height: number
  isEditing?: boolean
  onUpdate?: (updates: Partial<Slide>) => void
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
  const props = imageContent.templateConfig as ImgFadeTemplateProps
  const [openImageModal, setOpenImageModal] = useState<boolean>(false)
  const [uploadError, setUploadError] = useState<boolean>(false)
  const [retry, setRetry] = useState<boolean>(false)
  const [uploading, setUploading] = useState<boolean>(false)
  const [editing, setIsEditing] = useState<boolean>(false)
  const imageRef = useRef<HTMLImageElement | null>(null)

  // Create resolution object from dimensions
  const resolution = {
    id: `${width}x${height}`,
    name: 'Custom',
    aspect: `${width}/${height}`,
    width,
    height
  } as Resolution

  return (
    <AbsoluteFill
      style={{
        backgroundColor: slide.backgroundColor || '#0f172a'
      }}
    >
      {/* Render image content (resizable/draggable in edit mode) */}
      {imageContent.meta && (
        <ImageContent
          imageRef={imageRef}
          setIsEditing={setIsEditing}
          image={imageContent.meta}
          resolution={resolution}
          isEditing={editing}
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
          {uploadError && (
            <div className=' absolute left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-10'>
              <RetryButton
                isUploading={uploading}
                onPressRetry={() => {
                  setRetry(true)
                }}
              />
            </div>
          )}
          <ImagePreview
            onClickImage={() => {
              console.log("clicked")
              setIsEditing(true)
            }}
            imageRef={imageRef}
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
          <ImageUploadModal
            setUploading={setUploading}
            setRetry={setRetry}
            retry={retry}
            open={openImageModal}
            onClose={() => setOpenImageModal(false)}
            onUploadError={() => {
              setUploadError(true)
            }}
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
