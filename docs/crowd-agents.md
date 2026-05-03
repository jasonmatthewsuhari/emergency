# Crowd Agent Rendering

Sightline renders pedestrian agents as animated stick figures on the map. This document is the authoritative spec for how agents should be spawned and rendered. Follow it exactly when adding agents to any map view.

## TL;DR for coding agents

- **Spawning a crowd:** call `spawnAgentsInRadius(center, radiusM, count)` from `src/lib/spawnAgents.ts`
- **Rendering a crowd:** use `<CrowdLayer>` from `src/components/CrowdLayer.tsx`, not `makePedestrianAgentLayers`
- **Legacy path:** `makePedestrianAgentLayers` is only for ≤ 5 named/labeled agents (e.g. a single tracked pedestrian). Never call it with a large array.

---

## Data model

`PedestrianAgent` (defined in `src/types/index.ts`) is the canonical agent type. Do not extend it without updating this spec.

```typescript
interface PedestrianAgent {
  id: string           // stable unique ID
  name: string         // display label (shown only for named agents)
  position: LatLng     // world anchor — does not move, agents loop around it
  heading: number      // compass bearing in degrees (0 = north)
  speedMps: number     // 1.0–1.8 m/s for normal walking
  phaseOffsetM: number // offset into the walk cycle in meters (0–LOOP_LENGTH_M)
}
```

`WalkClip` / `WalkFrame` (also in `src/types/index.ts`) come from `/public/generated/ai4animation-low-poly-guy.json` at runtime. Load this once and cache it; never re-fetch it per agent.

---

## Spawning agents: `spawnAgentsInRadius`

**File:** `src/lib/spawnAgents.ts`

```typescript
export function spawnAgentsInRadius(
  center: LatLng,
  radiusM: number,
  count: number,
): PedestrianAgent[]
```

Implementation rules:
- Use `r = radiusM * Math.sqrt(Math.random())` and a random angle for **uniform** distribution in the circle (not just random r — that clusters at the center).
- Random `heading`: 0–360
- Random `speedMps`: `1.0 + Math.random() * 0.8` (1.0–1.8 m/s)
- Random `phaseOffsetM`: `Math.random() * LOOP_LENGTH_M` where `LOOP_LENGTH_M = 14`
- Name format: `Pedestrian ${String(i + 1).padStart(3, '0')}` (e.g. `Pedestrian 001`)

`offsetLatLng` from `src/layers/PedestrianAgentLayer.ts` converts (eastM, northM) to LatLng — import and reuse it, or move it to a shared lib.

---

## Rendering: `CrowdLayer` component

**File:** `src/components/CrowdLayer.tsx`

This is a React component that renders a `<canvas>` overlaid on the Deck.gl map canvas using Three.js `InstancedMesh`. It is the **only** correct way to render more than 5 agents.

### Props

```typescript
interface CrowdLayerProps {
  agents: PedestrianAgent[]
  walkClip: WalkClip
  deckRef: React.RefObject<DeckGL>
  elapsedSeconds: number
  maxAgents?: number            // default 2000; pre-allocated instance count
}
```

### Canvas setup

- Position `absolute`, `top: 0 / left: 0 / width: 100% / height: 100%`, `pointerEvents: 'none'`
- `THREE.WebGLRenderer` with `antialias: false`, `alpha: true` (transparent background so the map shows through), `powerPreference: 'low-power'`
- **No shadows** — `renderer.shadowMap.enabled = false`

### Geometry (7 InstancedMesh objects)

Pre-allocate at mount with `count = maxAgents`. All materials use `MeshBasicMaterial` (no lighting needed, saves GPU):

| Mesh | Geometry | Color |
|------|----------|-------|
| `shadow` | `CircleGeometry(0.72, 8)` | `0x080c12` at 40% opacity |
| `head` | `SphereGeometry(0.28, 6, 4)` | `0xffc994` (skin) |
| `torso` | `CylinderGeometry(0.26, 0.26, 0.82, 5)` | `0x3091ff` (shirt) |
| `leftArm` | `CylinderGeometry(0.085, 0.085, 0.5, 4)` | `0x3091ff` (shirt) |
| `rightArm` | `CylinderGeometry(0.085, 0.085, 0.5, 4)` | `0x3091ff` (shirt) |
| `leftLeg` | `CylinderGeometry(0.1, 0.1, 0.9, 4)` | `0x050505` (pants) |
| `rightLeg` | `CylinderGeometry(0.1, 0.1, 0.9, 4)` | `0x050505` (pants) |

