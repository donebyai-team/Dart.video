import { MediaSlideContent, MediaType, MetaData, Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { Loader2 } from 'lucide-react'
import React, { RefObject, useRef, useState } from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import { ImagePreview } from '../components/ImagePreview'
import RetryButton from '../components/RetryButton'
import UploadModal from '../components/UploadModal'
import { VideoPreview } from '../components/VideoPreview'
import CalloutEffectComponent from '../effects/CalloutEffect'
import SpotlightEffectComponent from '../effects/SpotlightEffect'
import { MediaContainer } from '../components/MediaContainer'

interface MediaSlideProps {
  slide: Slide
  width: number
  height: number
  isEditing?: boolean
  onUpdate?: (updates: Partial<Slide>) => void
}

export const MediaSlide: React.FC<MediaSlideProps> = ({ slide, width, height, onUpdate }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const [openUploadModal, setOpenUploadModal] = useState<boolean>(false)

  // Extract content and effects directly
  const background = slide.backgroundColor
  const mediaContent = slide.content.value as MediaSlideContent

  const [retry, setRetry] = useState<boolean>(false)
  const [uploadError, setUploadError] = useState<boolean>(false)
  const [uploading, setUploading] = useState<boolean>(false)
  const [editing, setIsEditing] = useState<boolean>(false)
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null)
  const [mediaType, setMediaType] = useState<MediaType>(mediaContent.mediaType);

  // check if these effects are available or not
  const isCalloutEffectsAvailable = slide.callouts && slide.callouts.length > 0
  const isSpotlightEffectsAvailable = slide.spotlights && slide.spotlights.length > 0

  return (
    <AbsoluteFill
      style={{
        backgroundColor: background,
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      {/* Video fills canvas (no resizing/positioning) */}
      <AbsoluteFill>
        {mediaContent.meta && (
          <MediaContainer
            mediaRef={mediaRef}
            setIsEditing={setIsEditing}
            media={mediaContent.meta}
            width={width}
            height={height}
            isEditing={editing}
            onUpdate={updates => {
              if (onUpdate && mediaContent) {
                onUpdate({
                  ...slide,
                  content: {
                    case: 'media',
                    value: {
                      ...mediaContent,
                      meta: {
                        ...mediaContent.meta,
                        ...updates
                      }
                    } as MediaSlideContent
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
            {uploading && (
              <div className=' absolute left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] z-10'>
                <Loader2 className=' w-32 h-32 text-white animate-spin' />
              </div>
            )}

            {mediaType == MediaType.IMAGE ? (
              <ImagePreview
                onClickImage={() => {
                  setIsEditing(true)
                }}
                mediaRef={mediaRef as RefObject<HTMLImageElement>}
                onImageChange={() => {
                  setOpenUploadModal(!openUploadModal)
                }}
                onChange={(newProps: any) => {
                  if (onUpdate && newProps) {
                    if (onUpdate && mediaContent) {
                      onUpdate({
                        ...slide,
                        content: {
                          case: 'media',
                          value: {
                            ...mediaContent,
                            ...newProps
                          } as MediaSlideContent
                        }
                      } as Slide)
                    }
                  }
                }}
                props={mediaContent}
              />
            ) : (
              <VideoPreview
                onClickVideo={() => {
                  setIsEditing(true)
                }}
                mediaRef={mediaRef as RefObject<HTMLVideoElement>}
                onVideoChange={() => {
                  setOpenUploadModal(!openUploadModal)
                }}
                onChange={(newProps: any) => {
                  if (onUpdate && newProps) {
                    if (onUpdate && mediaContent) {
                      onUpdate({
                        ...slide,
                        content: {
                          case: 'media',
                          value: {
                            ...mediaContent,
                            ...newProps
                          } as MediaSlideContent
                        }
                      } as Slide)
                    }
                  }
                }}
                props={mediaContent}
              />
            )}

            <UploadModal
              setUploading={setUploading}
              setUploadError={setUploadError}
              setRetry={setRetry}
              accept={'image/*, video/*'}
              retry={retry}
              open={openUploadModal}
              onClose={() => setOpenUploadModal(false)}
              onUpload={data => {
                if (onUpdate && data) {
                  const updatedMediaType = data.mimeType === 'image' ? MediaType.IMAGE : MediaType.VIDEO;
                  setMediaType(updatedMediaType)
                  if (onUpdate && mediaContent) {
                    onUpdate({
                      ...slide,
                      duration: data.duration ? data.duration : slide.duration,
                      content: {
                        case: 'media',
                        value: {
                          ...mediaContent,
                          uploadedMedia: data,
                          mediaType: updatedMediaType,
                          src: data.url
                        } as MediaSlideContent
                      }
                    } as Slide)
                  }
                }
              }}
            />
          </MediaContainer>
        )}
      </AbsoluteFill>

      {/* Render callout effects at CANVAS level */}
      {isCalloutEffectsAvailable &&
        slide.callouts.map(callout => (
          <AbsoluteFill style={{ pointerEvents: 'none' }}>
            <CalloutEffectComponent
              isImage={isImage}
              key={callout.id}
              callout={callout}
              frame={frame}
              // zooms helps to determine zoom level of cutout
              fps={fps}
              width={width} // Canvas dimensions
              height={height} // Canvas dimensions
              fullWidth={width}
              src={mediaContent.src ?? ''}
              fullHeight={height}
              borderColor={callout.color}
              slideDuration={slide.duration}
              meta={mediaContent.meta as MetaData}
              style={{
                borderRadius: mediaContent.style?.borderRadius as number,
                objectFit: mediaContent.style?.objectFit as 'cover' | 'fill' | 'contain'
              }}
            />
          </AbsoluteFill>
        ))}

      {/* Render spotlight effects at CANVAS level */}
      {isSpotlightEffectsAvailable &&
        slide.spotlights.map(spotlight => (
          <AbsoluteFill style={{ pointerEvents: 'none' }}>
            <SpotlightEffectComponent
              key={spotlight.id}
              spotlight={spotlight}
              isImage={isImage}
              frame={frame}
              fps={fps}
              width={width} // Canvas dimensions
              height={height} // Canvas dimensions
              fullWidth={width}
              src={mediaContent.src ?? ''}
              fullHeight={height}
              slideDuration={slide.duration}
              meta={mediaContent.meta as MetaData}
              style={{
                borderRadius: mediaContent.style?.borderRadius as number,
                objectFit: mediaContent.style?.objectFit as 'cover' | 'fill' | 'contain'
              }}
            />
          </AbsoluteFill>
        ))}
    </AbsoluteFill>
  )
}
