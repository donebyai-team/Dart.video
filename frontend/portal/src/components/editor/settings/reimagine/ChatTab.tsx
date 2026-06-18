import { create } from '@bufbuild/protobuf'
import { useEffect, useRef, useState } from 'react'
import type { ConversationMessage } from '@coasterai/pb/coasterai/core/v1/chat_pb'
import { ConversationRole } from '@coasterai/pb/coasterai/core/v1/chat_pb'
import { type MediaAsset, SelectedMediaAssetSchema } from '@coasterai/pb/coasterai/core/v1/media_asset_pb'
import type { PatchOverlay } from '@coasterai/renderer'
import { Paperclip } from 'lucide-react'
import SelectedAssetsDialog, { type SelectedAssetWithPreview } from '@/components/assets/SelectedAssetsDialog'
import { cn } from '@/lib/utils'
import { getFormattedDate } from '@/utils/format'
import ScenePromptComposer from './ScenePromptComposer'

interface ChatTabProps {
  messages: ConversationMessage[]
  isLoading: boolean
  setOverlay: (overlay: PatchOverlay) => void
  onConversationUpdated?: () => void
}

function MessageBubble({ message, onOpenAttachments }: { message: ConversationMessage; onOpenAttachments: () => void }) {
  const isUser = message.role === ConversationRole.USER
  const attachmentCount = Array.from(new Set(message.assetIds.concat(message.referenceIds))).length
  const [isExpanded, setIsExpanded] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const textRef = useRef<HTMLParagraphElement | null>(null)

  useEffect(() => {
    const element = textRef.current
    if (!element) return

    const checkOverflow = () => {
      setIsOverflowing(element.scrollHeight > element.clientHeight + 1)
    }

    checkOverflow()
    window.addEventListener('resize', checkOverflow)

    return () => {
      window.removeEventListener('resize', checkOverflow)
    }
  }, [message.message, isExpanded])

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[72%] rounded-2xl px-2.5 py-2 text-xs shadow-sm',
          isUser
            ? 'rounded-br-md bg-primary text-primary-foreground'
            : 'rounded-bl-md border border-border/70 bg-background text-foreground'
        )}
      >
        <p
          ref={textRef}
          className={cn(
            'break-words leading-relaxed',
            isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2 whitespace-pre-wrap'
          )}
        >
          {message.message}
        </p>

        {isOverflowing && (
          <button
            type='button'
            onClick={() => setIsExpanded(current => !current)}
            className={cn(
              'mt-1 text-[11px] font-medium underline-offset-2 hover:underline',
              isUser ? 'text-primary-foreground/85' : 'text-muted-foreground'
            )}
          >
            {isExpanded ? 'Less' : 'More'}
          </button>
        )}

        <div
          className={cn(
            'mt-2 flex items-center gap-2 text-[10px]',
            isUser ? 'text-primary-foreground/80' : 'text-muted-foreground'
          )}
        >
          {attachmentCount > 0 && (
            <button type='button' onClick={onOpenAttachments} className='inline-flex items-center gap-1 hover:underline'>
              <Paperclip className='h-3 w-3' />
              <span>{attachmentCount} attachment{attachmentCount > 1 ? 's' : ''}</span>
            </button>
          )}
          <span>{getFormattedDate(message.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}

export default function ChatTab({ messages, isLoading, setOverlay, onConversationUpdated }: ChatTabProps) {
  const [selectedAssetsDialogOpen, setSelectedAssetsDialogOpen] = useState(false)
  const [selectedAssets, setSelectedAssets] = useState<SelectedAssetWithPreview[]>([])

  const openMessageAttachments = (message: ConversationMessage) => {
    const attachmentIDs = Array.from(new Set(message.assetIds.concat(message.referenceIds)))

    setSelectedAssets(
      attachmentIDs.map(assetID => ({
        selection: create(SelectedMediaAssetSchema, {
          assetID
        })
      }))
    )
    setSelectedAssetsDialogOpen(true)
  }

  const hydrateSelectedAssets = (assets: MediaAsset[]) => {
    if (assets.length === 0) return

    setSelectedAssets(current =>
      current.map(selectedAsset => {
        const fullAsset = assets.find(asset => asset.id === selectedAsset.selection.assetID)
        return fullAsset
          ? { ...selectedAsset, asset: fullAsset }
          : selectedAsset
      })
    )
  }

  const removeSelectedAsset = (assetID: string) => {
    setSelectedAssets(current => current.filter(asset => asset.selection.assetID !== assetID))
  }

  const updateSelectedAssetNote = (assetID: string, note?: string) => {
    setSelectedAssets(current =>
      current.map(asset => asset.selection.assetID === assetID
        ? {
          ...asset,
          selection: create(SelectedMediaAssetSchema, {
            assetID,
            note
          })
        }
        : asset
      )
    )
  }

  return (
    <div className='flex h-[calc(100vh-14rem)] min-h-0 flex-col gap-4'>
      <SelectedAssetsDialog
        open={selectedAssetsDialogOpen}
        selectedAssets={selectedAssets}
        onOpenChange={setSelectedAssetsDialogOpen}
        onHydrateAssets={hydrateSelectedAssets}
        onRemoveAsset={removeSelectedAsset}
        onUpdateAssetNote={updateSelectedAssetNote}
        onOpenUpload={() => {}}
        preview={false}
      />

      <div className='min-h-0 flex-1'>
        {isLoading ? (
          <div className='flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/10 px-6 text-center text-sm text-muted-foreground'>
            Loading conversation...
          </div>
        ) : messages.length === 0 ? (
          <div className='flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/10 px-6 text-center text-sm text-muted-foreground'>
            No conversation yet.
          </div>
        ) : (
          <div className='h-full overflow-y-auto rounded-2xl border border-border/70 bg-muted/10 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
            <div className='space-y-4 p-4'>
              {messages.map((message, index) => (
                <MessageBubble
                  key={`${message.createdAt?.seconds ?? 'message'}-${index}`}
                  message={message}
                  onOpenAttachments={() => openMessageAttachments(message)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className='shrink-0'>
        <ScenePromptComposer
          setOverlay={setOverlay}
          onConversationUpdated={onConversationUpdated}
        />
      </div>
    </div>
  )
}
