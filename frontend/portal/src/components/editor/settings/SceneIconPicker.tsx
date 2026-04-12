import { useState } from 'react'
import SceneSortablePillList from './SceneSortablePillList'
import { IconPicker } from '../IconPicker'
import type { Icon } from '../IconPicker'

function IconPreview({
  icon,
  size = 14,
}: {
  icon: Icon
  size?: number
}) {
  if (icon.icon) {
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

  return (
    <IconPicker
      onChange={(icon) => {
        onChange(icon)
      }}
    />
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
      id: `${index}`,
      label: item.name,
      preview: <IconPreview icon={item} />,
    }
  })

  const reorderValues = (ids: string[]) => {
    const indexed = value.map((item, index) => ({ id: `${index}`, value: item }))
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
        onRemove={id => onChange(value.filter((_, index) => `${index}` !== id))}
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
