'use client'

import { LanguagesIcon } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const LANGUAGES = [{ label: 'English(UK)', value: 'en' }]

interface LanguageSelectorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const LanguageSelector = ({ value, onChange, disabled = false }: LanguageSelectorProps) => {
  return (
    <span className='flex items-center gap-1 flex-shrink-0'>
      <LanguagesIcon className='w-4 h-4' />
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className='h-7 text-xs bg-transparent border-none shadow-none ring-0 focus:ring-0 px-1 gap-1 w-auto min-w-0'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map(d => (
            <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </span>
  )
}

export default LanguageSelector
