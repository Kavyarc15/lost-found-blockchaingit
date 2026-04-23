import { useRef, useState, useCallback } from 'react'

export default function ImageUpload({ onFileSelect, preview, onRemove, uploading }) {
  const fileRef = useRef(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback((file) => {
    if (file && file.type.startsWith('image/')) {
      onFileSelect(file)
    }
  }, [onFileSelect])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragging(false)
  }, [])

  if (preview) {
    return (
      <div className={`image-upload-zone has-file`}>
        <img src={preview} alt="Preview" className="image-upload-preview" />
        {!uploading && (
          <button className="image-upload-remove" onClick={onRemove} title="Remove image">
            ✕
          </button>
        )}
        {uploading && (
          <div style={{ position: 'absolute', bottom: '16px' }}>
            <div className="spinner" style={{ width: '24px', height: '24px' }} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={`image-upload-zone ${dragging ? 'dragging' : ''}`}
      onClick={() => fileRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <div className="image-upload-icon">📷</div>
      <div className="image-upload-text">
        {dragging ? 'Drop your image here' : 'Click or drag & drop an image'}
      </div>
      <div className="image-upload-hint">
        JPEG, PNG, WebP • Max 10MB
      </div>
    </div>
  )
}
