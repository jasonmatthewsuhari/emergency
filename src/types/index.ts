export interface LatLng {
  lat: number
  lng: number
}

export interface Building {
  id: string
  footprint: LatLng[]
  centroid: LatLng
  groundElevation: number
  heightM: number
  baseHeightM: number
  levels?: number
  facadeColor?: string
  roofColor?: string
  material?: string
  roofMaterial?: string
  poiCategory?: BuildingPoiCategory
  poiName?: string
  poiTags?: Record<string, string>
  sourceTags?: Record<string, string>
  status?: 'flooded' | 'at-risk' | 'safe'
}

export type BuildingPoiCategory =
  | 'restaurant'
  | 'cafe'
  | 'bar'
  | 'retail'
  | 'grocery'
  | 'hotel'
  | 'office'
  | 'school'
  | 'medical'
  | 'transit'
  | 'parking'
  | 'entertainment'
  | 'worship'
  | 'residential'
  | 'industrial'

export type VegetationKind = 'tree' | 'tree-row' | 'wood' | 'park' | 'scrub' | 'grass' | 'garden'

export type StreetFixtureKind = 'traffic-signal' | 'crossing' | 'bus-stop' | 'street-lamp' | 'bench'

export interface StreetFixture {
  id: string
  kind: StreetFixtureKind
  position: LatLng
  name?: string
  tags?: Record<string, string>
}

export interface VegetationFeature {
  id: string
  kind: VegetationKind
  geometry: 'point' | 'line' | 'polygon'
  points: LatLng[]
}

export type BillboardFormat = 'digital' | 'static' | 'poster' | 'wallscape'
export type BillboardMaterial = 'digital-day' | 'digital-night' | 'printed-vinyl'

export interface BillboardPlacement {
  id: string
  name: string
  position: LatLng
  widthM: number
  heightM: number
  clearanceM: number
  heading: number
  format: BillboardFormat
  material: BillboardMaterial
  creativeText: string
  primaryColor: string
  secondaryColor: string
  brightness: number
  weeklyReach: number
  mediaUrl?: string
}

export interface AgentCapture {
  id: string
  agentName: string
  billboardName: string
  imageUrl: string
  thought: string | null
  timestamp: number
}

export type OohMediaTypeCode = 'bb' | 'bs' | 'db' | 'ds' | 'mu' | 'sf' | 'tr' | string

export type OohMapPointTuple = [
  id: string,
  lng: number,
  lat: number,
  mediaTypeCode: OohMediaTypeCode,
  priceAmount: number,
  weeklyImpressions: number,
  visibilityScore: number,
  sourceUrlIndex: number,
]

export interface OohMapPoint {
  id: string
  position: LatLng
  mediaTypeCode: OohMediaTypeCode
  mediaTypeLabel: string
  priceAmount: number
  weeklyImpressions: number
  visibilityScore: number
  sourceUrlIndex: number
}

export interface OohMapApiResponse {
  metadata: {
    built_at: string
    total_points: number
    returned_points: number
    schema: string
    media_type_codes: Record<string, string>
    bbox: {
      west: number
      south: number
      east: number
      north: number
    } | null
    limited: boolean
  }
  source_urls?: string[]
  points: OohMapPointTuple[]
}

export interface WalkFrame {
  time: number
  root: [number, number, number]
  yaw: number
  bodyTilt: number
  headTilt: number
  leftArm: number
  rightArm: number
  leftLeg: number
  rightLeg: number
}

export interface WalkClip {
  source: string
  fps: number
  durationSeconds: number
  frames: WalkFrame[]
}

export interface PedestrianAgent {
  id: string
  name: string
  position: LatLng
  heading: number
  speedMps: number
  phaseOffsetM: number
  visual?: 'walker' | 'car'
}

export type AgentBehaviorState = 'walking' | 'idle'

export interface AgentBehavior {
  agentId: string
  state: AgentBehaviorState
  angularVel: number
  stateTimer: number
  wanderAngle: number
}

export interface TrafficPoint {
  id: string
  position: LatLng
  weight: number
  category: BuildingPoiCategory | 'transit-hub'
}

