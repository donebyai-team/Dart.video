import { MediaSlideContent } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { RefObject, useEffect, useState } from 'react'
import { Html5Video, OffthreadVideo, getRemotionEnvironment } from 'remotion'
import MediaStyler from './MediaStyler'

interface Props {
  mediaRef: RefObject<HTMLVideoElement>
  props: MediaSlideContent
  onChange: (newProps: Partial<MediaSlideContent>) => void
  onVideoChange: () => void
  onClickVideo: () => void
}

const VideoPreview = ({ props, onChange, onVideoChange, mediaRef, onClickVideo }: Props) => {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const src = props.src
  const style = props.style || {}
  const { isRendering } = getRemotionEnvironment()

  useEffect(() => {
    if (isRendering) return
    const video = mediaRef.current
    if (!video) return
    if (video.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
      setIsLoading(false)
    } else {
      setIsLoading(true)
    }
  }, [src, mediaRef, isRendering])

  const handleReady = () => setIsLoading(false)

  const videoStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const,
    objectPosition: 'center',
    transition: 'opacity 0.3s ease-in-out',
    ...style,
  }

  return (
    <MediaStyler
      onMediaChange={() => {
        onVideoChange()
        setOpen(false)
      }}
      onChange={updatedProps => {
        onChange(updatedProps)
      }}
      open={open}
      setOpen={setOpen}
      value={props}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* Rendering path: OffthreadVideo handles frame extraction via ffmpeg, no timeout issues */}
        {isRendering ? (
          <OffthreadVideo
            src={src as string}
            style={videoStyle}
          />
        ) : (
          <>
            {/* Preview path: Html5Video with loading indicator */}
            {isLoading && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#000',
                  zIndex: 10
                }}
              >
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '3px solid #fff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}
                />
              </div>
            )}

            <Html5Video
              ref={mediaRef}
              playsInline={true}
              playbackRate={1}
              onClick={() => onClickVideo()}
              draggable={false}
              src={src as string}
              style={{
                ...videoStyle,
                opacity: isLoading ? 0 : 1,
                transition: 'opacity 0.3s ease-in-out'
              }}
              onLoadedData={handleReady}
              onCanPlay={handleReady}
              onError={error => {
                console.log('Video error:', error.message)
                return 'fallback'
              }}
            />
          </>
        )}

        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </MediaStyler>
  )
}

export { VideoPreview }