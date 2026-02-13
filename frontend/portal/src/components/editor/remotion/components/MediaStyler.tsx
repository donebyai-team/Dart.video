import { MediaSlideContent, MediaSlideStyle, MetaData } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import React, { SetStateAction, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
export const OBJECT_FIT_OPTIONS = ['contain', 'cover', 'fill'] as const

interface MediaStylerProps {
  open: boolean
  setOpen: (open: boolean) => void
  className?: string
  value: MediaSlideContent
  onChange: (styles: Partial<MediaSlideContent>) => void
  children?: React.ReactNode
  setIsEditingToggle?: React.Dispatch<SetStateAction<boolean>>
  onMediaChange?: () => void
  isImage?: boolean
}

export const MediaStyler = ({
  open,
  setOpen,
  onChange,
  value,
  className = '',
  children,
  onMediaChange,
  isImage
}: MediaStylerProps) => {
  const popoverRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  const styles = {
    width: value?.meta?.width ?? 200,
    height: value?.meta?.height ?? 200,
    borderRadius: value?.style?.borderRadius ?? 0,
    objectFit: value?.style?.objectFit ?? 'cover'
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
        const popoverHeight = 320

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
      onPointerDown={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
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
          maxHeight: '300px',
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
          {false && (
            <>
              {/* Width */}
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
                    Width
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#666' }}>{styles.width}px</span>
                </div>
                <input
                  type='range'
                  value={styles.width}
                  onChange={e => {
                    onChange({
                      ...value,
                      meta: {
                        ...value.meta,
                        width: Number(e.target.value)
                      } as MetaData
                    })
                  }}
                  min={50}
                  max={1000}
                  step={10}
                  style={{
                    width: '100%',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* Height */}
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
                    Height
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#666' }}>{styles.height}px</span>
                </div>
                <input
                  type='range'
                  value={styles.height}
                  onChange={e => {
                    onChange({
                      ...value,
                      meta: {
                        ...value.meta,
                        height: Number(e.target.value)
                      } as MetaData
                    })
                  }}
                  min={50}
                  max={1000}
                  step={10}
                  style={{
                    width: '100%',
                    cursor: 'pointer'
                  }}
                />
              </div>
            </>
          )}

          {onMediaChange && (
            <button
              onClick={onMediaChange}
              style={{
                fontSize: '0.75rem',
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ccc',
                backgroundColor: '#fff',
                cursor: 'pointer',
                marginTop: '4px'
              }}
            >
              Change {isImage ? 'Image' : 'Video'}
            </button>
          )}

          {/* Border Radius */}
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
                Border Radius
              </span>
              <span style={{ fontSize: '0.75rem', color: '#666' }}>{styles.borderRadius}px</span>
            </div>
            <input
              type='range'
              value={styles.borderRadius}
              onChange={e => {
                onChange({
                  ...value,
                  style: {
                    ...value.style,
                    borderRadius: Number(e.target.value)
                  } as MediaSlideStyle
                })
              }}
              min={0}
              max={200}
              step={1}
              style={{
                width: '100%',
                cursor: 'pointer'
              }}
            />
          </div>

          {/* Object Fit */}
          <div style={{ display: isImage ? 'flex' : 'none', flexDirection: 'column' }}>
            <label
              style={{
                fontSize: '0.75rem',
                fontWeight: 500,
                color: '#666',
                marginBottom: '4px'
              }}
            >
              Object Fit
            </label>
            <select
              value={String(styles.objectFit)}
              onChange={e => {
                onChange({
                  ...value,
                  style: {
                    ...value.style,
                    objectFit: e.target.value
                  } as MediaSlideStyle
                })
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
              {OBJECT_FIT_OPTIONS.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  ) : null

  return (
    <>
      {/* Trigger Button */}
      <div style={{ width: '100%', height: '100%' }} ref={triggerRef} onClick={() => setOpen(!open)}>
        {children}
      </div>

      {/* Render popover in portal at document body */}
      {popoverContent && createPortal(popoverContent, document.body)}
    </>
  )
}

export default MediaStyler
