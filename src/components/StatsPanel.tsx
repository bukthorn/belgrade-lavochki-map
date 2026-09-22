type StatsPanelProps = {
  totalCount: number
  visibleCount: number
  activeTypes: string[]
  isLoading: boolean
  error: string | null
}

function StatsPanel({
  totalCount,
  visibleCount,
  activeTypes,
  isLoading,
  error,
}: StatsPanelProps) {
  if (isLoading) {
    return (
      <div className="stats-panel">
        <div className="stats-title">Карта лавочек</div>
        <div>Загрузка данных...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="stats-panel">
        <div className="stats-title">Ошибка загрузки</div>
        <div>{error}</div>
      </div>
    )
  }

  return (
    <div className="stats-panel">
      <div className="stats-title">Карта лавочек</div>

      <div className="stats-grid">
        <div className="stats-card">
          <div className="stats-value">{totalCount}</div>
          <div className="stats-label">Всего</div>
        </div>

        <div className="stats-card">
          <div className="stats-value">{visibleCount}</div>
          <div className="stats-label">Показано</div>
        </div>
      </div>

      <div className="stats-filters">
        <strong>Активные фильтры:</strong>
        <br />

        {activeTypes.length > 0 ? (
          activeTypes.map((type) => (
            <span className="stats-tag" key={type}>
              {type}
            </span>
          ))
        ) : (
          <span>Нет активных фильтров</span>
        )}
      </div>
    </div>
  )
}

export default StatsPanel
