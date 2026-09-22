import { useEffect, useMemo, useState } from 'react'
import { fetchBenchItems } from './data/googleSheets'
import type { BenchItem } from './types/bench'
import { getAllTypes, itemMatchesSelectedTypes } from './utils/tags'
import { getAllPlaces, itemMatchesSelectedPlaces } from './utils/place'
import MapView from './components/MapView'
import StatsPanel from './components/StatsPanel'
import Filters from './components/Filters'

function App() {
  const [items, setItems] = useState<BenchItem[]>([])
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set())
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        setError(null)

        const data = await fetchBenchItems()
        setItems(data)
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : 'Unknown loading error'

        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const allPlaces = useMemo(() => getAllPlaces(items), [items])
  const allTypes = useMemo(() => getAllTypes(items), [items])

  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) =>
          itemMatchesSelectedPlaces(item, selectedPlaces) &&
          itemMatchesSelectedTypes(item, selectedTypes),
      ),
    [items, selectedPlaces, selectedTypes],
  )

  function handleTogglePlace(place: string) {
    setSelectedPlaces((currentPlaces) => {
      const nextPlaces = new Set(currentPlaces)

      if (nextPlaces.has(place)) {
        nextPlaces.delete(place)
      } else {
        nextPlaces.add(place)
      }

      return nextPlaces
    })
  }

  function handleToggleType(type: string) {
    setSelectedTypes((currentTypes) => {
      const nextTypes = new Set(currentTypes)

      if (nextTypes.has(type)) {
        nextTypes.delete(type)
      } else {
        nextTypes.add(type)
      }

      return nextTypes
    })
  }

  function handleClearFilters() {
    setSelectedPlaces(new Set())
    setSelectedTypes(new Set())
  }

  return (
    <div className="app-map-page">
      <MapView items={visibleItems} allPlaces={allPlaces} />

      <StatsPanel
        totalCount={items.length}
        visibleCount={visibleItems.length}
        activeFilters={[...selectedPlaces, ...selectedTypes]}
        isLoading={isLoading}
        error={error}
      />

      <Filters
        allPlaces={allPlaces}
        allTypes={allTypes}
        selectedPlaces={selectedPlaces}
        selectedTypes={selectedTypes}
        onTogglePlace={handleTogglePlace}
        onToggleType={handleToggleType}
        onClear={handleClearFilters}
      />
    </div>
  )
}

export default App
