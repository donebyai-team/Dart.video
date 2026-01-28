import React, { useState } from 'react'
import { TextEditor } from './TextEditor'
import TextStyler from './TextStyler'
import { TextCascadeTemplateBlock, TextCascadeTemplateStyles } from '../text-animation/text-cascade/types'

interface Props {
  children: React.ReactNode
  props: TextCascadeTemplateBlock
  onChange: (keyName: string, updatedProps: TextCascadeTemplateBlock) => void
}

export const EditableText: React.FC<Props> = ({ props, children, onChange }) => {
  const keyName = props.keyName
  const styles = props.styles
  const text = props.text
  const [open, setOpen] = useState<boolean>(false)
  const [isEditing, setIsEditing] = useState<boolean>(false)

  const onStylesChange = (newProps: Partial<TextCascadeTemplateStyles>) => {
    onChange(keyName, {
      ...props,
      styles: {
        ...props.styles,
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
      <TextEditor
        value={text}
        styles={styles}
        onChange={onChangeText}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
      >
        {children}
      </TextEditor>
    )
  }

  return (
    <TextStyler open={open} setOpen={setOpen} onChange={onStylesChange} value={styles}>
      <div onDoubleClick={() => setIsEditing(true)}>{children}</div>
    </TextStyler>
  )
}
