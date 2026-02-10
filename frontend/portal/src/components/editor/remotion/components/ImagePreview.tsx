import { RefObject, useState } from 'react'
import { Img } from 'remotion'
import { z } from 'zod'
import ImageStyler from './ImageStyler'

const ImgStyle = z.object({
  width: z.union([z.string(), z.number()]).optional(),
  height: z.union([z.string(), z.number()]).optional(),
  borderRadius: z.union([z.string(), z.number()]).optional(),
  objectFit: z.enum(['contain', 'cover', 'fill']).optional()
})

const ImgSchema = z.object({
  src: z.string(),
  style: ImgStyle
})

export type ImgTemplateProps = z.infer<typeof ImgSchema>

interface Props {
  imageRef: RefObject<HTMLImageElement>
  props: ImgTemplateProps
  onChange: (newProps: Partial<ImgTemplateProps>) => void
  onImageChange: () => void
  onClickImage: () => void
}

const ImagePreview = ({ props, onChange, onImageChange, imageRef, onClickImage }: Props) => {
  const [open, setOpen] = useState(false)
  const src = props.src
  const style = props.style || {}

  return (
    <ImageStyler
      onImagechange={() => {
        onImageChange()
        
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
      <Img
        ref={imageRef}
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
    </ImageStyler>
  )
}

export { ImagePreview }
