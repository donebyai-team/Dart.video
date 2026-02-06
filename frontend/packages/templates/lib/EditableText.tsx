import React, { useEffect, useState } from 'react'
import TextStyler from './TextStyler'
import { useLayoutEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { EditableTextData, EditableTextStyle } from './types'

interface EditableTextProps {
  children: React.ReactNode
  props: EditableTextData
  onChange: (updatedProps: EditableTextData) => void
}

export const EditableText: React.FC<EditableTextProps> = ({
  props,
  children,
  onChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  const style = props.style || {}
  const text = props.text || ""
  const [isEditing, setIsEditing] = useState<boolean>(false)

  useLayoutEffect(() => {
    if (!isEditing || !containerRef.current) return
    setRect(containerRef.current.getBoundingClientRect())
  }, [isEditing, text])

  useEffect(() => {
    if (!isEditing) return

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node

      if (
        containerRef.current?.contains(target) ||
        toolbarRef.current?.contains(target) ||
        textareaRef.current?.contains(target)
      ) return

      setIsEditing(false)
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isEditing])



  const onStylesChange = (newStyles: Partial<EditableTextStyle>) => {
    onChange({
      ...props,
      style: {
        ...props.style,
        ...newStyles
      }
    })
  }


  const onChangeText = (newText: string) => {
    onChange({
      ...props,
      text: newText
    })
  }


  return (
    <>
      <div
        ref={containerRef}
        style={{
          display: "inline-flex",
          width: "fit-content",
          height: "fit-content",
          position: "relative",
          cursor: "text"
        }}
        onClick={() => setIsEditing(true)}
      >
        {children}
      </div>

      {isEditing && rect &&
        createPortal(
          <>
            {/* Selection Rectangle */}
            <div
              style={{
                position: "fixed",
                top: rect.top - 4,
                left: rect.left - 4,
                width: rect.width + 8,
                height: rect.height + 8,
                border: "2px solid #6366f1",
                borderRadius: 6,
                pointerEvents: "none",
                zIndex: 9998
              }}
            />

            {/* Toolbar */}
            <TextStyler
              rect={rect}
              value={style}
              onChange={onStylesChange}
              toolbarRef={toolbarRef}
            />


            {/* Overlay Textarea */}
            <textarea
              autoFocus
              value={text}
              ref={textareaRef}
              onChange={e => onChangeText(e.target.value)}
              style={{
                padding: 4,
                position: "fixed",
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                background: "transparent",
                border: "none",
                outline: "none",
                resize: "none",
                zIndex: 9999,
                ...style
              }}
            />
          </>,
          document.body
        )}
    </>
  )

}
