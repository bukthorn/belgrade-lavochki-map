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
  return (
    <div className="filter-panel">
      <FilterGroup
        title="Место"
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
        title="Тип"
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
          Сбросить фильтры
        </button>
      </div>
    </div>
  )
}

export default Filters
