import { BitmapLayer, PathLayer, ScatterplotLayer, TextLayer } from '@deck.gl/layers'
import type { BillboardPlacement, LatLng } from '@/types'

interface BillboardPanel {
  placement: BillboardPlacement
  polygon: [number, number, number][]
  topCenter: [number, number, number]
}

interface BillboardPath {
  id: string
  placementId: string
  selected: boolean
  path: [number, number, number][]
  color: [number, number, number, number]
  width: number
}

interface BillboardHandle {
  id: string
  position: [number, number, number]
  color: [number, number, number, number]
}

const METERS_PER_LAT_DEGREE = 110540
const METERS_PER_LNG_DEGREE = 111320

// Cache 1×1 solid-color PNG data URLs so we don't recreate canvases on every render
const colorDataUrlCache = new Map<string, string>()
function solidColorDataUrl(hex: string): string {
  if (colorDataUrlCache.has(hex)) return colorDataUrlCache.get(hex)!
  if (typeof document === 'undefined') return ''
  const canvas = document.createElement('canvas')
  canvas.width = 1; canvas.height = 1
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''
  ctx.fillStyle = hex
  ctx.fillRect(0, 0, 1, 1)
  const url = canvas.toDataURL()
  colorDataUrlCache.set(hex, url)
  return url
}

function offsetLatLng(origin: LatLng, eastM: number, northM: number): LatLng {
  const lngScale = METERS_PER_LNG_DEGREE * Math.cos(origin.lat * Math.PI / 180)
  return {
    lat: origin.lat + northM / METERS_PER_LAT_DEGREE,
    lng: origin.lng + eastM / lngScale,
  }
}

function bearingVector(degrees: number) {
  const radians = degrees * Math.PI / 180
  return {
    east: Math.sin(radians),
    north: Math.cos(radians),
  }
}

function getPanelGeometry(placement: BillboardPlacement) {
  const side = bearingVector(placement.heading + 90)
  const halfWidth = placement.widthM / 2
  const left = offsetLatLng(placement.position, -side.east * halfWidth, -side.north * halfWidth)
  const right = offsetLatLng(placement.position, side.east * halfWidth, side.north * halfWidth)
  const baseZ = placement.clearanceM
  const topZ = placement.clearanceM + placement.heightM

  return {
    leftBottom: [left.lng, left.lat, baseZ] as [number, number, number],
    rightBottom: [right.lng, right.lat, baseZ] as [number, number, number],
    rightTop: [right.lng, right.lat, topZ] as [number, number, number],
    leftTop: [left.lng, left.lat, topZ] as [number, number, number],
    topCenter: [placement.position.lng, placement.position.lat, topZ + 1.3] as [number, number, number],
  }
}

function getBillboardScore(placement: BillboardPlacement) {
  const areaScore = Math.min(36, placement.widthM * placement.heightM * 0.42)
  const formatScore = placement.format === 'digital' ? 18 : placement.format === 'wallscape' ? 15 : 11
  const clearanceScore = Math.min(18, placement.clearanceM * 2.2)
  const brightnessScore = placement.brightness * 0.14
  return Math.round(Math.min(99, 18 + areaScore + formatScore + clearanceScore + brightnessScore))
}

function getGroundPadFill(panel: BillboardPanel, selectedBillboardId: string | null): [number, number, number, number] {
  if (panel.placement.id === selectedBillboardId) return [255, 211, 92, 80]
  if (panel.placement.material === 'digital-night') return [68, 142, 255, 72]
  return [18, 23, 32, 110]
}


