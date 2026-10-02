import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { FeatureCollection, Point } from 'geojson'
import type { BenchItem } from '../types/bench'
import type { LatLng } from '../utils/geo'
import { getType, getTypeStroke } from '../utils/tags'
import { getPlace, getPlaceColor } from '../utils/place'

// MapLibre looks for its worker next to its own file, which no longer
// exists once Vite bundles it; without the worker vector tiles never load
// and the map stays blank. Vite builds the worker separately and gives its URL.
maplibregl.setWorkerUrl(maplibreWorkerUrl)

type MapViewProps = {
  items: BenchItem[]
  allPlaces: string[]
  draftPoint: LatLng | null
  onMapClick: (point: LatLng) => void
}

// Raster OSM tiles. Vector tiles (OpenFreeMap) were tried and ran phones
// out of memory: the map went blank while panning and froze after reopening.
const MAP_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      // The tile usage policy allows only this host; the old a/b/c
      // subdomains are deprecated
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution:
        '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">&copy; OpenStreetMap contributors</a>',
    },
  },
  layers: [
    {
      id: 'osm-layer',
      type: 'raster',
      source: 'osm',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
}

// Benches are drawn by the map itself as one GeoJSON layer instead of a DOM
// element each, so thousands of them stay smooth and an update doesn't
// rebuild anything on the page
const BENCH_SOURCE = 'benches'
const BENCH_LAYER = 'benches'

// A bench dot is 16 px across, with a light ring and a soft shadow
const BENCH_RADIUS = 8
const RING_WIDTH = 2

// Extra pixels around a tap, so a small dot is easy to hit with a finger
const TAP_TOLERANCE = 8

// How long to wait for a second click before treating the first as single
const DOUBLE_CLICK_MS = 300

// ~10 cm, more than a bench needs
function roundCoordinate(value: number): number {
  return Number(value.toFixed(6))
}

function escapeHtml(value: string | undefined): string {
  if (!value) return ''

  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

// 2026-09-23 -> 23.09.2026
function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return day && month && year ? `${day}.${month}.${year}` : isoDate
}

function createPopupContent(item: BenchItem): string {
  const place = escapeHtml(item.place)
  const date = escapeHtml(item.date && formatDate(item.date))
  const type = escapeHtml(item.type)

  return `
    <div class="popup-content">
      <div class="popup-title">${place || 'Bench'}</div>

      ${
        type
          ? `
            <div class="popup-row">
              <strong>Type:</strong><br>
              ${type}
            </div>
          `
          : ''
      }

      ${
        date
          ? `
            <div class="popup-row">
              <strong>Date:</strong><br>
              ${date}
            </div>
          `
          : ''
      }
    </div>
  `
}

// Colors are resolved here, so the layer only reads them from properties
function toFeatureCollection(
  items: BenchItem[],
  allPlaces: string[],
): FeatureCollection<Point> {
  return {
    type: 'FeatureCollection',
    features: items.map((item) => {
      const stroke = getTypeStroke(getType(item))

      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [item.longitude, item.latitude],
        },
        properties: {
          id: item.id,
          color: getPlaceColor(getPlace(item), allPlaces),
          strokeWidth: stroke.width,
          strokeColor: stroke.color,
        },
      }
    }),
  }
}

function addBenchLayers(map: maplibregl.Map) {
  map.addSource(BENCH_SOURCE, {
    type: 'geojson',
    data: { type: 'FeatureCollection', features: [] },
  })

  map.addLayer({
    id: 'benches-shadow',
    type: 'circle',
    source: BENCH_SOURCE,
    paint: {
      'circle-radius': BENCH_RADIUS + 6,
      'circle-color': '#000000',
      'circle-opacity': 0.28,
      'circle-blur': 1,
      'circle-translate': [0, 4],
    },
  })

  map.addLayer({
    id: 'benches-ring',
    type: 'circle',
    source: BENCH_SOURCE,
    paint: {
      'circle-radius': BENCH_RADIUS + RING_WIDTH,
      'circle-color': '#ffffff',
      'circle-opacity': 0.8,
    },
  })

  // The stroke is drawn outside the radius, so the radius shrinks by the
  // stroke width and every dot keeps the same overall size
  map.addLayer({
    id: BENCH_LAYER,
    type: 'circle',
    source: BENCH_SOURCE,
    paint: {
      'circle-radius': ['-', BENCH_RADIUS, ['get', 'strokeWidth']],
      'circle-color': ['get', 'color'],
      'circle-stroke-width': ['get', 'strokeWidth'],
      'circle-stroke-color': ['get', 'strokeColor'],
    },
  })
}

