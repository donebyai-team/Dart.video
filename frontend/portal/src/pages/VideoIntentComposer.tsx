'use client'

import { create, fromJsonString } from '@bufbuild/protobuf'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Film,
  Globe,
  Link2,
  Paperclip,
  FileText,
  Sparkles,
  X,
  Square
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import ManualMediaImportPanel from '@/components/assets/ManualMediaImportPanel'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useClientsContext } from '@coasterai/ui-core/context/ClientContext'
import { getConnectError } from '@/utils/error'
import toast from 'react-hot-toast'
import defaultEditorConfig from '@/data/editorConfig'
import { useRouter } from 'next/navigation'
import { getDefaultResolution } from '@/stores/video/defaults'
import { type AskUserQuestion, type CreateVideoResponse } from '@coasterai/pb/coasterai/portal/v1/portal_pb'
import QuestionPanel from '@/components/composer/QuestionPanel'
import ThinkingViewComponent from '@/components/composer/ThinkingViewComponent'
import { Script, VideoMetadataSchema } from '@coasterai/pb/coasterai/core/v1/video_pb'
import LanguageSelector from '@/components/composer/LanguageSelector'
import BrandLibrarySelector from '@/components/composer/BrandLibrarySelector'
import { MediaAsset, SelectedMediaAssetSchema } from '@coasterai/pb/coasterai/core/v1/media_asset_pb'
import SelectedAssetsDialog, { type SelectedAssetWithPreview } from '@/components/assets/SelectedAssetsDialog'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AuthLoading } from '@/components/Loader/loader'
import type { BrandIdentity } from '@coasterai/pb/coasterai/core/v1/brandkit_pb'

const MIN_PROMPT_LENGTH = 10
const VIDEO_COMPOSER_PREFILL_STORAGE_KEY = 'video-composer-prefill-metadata'
const SHOW_FILE_UPLOAD_SHORTCUT = true

const PROMPT_TEMPLATES = {
  website: 'Create a 60-second explainer video based on the website provided. Focus on the main value proposition, key features, and target audience.',
  file: 'Create a video script based on the attached document. Extract the core problem, solution, and customer benefits.',
  script: 'Hook: [The problem your buyer faces]\n\nSolution: [How your product fixes it]\n\nProof: [One customer result]\n\nCTA: [Book a demo]'
}

type ComposerStage = 'compose' | 'planning' | 'question'
type QuickStartMode = 'website' | 'file' | 'script'

const isPromptTemplate = (value: string) => {
  const trimmedValue = value.trim()
  if (!trimmedValue) return true

  return (
    trimmedValue === PROMPT_TEMPLATES.file ||
    trimmedValue === PROMPT_TEMPLATES.script ||
    trimmedValue.startsWith(PROMPT_TEMPLATES.website)
  )
}

const isValidHttpUrl = (value: string) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

const buildWebsitePrompt = (urls: string[]) => {
  if (urls.length === 0) return PROMPT_TEMPLATES.website
  return `${PROMPT_TEMPLATES.website}\n\nWebsites:\n${urls.map(url => `- ${url}`).join('\n')}`
}

const REFERENCE_URLS_HEADER = 'Reference URLs:'

const stripManagedReferenceUrls = (value: string) => {
  const websiteSectionIndex = value.indexOf('\n\nWebsites:\n')
  if (websiteSectionIndex >= 0) {
    return value.slice(0, websiteSectionIndex).trimEnd()
  }

  const referenceSectionIndex = value.indexOf(`\n\n${REFERENCE_URLS_HEADER}\n`)
  if (referenceSectionIndex >= 0) {
    return value.slice(0, referenceSectionIndex).trimEnd()
  }

  return value.trimEnd()
}

const buildPromptWithReferenceUrls = (value: string, urls: string[]) => {
  const basePrompt = stripManagedReferenceUrls(value)

  if (urls.length === 0) {
    return basePrompt
  }

  if (!basePrompt || isPromptTemplate(basePrompt)) {
    return buildWebsitePrompt(urls)
  }

  return `${basePrompt}\n\n${REFERENCE_URLS_HEADER}\n${urls.map(url => `- ${url}`).join('\n')}`
}

