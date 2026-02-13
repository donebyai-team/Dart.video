import { UploadMediaResponse } from '@coasterai/pb/coasterai/portal/v1/portal_pb'
import { browserTokenStore } from '@coasterai/ui-core/provider/BrowserStores'
import { CONFIG_API_URI } from './config'

export const uploadMedia = async (file: File): Promise<UploadMediaResponse> => {
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

  console.log(data, 'data')

  return data
}
