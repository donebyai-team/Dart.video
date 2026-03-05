import React from 'react'

export function Sep() {
  return <div className="w-px h-5 bg-border/60 mx-1" />
}

export function IconBtn({
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
      className={`h-8 w-8 flex items-center justify-center rounded-md transition ${
        active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

export function ColorSwatch({
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

export function toHex(color: unknown): string {
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
