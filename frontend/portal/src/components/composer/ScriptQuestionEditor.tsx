'use client'

import { create } from '@bufbuild/protobuf'
import { useState } from 'react'
import { Plus, X } from 'lucide-react'

import { ScriptItemSchema, ScriptSchema, type Script } from '@coasterai/pb/coasterai/core/v1/video_pb'

interface ScriptQuestionEditorProps {
  script?: Script
  customEntry: string
  allowCustomEntry?: boolean
  isSubmitting: boolean
  onScriptChange: (script: Script) => void
  onCustomEntryChange: (value: string) => void
}

const cloneScript = (script?: Script) => create(ScriptSchema, {
  items: (script?.items ?? []).map(item => create(ScriptItemSchema, {
    name: item.name,
    narattion: [...(item.narattion ?? [])]
  }))
})

const ScriptQuestionEditor = ({
  script,
  customEntry,
  allowCustomEntry,
  isSubmitting,
  onScriptChange,
  onCustomEntryChange
}: ScriptQuestionEditorProps) => {
  const currentScript = script ?? cloneScript()
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [draftNarration, setDraftNarration] = useState('')

  const getNarrationKey = (sectionIndex: number, narrationIndex: number) => `${sectionIndex}-${narrationIndex}`

  const updateNarration = (sectionIndex: number, narrationIndex: number, value: string) => {
    const nextScript = cloneScript(currentScript)
    const nextItem = nextScript.items[sectionIndex]
    if (!nextItem) return
    nextItem.narattion[narrationIndex] = value
    onScriptChange(nextScript)
  }

  const addNarration = (sectionIndex: number, narrationIndex: number) => {
    const nextScript = cloneScript(currentScript)
    const nextItem = nextScript.items[sectionIndex]
    if (!nextItem) return
    const nextNarrationIndex = narrationIndex + 1
    nextItem.narattion = [
      ...nextItem.narattion.slice(0, nextNarrationIndex),
      '',
      ...nextItem.narattion.slice(nextNarrationIndex)
    ]
    onScriptChange(nextScript)
    setEditingKey(getNarrationKey(sectionIndex, nextNarrationIndex))
    setDraftNarration('')
  }

  const removeNarration = (sectionIndex: number, narrationIndex: number) => {
    const nextScript = cloneScript(currentScript)
    const nextItem = nextScript.items[sectionIndex]
    if (!nextItem) return
    nextItem.narattion = nextItem.narattion.filter((_, index) => index !== narrationIndex)
    onScriptChange(nextScript)
    if (editingKey === getNarrationKey(sectionIndex, narrationIndex)) {
      setEditingKey(null)
      setDraftNarration('')
    }
  }

  const startEditing = (sectionIndex: number, narrationIndex: number, value: string) => {
    if (isSubmitting) return
    setEditingKey(getNarrationKey(sectionIndex, narrationIndex))
    setDraftNarration(value)
  }

  const stopEditing = () => {
    setEditingKey(null)
    setDraftNarration('')
  }

  const saveEditing = (sectionIndex: number, narrationIndex: number) => {
    updateNarration(sectionIndex, narrationIndex, draftNarration)
    stopEditing()
  }

  return (
    <div className='space-y-2'>
      <div className='rounded-xl border bg-muted/20 overflow-hidden'>
        {currentScript.items.map((item, sectionIndex) => (
          <div key={`${item.name}-${sectionIndex}`} className='px-3 py-1.5'>
            <div className='mb-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground'>
              {item.name}
            </div>
            <div className='space-y-0.5'>
              {item.narattion.map((narration, narrationIndex) => (
                <div key={`${item.name}-${narrationIndex}`} className='flex items-start gap-0.5'>
                  {editingKey === getNarrationKey(sectionIndex, narrationIndex) ? (
                    <textarea
                      value={draftNarration}
                      onChange={e => setDraftNarration(e.target.value)}
                      onBlur={() => saveEditing(sectionIndex, narrationIndex)}
                      onKeyDown={e => {
                        if (e.key === 'Escape') {
                          e.preventDefault()
                          stopEditing()
                        }

                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          saveEditing(sectionIndex, narrationIndex)
                        }
                      }}
                      rows={1}
                      autoFocus
                      disabled={isSubmitting}
                      className='min-h-[30px] w-full resize-none rounded-md border-0 bg-background px-2 py-1.5 text-sm leading-5 shadow-sm ring-1 ring-primary/30 transition focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50'
                    />
                  ) : (
                    <button
                      type='button'
                      disabled={isSubmitting}
                      className='w-full rounded-md bg-background/80 px-2 py-1.5 text-left text-sm leading-5 text-foreground shadow-sm ring-1 ring-border transition hover:bg-background disabled:opacity-50'
                      onClick={() => startEditing(sectionIndex, narrationIndex, narration)}
                    >
                      {narration || 'Empty narration'}
                    </button>
                  )}
                  <div className='mt-0.5 flex flex-col gap-0.5'>
                    <button
                      type='button'
                      disabled={isSubmitting}
                      className='inline-flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50'
                      onClick={() => addNarration(sectionIndex, narrationIndex)}
                    >
                      <Plus className='h-2.5 w-2.5' />
                    </button>
                    <button
                      type='button'
                      disabled={isSubmitting}
                      className='inline-flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50'
                      onClick={() => removeNarration(sectionIndex, narrationIndex)}
                    >
                      <X className='h-2.5 w-2.5' />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {allowCustomEntry && (
        <div className='rounded-xl border bg-background/70 p-2.5'>
          <textarea
            value={customEntry}
            onChange={e => onCustomEntryChange(e.target.value)}
            placeholder='Optional instructions...'
            rows={2}
            disabled={isSubmitting}
            className='w-full resize-none border-0 bg-transparent p-0 text-sm leading-5 focus:outline-none disabled:opacity-50'
          />
        </div>
      )}
    </div>
  )
}

export { cloneScript }
export default ScriptQuestionEditor
