import { toLatLng, type LatLng } from './geo'

const SHORT_LINK_HOSTS = ['maps.app.goo.gl', 'goo.gl']

const NUMBER = String.raw`(-?\d{1,3}(?:\.\d+)?)`
const PAIR = String.raw`${NUMBER}\s*,\s*\+?${NUMBER}`

const PLAIN_PAIR = new RegExp(`^${PAIR}$`)
const PIN_DATA = new RegExp(`!3d${NUMBER}!4d${NUMBER}`)
const QUERY_PARAM = new RegExp(
  `[?&](?:q|query|ll|center|destination)=(?:loc:)?${PAIR}`,
)
const PATH_SEGMENT = new RegExp(`/maps/(?:search|place|dir)/${PAIR}`)
const VIEWPORT = new RegExp(`/@${PAIR}`)

function matchPair(text: string, pattern: RegExp): LatLng | null {
  const match = text.match(pattern)
  return match ? toLatLng(Number(match[1]), Number(match[2])) : null
}

// maps.app.goo.gl links are redirects the browser can't follow because of
// CORS, so the resolve-maps-link edge function expands them before parsing.
export function isShortMapsLink(text: string): boolean {
  try {
    return SHORT_LINK_HOSTS.includes(new URL(text.trim()).hostname)
  } catch {
    return false
  }
}

// Walking route from wherever the user is now; Google Maps takes the start
// from the device's own location, so it isn't passed here
export function getDirectionsUrl({ lat, lng }: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`
}

// Accepts a full Google Maps URL or plain "lat, lng". Order matters:
// !3d/!4d is the pin itself, while /@lat,lng is only the viewport centre.
export function parseMapsLink(text: string): LatLng | null {
  const input = text.trim()
  if (!input) return null

  const plain = matchPair(input, PLAIN_PAIR)
  if (plain) return plain

  let decoded = input
  try {
    decoded = decodeURIComponent(input)
  } catch {
    // Malformed escapes: parse the raw string
  }

  return (
    matchPair(decoded, PIN_DATA) ??
    matchPair(decoded, QUERY_PARAM) ??
    matchPair(decoded, PATH_SEGMENT) ??
    matchPair(decoded, VIEWPORT)
  )
}
