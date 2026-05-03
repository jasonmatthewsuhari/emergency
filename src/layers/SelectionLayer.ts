import { PathLayer, SolidPolygonLayer } from '@deck.gl/layers'
import { makeCircleCoords } from '@/lib/geoUtils'
import type { LatLng } from '@/types'

// Covers the entire Mercator-visible world
const WORLD_RING: [number, number][] = [
  [-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85],
]

interface SelectionRing {
  path: [number, number, number][]
}

export function makeSelectionLayer(center: LatLng, radiusKm: number) {
  return new PathLayer<SelectionRing>({
    id: 'selection-circle',
    data: [{
      path: makeCircleCoords([center.lng, center.lat], radiusKm, 96)
        .map(([lng, lat]) => [lng, lat, 1] as [number, number, number]),
    }],
    getPath: d => d.path,
    getColor: [100, 180, 255, 220],
    getWidth: 3,
    widthUnits: 'pixels',
    pickable: false,
  })
}

type MaskBand = { polygon: [number, number][][]; alpha: number }

/**
 * Gradient void — concentric donut rings stepping from transparent at the
 * selection boundary to fully opaque, so the surrounding area dissolves
 * naturally without any visible walls.
 */
export function makeSelectionMaskLayer(center: LatLng, radiusKm: number) {
  const c: [number, number] = [center.lng, center.lat]

  // Each band: [delta from selection edge (inner), delta (outer), alpha]
  const defs: [number, number, number][] = [
    [0,    0.07, 35],
    [0.07, 0.15, 105],
    [0.15, 0.25, 185],
    [0.25, 100,  252],
  ]

  const bands: MaskBand[] = defs.map(([di, do_, alpha]) => ({
    polygon: [
      makeCircleCoords(c, radiusKm + do_, 96),
      [...makeCircleCoords(c, radiusKm + di, 96)].reverse(),
    ],
    alpha,
  }))

  return new SolidPolygonLayer<MaskBand>({
    id: 'selection-mask-3d',
    data: bands,
    getPolygon: d => d.polygon,
    extruded: false,
    getFillColor: d => [13, 14, 20, d.alpha],
    pickable: false,
    updateTriggers: { getFillColor: [center.lat, center.lng, radiusKm] },
  })
}
