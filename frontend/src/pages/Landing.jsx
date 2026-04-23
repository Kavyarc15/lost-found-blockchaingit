import { useWeb3 } from '../context/Web3Context'
import { useContract } from '../hooks/useContract'
import { useState, useEffect } from 'react'

export default function Landing() {
  const { connectWallet, connecting, error } = useWeb3()
  const { getTotalItems } = useContract()
  const [stats, setStats] = useState({ total: 0 })

  useEffect(() => {
    getTotalItems().then((total) => setStats({ total })).catch(() => {})
  }, [getTotalItems])

  return (
    <div className="hero">
      <div className="hero-content">
        <div className="hero-badge">
          ⛓️ Powered by Blockchain
        </div>

        <h1>Lost & Found on the Blockchain</h1>

        <p className="hero-subtitle">
          A decentralized platform where finders register lost items with photos,
          owners claim them with proof, and every step is recorded immutably on-chain.
        </p>

        <div className="hero-actions">
          <button
            className="btn btn-primary btn-lg"
            onClick={connectWallet}
            disabled={connecting}
            id="connect-wallet-hero"
          >
            {connecting ? '⏳ Connecting…' : '🦊 Connect MetaMask'}
          </button>
          <a href="#how-it-works" className="btn btn-ghost btn-lg">
            Learn How It Works
          </a>
        </div>

        {error && (
          <p style={{ color: 'var(--color-danger)', marginTop: '16px', fontSize: '0.9rem' }}>
            {error}
          </p>
        )}

        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-value">{stats.total}</div>
            <div className="hero-stat-label">Items Registered</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">🔒</div>
            <div className="hero-stat-label">On-Chain Verified</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-value">🌐</div>
            <div className="hero-stat-label">Decentralized</div>
          </div>
        </div>

        <div className="features" id="how-it-works">
          <div className="feature-card">
            <div className="feature-card-icon" style={{ background: 'rgba(102, 126, 234, 0.15)' }}>📦</div>
            <h3>Report Found Items</h3>
            <p>Found something? Snap a photo, fill in the details, and register it on the blockchain for everyone to see.</p>
          </div>
          <div className="feature-card">
            <div className="feature-card-icon" style={{ background: 'rgba(242, 153, 74, 0.15)' }}>🔔</div>
            <h3>Real-time Notifications</h3>
            <p>All users on the network are instantly notified when a new item is found, so owners can spot their belongings.</p>
          </div>
          <div className="feature-card">
            <div className="feature-card-icon" style={{ background: 'rgba(56, 239, 125, 0.15)' }}>✅</div>
            <h3>Verified Returns</h3>
            <p>Owners confirm receipt with a photo. Both images are stored on IPFS, creating an immutable proof of return.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
