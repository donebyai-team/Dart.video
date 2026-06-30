'use client'

import React, { useCallback } from 'react'
import { Mention, MentionsInput, SuggestionDataItem } from 'react-mentions'
import { cn } from '@/lib/utils'

interface PauseAwareTextareaProps {
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  onClick?: () => void
  placeholder?: string
  className?: string
}

const PAUSE_OPTIONS: SuggestionDataItem[] = [
  { id: '500', display: '0.5s' },
  { id: '1000', display: '1s' },
  { id: '1500', display: '1.5s' },
  { id: '2000', display: '2s' },
  { id: '2500', display: '2.5s' },
  { id: '3000', display: '3s' },
  { id: '3500', display: '3.5s' },
  { id: '4000', display: '4s' },
  { id: '4500', display: '4.5s' },
  { id: '5000', display: '5s' },
  { id: '5500', display: '5.5s' },
  { id: '6000', display: '6s' },
  { id: '6500', display: '6.5s' },
  { id: '7000', display: '7s' },
]

export const PauseAwareTextarea = ({
  value,
  onChange,
  onFocus,
  onClick,
  placeholder,
  className,
}: PauseAwareTextareaProps) => {
  const handleChange = useCallback(
    (_event: { target: { value: string } }, newValue: string) => {
      onChange(newValue)
    },
    [onChange]
  )

  return (
    <div className={cn('relative w-full', className)} onClick={onClick}>
      <MentionsInput
        value={value}
        onChange={handleChange}
        onFocus={onFocus}
        placeholder={placeholder}
        className='mentions-input'
      >
        <Mention
          trigger='/'
          data={PAUSE_OPTIONS}
          markup='/[__display__](__id__)'
          displayTransform={(_, display) => display}
          appendSpaceOnAdd
          style={{
            backgroundColor: 'white',
            borderRadius: '4px',
            boxShadow: '0 0 0 1px hsl(var(--border)), 0 1px 2px rgba(0,0,0,0.1)',
          }}
          renderSuggestion={(suggestion: SuggestionDataItem, _search: string, _highlightedDisplay: React.ReactNode, _index: number, focused: boolean) => (
            <div
              className={cn(
                'flex items-center justify-between px-2 py-1.5 text-sm cursor-pointer',
                focused ? 'bg-accent text-accent-foreground' : ''
              )}
            >
              <span>{suggestion.display}</span>
              <span className='text-xs text-muted-foreground'>{suggestion.id}ms</span>
            </div>
          )}
        />
      </MentionsInput>
    </div>
  )
}
