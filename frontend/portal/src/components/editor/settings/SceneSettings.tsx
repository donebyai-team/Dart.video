import { useEffect, useMemo, useState } from 'react'
import type { PatchOverlay } from '@coasterai/renderer'
import { NumberStepper, SelectInput } from '../animation/toolbars/TextToolbar'
import { Button } from '@/components/ui/button'
import { Pause, Play, Plus } from 'lucide-react'
import { MultiSceneIconPicker, SingleSceneIconPicker } from './SceneIconPicker'
import { MultiSceneMediaPicker, SingleSceneMediaPicker } from './SceneMediaPicker'
import SceneSortablePillList from './SceneSortablePillList'
import { DualColorPicker } from '../animation/toolbars/stylers/DualColorPicker'
import { FieldDataType } from '../../../../../packages/animation/src'
import {
  getEditableSceneFields,
  getReservedSceneFieldOptions,
  resolveScenePatchEntryId,
  toSceneFieldLabel,
} from './sceneSettingsHelpers'
import { Icon } from '../IconPicker'

interface SceneSettingsProps {
  elementId: string
  overlay: PatchOverlay
  onValuePatch: (id: string, prop: string, value: unknown) => void
  onPreviewTemplate?: () => void
  isPreviewPlaying?: boolean
  onClose?: () => void;
}

