import { Img, useCurrentFrame, useVideoConfig, interpolate } from 'remotion'
import { ImgFadeTemplateProps } from './types'
import ImageStyler from '../../lib/ImageStyler'
import { useState } from 'react'

interface Props {
  props: ImgFadeTemplateProps
  onChange: (newProps: Partial<ImgFadeTemplateProps>) => void
  onImageChange: () => void
}

const RemoteComponent = ({ props, onChange, onImageChange }: Props) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const [open, setOpen] = useState(false)

  const src = props.src
  const style = props.style || {}

  const animationDuration = fps * 0.8

  const opacity = interpolate(frame, [0, animationDuration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })

  const scale = interpolate(frame, [0, animationDuration], [0.92, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })

  const blur = interpolate(frame, [0, animationDuration], [10, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })

  return (
    <ImageStyler
      onImagechange={onImageChange}
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
      <Img
        draggable={false}
        src={src as string}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          borderRadius: '8px',
          ...style,
          opacity,
          transform: `scale(${scale})`,
          filter: `blur(${blur}px)`
        }}
      ></Img>
    </ImageStyler>
  )
}

export { RemoteComponent }
