import type { PatchOverlay } from '@coasterai/renderer'
import { StyleOverrideSection } from './toolbars/shared'

interface AnimationToolbarProps {
  selectedId: string
  overlay: PatchOverlay
  onValuePatch: (id: string, prop: string, value: unknown) => void
  onStyleOverride: (id: string, style: Record<string, string | number>) => void
  onDeselect: () => void
}

export function AnimationToolbar({
  selectedId,
  overlay,
  onStyleOverride,
}: AnimationToolbarProps) {
  const style = (overlay[selectedId]?.style as Record<string, string | number> | undefined) ?? {}

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-background/95 backdrop-blur-lg border border-border shadow-xl text-sm select-none max-w-[700px]">
      <StyleOverrideSection
        styleOverride={style}
        onStyleOverride={next => onStyleOverride(selectedId, next)}
        collapsible={false}
      />
    </div>
  )
}
