import React, { useState } from 'react'
import { TextEditor } from './TextEditor'
import TextStyler from './TextStyler'

interface StyleProps {
  [key: string]: any
}

interface BlockProps {
  text: string
  style: StyleProps
  [key: string]: any
}

interface Props {
  children: React.ReactNode
  props: BlockProps
  onChange: (keyName: string, updatedProps: BlockProps) => void
  keyName: string
}

export const EditableText: React.FC<Props> = ({ props, children, onChange, keyName }) => {
  const style = props.style
  const text = props.text
  const [open, setOpen] = useState<boolean>(false)
  const [isEditing, setIsEditing] = useState<boolean>(false)

  const onStylesChange = (newProps: Partial<StyleProps>) => {
    onChange(keyName, {
      ...props,
      style: {
        ...props.style,
        ...newProps
      }
    })
  }

  const onChangeText = (newText: string) => {
    onChange(keyName, {
      ...props,
      text: newText
    })
  }

  if (isEditing) {
    return (
      <TextEditor value={text} style={style} onChange={onChangeText} isEditing={isEditing} setIsEditing={setIsEditing}>
        {children}
      </TextEditor>
    )
  }

  return (
    <TextStyler open={open} setOpen={setOpen} onChange={onStylesChange} value={style}>
      <div onDoubleClick={() => setIsEditing(true)}>{children}</div>
    </TextStyler>
  )
}
