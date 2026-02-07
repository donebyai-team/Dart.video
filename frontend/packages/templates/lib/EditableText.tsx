import React, { useEffect, useState, useLayoutEffect, useRef } from 'react'
import { TextStyler } from './TextStyler'
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
  const editableRef = useRef<HTMLDivElement>(null)
  const toolbarRef = useRef<HTMLDivElement>(null)


  const [isEditing, setIsEditing] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const style = props.style || {}
  const text = props.text || ""

  // ⭐ Centralized rect measurement
  const updateRect = () => {
    if (!containerRef.current) return
    const r = containerRef.current.getBoundingClientRect()
    setRect(r)
  }

  // Measure on edit start and track size changes while typing
  useLayoutEffect(() => {
    if (!isEditing || !containerRef.current) return

    updateRect()

    // Using ResizeObserver to ensure the blue rectangle follows the 
    // text size exactly as it grows/shrinks during typing
    const observer = new ResizeObserver(() => updateRect())
    observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [isEditing])

  // Track scroll/resize to keep the Portal UI pinned to the text
  useEffect(() => {
    if (!isEditing) return
    const handle = () => updateRect()
    window.addEventListener("scroll", handle, true)
    window.addEventListener("resize", handle)
    return () => {
      window.removeEventListener("scroll", handle, true)
      window.removeEventListener("resize", handle)
    }
  }, [isEditing])

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (isEditing && editableRef.current) {
      editableRef.current.focus()
      // Move cursor to end of text
      const range = document.createRange()
      const sel = window.getSelection()
      range.selectNodeContents(editableRef.current)
      range.collapse(false)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }, [isEditing])

  // Handle outside clicks to close editor
  useEffect(() => {
    if (!isEditing) return

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node
      // Don't close if clicking inside the text or the toolbar portal
      if (
        containerRef.current?.contains(target) ||
        toolbarRef.current?.contains(target)
      ) return

      setIsEditing(false)
    }

    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [isEditing])

  // Use a ref to track the caret offset across renders
  const caretOffsetRef = useRef<number>(0)

  // Helper: Get current caret position
  const getCaretCharacterOffsetWithin = (element: HTMLElement) => {
    let caretOffset = 0
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0)
      const preCaretRange = range.cloneRange()
      preCaretRange.selectNodeContents(element)
      preCaretRange.setEnd(range.endContainer, range.endOffset)
      caretOffset = preCaretRange.toString().length
    }
    return caretOffset
  }

  // Helper: Set caret position
  const setCaretPosition = (element: HTMLElement, offset: number) => {
    const range = document.createRange()
    const sel = window.getSelection()

    // Safety check: ensure offset doesn't exceed current text length
    const textLen = element.innerText.length
    const finalOffset = Math.min(offset, textLen)

    if (element.childNodes.length > 0) {
      // Find the text node
      const textNode = element.childNodes[0]
      range.setStart(textNode, finalOffset)
      range.collapse(true)
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  }

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    // 1. Save the current position before the state update triggers a re-render
    caretOffsetRef.current = getCaretCharacterOffsetWithin(el)

    // 2. Update the parent state
    onChange({ ...props, text: el.innerText })
  }

  // Restore caret position after every render where text changed
  useLayoutEffect(() => {
    if (isEditing && editableRef.current) {
      setCaretPosition(editableRef.current, caretOffsetRef.current)
      // Update the blue rectangle size
      const r = containerRef.current?.getBoundingClientRect()
      if (r) setRect(r)
    }
  }, [text, isEditing])

  // Initial focus when entering edit mode
  useEffect(() => {
    if (isEditing && editableRef.current) {
      // Set caret to the end initially
      caretOffsetRef.current = text.length
      editableRef.current.focus()
    }
  }, [isEditing])

  const onStylesChange = (newStyles: Partial<EditableTextStyle>) => {
    onChange({
      ...props,
      style: { ...props.style, ...newStyles }
    })
  }

  return (
    <>
      {/* TEXT CONTAINER */}
      <div
        ref={containerRef}
        onClick={() => setIsEditing(true)}
        style={{
          display: "inline-block", // Allows the div to grow with content
          position: "relative",
          cursor: "text",
          minWidth: "1ch",
          // Matches the height of the font to prevent box jumping
          lineHeight: 1,
          verticalAlign: 'top'
        }}
      >
        {/* The Invisible Layer: 
          We use "pre-wrap" so that it breaks lines and expands the parent 
          div correctly as you type in the editable layer.
        */}
        <div style={{
          opacity: isEditing ? 0 : 1,
          whiteSpace: "pre-wrap",
          pointerEvents: "none",
          ...style
        }}>
          {children}
        </div>

        {/* EDITABLE LAYER: Positioned exactly over the static text */}
        {isEditing && (
          <div
            ref={editableRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            style={{
              position: "absolute",
              inset: 0, // This is shorthand for top:0, left:0, right:0, bottom:0
              width: "100%",
              height: "100%",
              outline: "none",
              whiteSpace: "pre-wrap", // CRITICAL for auto-expansion
              wordBreak: "break-word",
              overflow: "hidden",
              ...style,
              // Overrides for editing mode to ensure clarity
              transform: 'none',
              transition: 'none',
              textShadow: 'none'
            }}
          >
            {text}
          </div>
        )}
      </div>

      {/* PORTAL UI: The Blue Border and Toolbar */}
      {isEditing && rect &&
        createPortal(
          <>
            {/* The Selection Rectangle */}
            <div
              style={{
                position: "fixed",
                top: rect.top - 4,
                left: rect.left - 4,
                width: rect.width + 8,
                height: rect.height + 8,
                border: "1px solid #6366f1",
                borderRadius: 3,
                pointerEvents: "none",
                zIndex: 99999,
                boxSizing: 'border-box'
              }}
            />

            <TextStyler
              rect={rect}
              value={style}
              onChange={onStylesChange}
              toolbarRef={toolbarRef}
            />
          </>,
          document.body
        )}
    </>
  )
}