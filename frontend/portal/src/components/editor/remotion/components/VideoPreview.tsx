import { RefObject, useState } from 'react'
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
  const src = props.src
  const style = props.style || {}

  return (
    <VideoStyler
      onVideochange={() => {
        onVideoChange()

        //Close the styler
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
      <Video
        ref={videoRef}
        onClick={() => onClickVideo()}
        draggable={false}
        src={src as string}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          ...style
        }}
      />
    </VideoStyler>
  )
}

export { VideoPreview }
