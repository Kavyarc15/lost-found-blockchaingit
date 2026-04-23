import { getStatusName, getStatusClass } from '../utils/formatters'

export default function StatusBadge({ status }) {
  const name = getStatusName(status)
  const className = getStatusClass(status)

  return (
    <span className={`status-badge ${className}`}>
      {name}
    </span>
  )
}
