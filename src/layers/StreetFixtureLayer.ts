import { PathLayer, ScatterplotLayer } from '@deck.gl/layers'
import type { StreetFixture, StreetFixtureKind } from '@/types'

interface Pole {
  id: string
  from: [number, number, number]
  to: [number, number, number]
  widthM: number
  color: [number, number, number, number]
}

interface LampDot {
  id: string
  position: [number, number, number]
  radiusM: number
  color: [number, number, number, number]
}

type TrafficPhase = 'red' | 'yellow' | 'green'

// 60-second cycle: 30s green → 5s yellow → 25s red
// Each fixture gets a staggered offset seeded from its OSM id.
function getTrafficPhase(fixture: StreetFixture, t: number): TrafficPhase {
  const seed = fixture.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0) % 60
  const elapsed = (t + seed) % 60
  if (elapsed < 30) return 'green'
  if (elapsed < 35) return 'yellow'
  return 'red'
}

const DIM: [number, number, number, number] = [40, 40, 42, 180]
const BULB_COLORS: Record<TrafficPhase, [number, number, number, number]> = {
  red: [225, 48, 48, 255],
  yellow: [240, 185, 40, 255],
  green: [48, 205, 100, 255],
}

function signalColor(bulb: TrafficPhase, active: TrafficPhase): [number, number, number, number] {
  return bulb === active ? BULB_COLORS[bulb] : DIM
}

const POLE_COLORS: Record<StreetFixtureKind, [number, number, number, number]> = {
  'traffic-signal': [50, 50, 55, 240],
  'bus-stop': [55, 85, 130, 225],
  'street-lamp': [62, 62, 68, 225],
  'crossing': [200, 200, 200, 0],
  'bench': [108, 78, 48, 205],
}

export function makeStreetFixtureLayers(fixtures: StreetFixture[], trafficPhaseTime: number) {
  const poles: Pole[] = []
  const lamps: LampDot[] = []
  const signalBulbs: LampDot[] = []

  for (const f of fixtures) {
    const lng = f.position.lng
    const lat = f.position.lat

    switch (f.kind) {
      case 'traffic-signal': {
        // Slender black pole
        poles.push({
          id: `${f.id}-pole`,
          from: [lng, lat, 0],
          to: [lng, lat, 4.5],
          widthM: 0.12,
          color: POLE_COLORS['traffic-signal'],
        })
        // Thicker housing box at the top of the pole
        poles.push({
          id: `${f.id}-housing`,
          from: [lng, lat, 3.65],
          to: [lng, lat, 4.5],
          widthM: 0.3,
          color: [30, 30, 32, 255],
        })
        // Three stacked lamp bulbs
        const phase = getTrafficPhase(f, trafficPhaseTime)
        signalBulbs.push(
          { id: `${f.id}-red`, position: [lng, lat, 4.35], radiusM: 0.13, color: signalColor('red', phase) },
          { id: `${f.id}-yellow`, position: [lng, lat, 4.08], radiusM: 0.13, color: signalColor('yellow', phase) },
          { id: `${f.id}-green`, position: [lng, lat, 3.81], radiusM: 0.13, color: signalColor('green', phase) },
        )
        break
      }

      case 'street-lamp': {
        poles.push({
          id: `${f.id}-pole`,
          from: [lng, lat, 0],
          to: [lng, lat, 5.5],
          widthM: 0.09,
          color: POLE_COLORS['street-lamp'],
        })
        // Warm white glow at the top
        lamps.push({
          id: `${f.id}-lamp`,
          position: [lng, lat, 5.55],
          radiusM: 0.32,
          color: [255, 230, 155, 215],
        })
        break
      }

      case 'bus-stop': {
        poles.push({
          id: `${f.id}-pole`,
          from: [lng, lat, 0],
          to: [lng, lat, 3.0],
          widthM: 0.09,
          color: POLE_COLORS['bus-stop'],
        })
        // Yellow route-flag dot at the top
        lamps.push({
          id: `${f.id}-flag`,
          position: [lng, lat, 3.15],
          radiusM: 0.38,
          color: [255, 185, 30, 230],
        })
        break
      }

      case 'crossing': {
        // Flat ground marker only — no pole
        lamps.push({
          id: `${f.id}-mark`,
          position: [lng, lat, 0.05],
          radiusM: 0.65,
          color: [240, 240, 190, 150],
        })
        break
      }

      case 'bench': {
        // Low brown stub (seat silhouette)
        poles.push({
          id: `${f.id}-seat`,
          from: [lng, lat, 0],
          to: [lng, lat, 0.48],
          widthM: 0.8,
          color: POLE_COLORS['bench'],
        })
        break
      }
    }
  }

  return [
    new PathLayer<Pole>({
      id: 'street-fixture-poles',
      data: poles,
      getPath: d => [d.from, d.to],
      getColor: d => d.color,
      getWidth: d => d.widthM,
      widthUnits: 'meters',
      widthMinPixels: 1,
      rounded: true,
      pickable: false,
    }),
    new ScatterplotLayer<LampDot>({
      id: 'street-fixture-lamps',
      data: lamps,
      getPosition: d => d.position,
      getRadius: d => d.radiusM,
      radiusUnits: 'meters',
      radiusMinPixels: 2,
      getFillColor: d => d.color,
      filled: true,
      stroked: false,
      pickable: false,
    }),
    new ScatterplotLayer<LampDot>({
      id: 'street-fixture-signal-bulbs',
      data: signalBulbs,
      getPosition: d => d.position,
      getRadius: d => d.radiusM,
      radiusUnits: 'meters',
      radiusMinPixels: 1.5,
      radiusMaxPixels: 6,
      getFillColor: d => d.color,
      filled: true,
      stroked: false,
      pickable: false,
    }),
  ]
}