export default function SceneSettings({
  elementId,
  overlay,
  onValuePatch,
  onPreviewTemplate,
  isPreviewPlaying = false,
  onClose,
}: SceneSettingsProps) {
  const MIN_ARRAY_ITEMS = 2
  const [arrayDrafts, setArrayDrafts] = useState<Record<string, string>>({})
  const patchEntryId = useMemo(() => resolveScenePatchEntryId(elementId, overlay), [elementId, overlay])
  const patchEntry = useMemo<Record<string, unknown>>(() => {
    if (!patchEntryId) return {}
    const entry = overlay[patchEntryId]
    return typeof entry === 'object' && entry !== null ? (entry as Record<string, unknown>) : {}
  }, [overlay, patchEntryId])

  const fields = useMemo(() => getEditableSceneFields(elementId, overlay), [elementId, overlay])

  useEffect(() => {
    setArrayDrafts({})
  }, [patchEntryId])

  useEffect(() => {
    if (fields.length === 0) {
      onClose?.()
    }
  }, [fields.length, onClose])

  if (fields.length == 0) {
    return null
  }

  return (
    <div className="h-full flex flex-col rounded-xl border bg-background shadow-sm">
      <div className="p-2 border-b border-border flex items-center justify-between">
        <h2 className="font-semibold">Settings</h2>
        {onPreviewTemplate && (
          <Button variant='secondary' size='sm' className='h-7 gap-1.5 px-2.5 text-xs' onClick={onPreviewTemplate}>
            {isPreviewPlaying ? <Pause className='w-3 h-3' /> : <Play className='w-3 h-3' />}
            {isPreviewPlaying ? 'Stop' : 'Preview'}
          </Button>
        )}
      </div>

      <div className="p-4 space-y-4 overflow-auto">
        {/* {fields.length === 0 && (
          <div className="text-sm text-muted-foreground">No editable props found yet.</div>
        )} */}

        {fields.map(field => {
          const prop = field.name
          const value = patchEntry[prop]
          const enumOptions = getReservedSceneFieldOptions(prop)
          const isArrayField = field.type === 'array'
          const isBooleanField = typeof value === 'boolean'

          const content = field.type === 'enum' ? (
            <label key={prop} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{toSceneFieldLabel(prop)}</span>
              <SelectInput
                value={String(value ?? 'body')}
                options={(enumOptions ?? []).map(option => ({
                  label: option,
                  value: option,
                }))}
                onChange={next => onValuePatch(patchEntryId ?? elementId, prop, next)}
                width="w-full"
              />
            </label>
          ) : field.datatype === FieldDataType.Icon && !isArrayField ? (
            <label key={prop} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{toSceneFieldLabel(prop)}</span>
              <SingleSceneIconPicker
                value={{ name: "", icon: String(value) } as Icon}
                onChange={next => onValuePatch(patchEntryId ?? elementId, prop, next.icon)}
              />
            </label>
          ) : field.datatype === FieldDataType.Icon && isArrayField ? (
            <div key={prop} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{toSceneFieldLabel(prop)}</span>
              <MultiSceneIconPicker
                value={(Array.isArray(value) ? value : []).map(v => ({ name: "", icon: String(v) } as Icon))}
                onChange={next => onValuePatch(patchEntryId ?? elementId, prop, next.map(i => i.icon))}
                minItems={MIN_ARRAY_ITEMS}
              />
            </div>
          ) : field.datatype === FieldDataType.Media && !isArrayField ? (
            <label key={prop} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{toSceneFieldLabel(prop)}</span>
              <SingleSceneMediaPicker
                // mediaType='image'
                fieldName={prop}
                value={String(value ?? '')}
                onChange={next => {
                  // Add other properties if needed
                  onValuePatch(patchEntryId ?? elementId, prop, next.url)
                  onValuePatch(patchEntryId ?? elementId, "_duration", next.duration * 30)
                }}
              />
            </label>
          ) : field.datatype === FieldDataType.Media && isArrayField ? (
            <div key={prop} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{toSceneFieldLabel(prop)}</span>
              <MultiSceneMediaPicker
                // mediaType='image'
                value={Array.isArray(value) ? value.map(item => String(item)) : []}
                onChange={next => onValuePatch(patchEntryId ?? elementId, prop, next)}
                minItems={MIN_ARRAY_ITEMS}
              />
            </div>
          ) : field.datatype === FieldDataType.Color ? (
            <label key={prop} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{toSceneFieldLabel(prop)}</span>
              <DualColorPicker
                primaryColor={String(value ?? '')}
                onPrimaryColor={next => onValuePatch(patchEntryId ?? elementId, prop, next)}
                primaryLabel="Text color"
                triggerVariant="input"
                triggerStyle="active-color"
              />
            </label>
          ) : field.type === 'string' ? (
            <label key={prop} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{toSceneFieldLabel(prop)}</span>
              <textarea
                value={String(value ?? '')}
                onChange={e => onValuePatch(patchEntryId ?? elementId, prop, e.target.value)}
                className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring/50"
              />
            </label>
          ) : field.type === 'number' ? (
            <div key={prop} className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">{toSceneFieldLabel(prop)}</span>
              <NumberStepper
                value={Number(value ?? field.default ?? 0)}
                onChange={next => onValuePatch(patchEntryId ?? elementId, prop, next)}
                inputWidth="w-20"
              />
            </div>
          ) : isBooleanField ? (
            <label key={prop} className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">{toSceneFieldLabel(prop)}</span>
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={e => onValuePatch(patchEntryId ?? elementId, prop, e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
            </label>
          ) : field.type === 'array' ? (
            <div key={prop} className="flex flex-col gap-2">
              <span className="text-sm font-medium">{toSceneFieldLabel(prop)}</span>
              <SceneSortablePillList
                items={(Array.isArray(value) ? value : []).map((item, itemIndex) => ({
                  id: `${itemIndex}:${item}`,
                  label: String(item),
                }))}
                minItems={MIN_ARRAY_ITEMS}
                onRemove={id => {
                  const next = (Array.isArray(value) ? value : [])
                    .map((item, itemIndex) => ({ id: `${itemIndex}:${item}`, value: item }))
                    .filter(item => item.id !== id)
                    .map(item => item.value)
                  onValuePatch(patchEntryId ?? elementId, prop, next)
                }}
                onReorder={nextIds => {
                  const indexed = (Array.isArray(value) ? value : []).map((item, itemIndex) => ({
                    id: `${itemIndex}:${item}`,
                    value: String(item),
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
                    onValuePatch(patchEntryId ?? elementId, prop, [...(Array.isArray(value) ? value : []), nextItem])
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
                    onValuePatch(patchEntryId ?? elementId, prop, [...(Array.isArray(value) ? value : []), nextItem])
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
