'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronRight, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Script } from '@coasterai/pb/coasterai/core/v1/video_pb'
import type { AskUserQuestion } from '@coasterai/pb/coasterai/portal/v1/portal_pb'
import { AskUserQuestionType } from '@coasterai/pb/coasterai/portal/v1/portal_pb'
import AssetPreviewDialog from '@/components/assets/AssetPreviewDialog'
import type { SelectedAssetWithPreview } from '@/components/assets/SelectedAssetsDialog'
import AssetUploadDropdown from './AssetUploadDropdown'
import ScriptQuestionEditor, { cloneScript } from './ScriptQuestionEditor'

interface QuestionPanelProps {
  questions: AskUserQuestion[]
  isSubmitting: boolean
  onContinue: (payload: { response: string; script?: Script }) => void
  selectedQuestionAssets?: SelectedAssetWithPreview[]
  onOpenAssetPicker?: (mode: 'upload') => void
  onOpenSelectedAssetsDialog?: () => void
}

const QuestionPanel = ({
  questions,
  isSubmitting,
  onContinue,
  selectedQuestionAssets = [],
  onOpenAssetPicker,
  onOpenSelectedAssetsDialog,
}: QuestionPanelProps) => {
  const [assetPreviewOpen, setAssetPreviewOpen] = useState(false)
  const [assetNote, setAssetNote] = useState('')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [customAnswer, setCustomAnswer] = useState('')
  const [accumulatedResponse, setAccumulatedResponse] = useState('')
  const [editedScript, setEditedScript] = useState<Script | undefined>()

  const question = questions[currentIndex]
  const allowCustomEntry = !!question?.allowCustomEntry
  const questionText = question?.questionText ?? ''

  useEffect(() => {
    setCurrentIndex(0)
    setSelectedAnswer('')
    setCustomAnswer('')
    setAccumulatedResponse('')
    setEditedScript(cloneScript(questions[0]?.script))
  }, [questions])

  useEffect(() => {
    if (!question) return
    setAssetNote('')
    setSelectedAnswer('')
    setCustomAnswer('')
    setEditedScript(cloneScript(question.script))
  }, [question])

  const isAssetClarification = question?.questionType === AskUserQuestionType.ASSET_CLARIFICATION
  const isUploadAsset = question?.questionType === AskUserQuestionType.UPLOAD_ASSET
  const isScriptQuestion = question?.questionType === AskUserQuestionType.SCRIPT
  const isLastQuestion = currentIndex === questions.length - 1
  const filteredUploadOptions = (question?.options ?? []).filter(option => {
    const normalizedOption = String(option ?? '').trim()
    return normalizedOption.length > 0 && !/upload/i.test(normalizedOption)
  })
  const questionAssetCount = selectedQuestionAssets.length
  const answerInput = useMemo(() => {
    if (selectedAnswer) return selectedAnswer
    if (allowCustomEntry) return customAnswer.trim()
    return ''
  }, [allowCustomEntry, customAnswer, selectedAnswer])
  const hasScriptResponse = useMemo(() => {
    if (!isScriptQuestion) return false
    const hasNarration = (editedScript?.items ?? []).some(item => item.narattion.some(text => text.trim().length > 0))
    const hasCustomEntry = customAnswer.trim().length > 0
    return hasNarration || (allowCustomEntry && hasCustomEntry)
  }, [allowCustomEntry, customAnswer, editedScript, isScriptQuestion])

  if (!question) return null

  const buildQuestionAnswerBlock = (questionText: string, answer: string) => {
    const nextBlock = `Q: ${questionText}\nA: ${answer}`
    return accumulatedResponse ? `${accumulatedResponse}\n${nextBlock}` : nextBlock
  }

  const getSanitizedScript = (script?: Script) => {
    if (!script) return undefined

    const nextScript = cloneScript(script)
    nextScript.items.forEach(item => {
      item.narattion = item.narattion.filter(text => text.trim().length > 0)
    })

    return nextScript
  }

  const handleAdvance = (answer: string, scriptOverride?: Script) => {
    const trimmedAnswer = answer.trim()
    if (!trimmedAnswer && !scriptOverride) return

    const nextAccumulatedResponse = buildQuestionAnswerBlock(questionText, trimmedAnswer)

    if (isLastQuestion) {
      onContinue({
        response: nextAccumulatedResponse,
        script: scriptOverride
      })
      return
    }

    setAccumulatedResponse(nextAccumulatedResponse)
    setCurrentIndex(index => index + 1)
  }

  const handleOptionClick = (option: string) => {
    setSelectedAnswer(option)
    handleAdvance(option)
  }

  const handleContinueClick = () => {
    if (isScriptQuestion) {
      const sanitizedScript = getSanitizedScript(editedScript)

      onContinue({
        response: customAnswer.trim() || 'SCRIPT_APPROVED',
        script: sanitizedScript
      })
      return
    }

    handleAdvance(answerInput)
  }

  return (
    <div className='rounded-xl border bg-background p-4 space-y-3 shadow-sm'>
      {questions.length > 1 && (
        <div className='flex items-center justify-between text-xs text-muted-foreground'>
          <span>Question {currentIndex + 1} of {questions.length}</span>
          <div className='flex gap-1'>
            {questions.map((_, index) => (
              <span
                key={index}
                className={`h-1.5 w-5 rounded-full ${index === currentIndex ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>
        </div>
      )}

      <p className='text-sm font-medium leading-snug'>{question.questionText}</p>

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

      {isScriptQuestion && (
        <ScriptQuestionEditor
          script={editedScript}
          customEntry={customAnswer}
          allowCustomEntry={question.allowCustomEntry}
          isSubmitting={isSubmitting}
          onScriptChange={setEditedScript}
          onCustomEntryChange={setCustomAnswer}
        />
      )}

      {isUploadAsset ? (
        <div className='space-y-3'>
          <div className='flex flex-wrap gap-2'>
            {onOpenAssetPicker && (
              <AssetUploadDropdown
                disabled={isSubmitting}
                onOpenAssetPicker={() => onOpenAssetPicker('upload')}
                triggerClassName='px-3 py-1.5 text-sm rounded-lg border transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
                showLabel={true}
              />
            )}
            {filteredUploadOptions.map(option => (
              <button
                key={option}
                onClick={() => handleOptionClick(option)}
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
                onClick={() => handleAdvance('Yes')}
                disabled={questionAssetCount === 0 || isSubmitting}
                className='w-full h-8 text-sm gap-1.5'
              >
                {isLastQuestion ? 'Continue' : 'Next'} <ChevronRight className='w-3.5 h-3.5' />
              </Button>
            </div>
          )}
        </div>
      ) : !isScriptQuestion && question.options?.length > 0 && (
        <div className='flex flex-wrap gap-2'>
          {question.options.map(option => (
            <button
              key={option}
              onClick={() => handleOptionClick(option)}
              disabled={isSubmitting}
              className='px-3 py-1.5 text-sm rounded-lg border transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {question.allowCustomEntry && !isScriptQuestion && (
        <>
          <textarea
            value={customAnswer}
            onChange={e => setCustomAnswer(e.target.value)}
            placeholder='Or type your answer...'
            rows={2}
            className='w-full resize-none bg-background border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30'
          />
          <Button
            size='sm'
            onClick={handleContinueClick}
            disabled={!answerInput || isSubmitting}
            className='w-full h-8 text-sm gap-1.5'
          >
            {isLastQuestion ? 'Continue' : 'Next'} <ChevronRight className='w-3.5 h-3.5' />
          </Button>
        </>
      )}

      {isScriptQuestion && (
        <Button
          size='sm'
          onClick={handleContinueClick}
          disabled={!hasScriptResponse || isSubmitting}
          className='w-full h-8 text-sm gap-1.5'
        >
          {isLastQuestion ? 'Continue' : 'Next'} <ChevronRight className='w-3.5 h-3.5' />
        </Button>
      )}
    </div>
  )
}

export default QuestionPanel
