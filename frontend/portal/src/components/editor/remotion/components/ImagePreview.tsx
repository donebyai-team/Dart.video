import { MediaSlideContent } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { RefObject, useState } from 'react'
import { Img } from 'remotion'
import MediaStyler from './MediaStyler'

interface Props {
  mediaRef: RefObject<HTMLImageElement>
  props: MediaSlideContent
  onChange: (newProps: Partial<MediaSlideContent>) => void
  onImageChange: () => void
  onClickImage: () => void
}

const ImagePreview = ({ props, onChange, onImageChange, mediaRef, onClickImage }: Props) => {
  const [open, setOpen] = useState(false)
  const src = props.src
  const style = props.style || {}

  return (
    <MediaStyler
      isImage={true}
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
        src={src as string}
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