function MapView({ items, allPlaces, draftPoint, onMapClick }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const draftMarkerRef = useRef<maplibregl.Marker | null>(null)
  const didFitBoundsRef = useRef(false)
  const onMapClickRef = useRef(onMapClick)

  // Clicks on the layer only give a feature id; the bench is looked up here
  const itemsRef = useRef(items)

  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    onMapClickRef.current = onMapClick
  }, [onMapClick])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      center: [20.4773, 44.8084],
      zoom: 15.5,
      style: MAP_STYLE,
    })

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')

    map.on('load', () => {
      addBenchLayers(map)
      setMapReady(true)
    })

    let popup: maplibregl.Popup | null = null

    function findBench(point: maplibregl.Point): BenchItem | undefined {
      if (!map.getLayer(BENCH_LAYER)) return undefined

      const [feature] = map.queryRenderedFeatures(
        [
          [point.x - TAP_TOLERANCE, point.y - TAP_TOLERANCE],
          [point.x + TAP_TOLERANCE, point.y + TAP_TOLERANCE],
        ],
        { layers: [BENCH_LAYER] },
      )

      if (!feature) return undefined

      return itemsRef.current.find(
        (item) => item.id === feature.properties.id,
      )
    }

    function showPopup(item: BenchItem) {
      popup?.remove()

      popup = new maplibregl.Popup({
        offset: BENCH_RADIUS + RING_WIDTH + 2,
        closeButton: true,
        closeOnClick: true,
      })
        .setLngLat([item.longitude, item.latitude])
        .setHTML(createPopupContent(item))
        .addTo(map)
    }

    map.on('mouseenter', BENCH_LAYER, () => {
      map.getCanvas().style.cursor = 'pointer'
    })

    map.on('mouseleave', BENCH_LAYER, () => {
      map.getCanvas().style.cursor = ''
    })

    // A click on a bench opens its popup; a click elsewhere picks a point.
    // Drags never produce a 'click' in MapLibre; the checks below drop the
    // other taps that aren't meant as picks.
    const container = map.getContainer()
    const activePointers = new Set<number>()
    let isNoiseGesture = false
    let hadPopup = false
    let clickTimer: ReturnType<typeof setTimeout> | undefined

    function cancelPendingClick() {
      clearTimeout(clickTimer)
      clickTimer = undefined
    }

    // Capture phase: runs before MapLibre stops the inertia or closes popups
    function handlePointerDown(event: PointerEvent) {
      if (activePointers.size === 0) {
        // A tap that stops a fling does nothing at all
        isNoiseGesture = map.isMoving()
        hadPopup = Boolean(container.querySelector('.maplibregl-popup'))
      }

      activePointers.add(event.pointerId)

      // Pinch zoom
      if (activePointers.size > 1) isNoiseGesture = true
    }

    function handlePointerUp(event: PointerEvent) {
      activePointers.delete(event.pointerId)
    }

    container.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('pointerup', handlePointerUp, true)
    window.addEventListener('pointercancel', handlePointerUp, true)

    map.on('click', (event) => {
      const target = event.originalEvent.target as Element | null

      if (isNoiseGesture) return
      if (target?.closest('.maplibregl-marker, .maplibregl-popup')) return

      const bench = findBench(event.point)

      if (bench) {
        cancelPendingClick()
        showPopup(bench)
        return
      }

      // A tap that closes a popup isn't a pick
      if (hadPopup) return

      // The second click of a double-click zoom cancels the first one
      if (clickTimer) {
        cancelPendingClick()
        return
      }

      const { lat, lng } = event.lngLat.wrap()

      clickTimer = setTimeout(() => {
        clickTimer = undefined
        onMapClickRef.current({
          lat: roundCoordinate(lat),
          lng: roundCoordinate(lng),
        })
      }, DOUBLE_CLICK_MS)
    })

    // Double-tap zoom on touch screens moves the map without a second 'click'
    map.on('movestart', cancelPendingClick)

    mapRef.current = map

    return () => {
      cancelPendingClick()
      container.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('pointerup', handlePointerUp, true)
      window.removeEventListener('pointercancel', handlePointerUp, true)
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    itemsRef.current = items

    const map = mapRef.current
    if (!mapReady || !map) return

    map
      .getSource<maplibregl.GeoJSONSource>(BENCH_SOURCE)
      ?.setData(toFeatureCollection(items, allPlaces))

    if (!didFitBoundsRef.current && items.length > 0) {
      const bounds = new maplibregl.LngLatBounds()
      items.forEach((item) => bounds.extend([item.longitude, item.latitude]))

      map.fitBounds(bounds, {
        padding: 80,
        maxZoom: 17,
        duration: 600,
      })

      didFitBoundsRef.current = true
    }
  }, [items, allPlaces, mapReady])

  // Pin for the bench being added, so the point can be checked before saving
  useEffect(() => {
    const map = mapRef.current
    if (!mapReady || !map) return

    draftMarkerRef.current?.remove()
    draftMarkerRef.current = null

    if (!draftPoint) return

    const lngLat: [number, number] = [draftPoint.lng, draftPoint.lat]

    draftMarkerRef.current = new maplibregl.Marker({ color: '#111111' })
      .setLngLat(lngLat)
      .addTo(map)

    // A point picked on the map is already in view; don't jump the camera
    if (map.getBounds().contains(lngLat)) return

    map.easeTo({
      center: lngLat,
      zoom: Math.max(map.getZoom(), 16),
      duration: 600,
    })
  }, [draftPoint, mapReady])

  return <div ref={mapContainerRef} className="map-container" />
}

export default MapView
