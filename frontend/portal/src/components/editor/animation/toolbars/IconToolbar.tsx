import React, { useMemo, useState } from 'react'
import {
  Bell,
  Bookmark,
  Camera,
  ChevronsUpDown,
  Circle,
  Globe,
  Heart,
  MessageCircle,
  Play,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Zap,
  Shapes,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { ColorSwatch, NumberStepper } from './TextToolbar'


const ICON_OPTIONS = [
  { name: 'star', Preview: Star },
  { name: 'heart', Preview: Heart },
  { name: 'shield', Preview: Shield },
  { name: 'play', Preview: Play },
] as const

function CtrlGroup({
  icon,
  tooltip,
  children,
}: {
  icon: React.ReactNode
  tooltip: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-1.5 shrink-0" title={tooltip}>
      <span className="text-muted-foreground shrink-0">{icon}</span>
      {children}
    </div>
  )
}

function Div() {
  return <div className="w-px h-5 bg-border/60 mx-0.5 shrink-0" />
}

interface IconToolbarProps {
  currentProps: Record<string, unknown>
  styleOverride: Record<string, string | number>
  onValuePatch: (prop: string, value: unknown) => void
  onStyleOverride: (style: Record<string, string | number>) => void
}

export function IconToolbar({
  currentProps,
  styleOverride,
  onValuePatch,
  onStyleOverride,
}: IconToolbarProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const currentName =
    typeof currentProps.name === 'string' ? currentProps.name : ICON_OPTIONS[0].name
  const currentSize = typeof currentProps.size === 'number' ? currentProps.size : 24
  const currentRadius =
    typeof styleOverride.borderRadius === 'number' ? styleOverride.borderRadius : 0

  const filteredIcons = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return ICON_OPTIONS
    return ICON_OPTIONS.filter(icon => icon.name.includes(normalized))
  }, [query])

  const selectedOption = ICON_OPTIONS.find(icon => icon.name === currentName)
  const SelectedPreview = selectedOption?.Preview ?? Circle

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background/95 backdrop-blur-lg border border-border shadow-xl text-sm select-none max-w-[700px]">
      <CtrlGroup icon={<Shapes size={13} />} tooltip="Change icon">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="h-7 min-w-[140px] max-w-[180px] px-2 rounded-md border border-border bg-muted hover:bg-accent transition-colors text-xs flex items-center gap-2"
            >
              <SelectedPreview
                size={14}
                style={{
                  color:
                    typeof styleOverride.color === 'string'
                      ? styleOverride.color: undefined                      
                }}
                className="shrink-0"
              />
              <span className="truncate">{currentName}</span>
              <ChevronsUpDown size={12} className="ml-auto shrink-0 text-muted-foreground" />
            </button>
          </PopoverTrigger>

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

  <div className="max-h-[240px] overflow-y-auto  px-2 py-2">
    <div className="grid grid-cols-4 gap-1 justify-items-center">
      {filteredIcons.map((icon, index) => {
        const Preview = icon.Preview
        const isSelected = icon.name === currentName

        return (
          <div
            key={icon.name}
            role="button"
            tabIndex={0}
            title={icon.name}
            onClick={() => {
              onValuePatch('name', icon.name)
              setOpen(false)
            }}
            className={cn(
              'inline-flex cursor-pointer',
              isSelected && 'bg-accent rounded-sm'
            )}
          >
            <Preview size={24}  />
          </div>
        )
      })}
    </div>
  </div>
</PopoverContent>
        </Popover>
      </CtrlGroup>

      <Div />

      <CtrlGroup
        icon={<span className="text-xs font-medium leading-none">S</span>}
        tooltip="Icon size"
      >
        <NumberStepper
          value={currentSize}
          onChange={value => onValuePatch('size', value)}
          min={8}
          step={2}
          inputWidth="w-14"
        />
      </CtrlGroup>

      <Div />

      <ColorSwatch
        color={styleOverride.color ?? '#ffffff'}
        label="A"
        title="Icon color"
        onChange={value => onStyleOverride({ color: value })}
      />

      <ColorSwatch
        color={styleOverride.backgroundColor ?? '#000000'}
        label="Bg"
        title="Background color"
        onChange={value => onStyleOverride({ backgroundColor: value })}
      />

      <CtrlGroup
        icon={<span className="text-xs font-medium leading-none">R</span>}
        tooltip="Corner radius"
      >
        <NumberStepper
          value={currentRadius}
          onChange={value => onStyleOverride({ borderRadius: value })}
          min={0}
          step={2}
          inputWidth="w-14"
        />
      </CtrlGroup>
    </div>
  )
}
