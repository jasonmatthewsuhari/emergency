import type { Building, LatLng, PedestrianAgent, TrafficPoint } from '@/types'

const LOOP_LENGTH_M = 14
const METERS_PER_LAT_DEGREE = 110540
const METERS_PER_LNG_DEGREE = 111320
const MAX_PLACEMENT_RETRIES = 30

export function offsetLatLng(origin: LatLng, eastM: number, northM: number): LatLng {
  const lngScale = METERS_PER_LNG_DEGREE * Math.cos(origin.lat * Math.PI / 180)
  return {
    lat: origin.lat + northM / METERS_PER_LAT_DEGREE,
    lng: origin.lng + eastM / lngScale,
  }
}

function pointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  let inside = false
  const x = point.lng, y = point.lat
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat
    const xj = polygon[j].lng, yj = polygon[j].lat
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function isInsideBuilding(pos: LatLng, buildings: Building[]): boolean {
  for (const b of buildings) {
    if (pointInPolygon(pos, b.footprint)) return true
  }
  return false
}

function makeAgent(i: number, position: LatLng, ts: number): PedestrianAgent {
  const visual = i > 0 && i % 16 === 0 ? 'car' : 'walker'

  return {
    id: `pedestrian-${ts}-${i}`,
    name: visual === 'car' ? `Car ${String(i + 1).padStart(3, '0')}` : `Pedestrian ${String(i + 1).padStart(3, '0')}`,
    position,
    heading: Math.random() * 360,
    speedMps: visual === 'car' ? 1.45 + Math.random() * 0.7 : 1.0 + Math.random() * 0.8,
    phaseOffsetM: Math.random() * LOOP_LENGTH_M,
    visual,
  }
}

function safePosition(
  sample: () => LatLng,
  buildings: Building[],
): LatLng {
  for (let attempt = 0; attempt < MAX_PLACEMENT_RETRIES; attempt++) {
    const pos = sample()
    if (!isInsideBuilding(pos, buildings)) return pos
  }
  return sample() // give up and accept it rather than hang
}

export function spawnAgentsInRadius(
  center: LatLng,
  radiusM: number,
  count: number,
  buildings: Building[] = [],
): PedestrianAgent[] {
  const ts = Date.now()
  return Array.from({ length: count }, (_, i) => {
    const pos = safePosition(() => {
      const r = radiusM * Math.sqrt(Math.random())
      const angle = Math.random() * 2 * Math.PI
      return offsetLatLng(center, r * Math.cos(angle), r * Math.sin(angle))
    }, buildings)
    return makeAgent(i, pos, ts)
  })
}

/**
 * Spawn agents weighted by foot-traffic density. Each TrafficPoint contributes
 * agents proportional to its weight; agents scatter within scatterRadiusM of
 * the hotspot center and are rejected from building interiors.
 */
export function spawnAgentsFromTraffic(
  trafficPoints: TrafficPoint[],
  totalCount: number,
  buildings: Building[] = [],
  scatterRadiusM = 10,
): PedestrianAgent[] {
  if (trafficPoints.length === 0) return []

  const totalWeight = trafficPoints.reduce((sum, p) => sum + p.weight, 0)
  const agents: PedestrianAgent[] = []
  const ts = Date.now()

  for (const tp of trafficPoints) {
    const share = Math.round((tp.weight / totalWeight) * totalCount)
    const nodeCount = Math.max(1, share)

    for (let j = 0; j < nodeCount && agents.length < totalCount; j++) {
      const pos = safePosition(() => {
        const r = scatterRadiusM * Math.sqrt(Math.random())
        const angle = Math.random() * 2 * Math.PI
        return offsetLatLng(tp.position, r * Math.cos(angle), r * Math.sin(angle))
      }, buildings)
      agents.push(makeAgent(agents.length, pos, ts))
    }
  }

  // Fill rounding gaps from the highest-weight node
  const top = [...trafficPoints].sort((a, b) => b.weight - a.weight)[0]
  while (agents.length < totalCount) {
    const pos = safePosition(() => {
      const r = scatterRadiusM * Math.sqrt(Math.random())
      const angle = Math.random() * 2 * Math.PI
      return offsetLatLng(top.position, r * Math.cos(angle), r * Math.sin(angle))
    }, buildings)
    agents.push(makeAgent(agents.length, pos, ts))
  }

  return agents
}
