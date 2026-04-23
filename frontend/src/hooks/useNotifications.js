import { useState, useEffect, useCallback, useRef } from 'react'
import { useWeb3 } from '../context/Web3Context'
import { useContract } from './useContract'
import { POLL_INTERVAL } from '../utils/constants'
import { getStatusName, timeAgo } from '../utils/formatters'

/**
 * Hook that polls contract events and builds a notification feed.
 * Returns { notifications, unreadCount, markAllRead, clearNotifications }
 */
export function useNotifications() {
  const { account, provider } = useWeb3()
  const { readContract } = useContract()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const lastBlockRef = useRef(0)
  const intervalRef = useRef(null)

  const fetchEvents = useCallback(async () => {
    if (!readContract || !provider) return

    try {
      const currentBlock = await provider.getBlockNumber()
      // On first run or if somehow behind, start from max(0, current - 1000)
      const fromBlock = lastBlockRef.current > 0
        ? lastBlockRef.current + 1
        : Math.max(0, currentBlock - 1000)

      if (fromBlock > currentBlock) return

      // Query events
      const reportedFilter = readContract.filters.ItemReported()
      const claimFilter = readContract.filters.ClaimFiled()
      const returnFilter = readContract.filters.ItemReturned()
      const disputeFilter = readContract.filters.ItemDisputed()

      const [reportedEvents, claimEvents, returnEvents, disputeEvents] = await Promise.all([
        readContract.queryFilter(reportedFilter, fromBlock, currentBlock),
        readContract.queryFilter(claimFilter, fromBlock, currentBlock),
        readContract.queryFilter(returnFilter, fromBlock, currentBlock),
        readContract.queryFilter(disputeFilter, fromBlock, currentBlock),
      ])

      const newNotifs = []

      for (const ev of reportedEvents) {
        const block = await ev.getBlock()
        newNotifs.push({
          id: `reported-${ev.args.itemId}-${ev.blockNumber}`,
          type: 'reported',
          icon: '📦',
          title: 'New Item Found',
          text: `"${ev.args.name}" was found and registered on the network.`,
          timestamp: block.timestamp,
          itemId: Number(ev.args.itemId),
        })
      }

      for (const ev of claimEvents) {
        const block = await ev.getBlock()
        newNotifs.push({
          id: `claim-${ev.args.itemId}-${ev.blockNumber}`,
          type: 'claimed',
          icon: '🙋',
          title: 'Item Claimed',
          text: `Someone has claimed ownership of item #${Number(ev.args.itemId)}.`,
          timestamp: block.timestamp,
          itemId: Number(ev.args.itemId),
        })
      }

      for (const ev of returnEvents) {
        const block = await ev.getBlock()
        newNotifs.push({
          id: `return-${ev.args.itemId}-${ev.blockNumber}`,
          type: 'returned',
          icon: '✅',
          title: 'Item Returned',
          text: `Item #${Number(ev.args.itemId)} has been successfully returned to its owner!`,
          timestamp: block.timestamp,
          itemId: Number(ev.args.itemId),
        })
      }

      for (const ev of disputeEvents) {
        const block = await ev.getBlock()
        newNotifs.push({
          id: `dispute-${ev.args.itemId}-${ev.blockNumber}`,
          type: 'disputed',
          icon: '⚠️',
          title: 'Item Disputed',
          text: `Item #${Number(ev.args.itemId)} has been flagged for review.`,
          timestamp: block.timestamp,
          itemId: Number(ev.args.itemId),
        })
      }

      if (newNotifs.length > 0) {
        // Sort newest first
        newNotifs.sort((a, b) => b.timestamp - a.timestamp)
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id))
          const unique = newNotifs.filter((n) => !existingIds.has(n.id))
          if (unique.length === 0) return prev
          setUnreadCount((c) => c + unique.length)
          return [...unique, ...prev].slice(0, 50) // Keep last 50
        })
      }

      lastBlockRef.current = currentBlock
    } catch (err) {
      console.error('Error fetching notifications:', err)
    }
  }, [readContract, provider])

  // Poll on interval
  useEffect(() => {
    if (!account || !readContract) return

    fetchEvents() // initial fetch
    intervalRef.current = setInterval(fetchEvents, POLL_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [account, readContract, fetchEvents])

  const markAllRead = useCallback(() => {
    setUnreadCount(0)
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
    setUnreadCount(0)
  }, [])

  return { notifications, unreadCount, markAllRead, clearNotifications }
}
