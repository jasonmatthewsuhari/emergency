import { PathLayer } from '@deck.gl/layers'
import { makeCircleCoords } from '@/lib/geoUtils'
import type { LatLng } from '@/types'

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
