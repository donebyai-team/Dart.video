import { useState } from 'react'
import {
  ChevronsUpDown,
  Plus,
} from 'lucide-react'
import { Popover, PopoverTrigger } from '@/components/ui/popover'
import SceneSortablePillList from './SceneSortablePillList'
import { IconPicker } from '../IconPicker'
import { Icon } from '../../../../../packages/animation/src'

function IconPreview({
  icon,
  size = 24,
}: {
  icon: Icon
  size?: number
}) {
  if (icon?.icon) {
    return (
      <img
        src={icon.icon}
        alt={icon.name}
        width={size}
        height={size}
        loading="lazy"
        className="object-contain"
      />
    )
  }

  return (
    <div
      className="flex items-center justify-center rounded-md border border-border bg-muted text-[10px] font-medium uppercase"
      style={{ width: size, height: size }}
    >
      ?
    </div>
  )
}

export function SingleSceneIconPicker({
  value,
  onChange,
}: {
  value: Icon
  onChange: (value: Icon) => void
}) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-9 w-full px-3 rounded-md border border-border bg-background hover:bg-accent/40 transition-colors text-sm flex items-center gap-2"
        >
          <span className="truncate">{value.name}</span>
          <ChevronsUpDown size={14} className="ml-auto shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <IconPicker
        onChange={(icon) => {
          console.log(icon)
        }}
      />
    </Popover>
  )
}

export function MultiSceneIconPicker({
  value,
  onChange,
  minItems = 2,
}: {
  value: Icon[]
  onChange: (value: Icon[]) => void
  minItems?: number
}) {
  const [open, setOpen] = useState(false)

  const items = value.map((item, index) => {
    return {
      id: `${index}:${item}`,
      label: item.name,
      preview: <IconPreview icon={item} size={14} />,
    }
  })

  const reorderValues = (ids: string[]) => {
    const indexed = value.map((item, index) => ({ id: `${index}:${item}`, value: item }))
    const next = ids
      .map(id => indexed.find(entry => entry.id === id))
      .filter((entry): entry is { id: string; value: Icon } => Boolean(entry))
      .map(entry => entry.value)
    onChange(next.length === value.length ? next : value)
  }

  return (
    <div className="flex flex-col gap-2">
      <SceneSortablePillList
        items={items}
        minItems={minItems}
        onRemove={id => reorderValues(items.filter(item => item.id !== id).map(item => item.id))}
        onReorder={reorderValues}
      />

      <IconPicker
        onChange={(icon) => {
          onChange([...value, icon])
        }}
      />
    </div>
  )
}
