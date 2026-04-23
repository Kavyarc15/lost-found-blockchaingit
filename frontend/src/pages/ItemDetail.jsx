import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useWeb3 } from '../context/Web3Context'
import { useContract } from '../hooks/useContract'
import { useIPFS } from '../hooks/useIPFS'
import StatusBadge from '../components/StatusBadge'
import ImageUpload from '../components/ImageUpload'
import LoadingSpinner from '../components/LoadingSpinner'
import { getIPFSUrl } from '../utils/pinata'
import { shortenAddress, formatDate } from '../utils/formatters'

export default function ItemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { account } = useWeb3()
  const { getItem, fileClaim, confirmReturn, loading: txLoading, error: txError } = useContract()
  const { uploading, uploadError, imageHash: confirmHash, imagePreview: confirmPreview, uploadImage: uploadConfirmImage, clearImage: clearConfirmImage } = useIPFS()

  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState(null)
  const [showConfirmUpload, setShowConfirmUpload] = useState(false)

  const loadItem = useCallback(async () => {
    try {
      const data = await getItem(Number(id))
      setItem(data)
    } catch (err) {
      console.error('Failed to load item:', err)
    } finally {
      setLoading(false)
    }
  }, [getItem, id])

  useEffect(() => {
    loadItem()
  }, [loadItem])

  const handleClaim = async () => {
    setActionError(null)
    try {
      await fileClaim(item.id)
      await loadItem()
    } catch (err) {
      setActionError(err.reason || err.message)
    }
  }

  const handleConfirmReturn = async () => {
    if (!confirmHash) return
    setActionError(null)
    try {
      await confirmReturn(item.id, confirmHash)
      await loadItem()
      setShowConfirmUpload(false)
    } catch (err) {
      setActionError(err.reason || err.message)
    }
  }

  if (loading) return <LoadingSpinner text="Loading item details..." />
  if (!item) {
    return (
      <div className="page">
        <div className="container">
          <div className="empty-state">
            <div className="empty-state-icon">❌</div>
            <h3>Item Not Found</h3>
            <p>This item doesn't exist on the blockchain.</p>
            <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isFinder = account?.toLowerCase() === item.finder.toLowerCase()
  const isOwner = item.owner && account?.toLowerCase() === item.owner.toLowerCase()
  const imageUrl = getIPFSUrl(item.imageHash)
  const confirmImageUrl = getIPFSUrl(item.confirmImageHash)

  // Timeline step states
  const steps = [
    { label: 'Reported', status: item.status >= 0 ? (item.status > 0 ? 'completed' : 'active') : '' },
    { label: 'Claimed', status: item.status >= 1 ? (item.status > 1 ? 'completed' : 'active') : '' },
    { label: 'Returned', status: item.status >= 2 ? 'completed' : '' },
  ]

  return (
    <div className="page">
      <div className="container detail-page">
        <div className="detail-back" onClick={() => navigate(-1)}>
          ← Back
        </div>

        <div className="glass-card detail-card">
          {/* Item Image */}
          {imageUrl ? (
            <img src={imageUrl} alt={item.name} className="detail-image" />
          ) : (
            <div className="detail-image-placeholder">📦</div>
          )}

          <div className="detail-body">
            {/* Header */}
            <div className="detail-header">
              <h1 className="detail-title">{item.name}</h1>
              <StatusBadge status={item.status} />
            </div>

            {/* Description */}
            {item.description && (
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '1rem', lineHeight: '1.7' }}>
                {item.description}
              </p>
            )}

            {/* Timeline */}
            <div className="timeline">
              <div className="timeline-steps">
                {steps.map((s, i) => (
                  <div key={i} className={`timeline-step ${s.status}`}>
                    <div className="timeline-step-dot">
                      {s.status === 'completed' ? '✓' : i + 1}
                    </div>
                    <span className="timeline-step-label">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Metadata Grid */}
            <div className="detail-meta">
              <div className="detail-meta-item">
                <div className="detail-meta-label">Location Found</div>
                <div className="detail-meta-value">📍 {item.location}</div>
              </div>
              <div className="detail-meta-item">
                <div className="detail-meta-label">Reported At</div>
                <div className="detail-meta-value">{formatDate(item.reportedAt)}</div>
              </div>
              <div className="detail-meta-item">
                <div className="detail-meta-label">Found By</div>
                <div className="detail-meta-value">
                  {shortenAddress(item.finder)} {isFinder && <span style={{ color: 'var(--color-primary)' }}>(You)</span>}
                </div>
              </div>
              <div className="detail-meta-item">
                <div className="detail-meta-label">Claimed By</div>
                <div className="detail-meta-value">
                  {item.owner === '0x0000000000000000000000000000000000000000'
                    ? '— Awaiting owner'
                    : <>
                        {shortenAddress(item.owner)} {isOwner && <span style={{ color: 'var(--color-primary)' }}>(You)</span>}
                      </>
                  }
                </div>
              </div>
              {item.claimedAt > 0 && (
                <div className="detail-meta-item">
                  <div className="detail-meta-label">Claimed At</div>
                  <div className="detail-meta-value">{formatDate(item.claimedAt)}</div>
                </div>
              )}
              {item.returnedAt > 0 && (
                <div className="detail-meta-item">
                  <div className="detail-meta-label">Returned At</div>
                  <div className="detail-meta-value">{formatDate(item.returnedAt)}</div>
                </div>
              )}
            </div>

            {/* Confirmation Photos (if returned) */}
            {item.status === 2 && confirmImageUrl && (
              <div className="photos-comparison">
                <div className="photos-comparison-item">
                  {imageUrl && <img src={imageUrl} alt="Finder's photo" />}
                  <div className="photos-comparison-label">Finder's Photo</div>
                </div>
                <div className="photos-comparison-item">
                  <img src={confirmImageUrl} alt="Owner's confirmation" />
                  <div className="photos-comparison-label">Owner's Confirmation</div>
                </div>
              </div>
            )}

            {/* Action Errors */}
            {(actionError || txError) && (
              <p style={{ color: 'var(--color-danger)', marginTop: '16px', fontSize: '0.9rem' }}>
                ❌ {actionError || txError}
              </p>
            )}

            {/* Action: Claim Item */}
            {item.status === 0 && !isFinder && (
              <div style={{ marginTop: '28px', padding: '24px', background: 'rgba(102, 126, 234, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
                <h3 style={{ marginBottom: '8px' }}>🙋 Is this your item?</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
                  If this item belongs to you, file a claim. After you receive it from the finder,
                  you'll need to upload a confirmation photo to complete the process.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={handleClaim}
                  disabled={txLoading}
                  id="claim-btn"
                >
                  {txLoading ? '⏳ Processing...' : '🙋 This Is Mine — File Claim'}
                </button>
              </div>
            )}

            {/* Action: Confirm Return (Owner only) */}
            {item.status === 1 && isOwner && (
              <div style={{ marginTop: '28px', padding: '24px', background: 'rgba(56, 239, 125, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(56, 239, 125, 0.2)' }}>
                <h3 style={{ marginBottom: '8px' }}>✅ Received Your Item?</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
                  After collecting your item from the finder, upload a confirmation photo to
                  complete the return and close this contract.
                </p>

                {!showConfirmUpload ? (
                  <button
                    className="btn btn-success"
                    onClick={() => setShowConfirmUpload(true)}
                    id="confirm-return-start-btn"
                  >
                    📷 Upload Confirmation Photo
                  </button>
                ) : (
                  <>
                    <div className="form-group">
                      <ImageUpload
                        onFileSelect={uploadConfirmImage}
                        preview={confirmPreview}
                        onRemove={clearConfirmImage}
                        uploading={uploading}
                      />
                      {uploadError && (
                        <p style={{ color: 'var(--color-danger)', marginTop: '8px', fontSize: '0.85rem' }}>
                          {uploadError}
                        </p>
                      )}
                      {confirmHash && (
                        <p style={{ color: 'var(--color-success)', marginTop: '8px', fontSize: '0.85rem' }}>
                          ✅ Confirmation image uploaded to IPFS
                        </p>
                      )}
                    </div>
                    <button
                      className="btn btn-success"
                      disabled={!confirmHash || txLoading || uploading}
                      onClick={handleConfirmReturn}
                      id="confirm-return-submit-btn"
                    >
                      {txLoading ? '⏳ Confirming on Blockchain...' : '✅ Confirm Return & Complete'}
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Info: Waiting for owner (Finder's view) */}
            {item.status === 0 && isFinder && (
              <div style={{ marginTop: '28px', padding: '24px', background: 'rgba(102, 126, 234, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(102, 126, 234, 0.2)' }}>
                <h3 style={{ marginBottom: '8px' }}>⏳ Waiting for the Owner</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Your item has been registered on the network. All users have been notified.
                  Wait for the rightful owner to identify and claim this item.
                </p>
              </div>
            )}

            {/* Info: Waiting for owner confirmation (Finder's view when claimed) */}
            {item.status === 1 && isFinder && (
              <div style={{ marginTop: '28px', padding: '24px', background: 'rgba(242, 153, 74, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(242, 153, 74, 0.2)' }}>
                <h3 style={{ marginBottom: '8px' }}>🤝 Item Claimed!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Someone has claimed this item as theirs. Please arrange the handover.
                  Once they receive it, they'll upload a confirmation photo to complete the contract.
                </p>
              </div>
            )}

            {/* Completed */}
            {item.status === 2 && (
              <div style={{ marginTop: '28px', padding: '24px', background: 'rgba(56, 239, 125, 0.08)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(56, 239, 125, 0.2)', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎉</div>
                <h3 style={{ color: 'var(--color-success)' }}>Contract Complete!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px' }}>
                  This item has been successfully returned to its owner. Both photos are permanently stored on IPFS.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
