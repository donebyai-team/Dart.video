// ─── Dual Color Picker ──────────────────────────────────────────────────────
// Single button that opens a popover with tabs for two color values.

import { Droplets } from "lucide-react"
import { useEffect, useState } from "react"
import { HexColorPicker } from "react-colorful"

import BrandColors from "@/components/editor/settings/BrandColors"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const FALLBACK_COLOR = "#000000"

function getTriggerBackground(color: string | undefined, triggerStyle: "gradient" | "active-color") {
  if (triggerStyle !== "active-color") {
    return "linear-gradient(135deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"
  }

  if (!color || color === "transparent") {
    return "repeating-conic-gradient(#d4d4d8 0% 25%, #ffffff 0% 50%) 50% / 10px 10px"
  }

  return color
}

export function DualColorPicker({
  primaryColor,
  secondaryColor,
  onPrimaryColor,
  onSecondaryColor,
  primaryLabel = "Primary",
  secondaryLabel = "Secondary",
  triggerStyle = "gradient",
  triggerVariant = "swatch",
  transparentTarget,
  onApplyPrimaryToAllScenes,
}: {
  primaryColor: string
  secondaryColor?: string
  onPrimaryColor: (v: string) => void
  onSecondaryColor?: (v: string) => void
  primaryLabel?: string
  secondaryLabel?: string
  triggerStyle?: "gradient" | "active-color"
  triggerVariant?: "swatch" | "input"
  transparentTarget?: 'primary' | 'secondary'
  onApplyPrimaryToAllScenes?: (v: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'primary' | 'secondary'>('primary')
  const [applyPrimaryToAllScenes, setApplyPrimaryToAllScenes] = useState(false)

  const hasSecondary = !!secondaryColor && !!onSecondaryColor
  const activeTab = hasSecondary ? tab : 'primary'
  const activeColorValue = activeTab === 'primary' ? primaryColor : secondaryColor
  const activeColor = activeColorValue && activeColorValue !== 'transparent' ? activeColorValue : FALLBACK_COLOR
  const onChangeActive = activeTab === 'primary' ? onPrimaryColor : onSecondaryColor
  const showTransparentButton = transparentTarget === activeTab || (transparentTarget === undefined && activeTab === 'secondary')
  const isTransparentActive = activeColorValue === 'transparent'
  const showApplyPrimaryOption = !!onApplyPrimaryToAllScenes

  const handlePrimaryColorChange = (nextColor: string) => {
    onPrimaryColor(nextColor)

    if (applyPrimaryToAllScenes) {
      onApplyPrimaryToAllScenes?.(nextColor)
    }
  }

  if (!onChangeActive) {
    return null
  }

  useEffect(() => {
    if (!showApplyPrimaryOption && applyPrimaryToAllScenes) {
      setApplyPrimaryToAllScenes(false)
    }
  }, [applyPrimaryToAllScenes, showApplyPrimaryOption])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="Colors"
          className={
            triggerVariant === "input"
              ? "flex h-7 w-9 items-center justify-center rounded-md border border-input bg-background shadow-sm"
              : "w-8 h-7 rounded-md border border-border shadow-sm cursor-pointer"
          }
          style={
            triggerVariant === "swatch" || triggerVariant === "input"
              ? {
                  background: getTriggerBackground(activeColorValue, triggerStyle),
                }
              : undefined
          }
        />
      </PopoverTrigger>

      <PopoverContent data-toolbar-popover="true" align="start" sideOffset={8} className="w-56 space-y-3 p-3">
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

          {showTransparentButton && (
            <button
              type="button"
              onClick={() => onChangeActive?.('transparent')}
              className={`flex w-full items-center justify-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                isTransparentActive
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <Droplets className="h-3.5 w-3.5" />
              Transparent
            </button>
          )}

          {showApplyPrimaryOption && activeTab === 'primary' && (
            <label className="flex items-center gap-2 text-xs text-foreground">
              <input
                type="checkbox"
                checked={applyPrimaryToAllScenes}
                onChange={(e) => {
                  const checked = e.target.checked
                  setApplyPrimaryToAllScenes(checked)
                  if (checked) {
                    onApplyPrimaryToAllScenes?.(primaryColor)
                  }
                }}
                className="h-4 w-4 rounded border-border"
              />
              Apply to all scenes
            </label>
          )}

          <HexColorPicker
            color={activeColor}
            onChange={activeTab === 'primary' ? handlePrimaryColorChange : onChangeActive}
          />

          <BrandColors
            selectedColor={activeColor}
            onSelect={activeTab === 'primary' ? handlePrimaryColorChange : onChangeActive}
            className="flex flex-wrap gap-1"
            swatchClassName="w-5 h-5 rounded border transition-all hover:scale-110"
          />

          <input
            value={activeColorValue || FALLBACK_COLOR}
            onChange={(e) => {
              const nextColor = e.target.value
              if (activeTab === 'primary') {
                handlePrimaryColorChange(nextColor)
                return
              }

              onChangeActive(nextColor)
            }}
            className="w-full text-xs px-2 py-1 border border-border rounded bg-muted"
          />
      </PopoverContent>
    </Popover>
  )
}
