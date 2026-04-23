import { Link, useLocation } from 'react-router-dom'
import { useWeb3 } from '../context/Web3Context'
import { useNotifications } from '../hooks/useNotifications'
import WalletButton from './WalletButton'
import NotificationPanel from './NotificationPanel'
import { useState } from 'react'

export default function Navbar() {
  const { account } = useWeb3()
  const location = useLocation()
  const { notifications, unreadCount, markAllRead, clearNotifications } = useNotifications()
  const [showNotif, setShowNotif] = useState(false)

  const isActive = (path) => location.pathname === path ? 'active' : ''

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to={account ? '/dashboard' : '/'} className="navbar-brand">
            <div className="navbar-brand-icon">🔗</div>
            Lost & Found
          </Link>

          {account && (
            <ul className="navbar-nav">
              <li><Link to="/dashboard" className={isActive('/dashboard')}>Dashboard</Link></li>
              <li><Link to="/report" className={isActive('/report')}>Report Item</Link></li>
              <li><Link to="/my-items" className={isActive('/my-items')}>My Items</Link></li>
            </ul>
          )}

          <div className="navbar-actions">
            {account && (
              <button
                className="notification-btn"
                onClick={() => { setShowNotif(true); markAllRead() }}
                title="Notifications"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
              </button>
            )}
            <WalletButton />
          </div>
        </div>
      </nav>

      {showNotif && (
        <NotificationPanel
          notifications={notifications}
          onClose={() => setShowNotif(false)}
          onClear={clearNotifications}
        />
      )}
    </>
  )
}
