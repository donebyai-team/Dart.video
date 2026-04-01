import { useMemo, useState } from 'react'
import type { PatchOverlay } from '@coasterai/renderer'
import { NumberStepper, SelectInput } from '../animation/toolbars/TextToolbar'
import { Button } from '@/components/ui/button'
import { Pause, Play, Plus } from 'lucide-react'
import { MultiSceneIconPicker, SingleSceneIconPicker } from './SceneIconPicker'
import { MultiSceneMediaPicker, SingleSceneMediaPicker } from './SceneMediaPicker'
import SceneSortablePillList from './SceneSortablePillList'
import {
  compareSceneFieldsByPriority,
  getEditableSceneFields,
  resolveScenePatchEntryId,
  toSceneFieldLabel,
} from './sceneSettingsHelpers'

interface SceneSettingsProps {
  elementId: string
  overlay: PatchOverlay
  onValuePatch: (id: string, prop: string, value: unknown) => void
  onPlay?: () => void
  isPreviewPlaying?: boolean
}

export default function SceneSettings({
  elementId,
  overlay,
  onValuePatch,
  onPlay,
  isPreviewPlaying = false,
}: SceneSettingsProps) {
  const MIN_ARRAY_ITEMS = 2
  const [arrayDrafts, setArrayDrafts] = useState<Record<string, string>>({})
  const patchEntryId = useMemo(() => resolveScenePatchEntryId(elementId, overlay), [elementId, overlay])

  const fields = useMemo(() => {
    return getEditableSceneFields(elementId, overlay).sort((left, right) =>
      compareSceneFieldsByPriority(left, right),
    )
  }, [elementId, overlay])

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold">Settings</h2>
        {onPlay && (
          <Button variant='secondary' size='sm' className='h-7 gap-1.5 px-2.5 text-xs' onClick={onPlay}>
            {isPreviewPlaying ? <Pause className='w-3 h-3' /> : <Play className='w-3 h-3' />}
            {isPreviewPlaying ? 'Stop' : 'Preview'}
          </Button>
        )}
      </div>

      <div className="p-4 space-y-4 overflow-auto">
        {fields.length === 0 && (
          <div className="text-sm text-muted-foreground">No editable props found yet.</div>
        )}

        {fields.map((field, index) => {
          const { prop, value, definition } = field
          if (!definition) return null

          const content = definition.kind === 'enum' ? (
            <label key={prop} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{toSceneFieldLabel(prop)}</span>
              <SelectInput
                value={String(value ?? 'body')}
                options={(definition.options ?? []).map((option: string) => ({
                  label: option,
                  value: option,
                }))}
                onChange={next => onValuePatch(patchEntryId ?? elementId, prop, next)}
                width="w-full"
              />
            </label>
          ) : definition.kind === 'icon' ? (
            <label key={prop} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{toSceneFieldLabel(prop)}</span>
              <SingleSceneIconPicker
                value={String(value)}
                onChange={next => onValuePatch(patchEntryId ?? elementId, prop, next)}
              />
            </label>
          ) : definition.kind === 'icon[]' ? (
            <div key={prop} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{toSceneFieldLabel(prop)}</span>
              <MultiSceneIconPicker
                value={value as string[]}
                onChange={next => onValuePatch(patchEntryId ?? elementId, prop, next)}
                minItems={MIN_ARRAY_ITEMS}
              />
            </div>
          ) : definition.kind === 'media' ? (
            <label key={prop} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{toSceneFieldLabel(prop)}</span>
              <SingleSceneMediaPicker
                fieldName={prop}
                value={String(value)}
                onChange={next => onValuePatch(patchEntryId ?? elementId, prop, next)}
              />
            </label>
          ) : definition.kind === 'media[]' ? (
            <div key={prop} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{toSceneFieldLabel(prop)}</span>
              <MultiSceneMediaPicker
                value={value as string[]}
                onChange={next => onValuePatch(patchEntryId ?? elementId, prop, next)}
                minItems={MIN_ARRAY_ITEMS}
              />
            </div>
          ) : definition.kind === 'string' ? (
            <label key={prop} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{toSceneFieldLabel(prop)}</span>
              <input
                type="text"
                value={String(value)}
                onChange={e => onValuePatch(patchEntryId ?? elementId, prop, e.target.value)}
                className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring/50"
              />
            </label>
          ) : definition.kind === 'number' ? (
            <div key={prop} className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">{toSceneFieldLabel(prop)}</span>
              <NumberStepper
                value={Number(value)}
                onChange={next => onValuePatch(patchEntryId ?? elementId, prop, next)}
                inputWidth="w-20"
              />
            </div>
          ) : definition.kind === 'boolean' ? (
            <label key={prop} className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">{toSceneFieldLabel(prop)}</span>
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={e => onValuePatch(patchEntryId ?? elementId, prop, e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
            </label>
          ) : definition.kind === 'string[]' ? (
            <div key={prop} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{toSceneFieldLabel(prop)}</span>
              <SceneSortablePillList
                items={(value as string[]).map((item, itemIndex) => ({
                  id: `${itemIndex}:${item}`,
                  label: item,
                }))}
                minItems={MIN_ARRAY_ITEMS}
                onRemove={id => {
                  const next = (value as string[])
                    .map((item, itemIndex) => ({ id: `${itemIndex}:${item}`, value: item }))
                    .filter(item => item.id !== id)
                    .map(item => item.value)
                  onValuePatch(patchEntryId ?? elementId, prop, next)
                }}
                onReorder={nextIds => {
                  const indexed = (value as string[]).map((item, itemIndex) => ({
                    id: `${itemIndex}:${item}`,
                    value: item,
                  }))
                  const next = nextIds
                    .map(id => indexed.find(item => item.id === id))
                    .filter((item): item is { id: string; value: string } => Boolean(item))
                    .map(item => item.value)
                  onValuePatch(patchEntryId ?? elementId, prop, next)
                }}
              />
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={arrayDrafts[prop] ?? ''}
                  onChange={e =>
                    setArrayDrafts(prev => ({
                      ...prev,
                      [prop]: e.target.value,
                    }))
                  }
                  onKeyDown={e => {
                    if (e.key !== 'Enter') return
                    e.preventDefault()
                    const nextItem = (arrayDrafts[prop] ?? '').trim()
                    if (!nextItem) return
                    onValuePatch(patchEntryId ?? elementId, prop, [...(value as string[]), nextItem])
                    setArrayDrafts(prev => ({ ...prev, [prop]: '' }))
                  }}
                  className="h-9 flex-1 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring/50"
                  placeholder={`Add ${toSceneFieldLabel(prop).toLowerCase()}...`}
                />
                <button
                  type="button"
                  onClick={() => {
                    const nextItem = (arrayDrafts[prop] ?? '').trim()
                    if (!nextItem) return
                    onValuePatch(patchEntryId ?? elementId, prop, [...(value as string[]), nextItem])
                    setArrayDrafts(prev => ({ ...prev, [prop]: '' }))
                  }}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:text-foreground"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : null

          if (!content) return null

          return (
            <div key={prop}>{content}</div>
          )
        })}
      </div>
    </div>
  )
}
