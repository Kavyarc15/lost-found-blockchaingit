import { useNavigate } from 'react-router-dom'
import StatusBadge from './StatusBadge'
import { getIPFSUrl } from '../utils/pinata'
import { shortenAddress, timeAgo } from '../utils/formatters'

export default function ItemCard({ item, index = 0 }) {
  const navigate = useNavigate()
  const imageUrl = getIPFSUrl(item.imageHash)

  return (
    <div
      className="item-card card-animate"
      style={{ animationDelay: `${index * 80}ms` }}
      onClick={() => navigate(`/item/${item.id}`)}
      id={`item-card-${item.id}`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={item.name}
          className="item-card-image"
          loading="lazy"
          onError={(e) => {
            e.target.style.display = 'none'
            e.target.nextSibling.style.display = 'flex'
          }}
        />
      ) : null}
      <div className="item-card-image-placeholder" style={imageUrl ? { display: 'none' } : {}}>
        📦
      </div>

      <div className="item-card-body">
        <div className="item-card-header">
          <h3 className="item-card-title">{item.name}</h3>
          <StatusBadge status={item.status} />
        </div>

        <p className="item-card-desc">
          {item.description || 'No description provided'}
        </p>

        <div className="item-card-meta">
          <span className="item-card-meta-item">
            📍 {item.location}
          </span>
          <span className="item-card-meta-item">
            👤 {shortenAddress(item.finder)}
          </span>
          <span className="item-card-meta-item">
            🕐 {timeAgo(item.reportedAt)}
          </span>
        </div>
      </div>
    </div>
  )
}
