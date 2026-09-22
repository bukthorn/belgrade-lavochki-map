import { useEffect, useMemo, useState } from 'react'
import { fetchBenchItems } from './data/googleSheets'
import type { BenchItem } from './types/bench'
import { getAllTypes, itemMatchesSelectedTypes } from './utils/tags'
import MapView from './components/MapView'
import StatsPanel from './components/StatsPanel'
import TypeFilters from './components/TypeFilters'

function App() {
  const [items, setItems] = useState<BenchItem[]>([])
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

  const allTypes = useMemo(() => getAllTypes(items), [items])

  const visibleItems = useMemo(
    () => items.filter((item) => itemMatchesSelectedTypes(item, selectedTypes)),
    [items, selectedTypes],
  )

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
    setSelectedTypes(new Set())
  }

  return (
    <div className="app-map-page">
      <MapView items={visibleItems} />

      <StatsPanel
        totalCount={items.length}
        visibleCount={visibleItems.length}
        activeTypes={Array.from(selectedTypes)}
        isLoading={isLoading}
        error={error}
      />

      <TypeFilters
        allTypes={allTypes}
        selectedTypes={selectedTypes}
        onToggleType={handleToggleType}
        onClear={handleClearFilters}
      />
    </div>
  )
}

export default App
