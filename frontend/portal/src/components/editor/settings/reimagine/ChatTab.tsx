import type { ConversationMessage } from '@coasterai/pb/coasterai/core/v1/chat_pb'
import { ConversationRole } from '@coasterai/pb/coasterai/core/v1/chat_pb'
import { Paperclip } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { getFormattedDate } from '@/utils/format'

interface ChatTabProps {
  messages: ConversationMessage[]
  isLoading: boolean
}

export default function ChatTab({ messages, isLoading }: ChatTabProps) {
  if (isLoading) {
    return (
      <div className='flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/10 px-6 text-center text-sm text-muted-foreground'>
        Loading conversation...
      </div>
    )
  }

  if (messages.length === 0) {
    return (
      <div className='flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/10 px-6 text-center text-sm text-muted-foreground'>
        No conversation yet.
      </div>
    )
  }

  return (
    <ScrollArea className='h-[calc(100vh-21rem)] min-h-72 rounded-2xl border border-border/70 bg-muted/10'>
      <div className='space-y-4 p-4'>
        {messages.map((message, index) => {
          const isUser = message.role === ConversationRole.USER
          const attachmentCount = message.assetIds.length + message.referenceIds.length

          return (
            <div key={`${message.createdAt?.seconds ?? 'message'}-${index}`} className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2.5 text-sm shadow-sm',
                  isUser
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-background text-foreground rounded-bl-md border border-border/70'
                )}
              >
                <p className='whitespace-pre-wrap break-words leading-relaxed'>{message.message}</p>

                <div
                  className={cn(
                    'mt-2 flex items-center gap-2 text-[11px]',
                    isUser ? 'text-primary-foreground/80' : 'text-muted-foreground'
                  )}
                >
                  {attachmentCount > 0 && (
                    <span className='inline-flex items-center gap-1'>
                      <Paperclip className='h-3 w-3' />
                      <span>{attachmentCount} attachment{attachmentCount > 1 ? 's' : ''}</span>
                    </span>
                  )}
                  <span>{getFormattedDate(message.createdAt)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}
