import { UploadedMedia } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import { CloudUpload } from 'lucide-react'
import React, { SetStateAction, useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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

      setChoosenFile(file)
      onClose()
      setIsUploading(true)

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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-96 rounded-2xl bg-white shadow-2xl">
        <div className="p-6">
          {/* Title */}
          <p className="text-sm font-semibold text-gray-900 mb-1">Upload Media</p>
          <p className="text-xs text-gray-400 mb-4">JPG, PNG, MP4 or WEBM</p>

          {/* Drop zone */}
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            className={[
              'flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-all duration-200',
              isDragging
                ? 'border-indigo-400 bg-indigo-50'
                : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
            ].join(' ')}
          >
            <div className={[
              'flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200',
              isDragging ? 'bg-indigo-100' : 'bg-gray-100'
            ].join(' ')}>
              <CloudUpload className={[
                'h-5 w-5 transition-colors duration-200',
                isDragging ? 'text-indigo-500' : 'text-gray-400'
              ].join(' ')} />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-gray-700">
                Drop file here, or{' '}
                <span className="text-indigo-500 underline underline-offset-2">browse</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default UploadModal
