import { useMemo, useState } from 'react'
import {
  ChevronsUpDown,
  Cpu,
  Database,
  GitBranch,
  Package,
  Heart,
  Play,
  Plus,
  ShoppingBag,
  Shield,
  Star,
  type LucideIcon,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import SceneSortablePillList from './SceneSortablePillList'

const ICON_OPTIONS = [
  { name: 'star', Preview: Star },
  { name: 'heart', Preview: Heart },
  { name: 'shield', Preview: Shield },
  { name: 'play', Preview: Play },
  { name: 'openai', Preview: Star },
  { name: 'anthropic', Preview: Star },
  { name: 'shopify', Preview: ShoppingBag },
  { name: 'midjourney', Preview: Star },
  { name: 'react', Preview: Star },
  { name: 'typescript', Preview: Star },
  { name: 'nodejs', Preview: Package },
  { name: 'postgresql', Preview: Database },
  { name: 'github', Preview: GitBranch },
  { name: 'slack', Preview: Star },
  { name: 'jira', Preview: Star },
  { name: 'figma', Preview: Star },
  { name: 'cursor', Preview: Cpu },
] as const

function IconPreview({
  name,
  Preview,
  size = 24,
}: {
  name: string
  Preview?: LucideIcon
  size?: number
}) {
  if (Preview) return <Preview size={size} />

  return (
    <div
      className="flex items-center justify-center rounded-md border border-border bg-muted text-[10px] font-medium uppercase"
      style={{ width: size, height: size }}
    >
      {name.slice(0, 2)}
    </div>
  )
}

function IconGrid({
  selectedValues,
  onSelect,
}: {
  selectedValues: string[]
  onSelect: (value: string) => void
}) {
  const [query, setQuery] = useState('')

  const filteredIcons = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return ICON_OPTIONS
    return ICON_OPTIONS.filter(icon => icon.name.includes(normalized))
  }, [query])

  return (
    <PopoverContent className="w-fit p-0" align="start" sideOffset={6}>
      <div className="border-b px-2 py-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search icons..."
          className="h-8 w-[180px] rounded-md border border-border bg-background px-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring/50"
        />
      </div>

      <div className="max-h-[240px] overflow-y-auto px-2 py-2">
        <div className="grid grid-cols-4 gap-1 justify-items-center">
          {filteredIcons.map(icon => {
            const isSelected = selectedValues.includes(icon.name)

            return (
              <div
                key={icon.name}
                role="button"
                tabIndex={0}
                title={icon.name}
                onClick={() => onSelect(icon.name)}
                className={cn(
                  'inline-flex cursor-pointer rounded-sm p-1',
                  isSelected && 'bg-accent'
                )}
              >
                <IconPreview name={icon.name} Preview={icon.Preview} size={24} />
              </div>
            )
          })}
        </div>
      </div>
    </PopoverContent>
  )
}

export function SingleSceneIconPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selectedOption = ICON_OPTIONS.find(icon => icon.name === value)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-9 w-full px-3 rounded-md border border-border bg-background hover:bg-accent/40 transition-colors text-sm flex items-center gap-2"
        >
          <IconPreview name={value} Preview={selectedOption?.Preview} size={16} />
          <span className="truncate">{value}</span>
          <ChevronsUpDown size={14} className="ml-auto shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <IconGrid
        selectedValues={[value]}
        onSelect={next => {
          onChange(next)
          setOpen(false)
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
  value: string[]
  onChange: (value: string[]) => void
  minItems?: number
}) {
  const [open, setOpen] = useState(false)

  const items = value.map((item, index) => {
    const option = ICON_OPTIONS.find(icon => icon.name === item)
    return {
      id: `${index}:${item}`,
      label: item,
      preview: <IconPreview name={item} Preview={option?.Preview} size={14} />,
    }
  })

  const reorderValues = (ids: string[]) => {
    const indexed = value.map((item, index) => ({ id: `${index}:${item}`, value: item }))
    const next = ids
      .map(id => indexed.find(entry => entry.id === id))
      .filter((entry): entry is { id: string; value: string } => Boolean(entry))
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

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            Add icon
          </button>
        </PopoverTrigger>
        <IconGrid
          selectedValues={value}
          onSelect={next => {
            if (!value.includes(next)) onChange([...value, next])
          }}
        />
      </Popover>
    </div>
  )
}
