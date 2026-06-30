import { useState } from 'react'
import { motion } from 'framer-motion'
import { Clapperboard, Mic2 } from 'lucide-react'
import StoryboardPanel from '@/components/editor/StoryboardPanel'
import { VoiceOverSettings } from '@/components/editor/settings/voiceover/VoiceOverSettings'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useVideoStore } from '@/stores/video'
import type { Section, Slide } from '@coasterai/pb/coasterai/core/v1/slide_pb'

interface EditorSidebarTabsProps {
  isStreamingVideo: boolean
  onSelectSlide: (section: Section, slide: Slide) => void
  onStartEditTitle: (id: string, title: string) => void
  onSaveTitle: () => void
  onPlayVoiceoverPreview: (slideId: string) => void
}

type SidebarTab = 'storyboard' | 'voiceover'

const EditorSidebarTabs = ({
  isStreamingVideo,
  onSelectSlide,
  onStartEditTitle,
  onSaveTitle,
  onPlayVoiceoverPreview,
}: EditorSidebarTabsProps) => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('storyboard')
  const videoConfig = useVideoStore(s => s.videoConfig)
  const selectedSlide = useVideoStore(s => s.selectedSlide)

  const sectionCount = videoConfig?.config?.sections.length ?? 0
  const slideCount = videoConfig?.config?.sections.reduce((acc, section) => acc + section.slides.length, 0) ?? 0

  return (
    <motion.div
      key='storyboard-tabs'
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className='h-full'
    >
      <Tabs
        value={activeTab}
        onValueChange={value => setActiveTab(value as SidebarTab)}
        className='flex h-full flex-col'
      >
        <div className='border-b border-border p-4'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='storyboard' className='gap-2'>
              <Clapperboard className='h-4 w-4' />
              Storyboard
            </TabsTrigger>
            <TabsTrigger value='voiceover' className='gap-2'>
              <Mic2 className='h-4 w-4' />
              Voiceover
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value='storyboard' className='mt-0 flex-1 min-h-0'>
          <div className='flex h-full flex-col'>
            {/* <div className='border-b border-border px-4 py-3'>
              <p className='text-xs text-muted-foreground'>{sectionCount} sections • {slideCount} scenes</p>
            </div> */}

            {selectedSlide && (
              <StoryboardPanel
                isStreamingVideo={isStreamingVideo}
                onSelectSlide={onSelectSlide}
                onStartEditTitle={onStartEditTitle}
                onSaveTitle={onSaveTitle}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value='voiceover' className='mt-0 flex-1 min-h-0'>
          <div className='flex h-full flex-col'>
            <VoiceOverSettings onPlayPreview={onPlayVoiceoverPreview} />
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  )
}

export default EditorSidebarTabs
