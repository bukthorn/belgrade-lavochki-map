import { getTypeColor } from '../utils/tags'

type TypeFiltersProps = {
  allTypes: string[]
  selectedTypes: Set<string>
  onToggleType: (type: string) => void
  onClear: () => void
}

function TypeFilters({
  allTypes,
  selectedTypes,
  onToggleType,
  onClear,
}: TypeFiltersProps) {
  if (allTypes.length === 0) {
    return (
      <div className="filter-panel">
        <div className="filter-header">
          <div className="filter-title">Типы</div>
          <div className="filter-count">Нет типов</div>
        </div>
      </div>
    )
  }

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <div className="filter-title">Типы</div>
        <div className="filter-count">{allTypes.length}</div>
      </div>

      <div className="filter-list">
        {allTypes.map((type) => (
          <label className="filter-option" key={type}>
            <input
              type="checkbox"
              value={type}
              checked={selectedTypes.has(type)}
              onChange={() => onToggleType(type)}
            />

            <span
              className="filter-color-dot"
              style={{ background: getTypeColor(type) }}
            />

            <span className="filter-label-text">{type}</span>
          </label>
        ))}
      </div>

      <div className="filter-actions">
        <button
          className="clear-filters-button"
          type="button"
          onClick={onClear}
        >
          Сбросить фильтры
        </button>
      </div>
    </div>
  )
}

export default TypeFilters
