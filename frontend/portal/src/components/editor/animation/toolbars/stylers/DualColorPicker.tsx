// ─── Dual Color Picker ──────────────────────────────────────────────────────
// Single button that opens a popover with tabs for Text and Background color.

import { useState } from "react"
import { HexColorPicker } from "react-colorful"

export function DualColorPicker({
  textColor,
  bgColor,
  onTextColor,
  onBgColor,
}: {
  textColor: string
  bgColor: string
  onTextColor: (v: string) => void
  onBgColor: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'text' | 'bg'>('text')

  const activeColor = tab === 'text' ? textColor : bgColor
  const onChangeActive = tab === 'text' ? onTextColor : onBgColor

  return (
    <div className="relative flex items-center">
      {/* Color button – rainbow gradient rectangle */}
      <button
        title="Colors"
        onClick={() => setOpen(!open)}
        className="w-8 h-7 rounded-md border border-border shadow-sm cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)',
        }}
      />

      {open && (
        <div className="absolute top-9 left-0 z-50 bg-background border border-border rounded-lg shadow-lg p-3 w-56 space-y-3">
          {/* Tabs */}
          <div className="flex rounded-md border border-border overflow-hidden text-xs">
            <button
              onClick={() => setTab('text')}
              className={`flex-1 py-1 transition-colors ${
                tab === 'text'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Text
            </button>
            <button
              onClick={() => setTab('bg')}
              className={`flex-1 py-1 transition-colors ${
                tab === 'bg'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              Background
            </button>
          </div>

          <HexColorPicker color={activeColor} onChange={onChangeActive} />

          <input
            value={activeColor}
            onChange={(e) => onChangeActive(e.target.value)}
            className="w-full text-xs px-2 py-1 border border-border rounded bg-muted"
          />

          <div className="flex justify-end">
            <button
              onClick={() => setOpen(false)}
              className="text-xs font-medium"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}