export type RoadKind = 'footway' | 'path' | 'pedestrian' | 'residential' | 'secondary' | 'primary' | 'other'

export interface RoadSegment {
  id: string
  path: LatLng[]
  kind: RoadKind
  weight: number
}

export type AgencyDemoEventStatus = 'queued' | 'running' | 'complete' | 'needs-approval' | 'error'

export interface AgencyDemoEvent {
  id: string
  phase: string
  actor: string
  title: string
  detail: string
  status: AgencyDemoEventStatus
  delayMs: number
  toolName?: string
}

export interface AgencyDemoCandidate {
  id: string
  name: string
  format: string
  sightlineScore: number
  monthlyEstimate: string
  estimatedWeeklyReach: number
}

export interface AgencyDemoProposal {
  recommendation: string
  budgetPlan: string
  nextActions: string[]
}

export interface AgencyDemoRun {
  sessionId: string
  agentId: string
  area: LatLng
  brief: string
  events: AgencyDemoEvent[]
  candidates: AgencyDemoCandidate[]
  proposal: AgencyDemoProposal
}

export type ManagedAgentEventStatus = 'queued' | 'running' | 'complete' | 'needs-approval' | 'error'

export interface ManagedAgentResources {
  agentId: string
  environmentId: string
}

export interface ManagedAgentDisplayEvent {
  id: string
  type: string
  actor: 'AI Agent' | 'Sightline App' | 'Managed Tool' | 'Session'
  title: string
  detail: string
  status: ManagedAgentEventStatus
  toolName?: string
  processedAt?: string | null
}

export interface ManagedAgencySession {
  mode: 'anthropic-managed-agents'
  sessionId: string
  agentId: string
  environmentId: string
  status: string
  area: LatLng
  brief: string
}

export interface ManagedAgencyEventsResponse {
  sessionId: string
  status: string
  events: ManagedAgentDisplayEvent[]
  rawEventCount: number
}

export interface PedestrianInterviewLine {
  role: 'interviewer' | 'pedestrian'
  text: string
}

export type PedestrianInterviewStatus = 'starting' | 'running' | 'idle' | 'error'

export interface PedestrianInterviewSession {
  sessionId: string
  sightingKey: string
  agentName: string
  billboardName: string
  startedAt: number
  status: PedestrianInterviewStatus
  transcript: PedestrianInterviewLine[]
  score?: number
  feedback?: string
  error?: string
}

export interface SceneImagePayload {
  dataUrl: string
}

export interface CapturedSceneImage {
  dataUrl: string
  capturedAt: string
}

export interface SceneResponseRequest {
  sceneImage: SceneImagePayload
  adImage?: SceneImagePayload | null
  brief?: string
  viewerProfile?: string
}

export interface SceneResponseResult {
  sceneDescription: string
  adDescription: string
  firstImpression: string
  likelyAttention: string
  likelyConfusion: string
  simpleRecommendation: string
}

export interface SceneResponseBudget {
  limitUsd: number
  spentUsd: number
  estimatedCostUsd: number
  remainingUsd: number
  inputTokens?: number
  outputTokens?: number
}

export interface SceneResponseApiResponse {
  result: SceneResponseResult
  budget: SceneResponseBudget
  model: string
}

export interface CompanyBriefIdentity {
  companyName: string
  industry: string
  description: string
  brandAdjectives: [string, string, string]
  tagline?: string
}

export interface CompanyBriefVisualSystem {
  primaryColor?: string
  secondaryColor?: string
  logoUrl?: string
  fonts?: string[]
  styleReference?: string
  avoidList?: string[]
}

export interface CompanyBriefCampaign {
  coreMessage: string
  offerOrHook?: string
  callToAction?: string
  campaignObjective?: string
}

export interface CompanyBriefAudience {
  description: string
  tone?: string
  contextWhenSeen?: string
}

export interface CompanyBrief {
  url: string
  identity: CompanyBriefIdentity
  visualSystem: CompanyBriefVisualSystem
  campaign: CompanyBriefCampaign
  audience: CompanyBriefAudience
}
