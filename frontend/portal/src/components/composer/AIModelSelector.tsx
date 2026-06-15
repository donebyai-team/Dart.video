'use client'

import { AIModel } from '@coasterai/pb/coasterai/core/v1/chat_pb'
import { Bot } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const AUTO_VALUE = 'auto'

const MODEL_OPTIONS = Object.entries(AIModel)
  .filter(([, value]) => typeof value === 'number')
  .filter(([key]) => key !== 'AI_MODEL_UNSPECIFIED')
  .map(([key, value]) => ({
    label: key
      .replace(/^AI_MODEL_/, '')
      .split('_')
      .map(part => {
        if (/^\d+$/.test(part)) return part
        if (part === 'GPT') return part
        const lower = part.toLowerCase()
        return lower.charAt(0).toUpperCase() + lower.slice(1)
      })
      .join(' ')
      .replace(/(\d) (\d)$/, '$1.$2'),
    value: String(value),
  }))

interface AIModelSelectorProps {
  value?: AIModel
  onChange: (value?: AIModel) => void
  disabled?: boolean
}

const AIModelSelector = ({ value, onChange, disabled = false }: AIModelSelectorProps) => {
  return (
    <span className='flex flex-shrink-0 items-center gap-1 text-muted-foreground'>
      <Bot className='h-4 w-4' />
      <Select
        value={value === undefined ? AUTO_VALUE : String(value)}
        onValueChange={nextValue => onChange(nextValue === AUTO_VALUE ? undefined : Number(nextValue) as AIModel)}
        disabled={disabled}
      >
        <SelectTrigger className='h-7 w-auto min-w-0 gap-1 border-none bg-transparent px-1 text-xs shadow-none ring-0 focus:ring-0'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={AUTO_VALUE}>Auto</SelectItem>
          {MODEL_OPTIONS.map(option => (
            <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  )
}

export default AIModelSelector
