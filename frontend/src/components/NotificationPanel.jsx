import { timeAgo } from '../utils/formatters'
import { useNavigate } from 'react-router-dom'

export default function NotificationPanel({ notifications, onClose, onClear }) {
  const navigate = useNavigate()

  const handleNotifClick = (notif) => {
    if (notif.itemId) {
      navigate(`/item/${notif.itemId}`)
      onClose()
    }
  }

  return (
    <>
      <div className="notification-panel-overlay" onClick={onClose} />
      <div className="notification-panel">
        <div className="notification-panel-header">
          <h3>🔔 Notifications</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {notifications.length > 0 && (
              <button className="notification-panel-close" onClick={onClear} title="Clear all">
                🗑
              </button>
            )}
            <button className="notification-panel-close" onClick={onClose} title="Close">
              ✕
            </button>
          </div>
        </div>

        <div className="notification-list">
          {notifications.length === 0 ? (
            <div className="notification-empty">
              <div className="notification-empty-icon">🔕</div>
              No notifications yet
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className="notification-item"
                onClick={() => handleNotifClick(notif)}
                style={{ cursor: notif.itemId ? 'pointer' : 'default' }}
              >
                <div className="notification-item-title">
                  {notif.icon} {notif.title}
                </div>
                <div className="notification-item-text">{notif.text}</div>
                <div className="notification-item-time">{timeAgo(notif.timestamp)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
