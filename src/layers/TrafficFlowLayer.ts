import { PathLayer, ScatterplotLayer } from '@deck.gl/layers'
import type { RoadSegment, TrafficPoint } from '@/types'

const FLOW_SPEED = 0.035
const ELEV = 1  // ground-level so lines appear on the road surface

interface Particle {
  position: [number, number, number]
  color: [number, number, number, number]
}

// Maps weight [0,1] → green (low foot traffic) → yellow → red (high foot traffic)
function trafficColor(weight: number, alpha: number): [number, number, number, number] {
  const w = Math.max(0, Math.min(1, weight))
  let r: number, g: number, b: number
  if (w < 0.5) {
    const t = w * 2
    r = Math.round(40 + t * 215)
    g = Math.round(200 + t * 40)
    b = Math.round(60 - t * 45)
  } else {
    const t = (w - 0.5) * 2
    r = 255
    g = Math.round(240 - t * 195)
    b = Math.round(15 - t * 10)
  }
  return [r, g, b, alpha]
}

function particlesAlongRoad(road: RoadSegment, roadIndex: number, flowTime: number): Particle[] {
  const path = road.path
  if (path.length < 2) return []

  // Compute cumulative metric distances along path
  const cumDist: number[] = [0]
  for (let i = 1; i < path.length; i++) {
    const cosLat = Math.cos((path[i].lat * Math.PI) / 180)
    const dx = (path[i].lng - path[i - 1].lng) * 111320 * cosLat
    const dy = (path[i].lat - path[i - 1].lat) * 110574
    cumDist.push(cumDist[i - 1] + Math.sqrt(dx * dx + dy * dy))
  }
  const totalM = cumDist[cumDist.length - 1]
  if (totalM < 15) return []

  const count = Math.max(1, Math.min(5, Math.floor(totalM / 55)))
  const color = trafficColor(road.weight, Math.round(140 + road.weight * 85))

  return Array.from({ length: count }, (_, p) => {
    const phase = (roadIndex * 0.618 + p / count) % 1
    const t = (flowTime * FLOW_SPEED + phase) % 1
    const target = t * totalM

    let seg = 0
    while (seg < cumDist.length - 2 && cumDist[seg + 1] < target) seg++

    const segLen = cumDist[seg + 1] - cumDist[seg]
    const segT = segLen > 0 ? (target - cumDist[seg]) / segLen : 0
    const lng = path[seg].lng + segT * (path[seg + 1].lng - path[seg].lng)
    const lat = path[seg].lat + segT * (path[seg + 1].lat - path[seg].lat)

    return { position: [lng, lat, ELEV + 0.5] as [number, number, number], color }
  })
}

export function makeTrafficFlowLayers(
  points: TrafficPoint[],
  roads: RoadSegment[],
  flowTime: number,
) {
  const particles: Particle[] = roads.flatMap((road, i) => particlesAlongRoad(road, i, flowTime))

  return [
    // Subtle transparent green→red overlay on roads showing foot traffic intensity
    new PathLayer<RoadSegment>({
      id: 'traffic-road-lines',
      data: roads,
      getPath: r => r.path.map(p => [p.lng, p.lat, ELEV]) as [number, number, number][],
      getColor: r => trafficColor(r.weight, Math.round(28 + r.weight * 48)),
      getWidth: r => (r.kind === 'primary' ? 5.5 : r.kind === 'secondary' ? 3.5 : 2.5),
      widthUnits: 'meters',
      widthMinPixels: 1.5,
      widthMaxPixels: 8,
      pickable: false,
    }),

    // Flowing particles moving along roads
    new ScatterplotLayer<Particle>({
      id: 'traffic-road-particles',
      data: particles,
      getPosition: p => p.position,
      getRadius: 2.5,
      radiusUnits: 'meters',
      radiusMinPixels: 2,
      radiusMaxPixels: 6,
      getFillColor: p => p.color,
      stroked: false,
      pickable: false,
    }),

    // Activity node anchors
    new ScatterplotLayer<TrafficPoint>({
      id: 'traffic-activity-nodes',
      data: points,
      getPosition: p => [p.position.lng, p.position.lat, ELEV],
      getRadius: 5,
      radiusUnits: 'meters',
      radiusMinPixels: 2,
      radiusMaxPixels: 8,
      getFillColor: p => trafficColor(p.weight, Math.round(100 + p.weight * 90)),
      stroked: false,
      pickable: false,
    }),
  ]
}
