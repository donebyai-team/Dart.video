import BrandFonts from '@/components/editor/settings/BrandFonts'
import { loadFonts, SUPPORTED_FONTS } from '@coasterai/renderer'
import { useState, useRef, useEffect, useMemo } from 'react'

export function FontSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredFonts = useMemo(
    () => SUPPORTED_FONTS.filter(f => f.toLowerCase().includes(search.toLowerCase())),
    [search]
  )

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (font: string) => {
    onChange(font)
    setIsOpen(false)
    setSearch('')
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    loadFonts(filteredFonts)
  }, [filteredFonts, isOpen])

  return (
    <div ref={containerRef} className='relative'>
      <input
        ref={inputRef}
        type='text'
        value={isOpen ? search : value || 'Default'}
        onChange={e => setSearch(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen(true)}
        placeholder='Search fonts...'
        className='h-7 w-24 px-2 rounded-md border border-border bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-ring/50 cursor-pointer'
      />
      {isOpen && (
        <div className='absolute top-full left-0 mt-1 w-60 max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md z-50'>
          <BrandFonts
            selectedFont={value}
            onSelect={handleSelect}
            title='Brand fonts'
            wrapperClassName='space-y-2 border-b border-border p-2'
            className='flex flex-col gap-0.5'
            fontClassName='w-full rounded px-1.5 py-1 text-left text-xs transition-colors hover:bg-accent'
          />
          <div className='px-2 pt-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground'>
            All fonts
          </div>
          <div className='px-2 py-1.5 text-xs cursor-pointer hover:bg-accent' onClick={() => handleSelect('')}>
            Default
          </div>
          {filteredFonts.map(f => (
            <div
              key={f}
              className='px-2 py-1.5 text-base cursor-pointer hover:bg-accent'
              onClick={() => handleSelect(f)}
              style={{ fontFamily: f }}
              title={f}
            >
              {f}
            </div>
          ))}
          {filteredFonts.length === 0 && (
            <div className='px-2 py-1.5 text-xs text-muted-foreground'>No fonts found</div>
          )}
        </div>
      )}
    </div>
  )
}
