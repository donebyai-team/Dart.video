// ─── Dual Color Picker ──────────────────────────────────────────────────────
// Single button that opens a popover with tabs for two color values.

import { useEffect, useRef, useState } from "react"
import { HexColorPicker } from "react-colorful"

import BrandColors from "@/components/editor/settings/BrandColors"

const FALLBACK_COLOR = "#000000"

export function DualColorPicker({
  primaryColor,
  secondaryColor,
  onPrimaryColor,
  onSecondaryColor,
  primaryLabel = "Primary",
  secondaryLabel = "Secondary",
  triggerStyle = "gradient",
  triggerVariant = "swatch",
}: {
  primaryColor: string
  secondaryColor?: string
  onPrimaryColor: (v: string) => void
  onSecondaryColor?: (v: string) => void
  primaryLabel?: string
  secondaryLabel?: string
  triggerStyle?: "gradient" | "active-color"
  triggerVariant?: "swatch" | "input"
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'primary' | 'secondary'>('primary')
  const containerRef = useRef<HTMLDivElement>(null)

  const hasSecondary = !!secondaryColor && !!onSecondaryColor
  const activeTab = hasSecondary ? tab : 'primary'
  const activeColorValue = activeTab === 'primary' ? primaryColor : secondaryColor
  const activeColor = activeColorValue || FALLBACK_COLOR
  const onChangeActive = activeTab === 'primary' ? onPrimaryColor : onSecondaryColor

  if (!onChangeActive) {
    return null
  }

  useEffect(() => {
    if (!open) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative flex items-center">
      <button
        type="button"
        title="Colors"
        onClick={() => setOpen(!open)}
        className={
          triggerVariant === "input"
            ? "flex h-7 w-9 items-center justify-center rounded-md border border-input bg-background shadow-sm"
            : "w-8 h-7 rounded-md border border-border shadow-sm cursor-pointer"
        }
        style={
          triggerVariant === "swatch" || triggerVariant === "input"
            ? {
                background:
                  triggerStyle === "active-color"
                    ? activeColorValue || FALLBACK_COLOR
                    : "linear-gradient(135deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
              }
            : undefined
        }
      />

      {open && (
        <div className="absolute top-9 left-0 z-50 bg-background border border-border rounded-lg shadow-lg p-3 w-56 space-y-3">
          {hasSecondary && (
            <div className="flex rounded-md border border-border overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setTab('primary')}
                className={`flex-1 py-1 transition-colors ${
                  tab === 'primary'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {primaryLabel}
              </button>
              <button
                type="button"
                onClick={() => setTab('secondary')}
                className={`flex-1 py-1 transition-colors ${
                  tab === 'secondary'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {secondaryLabel}
              </button>
            </div>
          )}

          {!hasSecondary && (
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {primaryLabel}
            </div>
          )}

          <HexColorPicker color={activeColor} onChange={onChangeActive} />

          <BrandColors
            selectedColor={activeColor}
            onSelect={onChangeActive}
            className="flex flex-wrap gap-1"
            swatchClassName="w-5 h-5 rounded border transition-all hover:scale-110"
          />

          <input
            value={activeColor}
            onChange={(e) => onChangeActive(e.target.value)}
            className="w-full text-xs px-2 py-1 border border-border rounded bg-muted"
          />
        </div>
      )}
    </div>
  )
}
