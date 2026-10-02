import { useEffect, useMemo, useState } from 'react'
import { fetchBenchItems, subscribeToNewBenches } from './data/benches'
import type { BenchItem } from './types/bench'
import type { LatLng } from './utils/geo'
import { getAllTypes, itemMatchesSelectedTypes } from './utils/tags'
import { getAllPlaces, itemMatchesSelectedPlaces } from './utils/place'
import MapView from './components/MapView'
import StatsPanel from './components/StatsPanel'
import Filters from './components/Filters'
import AddBenchForm from './components/AddBenchForm'

function App() {
  const [items, setItems] = useState<BenchItem[]>([])
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set())
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set())
  const [draftPoint, setDraftPoint] = useState<LatLng | null>(null)
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

  useEffect(() => subscribeToNewBenches(handleBenchAdded), [])

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

  // Own additions arrive twice: from the form and from the realtime feed
  function handleBenchAdded(bench: BenchItem) {
    setItems((currentItems) =>
      currentItems.some((item) => item.id === bench.id)
        ? currentItems
        : [...currentItems, bench],
    )
  }

  return (
    <div className="app-map-page">
      <MapView
        items={visibleItems}
        allPlaces={allPlaces}
        draftPoint={draftPoint}
      />

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

      <AddBenchForm
        onAdded={handleBenchAdded}
        onDraftPointChange={setDraftPoint}
      />
    </div>
  )
}

export default App
