import type { AgentBehavior, Building, LatLng, PedestrianAgent, RoadSegment, TrafficPoint } from '@/types'
import { createBehavior } from './agentBehaviors'

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
  return {
    id: `pedestrian-${ts}-${i}`,
    name: `Pedestrian ${String(i + 1).padStart(3, '0')}`,
    position,
    heading: Math.random() * 360,
    speedMps: 1.0 + Math.random() * 0.8,
    phaseOffsetM: Math.random() * LOOP_LENGTH_M,
    visual: 'walker',
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

// --- road-following spawn ---

function distanceMLocal(a: LatLng, b: LatLng): number {
  const lngScale = METERS_PER_LNG_DEGREE * Math.cos(a.lat * Math.PI / 180)
  const dlat = (b.lat - a.lat) * METERS_PER_LAT_DEGREE
  const dlng = (b.lng - a.lng) * lngScale
  return Math.sqrt(dlat * dlat + dlng * dlng)
}

function nearestWaypointIdx(pos: LatLng, path: LatLng[]): number {
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < path.length; i++) {
    const d = distanceMLocal(pos, path[i])
    if (d < bestDist) { bestDist = d; best = i }
  }
  return best
}

/**
 * Spawn agents on the road network, weighted by road kind and nearby traffic density.
 * Returns agents AND their pre-assigned path-following behaviors so waypoints are wired up.
 */
export function spawnAgentsOnRoads(
  roads: RoadSegment[],
  trafficPoints: TrafficPoint[],
  totalCount: number,
  buildings: Building[] = [],
): { agents: PedestrianAgent[]; behaviors: AgentBehavior[] } {
  if (roads.length === 0) return { agents: [], behaviors: [] }

  // Build per-road spawn weight = road.weight * (1 + sum of nearby traffic point weights)
  const TRAFFIC_BOOST_RADIUS_M = 60
  const roadWeights = roads.map(road => {
    const midIdx = Math.floor(road.path.length / 2)
    const mid = road.path[midIdx]
    let boost = 0
    for (const tp of trafficPoints) {
      if (distanceMLocal(mid, tp.position) < TRAFFIC_BOOST_RADIUS_M) boost += tp.weight
    }
    return road.weight * (1 + boost)
  })
  const totalWeight = roadWeights.reduce((s, w) => s + w, 0)

  const agents: PedestrianAgent[] = []
  const behaviors: AgentBehavior[] = []
  const ts = Date.now()

  for (let n = 0; n < totalCount; n++) {
    // Pick a road segment via weighted random
    let r = Math.random() * totalWeight
    let roadIdx = 0
    for (let k = 0; k < roadWeights.length; k++) {
      r -= roadWeights[k]
      if (r <= 0) { roadIdx = k; break }
    }
    const road = roads[roadIdx]

    // Pick a random waypoint on the road as spawn position
    const spawnWpIdx = Math.floor(Math.random() * road.path.length)
    const spawnPos = road.path[spawnWpIdx]

    if (isInsideBuilding(spawnPos, buildings)) continue

    const agent: PedestrianAgent = {
      id: `pedestrian-${ts}-${n}`,
      name: `Pedestrian ${String(n + 1).padStart(3, '0')}`,
      position: { ...spawnPos },
      heading: 0,
      speedMps: 1.0 + Math.random() * 0.8,
      phaseOffsetM: Math.random() * LOOP_LENGTH_M,
      visual: 'walker',
    }

    const waypointDir: 1 | -1 = Math.random() < 0.5 ? 1 : -1
    const startIdx = waypointDir === 1
      ? spawnWpIdx
      : spawnWpIdx

    // Set initial heading along the road
    const nextIdx = Math.min(spawnWpIdx + 1, road.path.length - 1)
    const prevIdx = Math.max(spawnWpIdx - 1, 0)
    const refPoint = waypointDir === 1 ? road.path[nextIdx] : road.path[prevIdx]
    if (refPoint && distanceMLocal(spawnPos, refPoint) > 0.1) {
      const dlat = (refPoint.lat - spawnPos.lat) * METERS_PER_LAT_DEGREE
      const dlng = (refPoint.lng - spawnPos.lng) * METERS_PER_LNG_DEGREE * Math.cos(spawnPos.lat * Math.PI / 180)
      agent.heading = ((Math.atan2(dlng, dlat) * 180 / Math.PI) + 360) % 360
    }

    const behavior = createBehavior(agent.id, road.path, waypointDir)
    behavior.waypointIdx = startIdx

    agents.push(agent)
    behaviors.push(behavior)
  }

  // Fill to totalCount if buildings caused skips
  while (agents.length < totalCount && roads.length > 0) {
    const road = roads[Math.floor(Math.random() * roads.length)]
    const wpIdx = Math.floor(Math.random() * road.path.length)
    const pos = road.path[wpIdx]
    const n = agents.length
    const agent: PedestrianAgent = {
      id: `pedestrian-${ts}-fill-${n}`,
      name: `Pedestrian ${String(n + 1).padStart(3, '0')}`,
      position: { ...pos },
      heading: Math.random() * 360,
      speedMps: 1.0 + Math.random() * 0.8,
      phaseOffsetM: Math.random() * LOOP_LENGTH_M,
      visual: 'walker',
    }
    const dir: 1 | -1 = Math.random() < 0.5 ? 1 : -1
    const beh = createBehavior(agent.id, road.path, dir)
    beh.waypointIdx = wpIdx
    agents.push(agent)
    behaviors.push(beh)
  }

  return { agents, behaviors }
}
