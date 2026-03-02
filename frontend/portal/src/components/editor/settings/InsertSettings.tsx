import { Button } from '@/components/ui/button'
import { CalloutEffect, EffectType, SpotlightEffect, ZoomEffect } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { CircleDot, Focus, Trash2, X, ZoomIn } from 'lucide-react'
import { useEffect, useState } from 'react'
import CalloutSettings from './CalloutSettings'
import SpotlightSettings from './SpotlightSettings'
import ZoomSettings from './ZoomSettings'


interface InsertSettingsProps {
  tool: EffectType
  currentObject: SpotlightEffect | CalloutEffect | ZoomEffect
  onUpdate: (settings: Partial<SpotlightEffect | CalloutEffect | ZoomEffect>) => void
  onDelete?: () => void
  onClose: () => void
  canDelete?: boolean
  slideDuration?: number
  slideStartTime?: number
  transitionDuration?: number
  onPlay?: () => void
  isPreviewPlaying?: boolean
}

export const toolMapping: Record<number, { label: string; icon: React.ElementType }> = {
  [EffectType.UNDEFINED]: {
    label: "Unknown",
    icon: CircleDot,
  },
  [EffectType.CALLOUT]: {
    label: "Callout",
    icon: Focus,
  },
  [EffectType.SPOTLIGHT]: {
    label: "Spotlight",
    icon: CircleDot,
  },
  [EffectType.ZOOM]: {
    label: "Zoom",
    icon: ZoomIn,
  },
};

const InsertSettings = ({
  tool,
  currentObject,
  onUpdate,
  onDelete,
  onClose,
  canDelete = true,
  slideDuration = 5,
  slideStartTime = 0,
  onPlay,
  isPreviewPlaying = false,
  transitionDuration = 0
}: InsertSettingsProps) => {
  const [settings, setSettings] = useState<SpotlightEffect | CalloutEffect | ZoomEffect>(currentObject);

  console.debug('insert settings', tool, currentObject)
  const ToolIcon = toolMapping[tool].icon

  // Sync settings when currentObject changes
  useEffect(() => {
    setSettings(currentObject);
  }, [currentObject?.id, slideDuration])

  const renderToolSpecificSettings = () => {

    // Render the specfic effect setting in sidebar based on object and tool selection
    switch (tool) {
      case EffectType.CALLOUT:
        return (
          <CalloutSettings
            settings={settings as CalloutEffect}
            onChange={settings => {
              onUpdate(settings);
            }}
            slideDuration={slideDuration}
            transitionDuration={transitionDuration}
          />
        )
      case EffectType.SPOTLIGHT:
        return (
          <SpotlightSettings
            settings={settings as SpotlightEffect}
             onChange={settings => {
              onUpdate(settings);
            }}
            slideDuration={slideDuration}
            slideStartTime={slideStartTime}
            //We need transition duration to calculate accurate start and end time of spotlight
            //so that they don't overlap with transitions
            transitionDuration={transitionDuration}
            onPlay={onPlay}
            isPreviewPlaying={isPreviewPlaying}
          />
        )
      case EffectType.ZOOM:
        return (
          <ZoomSettings
            settings={settings as ZoomEffect}
            onChange={settings => {
              onUpdate(settings)
            }}
            slideDuration={slideDuration}
            transitionDuration={transitionDuration}
            onPlay={onPlay}
            isPreviewPlaying={isPreviewPlaying}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className='h-full flex flex-col bg-card'>
      {/* Header */}
      <div className='flex items-center justify-between px-3 py-2 border-b border-border'>
        <div className='flex items-center gap-2'>
          <ToolIcon className='w-3.5 h-3.5 text-muted-foreground' />
          <h3 className='font-medium text-xs'>{toolMapping[tool].label}</h3>
        </div>
        <div className='flex items-center gap-1'>
          {canDelete && onDelete && (
            <Button
              variant='ghost'
              size='icon'
              className='h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10'
              onClick={onDelete}
            >
              <Trash2 className='w-3.5 h-3.5' />
            </Button>
          )}
          <Button variant='ghost' size='icon' className='h-6 w-6' onClick={onClose}>
            <X className='w-3.5 h-3.5' />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className='flex-1 overflow-y-auto p-3 space-y-3'>{renderToolSpecificSettings()}</div>
    </div>
  )
}

export default InsertSettings
