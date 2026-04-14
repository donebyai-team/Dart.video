import { useState } from 'react'
import ManualMediaImportPanel, { type ManualMediaConfirmPayload } from '@/components/assets/ManualMediaImportPanel'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import SceneSortablePillList from './SceneSortablePillList'

function getMediaLabel(url: string): string {
  try {
    const pathname = new URL(url).pathname
    return decodeURIComponent(pathname.split('/').pop() || url)
  } catch {
    return url.split('/').pop() || url
  }
}

function moveValuesByIds(values: string[], ids: string[]): string[] {
  const indexed = values.map((value, index) => ({ id: `${index}:${value}`, value }))
  const next = ids
    .map(id => indexed.find(item => item.id === id))
    .filter((item): item is { id: string; value: string } => Boolean(item))
    .map(item => item.value)
  return next.length === values.length ? next : values
}

export function SingleSceneMediaPicker({
  mediaType,
  fieldName,
  value,
  onChange,
}: {
  mediaType?: 'image' | 'video'
  fieldName?: string
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)

  const handleConfirm = async ({ asset }: ManualMediaConfirmPayload) => {
    onChange(asset.url)
    setOpen(false)
  }

  const buttonLabel = 'Replace'

  return (
    <div className="flex flex-col gap-2">
      {/* {value ? (
        <div className="text-xs text-muted-foreground">
          Selected asset: {getMediaLabel(value)}
        </div>
      ) : null} */}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          {buttonLabel}
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl p-0">
          <ManualMediaImportPanel
            mediaType={mediaType}
            showPreview={false}
            onClose={() => setOpen(false)}
            onConfirm={handleConfirm}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function MultiSceneMediaPicker({
  mediaType,
  value,
  onChange,
  minItems = 2,
}: {
  mediaType?: 'image' | 'video'
  value: string[]
  onChange: (value: string[]) => void
  minItems?: number
}) {
  const [open, setOpen] = useState(false)

  const handleConfirm = async ({ asset }: ManualMediaConfirmPayload) => {
    onChange([...value, asset.url])
    setOpen(false)
  }

  const items = value.map((item, index) => ({
    id: `${index}:${item}`,
    label: getMediaLabel(item),
  }))

  return (
    <div className="flex flex-col gap-3">
      <SceneSortablePillList
        items={items}
        minItems={minItems}
        onRemove={id => {
          const next = items
            .filter(item => item.id !== id)
            .map(item => item.id)
          onChange(moveValuesByIds(value, next))
        }}
        onReorder={nextIds => onChange(moveValuesByIds(value, nextIds))}
      />
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          Add image
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl p-0">
          <ManualMediaImportPanel
            mediaType={mediaType}
            onClose={() => setOpen(false)}
            onConfirm={handleConfirm}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
