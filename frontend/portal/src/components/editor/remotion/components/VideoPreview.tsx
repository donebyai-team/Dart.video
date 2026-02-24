import { MediaSlideContent } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { RefObject, useEffect, useState } from 'react'
import { Html5Video } from 'remotion'
import MediaStyler from './MediaStyler'

const loadedVideoSrcCache = new Set<string>()

interface Props {
  mediaRef: RefObject<HTMLVideoElement>
  props: MediaSlideContent
  srcOverride?: string
  onChange: (newProps: Partial<MediaSlideContent>) => void
  onVideoChange: () => void
  onClickVideo: () => void
}

const VideoPreview = ({ props, srcOverride, onChange, onVideoChange, mediaRef, onClickVideo }: Props) => {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [displaySrc, setDisplaySrc] = useState<string | null>(null)
  const src = srcOverride ?? props.src
  const style = props.style || {}

  // Preload video when src changes
  useEffect(() => {
    if (!src) return

    // Avoid reloading when this URL has already been loaded in this session.
    if (loadedVideoSrcCache.has(src) || src === displaySrc) {
      setDisplaySrc(src)
      setIsLoading(false)
      return
    }

    // Keep current media visible while next source preloads.
    if (!displaySrc) {
      setIsLoading(true)
    }

    // Create a temporary video element for preloading
    const preloadVideo = document.createElement('video')
    preloadVideo.preload = 'auto'
    preloadVideo.src = src

    const handleCanPlay = () => {
      loadedVideoSrcCache.add(src)
      setDisplaySrc(src)
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
  }, [src, displaySrc])

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
          delayRenderTimeoutInMilliseconds={120000}
          delayRenderRetries={2}
          onClick={() => onClickVideo()}
          draggable={false}
          src={(displaySrc ?? src) as string}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center',
            ...style,
            opacity: 1
          }}
          onError={error => {
            console.log('Video error:', error.message)
            return 'fallback'
          }}
          onLoadedData={() => {
            const activeSrc = displaySrc ?? src
            if (!activeSrc) return
            loadedVideoSrcCache.add(activeSrc)
            setDisplaySrc(activeSrc)
            setIsLoading(false)
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