export function makeBillboardLayers(
  placements: BillboardPlacement[],
  selectedBillboardId: string | null,
  onPickBillboard: (placementId: string) => void,
  opacity = 1,
) {
  const panels: BillboardPanel[] = placements.map(placement => {
    const geometry = getPanelGeometry(placement)
    return {
      placement,
      polygon: [geometry.leftBottom, geometry.rightBottom, geometry.rightTop, geometry.leftTop],
      topCenter: geometry.topCenter,
    }
  })

  const framePaths: BillboardPath[] = panels.flatMap(panel => {
    const selected = panel.placement.id === selectedBillboardId
    const [leftBottom, rightBottom, rightTop, leftTop] = panel.polygon
    const frameColor: [number, number, number, number] = selected ? [255, 211, 92, 255] : [224, 230, 240, 230]

    return [
      {
        id: `${panel.placement.id}-frame`,
        placementId: panel.placement.id,
        selected,
        path: [leftBottom, rightBottom, rightTop, leftTop, leftBottom],
        color: frameColor,
        width: selected ? 0.55 : 0.32,
      },
    ]
  })

  const handles: BillboardHandle[] = selectedBillboardId
    ? panels
        .filter(panel => panel.placement.id === selectedBillboardId)
        .flatMap(panel => panel.polygon.map((position, index) => ({
          id: `${panel.placement.id}-handle-${index}`,
          position,
          color: index < 2 ? [255, 211, 92, 255] as [number, number, number, number] : [120, 220, 255, 255] as [number, number, number, number],
        })))
    : []

  // Pole paths (ground → panel base)
  const polePaths: BillboardPath[] = panels.flatMap(panel => {
    const poleInset = panel.placement.widthM * 0.28
    const side = bearingVector(panel.placement.heading + 90)
    const leftPole = offsetLatLng(panel.placement.position,
      -side.east * poleInset, -side.north * poleInset)
    const rightPole = offsetLatLng(panel.placement.position,
      side.east * poleInset, side.north * poleInset)
    const bz = panel.placement.clearanceM

    return [
      {
        id: `${panel.placement.id}-pole-left`,
        placementId: panel.placement.id,
        selected: panel.placement.id === selectedBillboardId,
        path: [
          [leftPole.lng, leftPole.lat, 0] as [number, number, number],
          [leftPole.lng, leftPole.lat, bz] as [number, number, number],
        ],
        color: [138, 154, 176, 230],
        width: 0.45,
      },
      {
        id: `${panel.placement.id}-pole-right`,
        placementId: panel.placement.id,
        selected: panel.placement.id === selectedBillboardId,
        path: [
          [rightPole.lng, rightPole.lat, 0] as [number, number, number],
          [rightPole.lng, rightPole.lat, bz] as [number, number, number],
        ],
        color: [138, 154, 176, 230],
        width: 0.45,
      },
    ]
  })

  // BitmapLayer face layers — one per billboard.
  // BitmapLayer with 4-corner 3D bounds renders a textured quad at an arbitrary
  // orientation in deck.gl's coordinate space (the only layer that works for
  // vertical panels; SolidPolygonLayer only fills horizontal surfaces).
  // Front face: creative image if available, otherwise primary color solid.
  // Back face: dark metallic so the panel is visible from both sides.
  const idSuffix = opacity < 1 ? '-ghost' : ''

  const faceLayers = panels.flatMap(p => {
    const [lb, rb, rt, lt] = p.polygon
    const image = p.placement.mediaUrl || solidColorDataUrl(p.placement.primaryColor)
    const backImage = solidColorDataUrl('#2a3040')

    return [
      new BitmapLayer({
        id: `billboard-back-${p.placement.id}${idSuffix}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bounds: [rb, lb, lt, rt] as any,
        image: backImage,
        pickable: false,
        opacity,
        parameters: { depthTest: true },
      }),
      new BitmapLayer({
        id: `billboard-face-${p.placement.id}${idSuffix}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        bounds: [lb, rb, rt, lt] as any,
        image,
        pickable: opacity >= 1,
        opacity,
        parameters: { depthTest: true },
        onClick: opacity >= 1 ? () => onPickBillboard(p.placement.id) : undefined,
      }),
    ]
  })

  return [
    ...faceLayers,

    new PathLayer<BillboardPath>({
      id: `billboard-poles${idSuffix}`,
      data: polePaths,
      getPath: pole => pole.path,
      getColor: pole => pole.color,
      getWidth: 0.45,
      widthUnits: 'meters',
      widthMinPixels: 2,
      rounded: true,
      pickable: false,
      opacity,
    }),

    new PathLayer<BillboardPath>({
      id: `billboard-frames${idSuffix}`,
      data: framePaths,
      getPath: frame => frame.path,
      getColor: frame => frame.color,
      getWidth: frame => frame.width,
      widthUnits: 'meters',
      widthMinPixels: 1,
      rounded: true,
      pickable: opacity >= 1,
      autoHighlight: opacity >= 1,
      highlightColor: [255, 255, 255, 30],
      opacity,
      onClick: opacity >= 1 ? (info => {
        const id = (info.object as BillboardPath | null)?.placementId
        if (id) onPickBillboard(id)
      }) : undefined,
    }),

    new ScatterplotLayer<BillboardPanel>({
      id: `billboard-ground-pads${idSuffix}`,
      data: panels,
      getPosition: panel => [panel.placement.position.lng, panel.placement.position.lat, 0],
      getRadius: panel => Math.max(4, panel.placement.widthM * 0.36),
      radiusUnits: 'meters',
      getFillColor: panel => getGroundPadFill(panel, selectedBillboardId),
      getLineColor: panel => panel.placement.id === selectedBillboardId ? [255, 211, 92, 210] : [255, 255, 255, 90],
      lineWidthMinPixels: 1,
      stroked: true,
      filled: true,
      pickable: false,
      opacity,
    }),

    new ScatterplotLayer<BillboardHandle>({
      id: `billboard-resize-handles${idSuffix}`,
      data: handles,
      getPosition: handle => handle.position,
      getRadius: 0.95,
      radiusUnits: 'meters',
      radiusMinPixels: 5,
      getFillColor: handle => handle.color,
      getLineColor: [12, 14, 20, 255],
      lineWidthMinPixels: 1,
      stroked: true,
      filled: true,
      pickable: false,
      opacity,
    }),

    new TextLayer<BillboardPanel>({
      id: `billboard-score-labels${idSuffix}`,
      data: panels,
      getPosition: panel => panel.topCenter,
      getText: panel => panel.placement.id === selectedBillboardId
        ? `${panel.placement.name} / ${getBillboardScore(panel.placement)}`
        : String(getBillboardScore(panel.placement)),
      getColor: panel => panel.placement.id === selectedBillboardId ? [255, 238, 179, 255] : [230, 238, 255, 225],
      getSize: panel => panel.placement.id === selectedBillboardId ? 12 : 10,
      sizeUnits: 'pixels',
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'bottom',
      fontWeight: 700,
      background: true,
      getBackgroundColor: [10, 13, 20, 210],
      backgroundPadding: [5, 3],
      pickable: false,
      opacity,
    }),
  ]
}
