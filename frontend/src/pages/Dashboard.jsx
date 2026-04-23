import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useContract } from '../hooks/useContract'
import ItemCard from '../components/ItemCard'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Dashboard() {
  const navigate = useNavigate()
  const { getAllItems, getTotalItems } = useContract()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [stats, setStats] = useState({ total: 0, reported: 0, claimed: 0, returned: 0 })

  const loadItems = useCallback(async () => {
    try {
      const allItems = await getAllItems()
      setItems(allItems)

      const total = allItems.length
      const reported = allItems.filter((i) => i.status === 0).length
      const claimed = allItems.filter((i) => i.status === 1).length
      const returned = allItems.filter((i) => i.status === 2).length
      setStats({ total, reported, claimed, returned })
    } catch (err) {
      console.error('Failed to load items:', err)
    } finally {
      setLoading(false)
    }
  }, [getAllItems])

  useEffect(() => {
    loadItems()
    const interval = setInterval(loadItems, 15000)
    return () => clearInterval(interval)
  }, [loadItems])

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.location.toLowerCase().includes(search.toLowerCase())

    const matchesFilter =
      filter === 'all' ||
      (filter === 'reported' && item.status === 0) ||
      (filter === 'claimed' && item.status === 1) ||
      (filter === 'returned' && item.status === 2) ||
      (filter === 'disputed' && item.status === 3)

    return matchesSearch && matchesFilter
  })

  return (
    <div className="page">
      <div className="container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">📋 Dashboard</h1>
          <button className="btn btn-primary" onClick={() => navigate('/report')} id="report-new-btn">
            ➕ Report Found Item
          </button>
        </div>

        {/* Stats */}
        <div className="stats-bar">
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'rgba(102, 126, 234, 0.15)', color: 'var(--color-primary)' }}>📦</div>
            <div>
              <div className="stat-card-value">{stats.total}</div>
              <div className="stat-card-label">Total Items</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'rgba(102, 126, 234, 0.15)', color: '#667eea' }}>🔍</div>
            <div>
              <div className="stat-card-value">{stats.reported}</div>
              <div className="stat-card-label">Awaiting Owner</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'rgba(242, 153, 74, 0.15)', color: '#f2994a' }}>🙋</div>
            <div>
              <div className="stat-card-value">{stats.claimed}</div>
              <div className="stat-card-label">Claimed</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-card-icon" style={{ background: 'rgba(56, 239, 125, 0.15)', color: '#38ef7d' }}>✅</div>
            <div>
              <div className="stat-card-value">{stats.returned}</div>
              <div className="stat-card-label">Returned</div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <input
            className="input-field"
            type="text"
            placeholder="🔍 Search items by name, description, or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="search-input"
          />
          {['all', 'reported', 'claimed', 'returned', 'disputed'].map((f) => (
            <button
              key={f}
              className={`filter-chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        {loading ? (
          <LoadingSpinner text="Loading items from the blockchain..." />
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>{items.length === 0 ? 'No items yet' : 'No matching items'}</h3>
            <p>
              {items.length === 0
                ? 'Be the first to report a found item on the network!'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {items.length === 0 && (
              <button className="btn btn-primary" onClick={() => navigate('/report')}>
                ➕ Report Found Item
              </button>
            )}
          </div>
        ) : (
          <div className="items-grid">
            {filteredItems.map((item, index) => (
              <ItemCard key={item.id} item={item} index={index} />
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        className="fab"
        onClick={() => navigate('/report')}
        title="Report a found item"
        id="fab-report"
      >
        ➕
      </button>
    </div>
  )
}
