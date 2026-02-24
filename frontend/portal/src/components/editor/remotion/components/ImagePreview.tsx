import { MediaSlideContent } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { RefObject, useEffect, useState } from 'react'
import { Img } from 'remotion'
import MediaStyler from './MediaStyler'

const loadedImageSrcCache = new Set<string>()

interface Props {
  mediaRef: RefObject<HTMLImageElement>
  props: MediaSlideContent
  srcOverride?: string
  onChange: (newProps: Partial<MediaSlideContent>) => void
  onImageChange: () => void
  onClickImage: () => void
}

const ImagePreview = ({ props, srcOverride, onChange, onImageChange, mediaRef, onClickImage }: Props) => {
  const [open, setOpen] = useState(false)
  const src = srcOverride ?? props.src
  const [displaySrc, setDisplaySrc] = useState<string | undefined>(src || undefined)
  const style = props.style || {}

  useEffect(() => {
    if (!src) return

    if (loadedImageSrcCache.has(src)) {
      setDisplaySrc(src)
      return
    }

    const img = new window.Image()
    img.src = src
    img.onload = () => {
      loadedImageSrcCache.add(src)
      setDisplaySrc(src)
    }
    img.onerror = () => {
      // Fall back to direct swap if preload fails.
      setDisplaySrc(src)
    }
  }, [src])

  return (
    <MediaStyler
      onMediaChange={() => {
        onImageChange()
        //Close the styler
        setOpen(false)
      }}
      onChange={updatedProps => {
        onChange(updatedProps)
      }}
      open={open}
      setOpen={setOpen}
      value={props}
    >
      <Img
        ref={mediaRef}
        onClick={() => onClickImage()}
        draggable={false}
        src={(displaySrc ?? src) as string}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: '8px',
          ...style
        }}
      ></Img>
    </MediaStyler>
  )
}

export { ImagePreview }
