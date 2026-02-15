import { MediaSlideContent, MediaSlideStyle, MetaData } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { Spline } from 'lucide-react'
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
}

interface Position {
  top: number
  left: number
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export const MediaStyler = ({
  open,
  setOpen,
  onChange,
  value,
  className = '',
  children,
  onMediaChange,
}: MediaStylerProps) => {
  const popoverRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const borderRadiusButtonRef = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 })
  const [isAnimating, setIsAnimating] = useState(false)
  const [showBorderRadiusPopup, setShowBorderRadiusPopup] = useState(false)
  const [borderRadiusPopupPosition, setBorderRadiusPopupPosition] = useState({ top: 0, left: 0 })

  const styles = {
    width: value?.meta?.width ?? 200,
    height: value?.meta?.height ?? 200,
    borderRadius: value?.style?.borderRadius ?? 0,
    objectFit: value?.style?.objectFit ?? 'cover'
  }

  // Constants for better control
  const GAP = 8
  const VIEWPORT_PADDING = 12
  const TOOLBAR_OFFSET = -4 // Slight overlap with element like Canva
  const BORDER_RADIUS_POPUP_WIDTH = 220
  const BORDER_RADIUS_POPUP_HEIGHT = 56

  // Canva-style positioning - toolbar appears at top edge of element
  const calculateOptimalPosition = (triggerRect: DOMRect): Position => {
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    // Get actual popover dimensions if already rendered, otherwise estimate
    const popoverWidth = popoverRef.current?.offsetWidth || 280
    const popoverHeight = popoverRef.current?.offsetHeight || 52

    // Center horizontally on the trigger element
    const triggerCenterX = triggerRect.left + triggerRect.width / 2
    let left = triggerCenterX - popoverWidth / 2

    // Keep within viewport bounds
    left = Math.max(VIEWPORT_PADDING, Math.min(left, viewportWidth - popoverWidth - VIEWPORT_PADDING))

    // Position at top edge of element (with slight offset upward)
    let top = triggerRect.top + TOOLBAR_OFFSET
    let placement: 'top' | 'bottom' = 'top'

    // If toolbar would go off top of screen, position just inside element
    if (top < VIEWPORT_PADDING) {
      top = triggerRect.top + GAP
      placement = 'bottom'
    }

    // If element is very near top and toolbar won't fit above, put it below
    if (triggerRect.top < popoverHeight + VIEWPORT_PADDING + Math.abs(TOOLBAR_OFFSET)) {
      top = triggerRect.bottom + GAP
      placement = 'bottom'
    }

    return { top, left, placement }
  }

  // Handle animation states
  useEffect(() => {
    if (open) {
      setIsAnimating(true)
      // Reset animation state after animation completes
      const timer = setTimeout(() => setIsAnimating(false), 200)
      return () => clearTimeout(timer)
    }
  }, [open])

  // Position border radius popup (Canva-style - stick to button)
  useEffect(() => {
    if (showBorderRadiusPopup && borderRadiusButtonRef.current) {
      const updatePosition = () => {
        if (!borderRadiusButtonRef.current) return

        const buttonRect = borderRadiusButtonRef.current.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        // Center the popup relative to the button
        const buttonCenterX = buttonRect.left + buttonRect.width / 2
        const idealLeft = buttonCenterX - BORDER_RADIUS_POPUP_WIDTH / 2

        // Constrain horizontally
        const constrainedLeft = Math.max(
          VIEWPORT_PADDING,
          Math.min(idealLeft, viewportWidth - BORDER_RADIUS_POPUP_WIDTH - VIEWPORT_PADDING)
        )

        // Check space above and below
        const spaceBelow = viewportHeight - buttonRect.bottom - VIEWPORT_PADDING
        const spaceAbove = buttonRect.top - VIEWPORT_PADDING

        let top: number

        if (spaceBelow >= BORDER_RADIUS_POPUP_HEIGHT + GAP) {
          // Place below
          top = buttonRect.bottom + GAP
        } else if (spaceAbove >= BORDER_RADIUS_POPUP_HEIGHT + GAP) {
          // Place above
          top = buttonRect.top - BORDER_RADIUS_POPUP_HEIGHT - GAP
        } else {
          // Use side with more space
          if (spaceBelow > spaceAbove) {
            top = buttonRect.bottom + GAP
            if (top + BORDER_RADIUS_POPUP_HEIGHT > viewportHeight - VIEWPORT_PADDING) {
              top = viewportHeight - BORDER_RADIUS_POPUP_HEIGHT - VIEWPORT_PADDING
            }
          } else {
            top = Math.max(VIEWPORT_PADDING, buttonRect.top - BORDER_RADIUS_POPUP_HEIGHT - GAP)
          }
        }

        setBorderRadiusPopupPosition({ top, left: constrainedLeft })
      }

      updatePosition()
      
      // Use passive listeners for better performance
      const handleUpdate = () => requestAnimationFrame(updatePosition)
      window.addEventListener('resize', handleUpdate)
      window.addEventListener('scroll', handleUpdate, true)

      return () => {
        window.removeEventListener('resize', handleUpdate)
        window.removeEventListener('scroll', handleUpdate, true)
      }
    }
  }, [showBorderRadiusPopup])

  // Calculate optimal position for main popover
  useEffect(() => {
    if (open && triggerRef.current) {
      const updatePosition = () => {
        if (!triggerRef.current) return

        const triggerRect = triggerRef.current.getBoundingClientRect()
        const newPosition = calculateOptimalPosition(triggerRect)

        setPosition(newPosition)
      }

      // Initial position
      updatePosition()
      
      // Update on scroll/resize with RAF for smoothness
      const handleUpdate = () => requestAnimationFrame(updatePosition)
      window.addEventListener('resize', handleUpdate)
      window.addEventListener('scroll', handleUpdate, true)

      return () => {
        window.removeEventListener('resize', handleUpdate)
        window.removeEventListener('scroll', handleUpdate, true)
      }
    }
  }, [open])

  // Close main popover on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
        setShowBorderRadiusPopup(false)
      }
    }

    if (open) {
      // Small delay to prevent immediate closure on open
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
      
      return () => {
        clearTimeout(timer)
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [open, setOpen])

  // Close border radius popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const borderRadiusPopup = document.querySelector('[data-border-radius-popup="true"]')
      
      if (
        showBorderRadiusPopup &&
        borderRadiusPopup &&
        !borderRadiusPopup.contains(event.target as Node) &&
        borderRadiusButtonRef.current &&
        !borderRadiusButtonRef.current.contains(event.target as Node)
      ) {
        setShowBorderRadiusPopup(false)
      }
    }

    if (showBorderRadiusPopup) {
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside)
      }, 100)
      
      return () => {
        clearTimeout(timer)
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [showBorderRadiusPopup])

  // Close on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showBorderRadiusPopup) {
          setShowBorderRadiusPopup(false)
        } else {
          setOpen(false)
        }
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [open, setOpen, showBorderRadiusPopup])

  const borderRadiusPopup = showBorderRadiusPopup ? (
    <div
      data-border-radius-popup="true"
      style={{
        position: 'fixed',
        top: `${borderRadiusPopupPosition.top}px`,
        left: `${borderRadiusPopupPosition.left}px`,
        zIndex: 9999999,
        borderRadius: '12px',
        backgroundColor: '#2d3748',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.35), 0 0 1px rgba(0, 0, 0, 0.5)',
        padding: '12px 16px',
        animation: 'popoverFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
        minWidth: `${BORDER_RADIUS_POPUP_WIDTH}px`,
        pointerEvents: 'auto'
      }}
      onPointerDown={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <input
          type="range"
          className="slider-compact"
          value={styles.borderRadius}
          onChange={e => {
            onChange({
              ...value,
              style: {
                ...value.style,
                borderRadius: Number(e.target.value)
              } as MediaSlideStyle
            } as MediaSlideContent)
          }}
          min={0}
          max={200}
          step={1}
          style={{ flex: 1 }}
        />
        <span className="value-badge">{styles.borderRadius}</span>
      </div>
    </div>
  ) : null

  const popoverContent = open ? (
    <div
      ref={popoverRef}
      onPointerDown={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
      onTouchStart={e => e.stopPropagation()}
      className={className}
      style={{
        position: 'fixed',
        // -50 will prevent overlay on image (change is too adjust mannually if more vertical space needed)
        top: `${position.top - 50}px`,
        left: `${position.left}px`,
        zIndex: 999999,
        borderRadius: '16px',
        backgroundColor: '#2d3748',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.35), 0 2px 8px rgba(0, 0, 0, 0.2), 0 0 1px rgba(0, 0, 0, 0.5)',
        animation: isAnimating ? 'popoverFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
        transformOrigin: position.placement === 'bottom' ? 'top center' : 'bottom center',
        padding: '8px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        pointerEvents: 'auto',
        userSelect: 'none',
        backdropFilter: 'blur(8px)',
        willChange: 'transform, opacity'
      }}
    >
      <style>{`
        @keyframes popoverFadeIn {
          from {
            opacity: 0;
            transform: scale(0.92) translateY(-8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .toolbar-button {
          height: 32px;
          border-radius: 8px;
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #e2e8f0;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
          padding: 0 12px;
          font-size: 0.8125rem;
          font-weight: 500;
          gap: 6px;
          position: relative;
        }

        .toolbar-button:hover {
          background: rgba(255, 255, 255, 0.12);
        }

        .toolbar-button:active {
          background: rgba(255, 255, 255, 0.18);
          transform: scale(0.96);
        }

        .toolbar-button.active {
          background: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        .toolbar-button.active::after {
          content: '';
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 16px;
          height: 2px;
          background: currentColor;
          border-radius: 1px;
        }

        .toolbar-button.icon-only {
          width: 32px;
          padding: 0;
        }

        .slider-compact {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.2);
          outline: none;
          cursor: pointer;
          transition: background 0.15s ease;
        }

        .slider-compact:hover {
          background: rgba(255, 255, 255, 0.25);
        }

        .slider-compact::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .slider-compact::-webkit-slider-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
        }

        .slider-compact::-webkit-slider-thumb:active {
          transform: scale(1.05);
        }

        .slider-compact::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: none;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .slider-compact::-moz-range-thumb:hover {
          transform: scale(1.15);
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.35);
        }

        .slider-compact::-moz-range-thumb:active {
          transform: scale(1.05);
        }

        .divider-vertical {
          width: 1px;
          height: 24px;
          background: rgba(255, 255, 255, 0.15);
          margin: 0 4px;
          flex-shrink: 0;
        }

        .value-badge {
          font-size: 0.6875rem;
          font-weight: 600;
          color: #ffffff;
          background: rgba(255, 255, 255, 0.18);
          padding: 4px 8px;
          border-radius: 6px;
          min-width: 36px;
          text-align: center;
          flex-shrink: 0;
          font-variant-numeric: tabular-nums;
        }
      `}</style>

      {/* Change Media Button */}
      {onMediaChange && (
        <>
          <button
            onClick={onMediaChange}
            className="toolbar-button"
            title="Change Media"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Change Media
          </button>
          <div className="divider-vertical" />
        </>
      )}

      {/* Border Radius Button */}
      <button
        ref={borderRadiusButtonRef}
        onClick={() => setShowBorderRadiusPopup(!showBorderRadiusPopup)}
        className={`toolbar-button icon-only ${showBorderRadiusPopup ? 'active' : ''}`}
        title="Border Radius"
      >
        <Spline className="w-5 h-5" />
      </button>

      {/* Object Fit Controls */}
        <>
          <div className="divider-vertical" />
          
          {OBJECT_FIT_OPTIONS.map(option => (
            <button
              key={option}
              onClick={() => {
                onChange({
                  ...value,
                  style: {
                    ...value.style,
                    objectFit: option
                  } as MediaSlideStyle
                } as MediaSlideContent)
              }}
              className={`toolbar-button icon-only ${styles.objectFit === option ? 'active' : ''}`}
              title={`Object Fit: ${option.charAt(0).toUpperCase() + option.slice(1)}`}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '16px',
                    borderRadius: '3px',
                    border: '1.5px solid currentColor',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
                  }}
                >
                  <div
                    style={{
                      width: option === 'cover' ? '100%' : option === 'contain' ? '60%' : '100%',
                      height: option === 'cover' ? '100%' : option === 'contain' ? '60%' : '100%',
                      backgroundColor: 'currentColor',
                      borderRadius: '1px'
                    }}
                  />
                </div>
              </div>
            </button>
          ))}
        </>
    </div>
  ) : null

  return (
    <>
      {/* Trigger Button */}
      <div
        style={{ width: '100%', height: '100%' }}
        ref={triggerRef}
        onClick={() => setOpen(!open)}
      >
        {children}
      </div>

      {/* Render popover in portal at document body */}
      {popoverContent && createPortal(popoverContent, document.body)}
      
      {/* Render border radius popup in portal at document body */}
      {borderRadiusPopup && createPortal(borderRadiusPopup, document.body)}
    </>
  )
}

export default MediaStyler