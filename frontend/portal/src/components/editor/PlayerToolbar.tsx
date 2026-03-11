import {
  Clock,
  Palette,
  Type,
  ChevronDown,
  Wand2,
  Focus,
  CircleDot,
  ZoomIn,
  Figma
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { useVideoStore } from '@/stores/video'
import { SlideType, Slide, EffectType } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { ActiveToolType } from '@/types/tools'
import DurationChangeComponent from './remotion/components/DurationChangeComponent'
import { backgroundStyleToCSS } from '@coasterai/renderer'

interface PlayerToolbarProps {
  onDurationChange: (newDuration: number) => void
  minDuration?: number
  maxDuration?: number
}

const insertTools: { id: EffectType; name: string; icon: React.ElementType }[] = [
  { id: EffectType.CALLOUT, name: 'Callout', icon: Focus },
  { id: EffectType.SPOTLIGHT, name: 'Spotlight', icon: CircleDot },
  { id: EffectType.ZOOM, name: 'Zoom', icon: ZoomIn },
]

const PlayerToolbar = ({ onDurationChange, minDuration = 1, maxDuration = 180 }: PlayerToolbarProps) => {
  const getSlideWithBackground = useVideoStore(s => s.getSlideWithBackground)
  const onChangeTextAnimation = useVideoStore(s => s.handleEditAnimation)
  const activeTool = useVideoStore(s => s.activeTool)
  const onSelectTool = useVideoStore(s => s.handleSelectTool)
  const selectedSlide = useVideoStore(s => s.selectedSlide)

  if (!selectedSlide) return
  let slide = selectedSlide.slide 

  const currentBg = backgroundStyleToCSS(getSlideWithBackground(slide));
  const isBackgroundActive = activeTool?.type === ActiveToolType.BACKGROUND
  const activeInsertTool = activeTool?.type === ActiveToolType.INSERT ? activeTool.tool : null

  return (
    <div className='flex items-center justify-between gap-4 px-4 py-2 border-b border-border bg-background'>
      {/* Left side: Slide info and editing tools */}
      <div className='flex items-center gap-2'>
       
        {/* Background tool */}
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isBackgroundActive ? 'secondary' : 'ghost'}
                size='sm'
                className='gap-2 h-8'
                onClick={() => onSelectTool(isBackgroundActive ? { type: ActiveToolType.NONE } : { type: ActiveToolType.BACKGROUND })}
              >
                <div className='w-4 h-4 rounded border border-border' style={{ background: currentBg }} />
                <Palette className='w-4 h-4' />
                <span className='text-xs'>Background</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side='bottom' className='text-xs'>
              Change background color
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Change Animation button for text-animation slides */}
        {slide.type === SlideType.ANIMATION && onChangeTextAnimation && (
          <>
            <div className='h-4 w-px bg-border mx-1' />
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant='ghost' size='sm' className='gap-2 h-8' onClick={onChangeTextAnimation}>
                    <Wand2 className='w-4 h-4' />
                    <span className='text-xs'>Edit Animation</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side='bottom' className='text-xs'>
                  Editing this animation
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}

        {/* Insert Tools Dropdown - only for image/video slides */}
        {slide.type == SlideType.MEDIA && (
          <>
            <div className='h-4 w-px bg-border mx-1' />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant={activeInsertTool ? 'secondary' : 'ghost'} size='sm' className='gap-2 h-8'>
                  {activeInsertTool ? (
                    <>
                      {(() => {
                        const tool = insertTools.find(t => t.id === activeInsertTool)
                        const Icon = tool?.icon || Type
                        return <Icon className='w-4 h-4' />
                      })()}
                      <span className='text-xs'>{insertTools.find(t => t.id === activeInsertTool)?.name}</span>
                    </>
                  ) : (
                    <>
                      <Type className='w-4 h-4' />
                      <span className='text-xs'>Insert</span>
                    </>
                  )}
                  <ChevronDown className='w-3 h-3' />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' className='w-40 bg-popover'>
                {insertTools.map(tool => (
                  <DropdownMenuItem
                    key={String(tool.id)}
                    onClick={() => onSelectTool({ type: ActiveToolType.INSERT, tool: tool.id })}
                    className='gap-2'
                  >
                    <tool.icon className='w-4 h-4' />
                    {tool.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onSelectTool({ type: ActiveToolType.FIGMA_IMPORT })} className='gap-2'>
                  <Figma className='w-4 h-4' />
                  Import from Figma
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        )}        
      </div>

      {/* Right side: Duration control */}
      <div className='flex items-center gap-2'>
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className='flex items-center gap-1'>
                <Clock className='w-4 h-4 text-muted-foreground' />
                <span className='text-xs text-muted-foreground'>Duration:</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side='bottom' className='text-xs'>
              Slide duration in seconds
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <DurationChangeComponent
          value={slide.duration}
          onValueChange={val => {
            onDurationChange(val)
          }}
          max={maxDuration}
          min={minDuration}
          step={0.1}
        />
      </div>
    </div>
  )
}

export default PlayerToolbar
