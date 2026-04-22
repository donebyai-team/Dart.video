'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AskUserQuestion } from '@coasterai/pb/coasterai/portal/v1/portal_pb'
import { AskUserQuestionType } from '@coasterai/pb/coasterai/portal/v1/portal_pb'
import AssetPreviewDialog from '@/components/assets/AssetPreviewDialog'
import AssetUploadDropdown from './AssetUploadDropdown'
import type { SelectedAssetWithPreview } from '@/components/assets/SelectedAssetsDialog'

interface QuestionPanelProps {
  question: AskUserQuestion
  isSubmitting: boolean
  customAnswer: string
  answerInput: string
  onOptionClick: (option: string) => void
  onCustomAnswerChange: (value: string) => void
  onContinue: (responseOverride?: string) => void
  selectedQuestionAssets?: SelectedAssetWithPreview[]
  onOpenAssetPicker?: (mode: 'figma' | 'upload') => void
  onOpenSelectedAssetsDialog?: () => void
}

const QuestionPanel = ({
  question,
  isSubmitting,
  customAnswer,
  answerInput,
  onOptionClick,
  onCustomAnswerChange,
  onContinue,
  selectedQuestionAssets = [],
  onOpenAssetPicker,
  onOpenSelectedAssetsDialog,
}: QuestionPanelProps) => {
  const [assetPreviewOpen, setAssetPreviewOpen] = useState(false)
  const [assetNote, setAssetNote] = useState('')

  const isAssetClarification = question.questionType === AskUserQuestionType.ASSET_CLARIFICATION
  const isUploadAsset = question.questionType === AskUserQuestionType.UPLOAD_ASSET
  const filteredUploadOptions = (question.options ?? []).filter(option => {
    const normalizedOption = String(option ?? '').trim()
    return normalizedOption.length > 0 && !/upload/i.test(normalizedOption)
  })
  const questionAssetCount = selectedQuestionAssets.length

  useEffect(() => {
    setAssetNote('')
  }, [question.questionText, question.questionType])

  return (
    <div className='rounded-xl border bg-background p-4 space-y-3 shadow-sm'>
      <p className='text-sm font-medium leading-snug'>{question.questionText}</p>

      {/* Asset Preview for ASSET_CLARIFICATION */}
      {isAssetClarification && question.asset && (
        <>
          <div className='rounded-lg border bg-muted/30 p-3'>
            <div className='flex items-start gap-3'>
              <button 
                onClick={() => setAssetPreviewOpen(true)}
                className='flex-shrink-0 w-16 h-16 rounded border bg-background overflow-hidden hover:opacity-80 transition-opacity'
              >
                {question.asset.url ? (
                  <img 
                    src={question.asset.url} 
                    alt={question.asset.fileName || 'Asset'}
                    className='w-full h-full object-cover'
                  />
                ) : (
                  <div className='w-full h-full flex items-center justify-center text-muted-foreground'>
                    <ImagePlus className='w-6 h-6' />
                  </div>
                )}
              </button>
              <div className='flex-1 min-w-0'>
                <p className='text-xs font-medium truncate'>{question.asset.fileName || 'Unnamed Asset'}</p>
                <p className='text-xs text-muted-foreground mt-0.5'>Click to view full asset</p>
              </div>
            </div>
          </div>
          <AssetPreviewDialog
            title={question.asset.fileName || 'Asset'}
            subtitle='Add clarification for this asset'
            previewUrl={question.asset.url}
            mediaKind={question.asset.mimeType?.startsWith('video/') ? 'video' : 'image'}
            width={question.asset.width}
            height={question.asset.height}
            open={assetPreviewOpen}
            note={assetNote}
            noteLabel='Clarification for this asset'
            notePlaceholder='Add notes about how this asset should be used...'
            selectLabel='Done'
            onOpenChange={setAssetPreviewOpen}
            onNoteChange={setAssetNote}
            onSelect={() => setAssetPreviewOpen(false)}
          />
        </>
      )}

      {isUploadAsset ? (
        <div className='space-y-3'>
          <div className='flex flex-wrap gap-2'>
            {onOpenAssetPicker && (
              <AssetUploadDropdown
                disabled={isSubmitting}
                onOpenAssetPicker={onOpenAssetPicker}
                triggerClassName='px-3 py-1.5 text-sm rounded-lg border transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
                showLabel={true}
              />
            )}
            {filteredUploadOptions.map(option => (
              <button
                key={option}
                onClick={() => onOptionClick(option)}
                disabled={isSubmitting}
                className='px-3 py-1.5 text-sm rounded-lg border transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed'
              >
                {option}
              </button>
            ))}
          </div>

          {onOpenAssetPicker && (
            <div className='space-y-2'>
              {questionAssetCount > 0 && (
                <div className='flex justify-center'>
                  <button
                    type='button'
                    onClick={onOpenSelectedAssetsDialog}
                    className='flex cursor-pointer items-center justify-between rounded-lg border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs transition-colors hover:border-primary/30'
                  >
                    <span className='font-medium text-primary'>
                      {questionAssetCount} asset{questionAssetCount > 1 ? 's' : ''} selected
                    </span>
                  </button>
                </div>
              )}
              <Button
                size='sm'
                onClick={() => onContinue('Yes')} // just something to respond
                disabled={questionAssetCount === 0 || isSubmitting}
                className='w-full h-8 text-sm gap-1.5'
              >
                Continue <ChevronRight className='w-3.5 h-3.5' />
              </Button>
            </div>
          )}
        </div>
      ) : question.options?.length > 0 && (
        <div className='flex flex-wrap gap-2'>
          {question.options.map(option => (
            <button
              key={option}
              onClick={() => onOptionClick(option)}
              disabled={isSubmitting}
              className='px-3 py-1.5 text-sm rounded-lg border transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {question.allowCustomEntry && (
        <>
          <textarea
            value={customAnswer}
            onChange={e => onCustomAnswerChange(e.target.value)}
            placeholder='Or type your answer...'
            rows={2}
            className='w-full resize-none bg-background border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30'
          />
          <Button
            size='sm'
            onClick={() => onContinue()}
            disabled={!answerInput || isSubmitting}
            className='w-full h-8 text-sm gap-1.5'
          >
            Continue <ChevronRight className='w-3.5 h-3.5' />
          </Button>
        </>
      )}
    </div>
  )
}

export default QuestionPanel