const VideoIntentComposer = () => {
  const [prompt, setPrompt] = useState('')
  const [resolutionId, setResolutionId] = useState(defaultEditorConfig.resolution.default)
  const [selectedBrandLibraryId, setSelectedBrandLibraryId] = useState<string | undefined>()
  const [duration, setDuration] = useState('60')
  const [language, setLanguage] = useState('en')
  const [assetDialogOpen, setAssetDialogOpen] = useState(false)
  const [selectedAssetsDialogOpen, setSelectedAssetsDialogOpen] = useState(false)
  const [questionAssetsDialogOpen, setQuestionAssetsDialogOpen] = useState(false)
  const [selectedAssets, setSelectedAssets] = useState<SelectedAssetWithPreview[]>([])

  const [stage, setStage] = useState<ComposerStage>('compose')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [videoId, setVideoId] = useState('')
  const [isThinkingBusy, setIsThinkingBusy] = useState(false)
  const [thinkingChunk, setThinkingChunk] = useState('')
  const [thinkingResetSignal, setThinkingResetSignal] = useState(0)
  const streamSessionRef = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [activeQuestions, setActiveQuestions] = useState<AskUserQuestion[]>([])
  const [pendingQuestions, setPendingQuestions] = useState<AskUserQuestion[]>([])
  const [questionAssets, setQuestionAssets] = useState<SelectedAssetWithPreview[]>([])
  const [brandIdentities, setBrandIdentities] = useState<BrandIdentity[]>([])
  const [isLoadingBrands, setIsLoadingBrands] = useState(true)
  const [brandWebsiteUrl, setBrandWebsiteUrl] = useState('')
  const [showBrandOnboarding, setShowBrandOnboarding] = useState(false)
  const [quickStartMode, setQuickStartMode] = useState<QuickStartMode | null>(null)
  const [composerWebsiteUrl, setComposerWebsiteUrl] = useState('')
  const [attachedWebsiteUrls, setAttachedWebsiteUrls] = useState<string[]>([])

  const router = useRouter()
  const { portalClient } = useClientsContext()

  const hasPrompt = prompt.trim().length > MIN_PROMPT_LENGTH
  const hasSelectedAssets = selectedAssets.length > 0
  const canGenerate = hasPrompt || hasSelectedAssets
  const selectedAssetMessages = useMemo(
    () => selectedAssets.map(asset => asset.selection),
    [selectedAssets]
  )
  const mergedQuestionAssetMessages = useMemo(() => {
    const merged = [...selectedAssetMessages]

    for (const questionAsset of questionAssets) {
      const existingIndex = merged.findIndex(asset => asset.assetID === questionAsset.selection.assetID)
      if (existingIndex >= 0) {
        merged[existingIndex] = questionAsset.selection
      } else {
        merged.push(questionAsset.selection)
      }
    }

    return merged
  }, [questionAssets, selectedAssetMessages])

  const showThinking = hasSubmitted && stage === 'planning'
  const hasBrandIdentity = brandIdentities.length > 0

  useEffect(() => {
    if (pendingQuestions.length === 0) return
    if (isThinkingBusy) return

    setActiveQuestions(pendingQuestions)
    setPendingQuestions([])
    setQuestionAssets([])
    setQuestionAssetsDialogOpen(false)
    setStage('question')
  }, [isThinkingBusy, pendingQuestions])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (!portalClient) return

    const fetchBrandIdentities = async () => {
      try {
        setIsLoadingBrands(true)
        const res = await portalClient.getBrandIdentities({})
        setBrandIdentities(res.identities)
      } catch (err) {
        console.error('Failed to fetch brand identities', err)
        toast.error(getConnectError(err))
      } finally {
        setIsLoadingBrands(false)
      }
    }

    void fetchBrandIdentities()
  }, [portalClient])

  useEffect(() => {
    const serializedMetadata = window.sessionStorage.getItem(VIDEO_COMPOSER_PREFILL_STORAGE_KEY)
    if (!serializedMetadata) return

    try {
      const metadata = fromJsonString(VideoMetadataSchema, serializedMetadata)
      setPrompt(metadata.prompt ?? '')
      setSelectedAssets((metadata.assets ?? []).map(asset => ({
        selection: asset
      })))
      if (metadata.generatedBranding?.brandLibraryID || metadata.generatedBranding?.brandIdentity?.id) {
        setSelectedBrandLibraryId(metadata.generatedBranding?.brandLibraryID || metadata.generatedBranding?.brandIdentity?.id)
      }
    } catch (err) {
      console.error('Failed to restore video metadata prefill', err)
      toast.error('Unable to prefill composer from the selected video')
    } finally {
      window.sessionStorage.removeItem(VIDEO_COMPOSER_PREFILL_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    if (!hasBrandIdentity) return
    if (quickStartMode === 'file' && !SHOW_FILE_UPLOAD_SHORTCUT) {
      setQuickStartMode(null)
    }
  }, [hasBrandIdentity, quickStartMode])

  useEffect(() => {
    if (isLoadingBrands) return
    setShowBrandOnboarding(!hasBrandIdentity)
  }, [hasBrandIdentity, isLoadingBrands])

  const consumePlanningStream = async (stream: AsyncIterable<CreateVideoResponse>, signal?: AbortSignal, streamSession?: number) => {
    for await (const event of stream) {
      if (signal?.aborted) return
      if (streamSession && streamSessionRef.current !== streamSession) return

      if (event.id) {
        setVideoId(event.id)
      }

      if (event.thinkingSummary) {
        setThinkingChunk(event.thinkingSummary)
      }

      if (event.errorMessage) {
        throw new Error(event.errorMessage)
      }

      if (event.waitingForUserInput && event.askUserQuestion.length > 0) {
        setPendingQuestions(event.askUserQuestion)
        setIsThinkingBusy(false)
        return
      }

      if (event.planningCompleted) {
        if (signal?.aborted) return
        const nextVideoID = event.id || videoId
        if (!nextVideoID) {
          throw new Error('missing video id after planning completion')
        }
        router.push(`/editor/${nextVideoID}`)
        return
      }
    }
  }

  const handleStop = () => {
    streamSessionRef.current += 1

    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setThinkingChunk('')
    setThinkingResetSignal(v => v + 1)
    setIsThinkingBusy(false)
    setIsSubmitting(false)
    setHasSubmitted(false)
    setStage('compose')
    setActiveQuestions([])
    setPendingQuestions([])
    setQuestionAssets([])
    setQuestionAssetsDialogOpen(false)
  }

  const startVideoCreation = async () => {
    const selectedResolution =
      defaultEditorConfig.resolution.options.find(r => r.id === resolutionId) ??
      getDefaultResolution(defaultEditorConfig)

    const controller = new AbortController()
    abortControllerRef.current = controller
    const streamSession = streamSessionRef.current + 1
    streamSessionRef.current = streamSession

    try {
      setThinkingResetSignal(v => v + 1)
      setIsSubmitting(true)
      setHasSubmitted(true)
      setStage('planning')
      setThinkingChunk('Initializing planning...')
      setActiveQuestions([])
      setPendingQuestions([])

      const stream = portalClient.createVideo({
        prompt,
        resolution: selectedResolution,
        durationInSec: Number(duration),
        brandLibraryId: selectedBrandLibraryId,
        assets: selectedAssetMessages,
        questions: {}
      }, { signal: controller.signal })

      await consumePlanningStream(stream, controller.signal, streamSession)
    } catch (err: any) {
      if (!controller.signal.aborted) {
        toast.error(getConnectError(err))
        setStage('compose')
        setThinkingChunk('')
        setThinkingResetSignal(v => v + 1)
      }
    } finally {
      if (!controller.signal.aborted && streamSessionRef.current === streamSession) {
        setIsSubmitting(false)
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
    }
  }

  const handleSubmit = async () => {
    if (!canGenerate || isSubmitting) return

    await startVideoCreation()
  }

  const handleContinuePlanning = async ({ response, script: updatedScript }: { response: string; script?: Script }) => {
    const trimmedResponse = response.trim()
    if (!videoId || !trimmedResponse || isSubmitting) return

    const controller = new AbortController()
    abortControllerRef.current = controller
    const streamSession = streamSessionRef.current + 1
    streamSessionRef.current = streamSession

    try {
      setThinkingResetSignal(v => v + 1)
      setIsSubmitting(true)
      setStage('planning')
      setActiveQuestions([])
      setPendingQuestions([])
      setThinkingChunk('Received your answer. Continuing planning...')

      const stream = portalClient.continueVideoPlanning({
        id: videoId,
        response: trimmedResponse,
        assets: mergedQuestionAssetMessages,
        script: updatedScript
      }, { signal: controller.signal })

      setQuestionAssets([])
      setQuestionAssetsDialogOpen(false)

      await consumePlanningStream(stream, controller.signal, streamSession)
    } catch (err: any) {
      if (!controller.signal.aborted) {
        toast.error(getConnectError(err))
        setStage(activeQuestions.length > 0 ? 'question' : 'compose')
        setThinkingChunk('')
        setThinkingResetSignal(v => v + 1)
      }
    } finally {
      if (!controller.signal.aborted && streamSessionRef.current === streamSession) {
        setIsSubmitting(false)
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
    }
  }

  const upsertSelectedAsset = (asset: MediaAsset, note?: string) => {
    const nextAsset = create(SelectedMediaAssetSchema, {
      assetID: asset.id,
      note: note?.trim() || undefined
    })

    setSelectedAssets(current => {
      const remaining = current.filter(item => item.selection.assetID !== nextAsset.assetID)
      return [...remaining, { selection: nextAsset, asset }]
    })
    setAssetDialogOpen(false)
  }

  const upsertQuestionAsset = (asset: MediaAsset, note?: string) => {
    const nextAsset = create(SelectedMediaAssetSchema, {
      assetID: asset.id,
      note: note?.trim() || undefined
    })

    setQuestionAssets(current => {
      const remaining = current.filter(item => item.selection.assetID !== nextAsset.assetID)
      return [...remaining, { selection: nextAsset, asset }]
    })
    setAssetDialogOpen(false)
  }

  const handleSelectUploadedAsset = async ({ asset, sectionNote }: { asset: MediaAsset; sectionNote?: string }) => {
    // Composer-level PDFs are treated as URL context so planning reads the document link from the prompt
    // instead of sending the file through selected media assets.
    if (stage === 'compose' && asset.mimeType === 'application/pdf' && isValidHttpUrl(asset.url)) {
      const nextUrls = Array.from(new Set([...attachedWebsiteUrls, asset.url]))
      setAttachedWebsiteUrls(nextUrls)
      setQuickStartMode(null)
      setPrompt(current => buildPromptWithReferenceUrls(current, nextUrls))
      setAssetDialogOpen(false)
      return
    }

    if (stage === 'question') {
      upsertQuestionAsset(asset, sectionNote)
    } else {
      upsertSelectedAsset(asset, sectionNote)
    }
  }

  const openAssetDialog = () => {
    setAssetDialogOpen(true)
  }

  const fillPromptTemplate = (mode: QuickStartMode, websiteUrl?: string) => {
    if (!isPromptTemplate(prompt)) return

    if (mode === 'website') {
      const nextUrls = websiteUrl?.trim()
        ? Array.from(new Set([...attachedWebsiteUrls, websiteUrl.trim()]))
        : attachedWebsiteUrls
      setPrompt(buildWebsitePrompt(nextUrls))
      return
    }

    setPrompt(PROMPT_TEMPLATES[mode])
  }

  const handleQuickStart = (mode: QuickStartMode) => {
    if (stage !== 'compose') return

    if (mode === 'website') {
      setQuickStartMode('website')
      return
    }

    if (mode === 'file') {
      setQuickStartMode('file')
      fillPromptTemplate('file')
      openAssetDialog()
      return
    }

    setQuickStartMode(null)
    fillPromptTemplate('script')
  }

  const handleAddWebsiteContext = () => {
    const trimmedUrl = composerWebsiteUrl.trim()
    if (!trimmedUrl) return
    if (!isValidHttpUrl(trimmedUrl)) {
      toast.error('Please enter a valid website URL')
      return
    }

    const nextUrls = Array.from(new Set([...attachedWebsiteUrls, trimmedUrl]))
    setAttachedWebsiteUrls(nextUrls)
    setQuickStartMode(null)
    setComposerWebsiteUrl('')
    setPrompt(current => buildPromptWithReferenceUrls(current, nextUrls))
  }

  const handleBrandSetupSubmit = () => {
    const trimmedUrl = brandWebsiteUrl.trim()
    if (!trimmedUrl) return
    if (!isValidHttpUrl(trimmedUrl)) {
      toast.error('Please enter a valid website URL')
      return
    }

    router.push(`/dashboard/brand?websiteUrl=${encodeURIComponent(trimmedUrl)}`)
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

  const removeQuestionAsset = (assetID: string) => {
    setQuestionAssets(current => current.filter(asset => asset.selection.assetID !== assetID))
  }

  const updateQuestionAssetNote = (assetID: string, note?: string) => {
    setQuestionAssets(current =>
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

  const hydrateQuestionAssets = (assets: MediaAsset[]) => {
    if (assets.length === 0) return

    setQuestionAssets(current =>
      current.map(selectedAsset => {
        const fullAsset = assets.find(asset => asset.id === selectedAsset.selection.assetID)
        return fullAsset
          ? { ...selectedAsset, asset: fullAsset }
          : selectedAsset
      })
    )
  }

  if (isLoadingBrands) {
    return <AuthLoading />
  }

  return (
    <div className='flex flex-col w-full max-w-3xl mx-auto px-4 min-h-[calc(100vh-4rem)]'>
      <Dialog open={assetDialogOpen} onOpenChange={setAssetDialogOpen}>
        <DialogContent className='max-w-2xl p-0 overflow-hidden' forceMount>
          <ManualMediaImportPanel
            // showPreview={false}
            onClose={() => setAssetDialogOpen(false)}
            onConfirm={handleSelectUploadedAsset}
            canConfirm={stage === 'compose' || stage === 'question'}
          />
        </DialogContent>
      </Dialog>

      <SelectedAssetsDialog
        open={selectedAssetsDialogOpen}
        selectedAssets={selectedAssets}
        onOpenChange={setSelectedAssetsDialogOpen}
        onHydrateAssets={hydrateSelectedAssets}
        onRemoveAsset={removeSelectedAsset}
        onUpdateAssetNote={updateSelectedAssetNote}
        onOpenUpload={openAssetDialog}
      />

      <SelectedAssetsDialog
        open={questionAssetsDialogOpen}
        selectedAssets={questionAssets}
        onOpenChange={setQuestionAssetsDialogOpen}
        onHydrateAssets={hydrateQuestionAssets}
        onRemoveAsset={removeQuestionAsset}
        onUpdateAssetNote={updateQuestionAssetNote}
        onOpenUpload={openAssetDialog}
      />

      {/* Center area — grows to push input to the bottom */}
      <div className='flex-1 flex items-center justify-center py-8'>
        <div className='w-full'>
          <div className='mx-auto max-w-2xl text-center'>
            <h1 className='text-3xl font-semibold tracking-tight'>
              Turn your GTM assets into videos
            </h1>
            <p className='mt-2 text-sm text-muted-foreground'>
              Start with a website, deck, doc, or script. And watch Dart turn it into an on-brand explainer instantly.
            </p>
          </div>

          {stage === 'compose' && showBrandOnboarding ? (
            <div className='mx-auto mt-10 flex w-full max-w-2xl justify-center pt-2'>
              <Card className='w-full border-border/70 shadow-sm'>
                <CardContent className='p-6'>
                  <div className='mb-4 flex items-center gap-3'>
                    <div className='flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground'>
                      1
                    </div>
                    <p className='text-base font-semibold'>Match your brand automatically</p>
                  </div>

                  <p className='mb-4 text-sm text-muted-foreground'>
                    Add your company website and Dart will pull your colors, fonts, and logo into every video. You can refine this later.
                  </p>

                  <div className='space-y-3'>
                    <Input
                      type='url'
                      value={brandWebsiteUrl}
                      onChange={e => setBrandWebsiteUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleBrandSetupSubmit()}
                      placeholder='https://yourcompany.com'
                    />

                    <div className='flex gap-3'>
                      <Button
                        onClick={handleBrandSetupSubmit}
                        disabled={!brandWebsiteUrl.trim()}
                      >
                        {brandWebsiteUrl.trim() ? 'Apply brand & continue' : 'Continue'}
                      </Button>
                      <Button
                        variant='ghost'
                        onClick={() => setShowBrandOnboarding(false)}
                      >
                        Skip for now
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : stage === 'compose' && (
            <div className='mx-auto mt-10 max-w-3xl space-y-3 pt-2'>
              <div>
                <p className='text-sm font-medium text-foreground'>Quick start</p>
              </div>

              <div className='grid gap-3 md:grid-cols-3'>
                <button
                  type='button'
                  onClick={() => handleQuickStart('website')}
                  className='rounded-xl border border-border bg-card px-3 py-2 text-left transition-colors hover:border-foreground/20 hover:bg-muted/30'
                >                 
                  <p className='text-sm font-semibold'>Start with website</p>
                  <p className='mt-0.5 text-xs text-muted-foreground'>Pull context from a URL.</p>
                </button>

                {SHOW_FILE_UPLOAD_SHORTCUT && (
                  <button
                    type='button'
                    onClick={() => handleQuickStart('file')}
                    className='rounded-xl border border-border bg-card px-3 text-left transition-colors hover:border-foreground/20 hover:bg-muted/30'
                  >                   
                    <p className='text-sm font-semibold'>Upload a file</p>
                    <p className='mt-1 text-xs text-muted-foreground'>PPT, PDF, DOCX </p>
                  </button>
                )}

                <button
                  type='button'
                  onClick={() => handleQuickStart('script')}
                  className='rounded-xl border border-border bg-card px-3 py-2 text-left transition-colors hover:border-foreground/20 hover:bg-muted/30'
                >                  
                  <p className='text-sm font-semibold'>Use script template</p>
                  <p className='mt-0.5 text-xs text-muted-foreground'>Start with a structure outline.</p>
                </button>
              </div>

              {quickStartMode === 'website' && (
                <div className='rounded-xl border border-border bg-muted/30 p-4'>
                  <div className='mb-3 flex items-center gap-2 text-sm font-medium'>
                    <Globe className='h-4 w-4 text-primary' />
                    Enter website URL
                  </div>
                  <div className='flex flex-col gap-2 md:flex-row'>
                    <Input
                      type='url'
                      value={composerWebsiteUrl}
                      onChange={e => setComposerWebsiteUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddWebsiteContext()}
                      placeholder='https://yourcompany.com'
                      className='md:flex-1'
                    />
                    <div className='flex gap-2'>
                      <Button onClick={handleAddWebsiteContext} disabled={!composerWebsiteUrl.trim()}>
                        Add URL
                      </Button>
                      <Button variant='ghost' onClick={() => setQuickStartMode(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {!showBrandOnboarding && (
        <div className='pb-6 space-y-2'>

        {/* Thinking bar — appears above input when agent is active */}
        {showThinking && <ThinkingViewComponent thinkingChunk={thinkingChunk} />}

        {/* Question panel — appears above input when agent asks something */}
        {stage === 'question' && activeQuestions.length > 0 && (
          <QuestionPanel
            questions={activeQuestions}
            isSubmitting={isSubmitting}
            onContinue={payload => void handleContinuePlanning(payload)}
            selectedQuestionAssets={questionAssets}
            onOpenAssetPicker={openAssetDialog}
            onOpenSelectedAssetsDialog={() => setQuestionAssetsDialogOpen(true)}
          />
        )}

        {/* Main input card */}
        <div className='rounded-2xl border bg-background shadow-sm overflow-hidden'>

          {/* Toolbar row */}
          <div className='flex items-center gap-1.5 px-4 pt-3 pb-2 text-xs text-muted-foreground border-b border-border/40 flex-wrap'>
            <span className='flex items-center gap-1 flex-shrink-0'>
              <Film className='w-4 h-4' />
              <Select value={resolutionId} onValueChange={setResolutionId} disabled={stage !== 'compose'}>
                <SelectTrigger className='h-7 text-xs bg-transparent border-none shadow-none ring-0 focus:ring-0 px-1 gap-1 w-auto min-w-0'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {defaultEditorConfig.resolution.options.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.width}x{r.height})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </span>

            <span className='text-border/60 mx-0.5'>·</span>

            {/* <DurationSelector
              value={duration}
              onChange={setDuration}
              disabled={stage !== 'compose'}
            />

            <span className='text-border/60 mx-0.5'>·</span> */}

            <LanguageSelector
              value={language}
              onChange={setLanguage}
              disabled={stage !== 'compose'}
            />

            <div className='flex-1' />

            {/* Add Style */}
            {/* <StyleSelector
              selectedStyle={selectedStyle}
              onOpenDialog={() => setStyleDialogOpen(true)}
              disabled={stage !== 'compose'}
            /> */}

            {/* Add Brand Library */}
            <BrandLibrarySelector
              selectedBrandLibraryId={selectedBrandLibraryId}
              onChange={setSelectedBrandLibraryId}
              onAddBrand={() => router.push('/dashboard/brand')}
              disabled={stage !== 'compose'}
            />
          </div>

          {(attachedWebsiteUrls.length > 0 || hasSelectedAssets) && (
            <div className='mx-4 mt-3 flex flex-wrap gap-2'>
              {attachedWebsiteUrls.map(url => (
                <div key={url} className='flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5 text-xs text-foreground'>
                  <Link2 className='h-3.5 w-3.5 text-muted-foreground' />
                  <span className='max-w-[220px] truncate'>{url}</span>
                  <button
                    type='button'
                    className='rounded p-0.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive'
                    onClick={() => {
                      const nextUrls = attachedWebsiteUrls.filter(currentUrl => currentUrl !== url)
                      setAttachedWebsiteUrls(nextUrls)
                      setPrompt(current => buildPromptWithReferenceUrls(current, nextUrls))
                    }}
                  >
                    <X className='h-3.5 w-3.5' />
                  </button>
                </div>
              ))}

              {hasSelectedAssets && (
                <div
                  onClick={() => setSelectedAssetsDialogOpen(true)}
                  className='flex cursor-pointer items-center justify-between rounded-full border border-primary/15 bg-primary/5 px-3 py-1.5 text-xs transition-colors hover:border-primary/30'
                >
                  <div className='flex items-center gap-2 text-primary'>
                    <span className='font-medium'>
                      {selectedAssets.length} attached file{selectedAssets.length > 1 ? 's' : ''}
                    </span>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      setSelectedAssets([])
                    }}
                    className='ml-2 rounded p-0.5 hover:bg-destructive/10 hover:text-destructive'
                    type='button'
                  >
                    <X className='w-3.5 h-3.5' />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Textarea */}
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder='What do you want to create? Start with a website, attach files, or use the script template above.'
            rows={5}
            className='w-full resize-none bg-transparent px-4 py-3 text-sm focus:outline-none placeholder:text-muted-foreground/60'
            disabled={stage !== 'compose'}
          />

          {/* Action row */}
          <div className='flex items-center justify-between px-4 pb-4'>
            <div className='flex items-center gap-4 text-xs text-muted-foreground'>
              <button
                type='button'
                onClick={() => handleQuickStart('website')}
                className='inline-flex items-center gap-1.5 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50'
                disabled={stage !== 'compose'}
              >
                <Globe className='h-3.5 w-3.5' />
                Add URL
              </button>
              <button
                type='button'
                onClick={openAssetDialog}
                className='inline-flex items-center gap-1.5 transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50'
                disabled={stage !== 'compose'}
              >
                <Paperclip className='h-3.5 w-3.5' />
                Attach
              </button>
            </div>

            {isSubmitting || stage === 'question' ? (
              <Button
                onClick={handleStop}
                variant='outline'
                size='sm'
                className='h-9 w-9 rounded-xl hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30'
              >
                <Square className='w-3.5 h-3.5 fill-current' />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                size='sm'
                className='h-9 w-9 rounded-xl'
                disabled={!canGenerate || stage !== 'compose'}
              >
                <Sparkles className='w-4 h-4' />
              </Button>
            )}
          </div>
        </div>
        </div>
      )}
    </div>
  )
}

export default VideoIntentComposer
