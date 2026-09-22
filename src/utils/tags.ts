import type { BenchItem } from '../types/bench'

export function normalizeType(type: string | undefined): string {
  return String(type || '')
    .trim()
    .toLowerCase()
}

export function getType(item: Pick<BenchItem, 'type'>): string {
  return normalizeType(item.type)
}

export function getAllTypes(items: BenchItem[]): string[] {
  const types = new Set<string>()

  items.forEach((item) => {
    const type = getType(item)
    if (type) types.add(type)
  })

  return Array.from(types).sort()
}

export function getTypeBorder(type: string): string {
  if (type === 'backrest') return '3px solid #111111'
  if (type === 'backless') return 'none'

  return '3px solid #ffffff'
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
