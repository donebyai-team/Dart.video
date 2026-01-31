import React, { useState, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Box,
  Typography,
  CircularProgress,
  IconButton
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import CloudUploadIcon from '@mui/icons-material/CloudUpload'

interface ImageUploadModalProps {
  open: boolean
  onClose: () => void
  onUploadImage: (url: string) => void
  test?: boolean
}

export const ImageUploadModal: React.FC<ImageUploadModalProps> = ({
  open,
  onClose,
  onUploadImage,
  test = false
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file')
        return
      }

      setIsUploading(true)

      try {
        let imageUrl: string

        if (test) {
          // Test mode: use Object URL
          imageUrl = URL.createObjectURL(file)
        } else {
          // Production mode: implement your upload logic here
          // For now, using Object URL as fallback
          imageUrl = URL.createObjectURL(file)
        }

        onUploadImage(imageUrl)
        onClose()
      } catch (error) {
        console.error('Upload error:', error)
        alert('Failed to upload image')
      } finally {
        setIsUploading(false)
      }
    },
    [test, onUploadImage, onClose]
  )

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
    input.onchange = (e) => {
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
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2
        }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Upload Image</Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: (theme) => theme.palette.grey[500]
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
              <Typography variant="body2" color="text.secondary">
                Uploading...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CloudUploadIcon sx={{ fontSize: 64, color: 'primary.main', opacity: 0.5 }} />
              <Typography variant="h6" color="text.primary">
                Drag & Drop Image Here
              </Typography>
              <Typography variant="body2" color="text.secondary">
                or click to browse
              </Typography>
              <Typography variant="caption" color="text.disabled">
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