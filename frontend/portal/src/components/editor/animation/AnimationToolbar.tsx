import { resolveComponentFromId, type PatchOverlay } from '@coasterai/renderer'
import { ContainerToolbar } from './toolbars/ContainerToolbar'
import { MediaToolbar } from './toolbars/MediaToolbar'
import { TextToolbar } from './toolbars/TextToolbar'

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
  const resolvedComponent = resolveComponentFromId(selectedId)
  const resolvedName = resolvedComponent?.name ?? ''
  const name = resolvedName?.toLowerCase() || "";

  const isImage = name.includes("image");
  const isVideo = name.includes("video");
  const isContainer = selectedId.toLowerCase().includes('container');
  const isMediaComponent = isImage || isVideo;

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-1.5 rounded-xl bg-background/95 backdrop-blur-lg border border-border shadow-xl text-sm select-none max-w-[850px]">
      {isContainer ? (
        <ContainerToolbar
          styleOverride={style}
          selectedElementId={selectedId}
          onStyleOverride={next => onStyleOverride(selectedId, next)}
        />
      ) : isMediaComponent ? (
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
