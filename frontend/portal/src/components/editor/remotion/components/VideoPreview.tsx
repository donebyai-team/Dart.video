import { MediaSlideContent } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { RefObject, useEffect, useState } from 'react'
import { Html5Video, OffthreadVideo } from 'remotion'
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
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const src = props.src
  const style = props.style || {}

  // Preload video when src changes
  useEffect(() => {
    if (!src) return

    // Don't reload if it's the same source
    if (src === loadedSrc) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    // Create a temporary video element for preloading
    const preloadVideo = document.createElement('video')
    preloadVideo.preload = 'auto'
    preloadVideo.src = src

    const handleCanPlay = () => {
      setLoadedSrc(src)
      setIsLoading(false)
    }

    const handleError = () => {
      console.error('Video failed to load:', src)
      setIsLoading(false)
    }

    preloadVideo.addEventListener('canplaythrough', handleCanPlay)
    preloadVideo.addEventListener('error', handleError)

    // Start loading
    preloadVideo.load()

    return () => {
      preloadVideo.removeEventListener('canplaythrough', handleCanPlay)
      preloadVideo.removeEventListener('error', handleError)
      preloadVideo.src = '' // Release memory
    }
  }, [src, loadedSrc])

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
        {/* Loading indicator */}
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

        {/* Video with fade-in transition */}
        <Html5Video
          ref={mediaRef}
          playsInline={true}
          playbackRate={1}
          onClick={() => onClickVideo()}
          draggable={false}
          src={src as string}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center',
            ...style,
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out'
          }}
          onError={error => {
            console.log('Video error:', error.message)
            // Return 'fail' to fail the render, or 'fallback' to use <OffthreadVideo>
            return (
              <OffthreadVideo
                playbackRate={1}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center',
                  ...style,
                  opacity: isLoading ? 0 : 1,
                  transition: 'opacity 0.3s ease-in-out'
                }}
                src={src as string}
              />
            )
          }}
        />

        {/* Add spinner animation */}
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
