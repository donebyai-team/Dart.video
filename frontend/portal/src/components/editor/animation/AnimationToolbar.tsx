import { RegistryEntry } from '@coasterai/renderer'
import { X, Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'

export interface ElementEdit {
  style?: Record<string, string | number>
  text?: string
}

interface AnimationToolbarProps {
  selectedEid: string | null
  registry: Record<string, RegistryEntry>
  editStore: Record<string, ElementEdit>
  onEdit: (eid: string, patch: Partial<ElementEdit>) => void
  onDeselect: () => void
}

export function AnimationToolbar({
  selectedEid,
  registry,
  editStore,
  onEdit,
  onDeselect,
}: AnimationToolbarProps) {

  if (!selectedEid) return null

  const entry = registry[selectedEid]
  if (!entry) return null

  const merged = { ...entry.staticStyle, ...(editStore[selectedEid]?.style ?? {}) }
  const isText = entry.textType === 'static'

  function setStyle(prop: string, value: string | number) {
    onEdit(selectedEid!, { style: { [prop]: value } })
  }

  const isBold = merged.fontWeight === 700 || merged.fontWeight === 'bold'
  const isItalic = merged.fontStyle === 'italic'

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/95 backdrop-blur-lg border border-border shadow-xl text-sm select-none">

      {isText && (
        <>
          {/* FONT FAMILY */}
          <select
            value={String(merged.fontFamily ?? "Inter")}
            onChange={e => setStyle('fontFamily', e.target.value)}
            className="h-8 px-2 rounded-md border border-border bg-muted text-xs"
          >
            <option>Inter</option>
            <option>Arial</option>
            <option>Roboto</option>
            <option>Georgia</option>
            <option>Courier New</option>
          </select>

          {/* FONT SIZE */}
          {'fontSize' in merged && (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={parseFloat(String(merged.fontSize)) || 16}
                onChange={e => setStyle('fontSize', Number(e.target.value))}
                className="h-8 w-14 text-center rounded-md border border-border bg-muted text-xs"
                min={8}
                max={300}
              />
              <span className="text-muted-foreground text-xs">px</span>
            </div>
          )}

          <Sep />

          {/* BOLD */}
          <IconBtn
            active={isBold}
            onClick={() => setStyle('fontWeight', isBold ? 400 : 700)}
            title="Bold"
          >
            <Bold size={14} />
          </IconBtn>

          {/* ITALIC */}
          <IconBtn
            active={isItalic}
            onClick={() =>
              setStyle('fontStyle', isItalic ? 'normal' : 'italic')
            }
            title="Italic"
          >
            <Italic size={14} />
          </IconBtn>

          <Sep />

          {/* ALIGNMENT */}
          <IconBtn
            active={merged.textAlign === 'left'}
            onClick={() => setStyle('textAlign', 'left')}
            title="Align left"
          >
            <AlignLeft size={14} />
          </IconBtn>

          <IconBtn
            active={merged.textAlign === 'center'}
            onClick={() => setStyle('textAlign', 'center')}
            title="Align center"
          >
            <AlignCenter size={14} />
          </IconBtn>

          <IconBtn
            active={merged.textAlign === 'right'}
            onClick={() => setStyle('textAlign', 'right')}
            title="Align right"
          >
            <AlignRight size={14} />
          </IconBtn>

          <Sep />

          {/* COLOR */}
          {'color' in merged && (
            <ColorSwatch
              color={merged.color}
              title="Text color"
              onChange={v => setStyle('color', v)}
            />
          )}
        </>
      )}

      <Sep />

      {/* <IconBtn onClick={onDeselect} title="Close">
        <X size={14} />
      </IconBtn> */}
    </div>
  )
}

function Sep() {
  return <div className="w-px h-5 bg-border/60 mx-1" />
}

function IconBtn({
  children,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode
  active?: boolean
  onClick: () => void
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-8 w-8 flex items-center justify-center rounded-md transition
        ${active
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted text-foreground'
        }`}
    >
      {children}
    </button>
  )
}

function ColorSwatch({
  color,
  title,
  onChange,
}: {
  color: unknown
  title?: string
  onChange: (v: string) => void
}) {
  return (
    <label className="relative cursor-pointer" title={title}>
      <span
        className="w-6 h-6 rounded-md border border-border shadow-sm block"
        style={{ background: typeof color === 'string' ? color : '#fff' }}
      />
      <input
        type="color"
        value={toHex(color)}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />
    </label>
  )
}

function toHex(color: unknown): string {
  if (!color || typeof color !== 'string') return '#ffffff'
  const c = color.trim()

  if (c.startsWith('#')) return c.slice(0, 7)

  const m = c.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (m)
    return (
      '#' +
      [m[1], m[2], m[3]]
        .map(n => parseInt(n).toString(16).padStart(2, '0'))
        .join('')
    )

  return '#ffffff'
}