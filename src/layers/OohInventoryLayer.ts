import { ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import type { OohMapPoint } from '@/types'

const MEDIA_TYPE_COLORS: Record<string, [number, number, number, number]> = {
  bb: [255, 207, 92, 220],
  bs: [145, 214, 196, 220],
  db: [73, 145, 255, 235],
  ds: [120, 220, 255, 225],
  mu: [255, 116, 160, 220],
  sf: [194, 160, 255, 215],
  tr: [255, 151, 83, 220],
}

function getPointColor(point: OohMapPoint, selectedPointId: string | null): [number, number, number, number] {
  if (point.id === selectedPointId) return [255, 255, 255, 255]
  return MEDIA_TYPE_COLORS[point.mediaTypeCode] ?? [220, 226, 238, 210]
}

function getPointRadius(point: OohMapPoint, selectedPointId: string | null) {
  if (point.id === selectedPointId) return 15

  const reachRadius = Math.sqrt(Math.max(point.weeklyImpressions, 1)) / 95
  const visibilityBoost = point.visibilityScore >= 85 ? 2.5 : point.visibilityScore >= 70 ? 1.2 : 0
  return Math.max(5, Math.min(13, reachRadius + visibilityBoost))
}

export function makeOohInventoryLayers(points: OohMapPoint[], selectedPointId: string | null) {
  const selectedPoint = selectedPointId
    ? points.find(point => point.id === selectedPointId) ?? null
    : null

  return [
    new ScatterplotLayer<OohMapPoint>({
      id: 'ooh-inventory-points',
      data: points,
      getPosition: point => [point.position.lng, point.position.lat, 2],
      getRadius: point => getPointRadius(point, selectedPointId),
      radiusUnits: 'meters',
      radiusMinPixels: 4,
      radiusMaxPixels: 18,
      getFillColor: point => getPointColor(point, selectedPointId),
      getLineColor: point => point.id === selectedPointId ? [12, 14, 20, 255] : [255, 255, 255, 130],
      lineWidthMinPixels: 1,
      stroked: true,
      filled: true,
      pickable: true,
      autoHighlight: true,
      highlightColor: [255, 255, 255, 90],
      updateTriggers: {
        getRadius: [selectedPointId],
        getFillColor: [selectedPointId],
        getLineColor: [selectedPointId],
      },
    }),
    new TextLayer<OohMapPoint>({
      id: 'ooh-inventory-selected-label',
      data: selectedPoint ? [selectedPoint] : [],
      getPosition: point => [point.position.lng, point.position.lat, 18],
      getText: point => `${point.mediaTypeLabel} / ${point.visibilityScore}`,
      getColor: [10, 13, 20, 255],
      getSize: 12,
      sizeUnits: 'pixels',
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'bottom',
      fontWeight: 800,
      background: true,
      getBackgroundColor: [255, 255, 255, 235],
      backgroundPadding: [6, 4],
      pickable: false,
    }),
  ]
}
