import type { LatLng, PedestrianAgent } from '@/types'
import { offsetLatLng } from './spawnAgents'

// --- constants ---

const METERS_PER_LAT_DEGREE = 110540
const METERS_PER_LNG_DEGREE = 111320

// wander steering (Reynolds 1999)
const WANDER_DISTANCE = 2.0      // meters ahead to project the wander circle
const WANDER_RADIUS = 1.4        // radius of the wander circle
const WANDER_JITTER = 55         // max degrees of angle change per second

// turning
const MAX_TURN_RATE = 100        // deg/s
const ANGULAR_DAMPING = 0.82     // how quickly turn rate settles (per-frame blend factor)

// separation (agents avoid overlapping)
const SEPARATION_RADIUS_M = 1.8  // meters — personal space radius
const SEPARATION_FORCE = 2.5     // heading correction strength for separation

// boundary soft zone starts at this fraction of total radius
const BOUNDARY_SOFT_FRACTION = 0.65
const BOUNDARY_TURN_BLEND = 0.9  // strength of boundary steering at the hard edge

// state timers (seconds)
const WALK_MIN = 5
const WALK_MAX = 14
const IDLE_MIN = 1.5
const IDLE_MAX = 4.0

// --- types ---

export type AgentBehaviorState = 'walking' | 'idle'

export interface AgentBehavior {
  agentId: string
  state: AgentBehaviorState
  angularVel: number    // current angular velocity, deg/s
  stateTimer: number    // seconds until next state transition
  wanderAngle: number   // current angle offset on the wander circle, degrees
}

// --- helpers ---

function distanceM(a: LatLng, b: LatLng): number {
  const dlat = (b.lat - a.lat) * METERS_PER_LAT_DEGREE
  const dlng = (b.lng - a.lng) * METERS_PER_LNG_DEGREE * Math.cos(a.lat * Math.PI / 180)
  return Math.sqrt(dlat * dlat + dlng * dlng)
}

function bearingBetween(from: LatLng, to: LatLng): number {
  const dlat = (to.lat - from.lat) * METERS_PER_LAT_DEGREE
  const dlng = (to.lng - from.lng) * METERS_PER_LNG_DEGREE * Math.cos(from.lat * Math.PI / 180)
  return ((Math.atan2(dlng, dlat) * 180 / Math.PI) + 360) % 360
}

// signed angle from a to b in [-180, 180]
function angleDiff(a: number, b: number): number {
  return ((b - a + 540) % 360) - 180
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

// --- public API ---

export function createBehavior(agentId: string): AgentBehavior {
  return {
    agentId,
    state: 'walking',
    angularVel: 0,
    stateTimer: WALK_MIN + Math.random() * (WALK_MAX - WALK_MIN),
    wanderAngle: Math.random() * 360,
  }
}

export function createBehaviors(agents: PedestrianAgent[]): AgentBehavior[] {
  return agents.map(a => createBehavior(a.id))
}

/**
 * Advance all agents by dt seconds. Mutates neither input array; returns new arrays.
 *
 * @param boundaryCenter  optional soft boundary — agents steer back toward center near the edge
 * @param boundaryRadiusM radius of that boundary
 */
export function tickAgents(
  agents: PedestrianAgent[],
  behaviors: AgentBehavior[],
  dt: number,
  boundaryCenter?: LatLng,
  boundaryRadiusM?: number,
): { agents: PedestrianAgent[]; behaviors: AgentBehavior[] } {
  const nextAgents = agents.map(a => ({ ...a }))
  const nextBehaviors = behaviors.map(b => ({ ...b }))

  for (let i = 0; i < nextAgents.length; i++) {
    const agent = nextAgents[i]
    const beh = nextBehaviors[i]
    if (!beh) continue

    beh.stateTimer -= dt

    // --- idle state: stand still, then pick a new heading and resume ---
    if (beh.state === 'idle') {
      if (beh.stateTimer <= 0) {
        beh.state = 'walking'
        beh.stateTimer = WALK_MIN + Math.random() * (WALK_MAX - WALK_MIN)
        // resume in a loosely random direction
        agent.heading = (agent.heading + (Math.random() - 0.5) * 160 + 360) % 360
      }
      continue
    }

    // --- walking state ---

    if (beh.stateTimer <= 0) {
      beh.state = 'idle'
      beh.stateTimer = IDLE_MIN + Math.random() * (IDLE_MAX - IDLE_MIN)
      beh.angularVel = 0
      continue
    }

    // Reynolds wander: jitter the angle on a circle projected ahead of the agent
    beh.wanderAngle += (Math.random() - 0.5) * WANDER_JITTER * dt

    const headingRad = agent.heading * Math.PI / 180
    const wanderRad = (agent.heading + beh.wanderAngle) * Math.PI / 180

    // wander target: center of circle + offset point on the circle rim
    const targetEast = Math.sin(headingRad) * WANDER_DISTANCE + Math.sin(wanderRad) * WANDER_RADIUS
    const targetNorth = Math.cos(headingRad) * WANDER_DISTANCE + Math.cos(wanderRad) * WANDER_RADIUS
    let desiredHeading = ((Math.atan2(targetEast, targetNorth) * 180 / Math.PI) + 360) % 360

    // boundary repulsion: steer back toward center when approaching the edge
    if (boundaryCenter && boundaryRadiusM) {
      const d = distanceM(agent.position, boundaryCenter)
      const softEdge = boundaryRadiusM * BOUNDARY_SOFT_FRACTION
      if (d > softEdge) {
        const toCenter = bearingBetween(agent.position, boundaryCenter)
        const blend = clamp((d - softEdge) / (boundaryRadiusM - softEdge), 0, 1)
        desiredHeading += angleDiff(desiredHeading, toCenter) * blend * BOUNDARY_TURN_BLEND
      }
    }

    // separation: steer away from agents inside personal-space radius
    for (let j = 0; j < nextAgents.length; j++) {
      if (j === i) continue
      const other = nextAgents[j]
      const d = distanceM(agent.position, other.position)
      if (d < SEPARATION_RADIUS_M && d > 0.01) {
        const away = bearingBetween(other.position, agent.position)
        const urgency = (SEPARATION_RADIUS_M - d) / SEPARATION_RADIUS_M
        desiredHeading += angleDiff(desiredHeading, away) * urgency * SEPARATION_FORCE
      }
    }

    // angular spring: smoothly steer toward desiredHeading
    const headingError = angleDiff(agent.heading, desiredHeading)
    const angularForce = clamp(headingError * 3.0, -MAX_TURN_RATE, MAX_TURN_RATE)
    beh.angularVel = beh.angularVel * ANGULAR_DAMPING + angularForce * (1 - ANGULAR_DAMPING)
    beh.angularVel = clamp(beh.angularVel, -MAX_TURN_RATE, MAX_TURN_RATE)

    agent.heading = ((agent.heading + beh.angularVel * dt) + 360) % 360

    // move forward
    const moveRad = agent.heading * Math.PI / 180
    agent.position = offsetLatLng(
      agent.position,
      Math.sin(moveRad) * agent.speedMps * dt,
      Math.cos(moveRad) * agent.speedMps * dt,
    )
  }

  return { agents: nextAgents, behaviors: nextBehaviors }
}
