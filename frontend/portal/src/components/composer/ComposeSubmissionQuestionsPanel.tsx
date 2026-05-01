'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

export const COMPOSE_SUBMISSION_QUESTIONS = [
  {
    id: 'feature-highlights',
    questionText: 'What features should the video highlight?',
    helperText: 'e.g: auto prospecting, personalized DMs, intent signals, CRM sync, reply handling. List anything specific',
    optional: true,
    type: 'input' as const,
    inputPlaceholder: 'List the features you want the video to focus on...'
  },
  {
    id: 'end-card-cta',
    questionText: 'End card CTA',
    optional: true,
    type: 'input' as const,
    inputPlaceholder: 'e.g: Start free trial, Book a demo, Get early access. Leave blank if you want me to pick'
  },
  {
    id: 'video-tone',
    questionText: 'What tone should the video have?',
    optional: false,
    type: 'options' as const,
    options: ['Professional', 'Playful', 'Mix of both']
  }
]

export type ComposeSubmissionQuestionType = 'options' | 'input' | 'options-or-input'

export interface ComposeSubmissionQuestion {
  id: string
  questionText: string
  optional?: boolean
  type: ComposeSubmissionQuestionType
  options?: string[]
  helperText?: string
  inputPlaceholder?: string
}

export interface ComposeSubmissionQuestionResponse {
  questionId: string
  questionText: string
  selectedOption?: string
  customText?: string
  response: string
}

interface ComposeSubmissionQuestionsPanelProps {
  isSubmitting: boolean
  onCancel: () => void
  onComplete: (responses: ComposeSubmissionQuestionResponse[]) => void
  questions?: ComposeSubmissionQuestion[]
  initialResponses?: ComposeSubmissionQuestionResponse[]
  initialQuestionId?: string
  submitLabel?: string
}

const ComposeSubmissionQuestionsPanel = ({
  isSubmitting,
  onCancel,
  onComplete,
  questions = [],
  initialResponses = [],
  initialQuestionId,
  submitLabel = 'Done'
}: ComposeSubmissionQuestionsPanelProps) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [responsesByQuestionId, setResponsesByQuestionId] = useState<Record<string, {
    selectedOption?: string
    customText?: string
  }>>({})

  useEffect(() => {
    const nextResponsesByQuestionId = initialResponses.reduce<Record<string, {
      selectedOption?: string
      customText?: string
    }>>((acc, response) => {
      acc[response.questionId] = {
        selectedOption: response.selectedOption,
        customText: response.customText
      }
      return acc
    }, {})

    const requestedQuestionIndex = initialQuestionId
      ? questions.findIndex(question => question.id === initialQuestionId)
      : -1
    const firstUnansweredIndex = questions.findIndex(question => {
      const response = nextResponsesByQuestionId[question.id]
      return !response?.selectedOption?.trim() && !response?.customText?.trim()
    })

    setResponsesByQuestionId(nextResponsesByQuestionId)
    setCurrentIndex(
      requestedQuestionIndex >= 0
        ? requestedQuestionIndex
        : firstUnansweredIndex >= 0
          ? firstUnansweredIndex
          : 0
    )
  }, [initialQuestionId, initialResponses, questions])

  const currentQuestion = questions[currentIndex]
  const currentResponse = currentQuestion
    ? responsesByQuestionId[currentQuestion.id] ?? {}
    : {}

  if (!currentQuestion) return null

  const isLastQuestion = currentIndex === questions.length - 1
  const isCurrentQuestionAnswered = Boolean(
    currentResponse.selectedOption?.trim() || currentResponse.customText?.trim()
  )

  const handleOptionClick = (option: string) => {
    setResponsesByQuestionId(current => ({
      ...current,
      [currentQuestion.id]: {
        ...current[currentQuestion.id],
        selectedOption: option
      }
    }))
  }

  const handleCustomTextChange = (value: string) => {
    setResponsesByQuestionId(current => ({
      ...current,
      [currentQuestion.id]: {
        ...current[currentQuestion.id],
        customText: value
      }
    }))
  }

  const handleContinue = () => {
    if (!currentQuestion.optional && !isCurrentQuestionAnswered) return

    if (!isLastQuestion) {
      setCurrentIndex(index => index + 1)
      return
    }

    const finalResponses = questions.map(question => {
      const response = responsesByQuestionId[question.id] ?? {}
      const customText = response.customText?.trim()
      const selectedOption = response.selectedOption?.trim()

      return {
        questionId: question.id,
        questionText: question.questionText,
        selectedOption: selectedOption || undefined,
        customText: customText || undefined,
        response: customText || selectedOption || ''
      }
    })

    onComplete(finalResponses)
  }

  return (
    <div className='rounded-xl border bg-background p-4 shadow-sm space-y-4'>
      <div className='space-y-1'>  
        <p className='text-xs text-muted-foreground'>
          Question {currentIndex + 1} of {questions.length}
        </p>
        <p className='text-sm font-medium leading-snug'>{currentQuestion.questionText}</p>
        {currentQuestion.helperText && (
          <p className='text-xs text-muted-foreground'>{currentQuestion.helperText}</p>
        )}
        {currentQuestion.optional && (
          <p className='text-xs text-muted-foreground'>Optional</p>
        )}
      </div>

      {(currentQuestion.type === 'options' || currentQuestion.type === 'options-or-input') && currentQuestion.options?.length ? (
        <div className='flex flex-wrap gap-2'>
          {currentQuestion.options.map(option => {
            const isSelected = currentResponse.selectedOption === option

            return (
              <button
                key={option}
                type='button'
                onClick={() => handleOptionClick(option)}
                disabled={isSubmitting}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'hover:bg-muted'
                }`}
              >
                {option}
              </button>
            )
          })}
        </div>
      ) : null}

      {(currentQuestion.type === 'input' || currentQuestion.type === 'options-or-input') && (
        <textarea
          value={currentResponse.customText ?? ''}
          onChange={e => handleCustomTextChange(e.target.value)}
          placeholder={currentQuestion.inputPlaceholder ?? 'Add more details...'}
          rows={3}
          disabled={isSubmitting}
          className='w-full resize-none bg-background border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50'
        />
      )}

      <div className='flex items-center justify-between gap-2'>
        <Button
          type='button'
          variant='outline'
          size='sm'
          disabled={isSubmitting}
          onClick={() => {
            if (currentIndex === 0) {
              onCancel()
              return
            }

            setCurrentIndex(index => index - 1)
          }}
          className='gap-1.5'
        >
          <ChevronLeft className='w-3.5 h-3.5' />
          {currentIndex === 0 ? 'Back to prompt' : 'Back'}
        </Button>

        <Button
          type='button'
          size='sm'
          onClick={handleContinue}
          disabled={isSubmitting || (!currentQuestion.optional && !isCurrentQuestionAnswered)}
          className='gap-1.5'
        >
          {isLastQuestion ? submitLabel : 'Continue'}
          <ChevronRight className='w-3.5 h-3.5' />
        </Button>
      </div>
    </div>
  )
}

export default ComposeSubmissionQuestionsPanel
