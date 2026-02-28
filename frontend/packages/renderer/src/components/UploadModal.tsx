import { UploadedMedia } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { CloudUpload, Loader2 } from 'lucide-react'
import React, { SetStateAction, useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface UploadModalProps {
  open: boolean
  onClose: () => void
  onUpload: (url: UploadedMedia) => void
  retry: boolean
  setRetry: React.Dispatch<SetStateAction<boolean>>
  setUploading: React.Dispatch<SetStateAction<boolean>>
  setUploadError: React.Dispatch<SetStateAction<boolean>>
  accept: string
  uploadMedia: (file: File) => Promise<UploadedMedia>
}

// getVideoDurationFromUrl returns duration of video in seconds
export const getVideoDurationFromUrl = (url: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')

    video.preload = 'metadata'
    video.src = url

    video.onloadedmetadata = () => {
      resolve(video.duration)
      video.remove()
    }

    video.onerror = () => {
      reject(new Error('Failed to load video metadata'))
      video.remove()
    }
  })
}

export const UploadModal: React.FC<UploadModalProps> = ({
  open,
  onClose,
  onUpload,
  retry,
  setRetry,
  setUploading,
  setUploadError,
  accept,
  uploadMedia
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [choosenFile, setChoosenFile] = useState<File | null>(null)

  // Call upload to upload file
  const upload = async (file: File) => {
    const data = await uploadMedia(file)
    if (!data.mimeType?.startsWith('image')) {
      // Best effort: don't block upload if cross-origin metadata probing fails.
      try {
        const videoDuration = await getVideoDurationFromUrl(data.url)
        data.duration = videoDuration
      } catch (error) {
        console.debug('Skipping video duration fetch:', error)
      }
    }
    return data
  }

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        toast.error('Please upload an image/video file')
        return
      }

      // Set setChoosenFile to file to use it while you retry to upload
      setChoosenFile(file)

      // Set setIsUploading true to show loader
      setIsUploading(true)

      try {
        //async function to upload the update
        upload(file)
          .then(cloudUrl => {
            onUpload(cloudUrl)
            setIsUploading(false)
            setUploadError(false)
            setRetry(false)
          })
          .catch(error => {
            console.debug('Failed to upload file', error)
            toast.error(error.message)
            setIsUploading(false)
            setUploadError(true)
          })

        onClose()
      } catch (error) {
        toast.error('Failed to upload media')
        setIsUploading(false)
        setUploadError(true)
      }
    },
    [onUpload, onClose]
  )

  useEffect(() => {
    if (retry) {
      if (choosenFile) {
        setIsUploading(true)
        upload(choosenFile)
          .then(cloudUrl => {
            onUpload(cloudUrl)
            setRetry(false)
            setChoosenFile(null)
            setIsUploading(false)
            setUploadError(false)
          })
          .catch(error => {
            console.debug('Failed to retry upload file', error)
            toast.error(error.message)
            setUploadError(true)
            setIsUploading(false)
          })
      }
    }
  }, [retry])

  useEffect(() => {
    setUploading(isUploading)
  }, [isUploading])

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        handleFile(files[0])
      }
    },
    [handleFile]
  )

  const handleClick = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.onchange = e => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        handleFile(file)
      }
    }
    input.click()
  }, [handleFile])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-sm rounded-lg bg-white shadow-xl mx-4">
        <div className="p-4">
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={!isUploading ? handleClick : undefined}
            className={[
              'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-12 text-center transition-all duration-300',
              isUploading ? 'cursor-default' : 'cursor-pointer',
              isDragging
                ? 'border-blue-500 bg-blue-50'
                : isUploading
                  ? 'border-gray-300 bg-white'
                  : 'border-gray-300 bg-white hover:border-blue-500 hover:bg-gray-50'
            ].join(' ')}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
                <p className="text-sm text-gray-500">Uploading...</p>
              </>
            ) : (
              <>
                <CloudUpload className="h-16 w-16 text-blue-500 opacity-50" />
                <p className="text-base font-semibold text-gray-800">Drag &amp; Drop Media Here</p>
                <p className="text-sm text-gray-500">or click to browse</p>
                <p className="text-xs text-gray-400">Supports: JPG, PNG, MP4, WEBM</p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default UploadModal
