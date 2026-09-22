import type { BenchItem } from '../types/bench'

const MARKER_PALETTE = [
  '#2e7d32',
  '#1565c0',
  '#c62828',
  '#8b5a2b',
  '#6a1b9a',
  '#00838f',
  '#ef6c00',
  '#546e7a',
]

const DEFAULT_MARKER_COLOR = '#777777'

function hashString(value: string): number {
  let hash = 0

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }

  return Math.abs(hash)
}

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

export function getTypeColor(type: string): string {
  if (!type) return DEFAULT_MARKER_COLOR

  return MARKER_PALETTE[hashString(type) % MARKER_PALETTE.length]
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
