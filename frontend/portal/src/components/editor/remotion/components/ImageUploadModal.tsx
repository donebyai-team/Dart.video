import CloseIcon from '@mui/icons-material/Close'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'
import { Box, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material'
import React, { SetStateAction, useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface ImageUploadModalProps {
  open: boolean
  onClose: () => void
  onUploadImage: (url: string) => void
  onUploadError: () => void
  retry: boolean
  setRetry: React.Dispatch<SetStateAction<boolean>>
  setUploading: React.Dispatch<SetStateAction<boolean>>
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  open,
  onClose,
  onUploadImage,
  onUploadError,
  retry,
  setRetry,
  setUploading
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [choosenFile, setChoosenFile] = useState<File | null>(null)

  const uploadImage = async (file: File) => {
    //implement your uploading function here and return the url

    return URL.createObjectURL(file)
  }

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file')
        return
      }
      setChoosenFile(file)

      setIsUploading(true)

      try {
        let imageUrl: string

        imageUrl = URL.createObjectURL(file)

        onUploadImage(imageUrl)

        //async function to upload the update the image
        uploadImage(file)
          .then(cloudUrl => {
            onUploadImage(cloudUrl)
          })
          .catch(error => {
            console.error('Upload error:', error)
            toast.error('Something went wrong')
            onUploadError()
          })

        onClose()
      } catch (error) {
        console.error('Upload error:', error)
        toast.error('Failed to upload image')
      } finally {
        setIsUploading(false)
      }
    },
    [onUploadImage, onClose]
  )

  useEffect(() => {
    if (retry) {
      if (choosenFile) {
        setIsUploading(true)
        uploadImage(choosenFile)
          .then(cloudUrl => {
            onUploadImage(cloudUrl)
            setRetry(false)
            setChoosenFile(null)
            setIsUploading(false)
          })
          .catch((error) => {
            console.error('Upload error:', error)
            toast.error('Something went wrong')
            onUploadError()
            setRetry(false)
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
    input.accept = 'image/*'
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
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant='h6'>Upload Image</Typography>
        <IconButton
          aria-label='close'
          onClick={onClose}
          sx={{
            color: theme => theme.palette.grey[500]
          }}
          disabled={isUploading}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

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
                Drag & Drop Image Here
              </Typography>
              <Typography variant='body2' color='text.secondary'>
                or click to browse
              </Typography>
              <Typography variant='caption' color='text.disabled'>
                Supports: JPG, PNG, GIF, WebP
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default ImageUploadModal
