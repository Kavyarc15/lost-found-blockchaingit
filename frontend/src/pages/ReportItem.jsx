import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useContract } from '../hooks/useContract'
import { useIPFS } from '../hooks/useIPFS'
import ImageUpload from '../components/ImageUpload'

export default function ReportItem() {
  const navigate = useNavigate()
  const { reportItem, loading: txLoading } = useContract()
  const { uploading, uploadError, imageHash, imagePreview, uploadImage, clearImage } = useIPFS()

  const [form, setForm] = useState({ name: '', description: '', location: '' })
  const [step, setStep] = useState(1)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [newItemId, setNewItemId] = useState(null)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleFileSelect = async (file) => {
    await uploadImage(file)
  }

  const canProceedStep1 = form.name.trim() && form.location.trim()
  const canProceedStep2 = imageHash
  const canSubmit = canProceedStep1 && canProceedStep2

  const handleSubmit = async () => {
    if (!canSubmit) return
    setError(null)
    try {
      const itemId = await reportItem(
        form.name.trim(),
        form.description.trim(),
        form.location.trim(),
        imageHash
      )
      setNewItemId(itemId)
      setSuccess(true)
    } catch (err) {
      setError(err.reason || err.message || 'Transaction failed')
    }
  }

  if (success) {
    return (
      <div className="page">
        <div className="container form-page">
          <div className="glass-card form-card" style={{ textAlign: 'center', padding: '60px 36px' }}>
            <div style={{ fontSize: '4rem', marginBottom: '16px' }}>🎉</div>
            <h2>Item Registered Successfully!</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '8px', marginBottom: '28px' }}>
              Your found item has been recorded on the blockchain. All users on the network will be notified.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => navigate(`/item/${newItemId}`)}>
                View Item #{newItemId}
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container form-page">
        <h2>📦 Report a Found Item</h2>
        <p className="form-subtitle">
          Found something? Register it on the blockchain so the owner can find and claim it.
        </p>

        {/* Progress Steps */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '2px',
                background: step >= s ? 'var(--color-primary)' : 'rgba(255,255,255,0.08)',
                transition: 'background 300ms',
              }}
            />
          ))}
        </div>

        <div className="glass-card form-card">
          {/* Step 1: Item Details */}
          {step === 1 && (
            <>
              <h3 style={{ marginBottom: '24px' }}>Step 1: Item Details</h3>

              <div className="form-group">
                <label className="input-label">Item Name *</label>
                <input
                  className="input-field"
                  type="text"
                  name="name"
                  placeholder="e.g. Blue Water Bottle, iPhone 15, Car Keys..."
                  value={form.name}
                  onChange={handleChange}
                  id="input-name"
                />
              </div>

              <div className="form-group">
                <label className="input-label">Description</label>
                <textarea
                  className="input-field"
                  name="description"
                  placeholder="Describe the item — color, brand, any distinguishing features..."
                  value={form.description}
                  onChange={handleChange}
                  id="input-description"
                />
              </div>

              <div className="form-group">
                <label className="input-label">Location Found *</label>
                <input
                  className="input-field"
                  type="text"
                  name="location"
                  placeholder="e.g. Library 2nd Floor, Central Park Bench, Bus Stop #42..."
                  value={form.location}
                  onChange={handleChange}
                  id="input-location"
                />
              </div>

              <button
                className="btn btn-primary"
                disabled={!canProceedStep1}
                onClick={() => setStep(2)}
                style={{ width: '100%' }}
              >
                Next: Upload Photo →
              </button>
            </>
          )}

          {/* Step 2: Photo Upload */}
          {step === 2 && (
            <>
              <h3 style={{ marginBottom: '8px' }}>Step 2: Upload Photo</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>
                Take a clear photo of the item. This will be uploaded to IPFS and stored on-chain.
              </p>

              <div className="form-group">
                <ImageUpload
                  onFileSelect={handleFileSelect}
                  preview={imagePreview}
                  onRemove={clearImage}
                  uploading={uploading}
                />
                {uploadError && (
                  <p style={{ color: 'var(--color-danger)', marginTop: '8px', fontSize: '0.85rem' }}>
                    {uploadError}
                  </p>
                )}
                {imageHash && (
                  <p style={{ color: 'var(--color-success)', marginTop: '8px', fontSize: '0.85rem' }}>
                    ✅ Image uploaded to IPFS
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-ghost" onClick={() => setStep(1)} style={{ flex: 1 }}>
                  ← Back
                </button>
                <button
                  className="btn btn-primary"
                  disabled={!canProceedStep2 || uploading}
                  onClick={() => setStep(3)}
                  style={{ flex: 2 }}
                >
                  Next: Review & Submit →
                </button>
              </div>
            </>
          )}

          {/* Step 3: Review & Submit */}
          {step === 3 && (
            <>
              <h3 style={{ marginBottom: '24px' }}>Step 3: Review & Submit</h3>

              <div style={{ marginBottom: '20px' }}>
                <div className="detail-meta">
                  <div className="detail-meta-item">
                    <div className="detail-meta-label">Item Name</div>
                    <div className="detail-meta-value">{form.name}</div>
                  </div>
                  <div className="detail-meta-item">
                    <div className="detail-meta-label">Location</div>
                    <div className="detail-meta-value">{form.location}</div>
                  </div>
                </div>
                {form.description && (
                  <div style={{ marginBottom: '16px' }}>
                    <div className="detail-meta-label">Description</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>{form.description}</div>
                  </div>
                )}
                {imagePreview && (
                  <img src={imagePreview} alt="Preview" style={{
                    width: '100%', maxHeight: '200px', objectFit: 'cover',
                    borderRadius: 'var(--radius-md)', border: 'var(--border-glass)',
                  }} />
                )}
              </div>

              {error && (
                <p style={{ color: 'var(--color-danger)', marginBottom: '16px', fontSize: '0.85rem' }}>
                  ❌ {error}
                </p>
              )}

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn btn-ghost" onClick={() => setStep(2)} style={{ flex: 1 }}>
                  ← Back
                </button>
                <button
                  className="btn btn-success"
                  disabled={txLoading}
                  onClick={handleSubmit}
                  style={{ flex: 2 }}
                  id="submit-report-btn"
                >
                  {txLoading ? '⏳ Submitting to Blockchain...' : '🚀 Submit to Blockchain'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
