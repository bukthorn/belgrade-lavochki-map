import type { ReactNode } from 'react'

type FilterGroupProps = {
  title: string
  options: string[]
  selectedValues: Set<string>
  onToggle: (value: string) => void
  renderDot: (value: string) => ReactNode
}

function FilterGroup({
  title,
  options,
  selectedValues,
  onToggle,
  renderDot,
}: FilterGroupProps) {
  return (
    <div className="filter-group">
      <div className="filter-header">
        <div className="filter-title">{title}</div>
        <div className="filter-count">
          {options.length > 0 ? options.length : 'Нет данных'}
        </div>
      </div>

      {options.length > 0 && (
        <div className="filter-list">
          {options.map((value) => (
            <label className="filter-option" key={value}>
              <input
                type="checkbox"
                value={value}
                checked={selectedValues.has(value)}
                onChange={() => onToggle(value)}
              />

              {renderDot(value)}

              <span className="filter-label-text">{value}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

export default FilterGroup