Agents beyond `agents.length` should be hidden by scaling their matrix to 0 (call `dummy.scale.setScalar(0); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix)` for inactive slots).

### Camera sync

Each animation frame, read the Deck.gl viewport and copy its matrices directly into the Three.js camera. Do not let Three.js manage the camera independently.

```typescript
const viewports = deckRef.current?.getViewports()
if (!viewports?.[0]) return
const vp = viewports[0]

camera.matrixAutoUpdate = false
camera.matrixWorldInverse.fromArray(vp.viewMatrix)
camera.matrixWorld.copy(camera.matrixWorldInverse).invert()
camera.projectionMatrix.fromArray(vp.projectionMatrix)
camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert()
```

### Coordinate conversion

Deck.gl's `viewport.projectPosition([lng, lat, altMeters])` converts a world lat/lng/alt into the same coordinate space the view matrix expects. Use this for every agent position — do not roll your own Mercator projection.

```typescript
// Body part positions follow the same offsets as buildAgentGeometry in PedestrianAgentLayer.ts
// but expressed in meters relative to the agent's world anchor, then projected via viewport.
const [wx, wy, wz] = vp.projectPosition([agent.position.lng, agent.position.lat, altM])
```

### Per-frame update loop

```
for each agent i:
  1. frameIdx = floor((elapsedSeconds * agent.speedMps + agent.phaseOffsetM) / walkClip.durationSeconds
       * walkClip.frames.length) % walkClip.frames.length
  2. frame = walkClip.frames[frameIdx]
  3. loopOffset = ((elapsedSeconds * agent.speedMps + agent.phaseOffsetM) % LOOP_LENGTH_M) - LOOP_LENGTH_M / 2
  4. forward direction = bearingVector(agent.heading)
  5. For each body part, compute altM from frame data (same constants as buildAgentGeometry),
     project via viewport.projectPosition, set dummy position/rotation/scale, call setMatrixAt(i, dummy.matrix)

instancedMesh.instanceMatrix.needsUpdate = true  // once per mesh per frame, after the loop
```

The exact per-body-part offsets and animation math already exist in `PedestrianAgentLayer.ts:buildAgentGeometry` — port them directly rather than re-deriving.

### Body part transform details

All body part positions are derived from the `WalkFrame` exactly as in `buildAgentGeometry`. The cylinder meshes need an additional rotation to orient along the bone direction (cylinders are Y-axis by default; use `Matrix4.lookAt` or `Quaternion.setFromUnitVectors` to orient from joint-start to joint-end).

---

## Usage in MapCanvas

```tsx
// state
const [agents, setAgents] = useState<PedestrianAgent[]>([])

// deck.gl layers — only for named agents (≤5)
const namedAgents = agents.filter(a => a.name.startsWith('named:'))
const deckLayers = [
  ...makePedestrianAgentLayers(namedAgents, currentWalkFrame, elapsedSeconds),
  // ...other layers
]

// crowd overlay — for everyone else
<CrowdLayer
  agents={agents}
  walkClip={walkClip}
  deckRef={deckRef}
  elapsedSeconds={elapsedSeconds}
/>
```

---

## What NOT to do

- **Do not** call `makePedestrianAgentLayers` with more than ~5 agents. It creates 10 new JS objects per agent per frame, causing GC churn that degrades framerates regardless of GPU.
- **Do not** enable `renderer.shadowMap` in `CrowdLayer`. Shadows on 2000 instances kill low-end laptops.
- **Do not** use `MeshStandardMaterial` or `MeshPhongMaterial` in CrowdLayer — they require lighting passes. `MeshBasicMaterial` is correct and cheaper.
- **Do not** allocate new `Matrix4` / `Vector3` / `Euler` objects inside the per-frame loop. Declare a `dummy = new THREE.Object3D()` once at component mount and reuse it.
- **Do not** create a separate `WalkClip` fetch inside `CrowdLayer`. Receive it as a prop from the parent that already loaded it.

---

## Performance targets

On a mid-2018 laptop (integrated graphics):

| Agent count | Target FPS |
|------------|------------|
| 100 | 60 |
| 500 | 60 |
| 2000 | 30+ |

If 2000 agents drops below 30 FPS, the first thing to try is reducing polygon count on the cylinder geometry (use 4-sided cylinders instead of 6).
