'use client'

import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { AskUserQuestion } from '@coasterai/pb/coasterai/portal/v1/portal_pb'

interface QuestionPanelProps {
  question: AskUserQuestion
  isSubmitting: boolean
  customAnswer: string
  answerInput: string
  onOptionClick: (option: string) => void
  onCustomAnswerChange: (value: string) => void
  onContinue: () => void
}

const QuestionPanel = ({
  question,
  isSubmitting,
  customAnswer,
  answerInput,
  onOptionClick,
  onCustomAnswerChange,
  onContinue,
}: QuestionPanelProps) => {
  return (
    <div className='rounded-xl border bg-background p-4 space-y-3 shadow-sm'>
      <p className='text-sm font-medium leading-snug'>{question.questionText}</p>

      {question.options?.length > 0 && (
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
            onClick={onContinue}
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
