import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { addBench, resolveMapsLink } from '../data/benches'
import type { BenchItem } from '../types/bench'
import { parseCoordinate, toLatLng, type LatLng } from '../utils/geo'
import { isShortMapsLink, parseMapsLink } from '../utils/mapsLink'
import { PLACES } from '../utils/place'
import { BENCH_TYPES } from '../utils/tags'

type AddBenchFormProps = {
  onAdded: (bench: BenchItem) => void
  onDraftPointChange: (point: LatLng | null) => void
  pickedPoint: LatLng | null
}

type Status = {
  kind: 'pending' | 'ok' | 'error'
  message: string
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error'
}

function AddBenchForm({
  onAdded,
  onDraftPointChange,
  pickedPoint,
}: AddBenchFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [link, setLink] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [place, setPlace] = useState('')
  const [type, setType] = useState('')
  const [linkStatus, setLinkStatus] = useState<Status | null>(null)
  const [submitStatus, setSubmitStatus] = useState<Status | null>(null)

  const draftPoint = useMemo(
    () => toLatLng(parseCoordinate(latitude), parseCoordinate(longitude)),
    [latitude, longitude],
  )

  useEffect(() => {
    onDraftPointChange(isOpen ? draftPoint : null)
  }, [isOpen, draftPoint, onDraftPointChange])

  // A click on the map opens the form with the clicked point;
  // every click is a new object, so repeated clicks all land here
  useEffect(() => {
    if (!pickedPoint) return

    setIsOpen(true)
    setLink('')
    setLatitude(String(pickedPoint.lat))
    setLongitude(String(pickedPoint.lng))
    setSubmitStatus(null)
  }, [pickedPoint])

  // Debounced so a link typed by hand doesn't fire a request per keystroke;
  // the cancelled flag drops answers for a link that has since changed.
  useEffect(() => {
    const text = link.trim()

    if (!text) {
      setLinkStatus(null)
      return
    }

    let cancelled = false

    const timer = setTimeout(async () => {
      try {
        let source = text

        if (isShortMapsLink(text)) {
          setLinkStatus({ kind: 'pending', message: 'Expanding the link…' })
          source = await resolveMapsLink(text)
        }

        if (cancelled) return

        const point = parseMapsLink(source)

        if (point) {
          setLatitude(String(point.lat))
          setLongitude(String(point.lng))
          setLinkStatus({ kind: 'ok', message: 'Coordinates taken from the link' })
        } else {
          setLinkStatus({
            kind: 'error',
            message: 'No coordinates in the link — enter them manually',
          })
        }
      } catch (error) {
        if (!cancelled) {
          setLinkStatus({ kind: 'error', message: errorMessage(error) })
        }
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [link])

  // "Bench added" only confirms the save, so it goes away on its own
  useEffect(() => {
    if (submitStatus?.kind !== 'ok') return

    const timer = setTimeout(() => setSubmitStatus(null), 2000)
    return () => clearTimeout(timer)
  }, [submitStatus])

  const isSubmitting = submitStatus?.kind === 'pending'
  const canSubmit = Boolean(draftPoint && place && type) && !isSubmitting

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!draftPoint || !canSubmit) return

    setSubmitStatus({ kind: 'pending', message: 'Saving…' })

    try {
      const bench = await addBench({
        latitude: draftPoint.lat,
        longitude: draftPoint.lng,
        place,
        type,
      })

      onAdded(bench)

      // Place and type are kept: benches are usually added in batches
      // along the same street
      setLink('')
      setLatitude('')
      setLongitude('')
      setSubmitStatus({ kind: 'ok', message: 'Bench added' })
    } catch (error) {
      setSubmitStatus({ kind: 'error', message: errorMessage(error) })
    }
  }

  if (!isOpen) {
    return (
      <button
        className="add-bench-toggle"
        type="button"
        aria-label="Add a bench"
        onClick={() => setIsOpen(true)}
      >
        +<span className="add-bench-toggle-text"> Add a bench</span>
      </button>
    )
  }

  return (
    <form className="add-bench-panel" onSubmit={handleSubmit}>
      <div className="panel-header">
        <div className="filter-title">New bench</div>

        <button
          className="panel-close"
          type="button"
          aria-label="Close"
          onClick={() => setIsOpen(false)}
        >
          ×
        </button>
      </div>

      <span className="add-bench-label">
        Click the map to put the bench there, or paste a link below
      </span>

      <label className="add-bench-field">
        <span className="add-bench-label">Google Maps link or "lat, lng"</span>
        <input
          type="text"
          inputMode="url"
          placeholder="https://maps.app.goo.gl/…"
          value={link}
          onChange={(event) => setLink(event.target.value)}
        />
        {linkStatus && (
          <span className={`add-bench-status add-bench-status--${linkStatus.kind}`}>
            {linkStatus.message}
          </span>
        )}
      </label>

      <div className="add-bench-row">
        <label className="add-bench-field">
          <span className="add-bench-label">Latitude</span>
          <input
            type="text"
            inputMode="decimal"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
          />
        </label>

        <label className="add-bench-field">
          <span className="add-bench-label">Longitude</span>
          <input
            type="text"
            inputMode="decimal"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
          />
        </label>
      </div>

      <label className="add-bench-field">
        <span className="add-bench-label">Place</span>
        <select value={place} onChange={(event) => setPlace(event.target.value)}>
          <option value="" disabled>
            Choose…
          </option>
          {PLACES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label className="add-bench-field">
        <span className="add-bench-label">Type</span>
        <select value={type} onChange={(event) => setType(event.target.value)}>
          <option value="" disabled>
            Choose…
          </option>
          {BENCH_TYPES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <button className="add-bench-submit" type="submit" disabled={!canSubmit}>
        Add
      </button>

      {submitStatus && (
        <div className={`add-bench-status add-bench-status--${submitStatus.kind}`}>
          {submitStatus.message}
        </div>
      )}
    </form>
  )
}

export default AddBenchForm
