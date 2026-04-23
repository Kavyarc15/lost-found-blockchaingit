import { useState, useCallback } from 'react'
import { uploadToIPFS } from '../utils/pinata'

/**
 * Hook to handle image upload to IPFS.
 * Returns { uploading, uploadError, uploadImage, imageHash, imagePreview, clearImage }
 */
export function useIPFS() {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [imageHash, setImageHash] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  const uploadImage = useCallback(async (file) => {
    if (!file) return null

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file (JPEG, PNG, etc.)')
      return null
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image must be under 10MB')
      return null
    }

    setUploading(true)
    setUploadError(null)

    try {
      // Create preview immediately
      const preview = URL.createObjectURL(file)
      setImagePreview(preview)

      // Upload to IPFS
      const hash = await uploadToIPFS(file)
      setImageHash(hash)
      return hash
    } catch (err) {
      setUploadError(err.message || 'Failed to upload image')
      setImagePreview(null)
      return null
    } finally {
      setUploading(false)
    }
  }, [])

  const clearImage = useCallback(() => {
    setImageHash(null)
    setImagePreview(null)
    setUploadError(null)
  }, [])

  return {
    uploading,
    uploadError,
    imageHash,
    imagePreview,
    uploadImage,
    clearImage,
  }
}
