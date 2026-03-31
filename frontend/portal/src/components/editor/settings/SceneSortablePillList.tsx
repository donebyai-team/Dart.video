import { useMemo, type ReactNode } from 'react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X } from 'lucide-react'

type SortablePillItemData = {
  id: string
  label: string
  preview?: ReactNode
}

function SortablePill({
  item,
  onRemove,
  canRemove,
}: {
  item: SortablePillItemData
  onRemove: () => void
  canRemove: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  return (
    <span
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
      }}
      className="inline-flex items-center gap-1 rounded-sm border border-border bg-muted px-3 py-1 text-sm"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      {item.preview}
      <span>{item.label}</span>
      <button
        type="button"
        disabled={!canRemove}
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </span>
  )
}

interface SceneSortablePillListProps {
  items: SortablePillItemData[]
  minItems?: number
  onReorder: (nextIds: string[]) => void
  onRemove: (id: string) => void
}

export default function SceneSortablePillList({
  items,
  minItems = 2,
  onReorder,
  onRemove,
}: SceneSortablePillListProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const ids = useMemo(() => items.map(item => item.id), [items])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = ids.indexOf(String(active.id))
    const newIndex = ids.indexOf(String(over.id))
    if (oldIndex === -1 || newIndex === -1) return

    onReorder(arrayMove(ids, oldIndex, newIndex))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <SortablePill
              key={item.id}
              item={item}
              canRemove={items.length > minItems}
              onRemove={() => onRemove(item.id)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
