import { useState, useEffect, useCallback } from 'react'
import { useWeb3 } from '../context/Web3Context'
import { useContract } from '../hooks/useContract'
import ItemCard from '../components/ItemCard'
import LoadingSpinner from '../components/LoadingSpinner'
import { useNavigate } from 'react-router-dom'

export default function MyItems() {
  const navigate = useNavigate()
  const { account } = useWeb3()
  const { getItemsByFinder, getItemsByOwner, getItem } = useContract()

  const [activeTab, setActiveTab] = useState('found')
  const [foundItems, setFoundItems] = useState([])
  const [claimedItems, setClaimedItems] = useState([])
  const [loading, setLoading] = useState(true)

  const loadItems = useCallback(async () => {
    if (!account) return
    setLoading(true)
    try {
      // Items I found
      const finderIds = await getItemsByFinder(account)
      const finderItems = await Promise.all(finderIds.map((id) => getItem(id)))
      setFoundItems(finderItems.reverse())

      // Items I claimed
      const ownerIds = await getItemsByOwner(account)
      const ownerItemsList = await Promise.all(ownerIds.map((id) => getItem(id)))
      setClaimedItems(ownerItemsList.reverse())
    } catch (err) {
      console.error('Failed to load my items:', err)
    } finally {
      setLoading(false)
    }
  }, [account, getItemsByFinder, getItemsByOwner, getItem])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const currentItems = activeTab === 'found' ? foundItems : claimedItems

  return (
    <div className="page">
      <div className="container">
        <div className="dashboard-header">
          <h1 className="dashboard-title">👤 My Items</h1>
          <button className="btn btn-primary" onClick={() => navigate('/report')}>
            ➕ Report Found Item
          </button>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'found' ? 'active' : ''}`}
            onClick={() => setActiveTab('found')}
          >
            📦 Items I Found ({foundItems.length})
          </button>
          <button
            className={`tab ${activeTab === 'claimed' ? 'active' : ''}`}
            onClick={() => setActiveTab('claimed')}
          >
            🙋 Items I Claimed ({claimedItems.length})
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <LoadingSpinner text="Loading your items..." />
        ) : currentItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              {activeTab === 'found' ? '📦' : '🙋'}
            </div>
            <h3>
              {activeTab === 'found'
                ? "You haven't reported any found items yet"
                : "You haven't claimed any items yet"
              }
            </h3>
            <p>
              {activeTab === 'found'
                ? 'Found something? Report it to help the owner find it!'
                : 'Browse the dashboard to see if any of the found items belong to you.'
              }
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate(activeTab === 'found' ? '/report' : '/dashboard')}
            >
              {activeTab === 'found' ? '➕ Report Found Item' : '📋 Browse Dashboard'}
            </button>
          </div>
        ) : (
          <div className="items-grid">
            {currentItems.map((item, index) => (
              <ItemCard key={item.id} item={item} index={index} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
