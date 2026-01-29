import React, { SetStateAction, useEffect, useRef } from 'react'

interface Props {
  value: string
  style: any
  isEditing: boolean
  onChange: (newProps: string) => void
  setIsEditing: React.Dispatch<SetStateAction<boolean>>
  children: React.ReactNode
}
export const TextEditor: React.FC<Props> = ({ value, onChange, setIsEditing, style, isEditing, children }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (textareaRef.current && !textareaRef.current.contains(event.target as Node)) {
        setIsEditing?.(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [setIsEditing])

  if (!isEditing) {
    return children
  }

  return (
    <textarea
      ref={textareaRef}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          setIsEditing(false)
        }
      }}
      style={{ ...style, background: 'transparent', minHeight: '100px', padding: '8px' }}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  )
}
