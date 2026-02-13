import { RefObject, useState, useEffect } from 'react'
import { z } from 'zod'
import VideoStyler from './VideoStyler'
import { Video } from 'remotion'

const VidStyle = z.object({
  width: z.union([z.string(), z.number()]).optional(),
  height: z.union([z.string(), z.number()]).optional(),
  borderRadius: z.union([z.string(), z.number()]).optional(),
  objectFit: z.enum(['contain', 'cover', 'fill']).optional()
})

const VidSchema = z.object({
  src: z.string(),
  style: VidStyle
})

export type VidTemplateProps = z.infer<typeof VidSchema>

interface Props {
  videoRef: RefObject<HTMLVideoElement>
  props: VidTemplateProps
  onChange: (newProps: Partial<VidTemplateProps>) => void
  onVideoChange: () => void
  onClickVideo: () => void
}

const VideoPreview = ({ props, onChange, onVideoChange, videoRef, onClickVideo }: Props) => {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null)
  const src = props.src
  const style = props.style || {}
  const ext = src.split('.')[1]
  const thumbnailUrl = src.replace(`.${ext}`, `.${ext}/ik-thumbnail.jpg?tr=so-2'`)

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
    <VideoStyler
      onVideochange={() => {
        onVideoChange()
        setOpen(false)
      }}
      onChange={props => {
        onChange({
          src,
          style: { ...style, ...props }
        })
      }}
      open={open}
      setOpen={setOpen}
      value={style as any}
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
        <Video
          poster={thumbnailUrl}
          ref={videoRef}
          onClick={() => onClickVideo()}
          draggable={false}
          src={src as string}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            ...style,
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out'
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
    </VideoStyler>
  )
}

export { VideoPreview }
