import TextStyler from '@/components/editor/remotion/components/TextStyler'
import { useState, type SetStateAction } from 'react'

interface Props {
  props: Record<string, any>
  onChange: (newProps: Record<string, any>) => void
  setIsEditingToggle?: React.Dispatch<SetStateAction<boolean>>
}

import { useEffect, useRef } from 'react'
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

const TextEditable: React.FC<Props> = ({ props, onChange, setIsEditingToggle }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (textareaRef.current && !textareaRef.current.contains(event.target as Node)) {
        setIsEditingToggle?.(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [setIsEditingToggle])

  return (
    <textarea
      ref={textareaRef}
      onKeyDown={e => {
        if (e.key === 'Enter' && setIsEditingToggle) {
          setIsEditingToggle(false)
        }
      }}
      style={{ ...props, background: 'transparent', minHeight: '100px', padding: '8px' }}
      value={props.text}
      onChange={e => onChange({ ...props, text: e.target.value })}
    />
  )
}

const RemoteComponent = ({ props, onChange }: Props) => {
  const [open, setOpen] = useState<boolean>(false)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const onChangeStyles = (newProps: any) => {
    onChange({ ...props, ...newProps })
  }

  const onEditToggle = () => {
    setIsEditing(prev => !prev)
  }

  return (
    <>
      {!isEditing ? (
        <>
          <TextStyler onChange={onChangeStyles} open={open} setOpen={setOpen} value={props}>
            {props.text.split('').map((letter: string, i: number) => {
              const delay = i * 1.5
              console.log(frame, i, 'frame')
              const animProgress = spring({
                frame: frame - delay,
                fps,
                config: { damping: 20, stiffness: 150 }
              })

              const opacity = interpolate(animProgress, [0, 1], [0, 1])
              const translateX = interpolate(animProgress, [0, 1], [-20, 0])

              return (
                <span
                  onDoubleClick={() => setIsEditing(true)}
                  key={i}
                  style={{
                    ...props,
                    opacity,
                    transform: `translateX(${translateX}px)`,
                    textShadow: '0 2px 20px rgba(147, 51, 234, 0.4)'
                  }}
                >
                  {letter === ' ' ? '\u00A0' : letter}
                </span>
              )
            })}
          </TextStyler>
        </>
      ) : (
        <TextEditable props={props} onChange={onChange} setIsEditingToggle={setIsEditing} />
      )}
    </>
  )
}

export  {RemoteComponent}
