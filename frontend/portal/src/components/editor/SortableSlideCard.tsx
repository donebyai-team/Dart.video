import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, ImageIcon, Type, BarChart3, Sparkles, Film, Trash2, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import SlideThumbnail from './SlideThumbnail'
import { Slide, SlideType } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { useVideoStore } from '@/stores/video'

interface SortableSlideCardProps {
  slide: Slide
  isSelected: boolean
  index: number
  onSelect: () => void
  onDelete: () => void
}

const slideTypeIcons: Record<SlideType, React.ElementType> = {
  [SlideType.MEDIA]: ImageIcon,
  [SlideType.TEXT_ANIMATION]: Type,
  [SlideType.VISUAL_ANIMATION]: BarChart3,
  [SlideType.STACK]: Layers,
  [SlideType.INFOGRAPHIC]: Layers,
  [SlideType.UNDEFINED]: Layers
}

const SortableSlideCard = ({ slide, isSelected, index, onSelect, onDelete }: SortableSlideCardProps) => {
  const getSlideWithBackground = useVideoStore(s => s.getSlideWithBackground)
  slide.backgroundStyle = getSlideWithBackground(slide)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : undefined
  }

  const TypeIcon = slideTypeIcons[slide.type] || ImageIcon

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group cursor-pointer rounded-lg overflow-hidden transition-all border ${
        isSelected ? 'border-primary shadow-sm shadow-primary/10' : 'border-border/50 hover:border-border'
      } ${isDragging ? 'shadow-lg' : ''}`}
      onClick={onSelect}
    >
      <div className='flex gap-2 p-1.5 bg-background'>
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className='flex items-center cursor-grab active:cursor-grabbing'
          onClick={e => e.stopPropagation()}
        >
          <GripVertical className='w-3 h-3 text-muted-foreground/50 hover:text-muted-foreground transition-colors' />
        </div>

        {/* Thumbnail */}
        <div className='relative w-16 h-10 rounded overflow-hidden flex-shrink-0 bg-muted'>
          <SlideThumbnail slide={slide} animationStyle={index} />
          {/* Slide type indicator */}
          <div className='absolute bottom-0.5 left-0.5 bg-foreground/80 text-background p-0.5 rounded'>
            <TypeIcon className='w-2 h-2' />
          </div>
          {/* Duration */}
          <div className='absolute bottom-0.5 right-0.5 bg-foreground/80 text-background text-[7px] px-0.5 rounded'>
            {slide.duration}s
          </div>
          {/* Play overlay */}
          <div className='absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-colors flex items-center justify-center'>
            <div className='w-4 h-4 rounded-full bg-background/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity'>
              <div className='w-0 h-0 border-l-[5px] border-l-foreground border-y-[3px] border-y-transparent ml-0.5' />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className='flex-1 min-w-0'>
          <p className='text-[10px] text-muted-foreground line-clamp-2 leading-snug'>{slide.transcript}</p>
        </div>

        {/* Delete action */}
        <div className='flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity'>
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-5 w-5 text-destructive hover:text-destructive hover:bg-destructive/10'
                  onClick={handleDelete}
                >
                  <Trash2 className='w-3 h-3' />
                </Button>
              </TooltipTrigger>
              <TooltipContent side='right' className='text-[10px]'>
                Delete slide
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}

export default SortableSlideCard
