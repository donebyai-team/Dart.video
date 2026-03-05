import { X } from 'lucide-react'

export interface RegistryEntry {
  eid: string
  elementType: string
  textType: 'static' | 'dynamic' | 'animated' | 'mixed' | 'none'
  staticText?: string
  staticStyle: Record<string, any>
  nonEditable?: string[]
  assetType?: 'image' | 'icon' | 'none'
}

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
  // Empty state
  if (!selectedEid) {
    return (
      <div className="h-10 border-b border-border flex items-center px-3 text-sm text-muted-foreground select-none">
        Click an element to edit
      </div>
    )
  }

  const entry = registry[selectedEid]
  if (!entry) {
    return (
      <div className="h-10 border-b border-border flex items-center px-3 text-sm text-muted-foreground select-none">
        <span>Unknown element</span>
        <div className="flex-1" />
        <DeselectButton onDeselect={onDeselect} />
      </div>
    )
  }

  const currentStyle = { ...entry.staticStyle, ...(editStore[selectedEid]?.style ?? {}) }
  const currentText = editStore[selectedEid]?.text ?? entry.staticText ?? ''

  function onStyleChange(prop: string, value: string | number) {
    onEdit(selectedEid!, { style: { [prop]: value } })
  }

  // Text element controls
  if (entry.textType === 'static') {
    const fontSize = parseFloat(String(currentStyle.fontSize)) || 16
    const isBold =
      currentStyle.fontWeight === 700 ||
      currentStyle.fontWeight === '700' ||
      currentStyle.fontWeight === 'bold'
    const color = toHex(currentStyle.color)

    return (
      <div className="h-10 border-b border-border flex items-center px-3 gap-2 bg-background">
        {/* Text content */}
        <input
          type="text"
          value={currentText}
          onChange={e => onEdit(selectedEid!, { text: e.target.value })}
          className="h-7 px-2 text-sm bg-muted rounded border border-border w-48 focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Text content"
        />

        <Divider />

        {/* Font size */}
        {'fontSize' in currentStyle && (
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            Size
            <input
              type="number"
              value={fontSize}
              onChange={e => onStyleChange('fontSize', Number(e.target.value))}
              className="h-7 w-14 px-2 text-sm bg-muted rounded border border-border focus:outline-none focus:ring-1 focus:ring-ring"
              min={8}
              max={300}
            />
          </label>
        )}

        {/* Bold */}
        {'fontWeight' in currentStyle && (
          <button
            onClick={() => onStyleChange('fontWeight', isBold ? 400 : 700)}
            title="Bold"
            className={`h-7 w-7 flex items-center justify-center rounded text-sm font-bold transition-colors ${
              isBold ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
            }`}
          >
            B
          </button>
        )}

        {/* Color */}
        {'color' in currentStyle && (
          <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer">
            Color
            <span
              className="h-5 w-5 rounded border border-border overflow-hidden"
              style={{ background: currentStyle.color }}
            >
              <input
                type="color"
                value={color}
                onChange={e => onStyleChange('color', e.target.value)}
                className="opacity-0 w-full h-full cursor-pointer"
              />
            </span>
          </label>
        )}

        <div className="flex-1" />

        <DeselectButton onDeselect={onDeselect} />
      </div>
    )
  }

  // Fallback: non-text / prompt-only
  return (
    <div className="h-10 border-b border-border flex items-center px-3 gap-2 bg-background">
      <span className="text-sm text-muted-foreground">
        {entry.elementType}
      </span>
      <span className="text-xs text-muted-foreground/50">prompt-only editing</span>
      <div className="flex-1" />
      <DeselectButton onDeselect={onDeselect} />
    </div>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-border shrink-0" />
}

function DeselectButton({ onDeselect }: { onDeselect: () => void }) {
  return (
    <button
      onClick={onDeselect}
      className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted transition-colors"
      title="Deselect"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  )
}

/**
 * Convert any CSS color to #rrggbb for <input type="color">.
 * Only handles hex reliably; rgb/named colors fall back to white.
 */
function toHex(color: unknown): string {
  if (!color || typeof color !== 'string') return '#ffffff'
  const c = color.trim()
  if (c.startsWith('#')) {
    if (c.length === 4) {
      // #abc → #aabbcc
      return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`
    }
    return c.slice(0, 7)
  }
  // rgb(...) — parse and convert
  const m = c.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (m) {
    return (
      '#' +
      [m[1], m[2], m[3]]
        .map(n => parseInt(n).toString(16).padStart(2, '0'))
        .join('')
    )
  }
  return '#ffffff'
}
