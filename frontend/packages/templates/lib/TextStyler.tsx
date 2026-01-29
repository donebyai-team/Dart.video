import React, { SetStateAction, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FONT_FAMILIES, FONT_WEIGHTS, TEXT_ALIGNMENTS } from '../text-animation/text-cascade/constants'

interface BaseTextStyles {
  fontSize?: number
  color?: string
  fontWeight?: string | number
  textAlign?: string
  lineHeight?: number
  letterSpacing?: number
  fontFamily?: string
}

interface TextStylerProps<T extends BaseTextStyles> {
  open: boolean
  setOpen: (open: boolean) => void
  className?: string
  value: T
  onChange: (styles: Partial<T>) => void
  children?: React.ReactNode
  setIsEditingToggle?: React.Dispatch<SetStateAction<boolean>>
}

export const TextStyler = <T extends BaseTextStyles>({
  open,
  setOpen,
  onChange,
  value,
  className = '',
  children
}: TextStylerProps<T>) => {
  const popoverRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const set = <K extends keyof T>(key: K, v: T[K]) => {
    onChange({ [key]: v } as unknown as Partial<T>)
  }

  const styles = {
    fontSize: value.fontSize ?? 16,
    color: value.color ?? '#000000',
    fontWeight: value.fontWeight ?? 'normal',
    lineHeight: value.lineHeight ?? 1.5,
    letterSpacing: value.letterSpacing ?? 0,
    fontFamily: value.fontFamily ?? 'Inter',
    textAlign: value.textAlign ?? 'left'
  }

  // Calculate optimal position
  useEffect(() => {
    if (open && triggerRef.current) {
      const updatePosition = () => {
        if (!triggerRef.current) return

        const triggerRect = triggerRef.current.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        const gap = 8
        const popoverWidth = 220
        const popoverHeight = 420

        let top = 0
        let left = 0

        const spaceBelow = viewportHeight - triggerRect.bottom
        const spaceAbove = triggerRect.top
        const spaceRight = viewportWidth - triggerRect.right
        const spaceLeft = triggerRect.left

        // Try bottom first
        if (spaceBelow >= popoverHeight + gap) {
          top = triggerRect.bottom + gap
          left = triggerRect.left
        }
        // Try top
        else if (spaceAbove >= popoverHeight + gap) {
          top = triggerRect.top - popoverHeight - gap
          left = triggerRect.left
        }
        // Try right
        else if (spaceRight >= popoverWidth + gap) {
          left = triggerRect.right + gap
          top = triggerRect.top
          if (top + popoverHeight > viewportHeight) {
            top = viewportHeight - popoverHeight - 10
          }
        }
        // Try left
        else if (spaceLeft >= popoverWidth + gap) {
          left = triggerRect.left - popoverWidth - gap
          top = triggerRect.top
          if (top + popoverHeight > viewportHeight) {
            top = viewportHeight - popoverHeight - 10
          }
        }
        // Fallback: position below but ensure visibility
        else {
          top = triggerRect.bottom + gap
          left = triggerRect.left
        }

        // Ensure horizontal visibility
        if (left + popoverWidth > viewportWidth) {
          left = viewportWidth - popoverWidth - 10
        }
        if (left < 10) {
          left = 10
        }

        // Ensure vertical visibility
        if (top + popoverHeight > viewportHeight) {
          top = viewportHeight - popoverHeight - 10
        }
        if (top < 10) {
          top = 10
        }

        setPosition({ top, left })
      }

      updatePosition()
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition, true)

      return () => {
        window.removeEventListener('resize', updatePosition)
        window.removeEventListener('scroll', updatePosition, true)
      }
    }
  }, [open])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, setOpen])

  // Close on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [open, setOpen])

  const popoverContent = open ? (
    <div
      ref={popoverRef}
      className={className}
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
        zIndex: 999999,
        width: '220px',
        borderRadius: '8px',
        backgroundColor: '#ffffff',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        border: '1px solid #e0e0e0'
      }}
    >
      <div
        style={{
          padding: '12px',
          maxHeight: '250px',
          overflowY: 'auto'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          {/* Font Family */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                color: '#666',
                marginBottom: '4px'
              }}
            >
              Font Family
            </label>
            <select
              value={String(styles.fontFamily)}
              onChange={e => set('fontFamily' as keyof T, e.target.value as T[keyof T])}
              style={{
                fontSize: '0.75rem',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                backgroundColor: '#fff',
                cursor: 'pointer'
              }}
            >
              {FONT_FAMILIES.map(f => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Font Size */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: '#666'
                }}
              >
                Font Size
              </span>
              <span style={{ fontSize: '0.75rem', color: '#666' }}>{styles.fontSize}px</span>
            </div>
            <input
              type='range'
              value={styles.fontSize}
              onChange={e => set('fontSize' as keyof T, Number(e.target.value) as T[keyof T])}
              min={8}
              max={120}
              step={1}
              style={{
                width: '100%',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Font Weight */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                color: '#666',
                marginBottom: '4px'
              }}
            >
              Font Weight
            </label>
            <select
              value={String(styles.fontWeight)}
              onChange={e => {
                const v = e.target.value
                set('fontWeight' as keyof T, v as T[keyof T])
              }}
              style={{
                fontSize: '0.75rem',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                backgroundColor: '#fff',
                cursor: 'pointer'
              }}
            >
              {FONT_WEIGHTS.map(fw => (
                <option key={fw} value={fw}>
                  {fw}
                </option>
              ))}
            </select>
          </div>

          {/* Color */}
          <div>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                color: '#666',
                display: 'block',
                marginBottom: '4px'
              }}
            >
              Color
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type='text'
                value={styles.color}
                onChange={e => set('color' as keyof T, e.target.value as T[keyof T])}
                placeholder='#000000'
                style={{
                  flex: 1,
                  fontSize: '0.75rem',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
              <input
                type='color'
                value={styles.color}
                onChange={e => set('color' as keyof T, e.target.value as T[keyof T])}
                style={{
                  width: '40px',
                  height: '32px',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  border: '1px solid #ccc'
                }}
              />
            </div>
          </div>

          {/* Text Align */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                color: '#666',
                marginBottom: '4px'
              }}
            >
              Text Align
            </label>
            <select
              value={String(styles.textAlign)}
              onChange={e => set('textAlign' as keyof T, e.target.value as T[keyof T])}
              style={{
                fontSize: '0.75rem',
                padding: '6px 8px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                backgroundColor: '#fff',
                cursor: 'pointer'
              }}
            >
              {TEXT_ALIGNMENTS.map(fw => (
                <option key={fw} value={fw}>
                  {fw}
                </option>
              ))}
            </select>
          </div>

          {/* Line Height */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: '#666'
                }}
              >
                Line Height
              </span>
              <span style={{ fontSize: '0.75rem', color: '#666' }}>{styles.lineHeight.toFixed(2)}</span>
            </div>
            <input
              type='range'
              value={styles.lineHeight}
              onChange={e => set('lineHeight' as keyof T, Number(e.target.value) as T[keyof T])}
              min={0.8}
              max={3}
              step={0.05}
              style={{
                width: '100%',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Letter Spacing */}
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  color: '#666'
                }}
              >
                Letter Spacing
              </span>
              <span style={{ fontSize: '0.75rem', color: '#666' }}>{styles.letterSpacing}px</span>
            </div>
            <input
              type='range'
              value={styles.letterSpacing}
              onChange={e => set('letterSpacing' as keyof T, Number(e.target.value) as T[keyof T])}
              min={-2}
              max={20}
              step={0.5}
              style={{
                width: '100%',
                cursor: 'pointer'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      {/* Trigger Button */}
      <div ref={triggerRef} onClick={() => setOpen(!open)}>
        {children}
      </div>

      {/* Render popover in portal at document body */}
      {popoverContent && createPortal(popoverContent, document.body)}
    </>
  )
}

export default TextStyler
