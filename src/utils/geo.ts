export type LatLng = {
  lat: number
  lng: number
}

export function parseCoordinate(value: string | undefined): number {
  if (value === null || value === undefined) return Number.NaN

  return Number.parseFloat(
    String(value)
      .trim()
      .replace(',', '.'),
  )
}

export function toLatLng(lat: number, lng: number): LatLng | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null

  return { lat, lng }
}
