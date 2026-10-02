import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import type { BenchItem } from '../types/bench'
import type { LatLng } from '../utils/geo'
import { getType, getTypeBorder } from '../utils/tags'
import { getPlace, getPlaceColor } from '../utils/place'

type MapViewProps = {
  items: BenchItem[]
  allPlaces: string[]
  draftPoint: LatLng | null
  onMapClick: (point: LatLng) => void
}

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

function createMarkerElement(color: string, border: string): HTMLDivElement {
  const element = document.createElement('div')
  element.className = 'bench-marker'
  element.style.background = color
  element.style.border = border
  return element
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

function MapView({ items, allPlaces, draftPoint, onMapClick }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const draftMarkerRef = useRef<maplibregl.Marker | null>(null)
  const didFitBoundsRef = useRef(false)
  const onMapClickRef = useRef(onMapClick)

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
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap contributors',
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
      },
    })

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')

    map.on('load', () => {
      setMapReady(true)
    })

    // Picking a point by clicking the map. Drags never produce a 'click' in
    // MapLibre; the checks below drop the other taps that aren't meant as picks.
    const container = map.getContainer()
    const activePointers = new Set<number>()
    let isNoiseGesture = false
    let clickTimer: ReturnType<typeof setTimeout> | undefined

    function cancelPendingClick() {
      clearTimeout(clickTimer)
      clickTimer = undefined
    }

    // Capture phase: runs before MapLibre stops the inertia or closes popups
    function handlePointerDown(event: PointerEvent) {
      if (activePointers.size === 0) {
        // A tap that stops a fling or closes a popup isn't a pick
        isNoiseGesture =
          map.isMoving() || Boolean(container.querySelector('.maplibregl-popup'))
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
      markersRef.current.forEach((marker) => marker.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapReady || !mapRef.current) return

    markersRef.current.forEach((marker) => marker.remove())
    markersRef.current = []

    const bounds = new maplibregl.LngLatBounds()
    items.forEach((item) => {
      const lat = item.latitude
      const lng = item.longitude

      const color = getPlaceColor(getPlace(item), allPlaces)
      const border = getTypeBorder(getType(item))
      const markerElement = createMarkerElement(color, border)

      const popup = new maplibregl.Popup({
        offset: 18,
        closeButton: true,
        closeOnClick: true,
      }).setHTML(createPopupContent(item))

      const marker = new maplibregl.Marker({
        element: markerElement,
        anchor: 'center',
      })
        .setLngLat([lng, lat])
        .setPopup(popup)
        .addTo(mapRef.current!)

      markersRef.current.push(marker)
      bounds.extend([lng, lat])
    })

    if (!didFitBoundsRef.current && items.length > 0) {
      mapRef.current.fitBounds(bounds, {
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
