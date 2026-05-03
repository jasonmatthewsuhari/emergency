'use client'

import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

const MapCanvas = dynamic(() => import('@/components/MapCanvas'), { ssr: false })

const MAP_FOCUS_STORAGE_KEY = 'sightline:map-focus'

type MapFocus = {
  lat: number
  lng: number
  countryIso: string | null
}

function isValidCoordinate(lat: number, lng: number) {
  return Number.isFinite(lat) && Number.isFinite(lng)
}

function readStoredMapFocus(): MapFocus | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = sessionStorage.getItem(MAP_FOCUS_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<MapFocus>
    const lat = Number(parsed.lat)
    const lng = Number(parsed.lng)
    if (!isValidCoordinate(lat, lng)) return null
    return {
      lat,
      lng,
      countryIso: typeof parsed.countryIso === 'string' ? parsed.countryIso : null,
    }
  } catch {
    return null
  }
}

function MapPageInner() {
  const params = useSearchParams()
  const [storedFocus] = useState<MapFocus | null>(() => readStoredMapFocus())

  const rawQueryLat = params.get('lat')
  const rawQueryLng = params.get('lng')
  const queryLat = rawQueryLat === null ? null : Number(rawQueryLat)
  const queryLng = rawQueryLng === null ? null : Number(rawQueryLng)
  const queryFocus = queryLat !== null && queryLng !== null && isValidCoordinate(queryLat, queryLng)
    ? { lat: queryLat, lng: queryLng, countryIso: params.get('country') ?? null }
    : null
  const mapFocus = storedFocus ?? queryFocus
  const focusArea = mapFocus ? { lat: mapFocus.lat, lng: mapFocus.lng } : null
  const countryIso = mapFocus?.countryIso ?? null

  return <MapCanvas focusArea={focusArea} countryIso={countryIso} />
}

export default function MapPage() {
  return (
    <Suspense fallback={null}>
      <MapPageInner />
    </Suspense>
  )
}
