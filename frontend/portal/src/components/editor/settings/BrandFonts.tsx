import { useEffect, useMemo } from 'react'
import { loadFonts } from '@coasterai/renderer'
import { useVideoStore } from '@/stores/video'

interface BrandFontsProps {
  onSelect: (font: string) => void
  selectedFont?: string | null
  title?: string
  wrapperClassName?: string
  className?: string
  fontClassName?: string
}

export default function BrandFonts({
  onSelect,
  selectedFont,
  title = 'Brand Fonts',
  wrapperClassName = 'space-y-2',
  className = 'flex flex-col gap-1',
  fontClassName = 'w-full rounded-md px-2 py-1.5 text-left text-base transition-colors hover:bg-accent'
}: BrandFontsProps) {
  const brandFonts = useVideoStore(s => s.videoConfig?.metadata?.generatedBranding?.brandIdentity?.fonts)

  const fonts = useMemo(() => {
    const seen = new Set<string>()

    return (brandFonts ?? []).reduce<string[]>((acc, font) => {
      const fontName = (font.googleFontsName || font.name || '').trim()
      const normalizedFontName = fontName.toLowerCase()

      if (!fontName || seen.has(normalizedFontName)) {
        return acc
      }

      seen.add(normalizedFontName)
      acc.push(fontName)
      return acc
    }, [])
  }, [brandFonts])

  useEffect(() => {
    loadFonts(fonts)
  }, [fonts])

  if (!fonts.length) {
    return null
  }

  const normalizedSelectedFont = selectedFont?.toLowerCase()

  return (
    <div className={wrapperClassName}>
      <p className='text-xs font-medium uppercase tracking-wider text-muted-foreground'>{title}</p>

      <div className={className}>
        {fonts.map(font => {
          const isActive = normalizedSelectedFont === font.toLowerCase()

          return (
            <button
              key={font}
              type='button'
              onClick={() => onSelect(font)}
              className={`${fontClassName} ${isActive ? 'bg-accent text-accent-foreground' : ''}`}
              style={{ fontFamily: font }}
              title={font}
            >
              <span className='block truncate'>{font}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
