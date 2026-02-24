import { uploadMedia } from '@/services/utils'
import { UploadedMedia } from '@coasterai/pb/coasterai/core/v1/slide_pb'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { Box, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material'
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
  accept
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
            console.debug("Failed to upload file", error);
            toast.error(error.message)
            setIsUploading(false)
            setUploadError(true)
          })

        onClose()
      } catch (error) {
        toast.error('Failed to upload media')
        setIsUploading(false)
        setUploadError(true);
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
            console.debug("Failed to retry upload file", error);
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

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth='sm'
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2
        }
      }}
    >     

      <DialogContent dividers>
        <Box
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={!isUploading ? handleClick : undefined}
          sx={{
            border: '2px dashed',
            borderColor: isDragging ? 'primary.main' : 'grey.300',
            borderRadius: 2,
            p: 6,
            textAlign: 'center',
            cursor: isUploading ? 'default' : 'pointer',
            bgcolor: isDragging ? 'action.hover' : 'background.paper',
            transition: 'all 0.3s ease',
            '&:hover': {
              borderColor: isUploading ? 'grey.300' : 'primary.main',
              bgcolor: isUploading ? 'background.paper' : 'action.hover'
            }
          }}
        >
          {isUploading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CircularProgress />
              <Typography variant='body2' color='text.secondary'>
                Uploading...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', opacity: 0.5 }} />
              <Typography variant='h6' color='text.primary'>
                Drag & Drop Media Here
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                or click to browse
              </Typography>
              <Typography variant='caption' color='text.disabled'>
                Supports: JPG, PNG, MP4, WEBM
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default UploadModal
