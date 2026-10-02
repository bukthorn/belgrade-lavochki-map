import type { BenchItem } from '../types/bench'

// Options for the add-bench form. Keep in sync with the type check
// constraint in supabase/migrations
export const BENCH_TYPES = ['backrest', 'backless']

export function normalizeType(type: string | undefined): string {
  return String(type || '')
    .trim()
    .toLowerCase()
}

export function getType(item: Pick<BenchItem, 'type'>): string {
  return normalizeType(item.type)
}

// Every type the form offers, plus any other type found in the data
export function getAllTypes(items: BenchItem[]): string[] {
  const types = new Set<string>(BENCH_TYPES)

  items.forEach((item) => {
    const type = getType(item)
    if (type) types.add(type)
  })

  return Array.from(types).sort()
}

// Outline that tells the bench type apart, in pixels; the map layer and
// the filter dots both draw it from here
export function getTypeStroke(type: string): { width: number; color: string } {
  if (type === 'backrest') return { width: 3, color: '#111111' }
  if (type === 'backless') return { width: 0, color: '#111111' }

  return { width: 3, color: '#ffffff' }
}

export function getTypeBorder(type: string): string {
  const { width, color } = getTypeStroke(type)
  return width > 0 ? `${width}px solid ${color}` : 'none'
}

export function itemMatchesSelectedTypes(
  item: BenchItem,
  selectedTypes: Set<string>,
): boolean {
  if (selectedTypes.size === 0) {
    return true
  }

  return selectedTypes.has(getType(item))
}
