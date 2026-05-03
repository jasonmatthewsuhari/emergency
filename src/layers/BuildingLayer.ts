import { PathLayer, PolygonLayer } from '@deck.gl/layers'
import type { Building, BuildingPoiCategory } from '@/types'

type Rgba = [number, number, number, number]

interface BuildingPathDetail {
  id: string
  building: Building
  path: [number, number, number][]
  color: Rgba
  width: number
}

const NAMED_COLORS: Record<string, [number, number, number]> = {
  beige: [197, 185, 158],
  black: [48, 48, 48],
  blue: [112, 146, 176],
  brown: [128, 101, 78],
  gray: [158, 158, 158],
  grey: [158, 158, 158],
  green: [116, 143, 110],
  orange: [190, 135, 82],
  red: [164, 91, 78],
  silver: [176, 180, 182],
  white: [218, 214, 204],
  yellow: [196, 178, 112],
}

const MATERIAL_COLORS: Record<string, Rgba> = {
  apartments: [202, 193, 176, 235],
  brick: [168, 101, 78, 238],
  commercial: [185, 193, 198, 230],
  concrete: [198, 194, 181, 235],
  construction: [182, 166, 130, 210],
  glass: [145, 183, 202, 218],
  industrial: [166, 171, 169, 230],
  metal: [176, 182, 186, 226],
  office: [178, 190, 199, 230],
  residential: [205, 195, 178, 236],
  retail: [198, 188, 170, 234],
  roof: [122, 112, 102, 238],
  school: [202, 186, 158, 236],
  stone: [188, 183, 171, 236],
  wood: [164, 120, 86, 235],
}

const FALLBACK_FACADE_PALETTE: Rgba[] = [
  [205, 198, 181, 236],
  [194, 199, 196, 234],
  [188, 197, 205, 230],
  [207, 190, 170, 236],
  [181, 187, 177, 234],
  [198, 184, 170, 236],
]

const POI_STYLES: Record<BuildingPoiCategory, {
  facade: Rgba
  roof: Rgba
  accent: Rgba
}> = {
  restaurant: {
    facade: [214, 178, 146, 240],
    roof: [110, 67, 53, 242],
    accent: [220, 70, 54, 245],
  },
  cafe: {
    facade: [212, 188, 150, 240],
    roof: [101, 77, 56, 242],
    accent: [232, 159, 61, 245],
  },
  bar: {
    facade: [128, 111, 143, 238],
    roof: [62, 48, 74, 242],
    accent: [174, 90, 210, 245],
  },
  retail: {
    facade: [198, 190, 176, 238],
    roof: [85, 88, 91, 242],
    accent: [65, 137, 214, 245],
  },
  grocery: {
    facade: [188, 202, 174, 238],
    roof: [76, 99, 70, 242],
    accent: [68, 172, 103, 245],
  },
  hotel: {
    facade: [206, 190, 166, 240],
    roof: [101, 84, 65, 242],
    accent: [217, 178, 89, 245],
  },
  office: {
    facade: [166, 190, 205, 228],
    roof: [80, 95, 105, 238],
    accent: [103, 182, 224, 235],
  },
  school: {
    facade: [210, 193, 153, 240],
    roof: [121, 83, 64, 242],
    accent: [236, 194, 66, 245],
  },
  medical: {
    facade: [213, 218, 213, 240],
    roof: [99, 122, 118, 242],
    accent: [66, 184, 170, 245],
  },
  transit: {
    facade: [180, 190, 200, 236],
    roof: [80, 86, 94, 242],
    accent: [67, 122, 218, 245],
  },
  parking: {
    facade: [170, 172, 168, 230],
    roof: [92, 94, 92, 238],
    accent: [80, 130, 210, 245],
  },
  entertainment: {
    facade: [169, 143, 181, 238],
    roof: [79, 61, 92, 242],
    accent: [205, 96, 210, 245],
  },
  worship: {
    facade: [193, 185, 168, 238],
    roof: [102, 96, 84, 242],
    accent: [188, 162, 95, 235],
  },
  residential: {
    facade: [205, 195, 178, 236],
    roof: [121, 105, 91, 240],
    accent: [152, 132, 111, 185],
  },
  industrial: {
    facade: [166, 171, 169, 232],
    roof: [96, 101, 99, 240],
    accent: [111, 130, 137, 205],
  },
}

const STOREFRONT_CATEGORIES = new Set<BuildingPoiCategory>([
  'restaurant',
  'cafe',
  'bar',
  'retail',
  'grocery',
  'hotel',
  'medical',
  'entertainment',
])

