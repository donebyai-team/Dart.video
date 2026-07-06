import BrandFonts from '@/components/editor/settings/BrandFonts'
import { loadFonts, SUPPORTED_FONTS } from '@coasterai/renderer'
import { useState, useRef, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface FontSelectorProps {
  value: string
  onChange: (v: string) => void
  availableFonts?: string[]
  brandFonts?: string[]
  placeholder?: string
  emptyLabel?: string
  defaultOptionLabel?: string
  className?: string
  inputClassName?: string
  popoverClassName?: string
}

export function FontSelector({
  value,
  onChange,
  availableFonts,
  brandFonts,
  placeholder = 'Search fonts...',
  emptyLabel = 'Default',
  defaultOptionLabel = 'Default',
  className,
  inputClassName,
  popoverClassName,
}: FontSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const dedupedBrandFonts = useMemo(() => {
    const seen = new Set<string>()

    return (brandFonts ?? []).reduce<string[]>((acc, font) => {
      const normalizedFont = font.trim()
      const normalizedKey = normalizedFont.toLowerCase()

      if (!normalizedFont || seen.has(normalizedKey)) {
        return acc
      }

      seen.add(normalizedKey)
      acc.push(normalizedFont)
      return acc
    }, [])
  }, [brandFonts])

  const selectableFonts = availableFonts ?? SUPPORTED_FONTS

  const filteredFonts = useMemo(
    () => selectableFonts.filter(f => f.toLowerCase().includes(search.toLowerCase())),
    [search, selectableFonts]
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

    loadFonts([...dedupedBrandFonts, ...filteredFonts])
  }, [dedupedBrandFonts, filteredFonts, isOpen])

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <input
        ref={inputRef}
        type='text'
        value={isOpen ? search : value || emptyLabel}
        onChange={e => setSearch(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen(true)}
        placeholder={placeholder}
        className={cn(
          'h-7 w-24 px-2 rounded-md border border-border bg-muted text-xs focus:outline-none focus:ring-1 focus:ring-ring/50 cursor-pointer',
          inputClassName
        )}
      />
      {isOpen && (
        <div className={cn('absolute top-full left-0 mt-1 w-60 max-h-48 overflow-y-auto rounded-md border border-border bg-popover shadow-md z-50', popoverClassName)}>
          {dedupedBrandFonts.length > 0 && (
            <BrandFonts
              selectedFont={value}
              onSelect={handleSelect}
              title='Brand fonts'
              fonts={dedupedBrandFonts}
              wrapperClassName='space-y-2 border-b border-border p-2'
              className='flex flex-col gap-0.5'
              fontClassName='w-full rounded px-1.5 py-1 text-left text-xs transition-colors hover:bg-accent'
            />
          )}
          <div className='px-2 pt-2 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground'>
            All fonts
          </div>
          <div className='px-2 py-1.5 text-xs cursor-pointer hover:bg-accent' onClick={() => handleSelect('')}>
            {defaultOptionLabel}
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
