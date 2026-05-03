/** Geographic circle helpers — no external dependencies. */

import type { LatLng } from '@/types'

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(h))
}

const WORLD_RING: [number, number][] = [
  [-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85],
]

/**
 * Returns the coordinate ring of a geodesic circle.
 * dx/dy use equirectangular approximation (accurate to <0.1% at ≤100 km radius).
 */
export function makeCircleCoords(
  center: [number, number],
  radiusKm: number,
  steps = 64,
): [number, number][] {
  const [lng, lat] = center
  const distX = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180))
  const distY = radiusKm / 110.574
  const coords: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const θ = (i / steps) * 2 * Math.PI
    coords.push([lng + distX * Math.cos(θ), lat + distY * Math.sin(θ)])
  }
  return coords
}

/** GeoJSON circle polygon — use as a react-map-gl Source payload. */
export function makeCircleGeoJSON(
  center: [number, number],
  radiusKm: number,
): GeoJSON.Feature<GeoJSON.Polygon> {
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [makeCircleCoords(center, radiusKm)] },
    properties: {},
  }
}

/**
 * GeoJSON polygon that covers the ENTIRE world except the circle.
 * Use as a DeckGL PolygonLayer fill to mask everything outside the area.
 */
export function makeInvertedMask(
  center: [number, number],
  radiusKm: number,
): GeoJSON.Feature<GeoJSON.Polygon> {
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [WORLD_RING, [...makeCircleCoords(center, radiusKm)].reverse()],
    },
    properties: {},
  }
}