function normalizeTag(value: string | undefined) {
  return value?.trim().toLowerCase().replace(/_/g, '-')
}

function hashString(value: string) {
  let hash = 2166136261
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function tintColor(color: Rgba, amount: number): Rgba {
  return [
    Math.max(0, Math.min(255, Math.round(color[0] + amount))),
    Math.max(0, Math.min(255, Math.round(color[1] + amount))),
    Math.max(0, Math.min(255, Math.round(color[2] + amount))),
    color[3],
  ]
}

function fallbackColorForBuilding(building: Building): Rgba {
  const hash = hashString(building.id)
  const base = FALLBACK_FACADE_PALETTE[hash % FALLBACK_FACADE_PALETTE.length]
  const variation = ((hash >> 8) % 25) - 12
  return tintColor(base, variation)
}

function colorFromTag(value: string | undefined, alpha: number): Rgba | null {
  const normalized = normalizeTag(value)?.split(';')[0].trim()
  if (!normalized) return null

  const hex = normalized.match(/^#?([0-9a-f]{6})$/i)
  if (hex) {
    return [
      Number.parseInt(hex[1].slice(0, 2), 16),
      Number.parseInt(hex[1].slice(2, 4), 16),
      Number.parseInt(hex[1].slice(4, 6), 16),
      alpha,
    ]
  }

  const named = NAMED_COLORS[normalized]
  return named ? [named[0], named[1], named[2], alpha] : null
}

function colorForBuilding(building: Building): Rgba {
  const explicit = colorFromTag(building.facadeColor, 224)
  if (explicit) return explicit
  if (building.poiCategory) return POI_STYLES[building.poiCategory].facade

  const material = normalizeTag(building.material)
  if (material) {
    if (material.includes('glass')) return MATERIAL_COLORS.glass
    if (material.includes('brick')) return MATERIAL_COLORS.brick
    if (material.includes('concrete')) return MATERIAL_COLORS.concrete
    if (material.includes('metal') || material.includes('steel')) return MATERIAL_COLORS.metal
    if (material.includes('wood')) return MATERIAL_COLORS.wood
    if (MATERIAL_COLORS[material]) return MATERIAL_COLORS[material]
  }

  const kind = normalizeTag(building.sourceTags?.building)
  if (kind && MATERIAL_COLORS[kind]) return MATERIAL_COLORS[kind]

  return fallbackColorForBuilding(building)
}

function roofColorForBuilding(building: Building): Rgba {
  const explicit = colorFromTag(building.roofColor, 232)
  if (explicit) return explicit
  if (building.poiCategory) return POI_STYLES[building.poiCategory].roof

  const material = normalizeTag(building.roofMaterial)
  if (material) {
    if (material.includes('metal')) return [142, 146, 148, 232]
    if (material.includes('tile')) return [153, 99, 74, 234]
    if (material.includes('concrete')) return [160, 154, 143, 232]
    if (material.includes('glass')) return [118, 158, 178, 220]
  }

  const facade = colorForBuilding(building)
  return [
    Math.max(45, Math.round(facade[0] * 0.76)),
    Math.max(45, Math.round(facade[1] * 0.76)),
    Math.max(45, Math.round(facade[2] * 0.76)),
    232,
  ]
}

function getBuildingPolygon(building: Building) {
  return building.footprint.map(point => [
    point.lng,
    point.lat,
    building.baseHeightM,
  ] as [number, number, number])
}

function getRoofPolygon(building: Building) {
  const roofZ = Math.max(building.heightM, building.baseHeightM + 1) + 0.08
  return building.footprint.map(point => [
    point.lng,
    point.lat,
    roofZ,
  ] as [number, number, number])
}

function getOutlinePath(building: Building) {
  const basePath = getRoofPolygon(building)
  const first = basePath[0]
  return first ? [...basePath, first] : basePath
}

function getFacadeBandColor(building: Building): Rgba {
  const facade = colorForBuilding(building)
  return [
    Math.max(35, Math.round(facade[0] * 0.62)),
    Math.max(35, Math.round(facade[1] * 0.62)),
    Math.max(35, Math.round(facade[2] * 0.62)),
    150,
  ]
}

function makeClosedPathAtHeight(building: Building, heightM: number) {
  const path = building.footprint.map(point => [
    point.lng,
    point.lat,
    heightM,
  ] as [number, number, number])
  const first = path[0]
  return first ? [...path, first] : path
}

function makeFacadeBands(building: Building): BuildingPathDetail[] {
  const floorHeightM = building.levels && building.levels > 0
    ? Math.max(2.6, Math.min(4.2, building.heightM / building.levels))
    : 3.2
  const firstBandM = building.baseHeightM + floorHeightM
  const maxBandCount = Math.min(14, Math.floor((building.heightM - firstBandM) / floorHeightM) + 1)
  const color = getFacadeBandColor(building)

  return Array.from({ length: Math.max(0, maxBandCount) }, (_, index) => {
    const heightM = firstBandM + index * floorHeightM
    return {
      id: `${building.id}-floor-${index}`,
      building,
      path: makeClosedPathAtHeight(building, heightM),
      color,
      width: 0.28,
    }
  })
}

function makeVerticalEdges(building: Building): BuildingPathDetail[] {
  const color = getFacadeBandColor(building)
  return building.footprint.slice(0, -1).map((point, index) => ({
    id: `${building.id}-edge-${index}`,
    building,
    path: [
      [point.lng, point.lat, building.baseHeightM],
      [point.lng, point.lat, building.heightM],
    ],
    color: [color[0], color[1], color[2], 115],
    width: 0.22,
  }))
}

function makeGroundFloorAccents(building: Building): BuildingPathDetail[] {
  const category = building.poiCategory
  if (!category) return []

  const style = POI_STYLES[category]
  const baseM = building.baseHeightM
  const shouldLookLikeStorefront = STOREFRONT_CATEGORIES.has(category)
  const heights = shouldLookLikeStorefront
    ? [baseM + 2.4, baseM + 3.4]
    : [baseM + 2.8]

  return heights.map((heightM, index) => ({
    id: `${building.id}-poi-accent-${index}`,
    building,
    path: makeClosedPathAtHeight(building, Math.min(heightM, building.heightM + 0.15)),
    color: style.accent,
    width: shouldLookLikeStorefront ? 1.15 : 0.72,
  }))
}

export function makeBuildingLayers(buildings: Building[]) {
  const drawableBuildings = buildings.filter(building => building.footprint.length >= 4 && building.heightM > 0)
  const facadeBands = drawableBuildings.flatMap(makeFacadeBands)
  const verticalEdges = drawableBuildings.flatMap(makeVerticalEdges)
  const groundFloorAccents = drawableBuildings.flatMap(makeGroundFloorAccents)

  return [
    new PolygonLayer<Building>({
      id: 'custom-building-extrusions',
      data: drawableBuildings,
      getPolygon: getBuildingPolygon,
      extruded: true,
      wireframe: false,
      getElevation: building => Math.max(1, building.heightM - building.baseHeightM),
      getFillColor: colorForBuilding,
      filled: true,
      stroked: false,
      pickable: false,
      material: {
        ambient: 0.42,
        diffuse: 0.58,
        shininess: 18,
        specularColor: [210, 218, 220],
      },
    }),
    new PolygonLayer<Building>({
      id: 'custom-building-roofs',
      data: drawableBuildings,
      getPolygon: getRoofPolygon,
      getFillColor: roofColorForBuilding,
      filled: true,
      stroked: false,
      pickable: false,
    }),
    new PathLayer<Building>({
      id: 'custom-building-roof-outlines',
      data: drawableBuildings,
      getPath: getOutlinePath,
      getColor: [70, 66, 60, 145],
      getWidth: 0.55,
      widthUnits: 'meters',
      widthMinPixels: 0.45,
      rounded: false,
      pickable: false,
    }),
    new PathLayer<BuildingPathDetail>({
      id: 'custom-building-floor-bands',
      data: facadeBands,
      getPath: detail => detail.path,
      getColor: detail => detail.color,
      getWidth: detail => detail.width,
      widthUnits: 'meters',
      widthMinPixels: 0.35,
      rounded: false,
      pickable: false,
    }),
    new PathLayer<BuildingPathDetail>({
      id: 'custom-building-vertical-edges',
      data: verticalEdges,
      getPath: detail => detail.path,
      getColor: detail => detail.color,
      getWidth: detail => detail.width,
      widthUnits: 'meters',
      widthMinPixels: 0.25,
      rounded: false,
      pickable: false,
    }),
    new PathLayer<BuildingPathDetail>({
      id: 'custom-building-poi-accents',
      data: groundFloorAccents,
      getPath: detail => detail.path,
      getColor: detail => detail.color,
      getWidth: detail => detail.width,
      widthUnits: 'meters',
      widthMinPixels: 1.1,
      rounded: false,
      pickable: false,
    }),
  ]
}
