import { browserTokenStore } from '@coasterai/ui-core/provider/BrowserStores'
import { CONFIG_API_URI } from './config'
import { UploadedMedia, UploadedMediaSchema } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { create } from '@bufbuild/protobuf'

export const uploadMedia = async (file: File): Promise<UploadedMedia> => {
  // Check file size (10 MB = 10 * 1024 * 1024 bytes)
  const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB in bytes

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds 10 MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)} MB`)
  }

  const token = await browserTokenStore.Get()
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(`${CONFIG_API_URI}/media/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token?.token}`
    },
    body: formData
  })
  const data = await response.json()

  return create(UploadedMediaSchema, data)
}

export type PollVideoRenderProgress = {
  completed?: boolean
  renderPhase?: string
  renderCurrent?: number
  renderTotal?: number
  renderPercent?: number
  renderEtaSeconds?: number
}

export type PollVideoRenderResult =
  | { type: 'progress'; data: PollVideoRenderProgress }
  | { type: 'file'; blob: Blob; fileName: string }

const parseFileName = (contentDisposition: string | null, fallback: string) => {
  if (!contentDisposition) return fallback
  const match = contentDisposition.match(/filename="?([^"]+)"?/)
  return match?.[1] ?? fallback
}

export const pollVideoRender = async (
  jobId: string,
  videoId: string,
  version: string
): Promise<PollVideoRenderResult> => {
  const token = await browserTokenStore.Get()
  const params = new URLSearchParams({ jobId, videoId, version })

  const response = await fetch(`${CONFIG_API_URI}/video/render?${params.toString()}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token?.token}`
    }
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(errText || `Render polling failed (${response.status})`)
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('video/mp4')) {
    const blob = await response.blob()
    const fileName = parseFileName(response.headers.get('content-disposition'), `${videoId}-${version}.mp4`)
    return { type: 'file', blob, fileName }
  }

  const data = (await response.json()) as PollVideoRenderProgress
  return { type: 'progress', data }
}
