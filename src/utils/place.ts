import type { BenchItem } from '../types/bench'

const PLACE_COLORS: Record<string, string> = {
  street: '#8a7360',
  park: '#2e7d32',
}

const AUTO_PLACE_PALETTE = [
  '#1565c0',
  '#c62828',
  '#6a1b9a',
  '#00838f',
  '#ef6c00',
  '#546e7a',
  '#ad1457',
  '#5d4037',
  '#00695c',
  '#4527a0',
]

const DEFAULT_PLACE_COLOR = '#777777'

export function normalizePlace(place: string | undefined): string {
  return String(place || '')
    .trim()
    .toLowerCase()
}

export function getPlace(item: Pick<BenchItem, 'place'>): string {
  return normalizePlace(item.place)
}

export function getAllPlaces(items: BenchItem[]): string[] {
  const places = new Set<string>()

  items.forEach((item) => {
    const place = getPlace(item)
    if (place) places.add(place)
  })

  return Array.from(places).sort()
}

// street/park have fixed colors; any other place gets one slot from
// AUTO_PLACE_PALETTE, assigned by alphabetical position so it stays the
// same across reloads and never collides with another custom place.
export function getPlaceColor(place: string, allPlaces: string[]): string {
  if (!place) return DEFAULT_PLACE_COLOR
  if (PLACE_COLORS[place]) return PLACE_COLORS[place]

  const customPlaces = allPlaces.filter((p) => !PLACE_COLORS[p]).sort()
  const index = customPlaces.indexOf(place)

  if (index === -1) return DEFAULT_PLACE_COLOR

  return AUTO_PLACE_PALETTE[index % AUTO_PLACE_PALETTE.length]
}

export function itemMatchesSelectedPlaces(
  item: BenchItem,
  selectedPlaces: Set<string>,
): boolean {
  if (selectedPlaces.size === 0) {
    return true
  }

  return selectedPlaces.has(getPlace(item))
}
