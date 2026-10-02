import { useState, type ReactNode } from 'react'

type StatsPanelProps = {
  totalCount: number
  visibleCount: number
  activeFilters: string[]
  isLoading: boolean
  error: string | null
}

function StatsPanel({
  totalCount,
  visibleCount,
  activeFilters,
  isLoading,
  error,
}: StatsPanelProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    let summary = `${visibleCount} / ${totalCount}`
    if (isLoading) summary = '…'
    if (error) summary = 'error'

    return (
      <button
        className="panel-toggle panel-toggle--stats"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        Benches
        <span
          className={`panel-toggle-badge${error ? ' panel-toggle-badge--error' : ''}`}
        >
          {summary}
        </span>
      </button>
    )
  }

  let title = 'Bench map'
  let body: ReactNode

  if (isLoading) {
    body = <div>Loading data...</div>
  } else if (error) {
    title = 'Loading error'
    body = <div>{error}</div>
  } else {
    body = (
      <>
        <div className="stats-grid">
          <div className="stats-card">
            <div className="stats-value">{totalCount}</div>
            <div className="stats-label">Total</div>
          </div>

          <div className="stats-card">
            <div className="stats-value">{visibleCount}</div>
            <div className="stats-label">Shown</div>
          </div>
        </div>

        <div className="stats-filters">
          <strong>Active filters:</strong>
          <br />

          {activeFilters.length > 0 ? (
            activeFilters.map((filter) => (
              <span className="stats-tag" key={filter}>
                {filter}
              </span>
            ))
          ) : (
            <span>No active filters</span>
          )}
        </div>
      </>
    )
  }

  return (
    <div className="stats-panel">
      <div className="panel-header stats-header">
        <div className="stats-title">{title}</div>

        <button
          className="panel-close"
          type="button"
          aria-label="Close"
          onClick={() => setIsOpen(false)}
        >
          ×
        </button>
      </div>

      {body}
    </div>
  )
}

export default StatsPanel
