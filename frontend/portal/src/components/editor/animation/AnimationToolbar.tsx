import React from 'react'
import type { RegistryEntry } from '@coasterai/renderer'
import { TextToolbar } from './toolbars/TextToolbar'
import { ImageToolbar } from './toolbars/ImageToolbar'
import { IconToolbar } from './toolbars/IconToolbar'
import { ElementEdit } from '@coasterai/renderer/src/types/ast'


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
}: AnimationToolbarProps) {
  if (!selectedEid) return null

  const entry = registry[selectedEid]
  if (!entry) return null

  const isText = entry.textType === 'static'
  const isImage = entry.assetType === 'image'
  const isIcon = entry.assetType === 'icon'

  if (!isText && !isImage && !isIcon) return null

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-background/95 backdrop-blur-lg border border-border shadow-xl text-sm select-none">
      {isText && (
        <TextToolbar eid={selectedEid} registry={registry} editStore={editStore} onEdit={onEdit} />
      )}
      {isImage && (
        <ImageToolbar eid={selectedEid} registry={registry} editStore={editStore} onEdit={onEdit} />
      )}
      {isIcon && (
        <IconToolbar eid={selectedEid} registry={registry} editStore={editStore} onEdit={onEdit} />
      )}
    </div>
  )
}