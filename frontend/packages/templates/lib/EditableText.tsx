import React, { useState } from 'react'
import { TextEditor } from './TextEditor'
import TextStyler from './TextStyler'

interface StyleProps {
  [key: string]: any
}

interface EditableTextProps<T extends Record<string, any>> {
  children: React.ReactNode
  props: T
  onChange: (updatedProps: T) => void
  textKey?: keyof T // Which property contains the text
  styleKey?: keyof T // Which property contains the style
}

export const EditableText = <T extends Record<string, any>>({
  props,
  children,
  onChange,
  textKey = 'text' as keyof T,
  styleKey = 'style' as keyof T
}: EditableTextProps<T>) => {
  const style = (props[styleKey] as StyleProps) || {}
  const text = (props[textKey] as string) || ''
  const [open, setOpen] = useState<boolean>(false)
  const [isEditing, setIsEditing] = useState<boolean>(false)

  const onStylesChange = (newStyles: Partial<StyleProps>) => {
    onChange({
      ...props,
      [styleKey]: {
        ...style,
        ...newStyles
      }
    } as T)
  }

  const onChangeText = (newText: string) => {
    onChange({
      ...props,
      [textKey]: newText
    } as T)
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
