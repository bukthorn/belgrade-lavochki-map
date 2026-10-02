import { useState } from 'react'
import FilterGroup from './FilterGroup'
import { getPlaceColor } from '../utils/place'
import { getTypeBorder } from '../utils/tags'

type FiltersProps = {
  allPlaces: string[]
  allTypes: string[]
  selectedPlaces: Set<string>
  selectedTypes: Set<string>
  onTogglePlace: (place: string) => void
  onToggleType: (type: string) => void
  onClear: () => void
}

function Filters({
  allPlaces,
  allTypes,
  selectedPlaces,
  selectedTypes,
  onTogglePlace,
  onToggleType,
  onClear,
}: FiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const activeCount = selectedPlaces.size + selectedTypes.size

  if (!isOpen) {
    return (
      <button
        className="panel-toggle panel-toggle--filters"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        Filters
        {activeCount > 0 && (
          <span className="panel-toggle-badge">{activeCount}</span>
        )}
      </button>
    )
  }

  return (
    <div className="filter-panel">
      <div className="panel-header">
        <div className="filter-title">Filters</div>

        <button
          className="panel-close"
          type="button"
          aria-label="Close"
          onClick={() => setIsOpen(false)}
        >
          ×
        </button>
      </div>

      <FilterGroup
        title="Place"
        options={allPlaces}
        selectedValues={selectedPlaces}
        onToggle={onTogglePlace}
        renderDot={(place) => (
          <span
            className="filter-color-dot"
            style={{ background: getPlaceColor(place, allPlaces) }}
          />
        )}
      />

      <FilterGroup
        title="Type"
        options={allTypes}
        selectedValues={selectedTypes}
        onToggle={onToggleType}
        renderDot={(type) => (
          <span
            className="filter-color-dot filter-color-dot--outline"
            style={{ border: getTypeBorder(type) }}
          />
        )}
      />

      <div className="filter-actions">
        <button
          className="clear-filters-button"
          type="button"
          onClick={onClear}
        >
          Clear filters
        </button>
      </div>
    </div>
  )
}

export default Filters
