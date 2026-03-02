import { MediaSlideContent, MediaType, MetaData, Slide, UploadedMedia } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { Loader2 } from 'lucide-react'
import React, { RefObject, useEffect, useRef, useState } from 'react'
import { preloadImage, preloadVideo } from '@remotion/preload'
import { AbsoluteFill, useCurrentFrame, useRemotionEnvironment, useVideoConfig } from 'remotion'
import { ImagePreview } from '../components/ImagePreview'
import RetryButton from '../components/RetryButton'
import UploadModal from '../components/UploadModal'
import { VideoPreview } from '../components/VideoPreview'
import CalloutEffectComponent from '../effects/CalloutEffect'
import SpotlightEffectComponent from '../effects/SpotlightEffect'
import { ZoomEffectComponent } from '../effects/ZoomEffect'
import { MediaContainer } from '../components/MediaContainer'
import { backgroundStyleToCSS } from '../backgroundUtils'


interface MediaSlideProps {
  slide: Slide
  width: number
  height: number
  isEditing?: boolean
  onUpdate?: (updates: Partial<Slide>) => void
  uploadMedia?: (file: File) => Promise<UploadedMedia>
}

export const MediaSlide: React.FC<MediaSlideProps> = ({ slide, width, height, isEditing = false, onUpdate, uploadMedia }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { isRendering } = useRemotionEnvironment()
  const [openUploadModal, setOpenUploadModal] = useState<boolean>(false)

  // Extract content and effects directly
  const background = backgroundStyleToCSS(slide.backgroundStyle);
  const mediaContent = slide.content.value as MediaSlideContent

  const [retry, setRetry] = useState<boolean>(false)
  const [uploadError, setUploadError] = useState<boolean>(false)
  const [uploading, setUploading] = useState<boolean>(false)
  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null)
  const getMediaTypeFromSrc = (src?: string): MediaType | null => {
    if (!src) return null

    const normalized = src.toLowerCase().split('?')[0]
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.avif']
    const videoExtensions = ['.mp4', '.mov', '.webm', '.m4v', '.avi', '.mkv']

    if (imageExtensions.some(ext => normalized.endsWith(ext))) return MediaType.IMAGE
    if (videoExtensions.some(ext => normalized.endsWith(ext))) return MediaType.VIDEO
    return null
  }

  const normalizedStoredMediaType =
    mediaContent.mediaType === MediaType.IMAGE || mediaContent.mediaType === MediaType.VIDEO
      ? mediaContent.mediaType
      : null
  const inferredMediaType = getMediaTypeFromSrc(mediaContent.src)
  const resolvedMediaType = inferredMediaType ?? normalizedStoredMediaType ?? MediaType.IMAGE
  const [mediaType, setMediaType] = useState<MediaType>(resolvedMediaType)
  useEffect(() => {
    if (resolvedMediaType !== mediaType) {
      setMediaType(resolvedMediaType)
    }
  }, [resolvedMediaType, mediaType])

  useEffect(() => {
    const src = mediaContent.src
    if (!src || isRendering) return

    const unpreload =
      resolvedMediaType === MediaType.VIDEO ? preloadVideo(src) : preloadImage(src)
    return () => {
      unpreload()
    }
  }, [mediaContent.src, isRendering, resolvedMediaType])

  const resolvedSrc = mediaContent.src ?? ''

  // check if these effects are available or not
  const isCalloutEffectsAvailable = slide.callouts && slide.callouts.length > 0
  const isSpotlightEffectsAvailable = slide.spotlights && slide.spotlights.length > 0
  const isZoomEffectsAvailable = slide.zooms && slide.zooms.length > 0

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
            media={mediaContent.meta}
            width={width}
            height={height}
            isEditing={isEditing}
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

            {mediaType === MediaType.VIDEO ? (
              <VideoPreview
                onClickVideo={() => {}}
                mediaRef={mediaRef as RefObject<HTMLVideoElement>}
                props={mediaContent}
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
              />
            ) : (
              <ImagePreview
                onClickImage={() => {}}
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
            )}

            <UploadModal
              setUploading={setUploading}
              setUploadError={setUploadError}
              setRetry={setRetry}
              accept={'image/*, video/*'}
              retry={retry}
              open={openUploadModal}
              onClose={() => setOpenUploadModal(false)}
              uploadMedia={uploadMedia ?? (() => Promise.reject(new Error('uploadMedia not provided')))}
              onUpload={data => {
                if (onUpdate && data) {
                  const updatedMediaType = data.mimeType?.startsWith('image')
                    ? MediaType.IMAGE
                    : MediaType.VIDEO
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
              mediaType={mediaType}
              key={callout.id}
              callout={callout}
              frame={frame}
              // zooms helps to determine zoom level of cutout
              fps={fps}
              width={width} // Canvas dimensions
              height={height} // Canvas dimensions
              fullWidth={width}
              src={resolvedSrc}
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
              mediaType={mediaType}
              frame={frame}
              fps={fps}
              width={width} // Canvas dimensions
              height={height} // Canvas dimensions
              fullWidth={width}
              src={resolvedSrc}
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

      {/* Render zoom effects at CANVAS level */}
      {isZoomEffectsAvailable &&
        slide.zooms.map(zoom => (
          <AbsoluteFill key={zoom.id} style={{ pointerEvents: 'none' }}>
            <ZoomEffectComponent
              zoom={zoom}
              mediaType={mediaType}
              frame={frame}
              fps={fps}
              width={width}
              height={height}
              fullWidth={width}
              fullHeight={height}
              src={resolvedSrc}
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
