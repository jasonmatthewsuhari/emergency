import { PathLayer, PolygonLayer } from '@deck.gl/layers'
import type { Building } from '@/types'

type Rgba = [number, number, number, number]

interface BuildingPathDetail {
  id: string
  building: Building
  path: [number, number, number][]
  color: Rgba
  width: number
}

const MAPBOX_FACADE: Rgba = [213, 209, 202, 230]
const MAPBOX_ROOF: Rgba = [178, 173, 165, 232]

function colorForBuilding(_building: Building): Rgba {
  return MAPBOX_FACADE
}

function roofColorForBuilding(_building: Building): Rgba {
  return MAPBOX_ROOF
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

function makeGroundFloorAccents(_building: Building): BuildingPathDetail[] {
  return []
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
