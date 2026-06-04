import { resolveComponentFromId, type PatchOverlay } from '@coasterai/renderer'
import { ContainerToolbar } from './toolbars/ContainerToolbar'
import { MediaToolbar } from './toolbars/MediaToolbar'
import { TextToolbar } from './toolbars/TextToolbar'
import { isMediaComponent } from '@coasterai/animation'

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
  const isContainer = selectedId.toLowerCase().includes('container');
  const isMedia = isMediaComponent(selectedId)

  return (
    <div className="flex w-[min(800px,calc(100vw-54px))] flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl bg-background/95 backdrop-blur-lg border border-border shadow-xl text-sm select-none">
      {isContainer ? (
        <ContainerToolbar
          styleOverride={style}
          selectedElementId={selectedId}
          onStyleOverride={next => onStyleOverride(selectedId, next)}
        />
      ) : isMedia ? (
        <MediaToolbar
          styleOverride={style}
          selectedElementId={selectedId}
          onStyleOverride={next => onStyleOverride(selectedId, next)}
        />
      ) : (
        <TextToolbar
          styleOverride={style}
          onStyleOverride={next => onStyleOverride(selectedId, next)}
          selectedElementId={selectedId}
        />
      )}
    </div>
  );
}
