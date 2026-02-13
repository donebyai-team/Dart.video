import { MetaData, Slide, VideoSlideContent } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { Resolution } from '@coasterai/pb/coasterai/core/v1/video_pb'
import { Loader2 } from 'lucide-react'
import React, { useRef, useState } from 'react'
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'
import RetryButton from '../components/RetryButton'
import UploadModal from '../components/UploadModal'
import { VideoPreview } from '../components/VideoPreview'
import CalloutEffectComponent from '../effects/CalloutEffect'
import SpotlightEffectComponent from '../effects/SpotlightEffect'
import { VideoContent } from './VideoContent'

interface VideoSlideProps {
  slide: Slide
  width: number
  height: number
  isEditing?: boolean
  onUpdate?: (updates: Partial<Slide>) => void
}

/**
 * VideoSlide Component (NEW ARCHITECTURE)
 * Renders a video slide with:
 * - Video content (always fills canvas)
 * - Canvas-level spotlight effects
 * - Play button overlay
 */
export const VideoSlide: React.FC<VideoSlideProps> = ({ slide, width, height, onUpdate }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const [openUploadModal, setOpenUploadModal] = useState<boolean>(false)

  const resolution = {
    id: `${width}x${height}`,
    name: 'Custom',
    aspect: `${width}/${height}`,
    width,
    height
  } as Resolution

  // Extract content and effects directly
  const videoContent = slide.content.value as VideoSlideContent

  // Extract case of the slide to opt render blur effect on image/video
  const slideCase = slide.content.case
  const [retry, setRetry] = useState<boolean>(false)
  const [uploadError, setUploadError] = useState<boolean>(false)
  const [uploading, setUploading] = useState<boolean>(false)
  const [editing, setIsEditing] = useState<boolean>(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const props = {
    src: videoContent.src,
    style: videoContent.style ?? {}
  }
  console.log(slide, 'videoContent')
  // Get video source from content (new architecture) or fallback to old structure
  const videoSrc = videoContent?.src

  // check if these effects are available or not
  const isCalloutEffectsAvailable = slide.callouts && slide.callouts.length > 0
  const isSpotlightEffectsAvailable = slide.spotlights && slide.spotlights.length > 0

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#000'
      }}
    >
      {/* Video fills canvas (no resizing/positioning) */}
      <AbsoluteFill>
        {videoContent.meta && (
          <VideoContent
            videoRef={videoRef}
            setIsEditing={setIsEditing}
            video={videoContent.meta}
            resolution={resolution}
            isEditing={editing}
            onUpdate={updates => {
              if (onUpdate && videoContent) {
                onUpdate({
                  content: {
                    case: 'video',
                    value: {
                      ...videoContent,
                      meta: {
                        ...videoContent.meta,
                        ...updates
                      }
                    } as VideoSlideContent
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
            <VideoPreview
              onClickVideo={() => {
                setIsEditing(true)
              }}
              videoRef={videoRef}
              onVideoChange={() => {
                setOpenUploadModal(!openUploadModal)
              }}
              onChange={(newProps: any) => {
                if (onUpdate && newProps) {
                  if (onUpdate && videoContent) {
                    onUpdate({
                      content: {
                        case: 'video',
                        value: {
                          ...videoContent,
                          ...newProps
                        } as VideoSlideContent
                      }
                    } as Slide)
                  }
                }
              }}
              props={props}
            />

            <UploadModal
              setUploading={setUploading}
              setUploadError={setUploadError}
              setRetry={setRetry}
              accept='video/*'
              retry={retry}
              open={openUploadModal}
              onClose={() => setOpenUploadModal(false)}
              onUpload={data => {
                if (onUpdate && data) {
                  if (onUpdate && videoContent) {
                    onUpdate({
                      content: {
                        case: 'video',
                        value: {
                          ...videoContent,
                          src: data.url
                        } as VideoSlideContent
                      }
                    } as Slide)
                  }
                }
              }}
            />
          </VideoContent>
        )}
      </AbsoluteFill>

      {/* Render callout effects at CANVAS level */}
      {isCalloutEffectsAvailable &&
        slide.callouts.map(callout => (
          <AbsoluteFill style={{ pointerEvents: 'none' }}>
            <CalloutEffectComponent
              slideCase={slideCase as string}
              key={callout.id}
              callout={callout}
              frame={frame}
              // zooms helps to determine zoom level of cutout
              fps={fps}
              width={width} // Canvas dimensions
              height={height} // Canvas dimensions
              fullWidth={width}
              src={props.src ?? ''}
              fullHeight={height}
              borderColor={callout.color}
              slideDuration={slide.duration}
              meta={videoContent.meta as MetaData}
              style={{
                borderRadius: props.style.borderRadius as number,
                objectFit: props.style.objectFit as 'cover' | 'fill' | 'contain'
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
              slideCase={slideCase as string}
              frame={frame}
              fps={fps}
              width={width} // Canvas dimensions
              height={height} // Canvas dimensions
              fullWidth={width}
              src={props.src ?? ''}
              fullHeight={height}
              slideDuration={slide.duration}
              meta={videoContent.meta as MetaData}
              style={{
                borderRadius: props.style.borderRadius as number,
                objectFit: props.style.objectFit as 'cover' | 'fill' | 'contain'
              }}
            />
          </AbsoluteFill>
        ))}
    </AbsoluteFill>
  )
}
