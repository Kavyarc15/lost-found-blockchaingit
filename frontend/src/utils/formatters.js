/**
 * Shorten an Ethereum address for display.
 */
export function shortenAddress(address) {
  if (!address) return ''
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

/**
 * Format a Unix timestamp to a readable date string.
 */
export function formatDate(timestamp) {
  if (!timestamp || timestamp === 0n) return '—'
  const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp
  const date = new Date(ts * 1000)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format a timestamp as "time ago".
 */
export function timeAgo(timestamp) {
  if (!timestamp || timestamp === 0n) return ''
  const ts = typeof timestamp === 'bigint' ? Number(timestamp) : timestamp
  const now = Math.floor(Date.now() / 1000)
  const diff = now - ts

  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return formatDate(timestamp)
}

/**
 * Map status number to string.
 */
export const STATUS_NAMES = ['Reported', 'Claimed', 'Returned', 'Disputed']

export function getStatusName(status) {
  const idx = typeof status === 'bigint' ? Number(status) : status
  return STATUS_NAMES[idx] || 'Unknown'
}

/**
 * Map status to CSS class.
 */
export function getStatusClass(status) {
  const idx = typeof status === 'bigint' ? Number(status) : status
  const classes = ['status-reported', 'status-claimed', 'status-returned', 'status-disputed']
  return classes[idx] || ''
}
