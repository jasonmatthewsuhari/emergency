'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import DeckGL from '@deck.gl/react'
import type { DeckGLRef } from '@deck.gl/react'
import type { PickingInfo } from '@deck.gl/core'
import { PathLayer, ScatterplotLayer } from '@deck.gl/layers'
import { Map as MapboxMap } from 'react-map-gl/mapbox'
import type { MapRef } from 'react-map-gl/mapbox'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import AgencyDemoPanel from '@/components/AgencyDemoPanel'
import AreaConfirmDialog from '@/components/AreaConfirmDialog'
import BillboardStudioPanel from '@/components/BillboardStudioPanel'
import DashboardOverlay from '@/components/DashboardOverlay'
import MapLoadingScreen from '@/components/MapLoadingScreen'
import MapToolbar, { type MapTool } from '@/components/MapToolbar'
import StreetViewPanel from '@/components/StreetViewPanel'
import StreetViewCursor from '@/components/StreetViewCursor'
import { makeBuildingLayers } from '@/layers/BuildingLayer'
import { makeBillboardLayers } from '@/layers/BillboardLayer'
import { makeOohInventoryLayers } from '@/layers/OohInventoryLayer'
import { makeSelectionLayer } from '@/layers/SelectionLayer'
import CrowdLayer from '@/components/CrowdLayer'
import BillboardMeshLayer from '@/components/BillboardMeshLayer'
import { makeStreetFixtureLayers } from '@/layers/StreetFixtureLayer'
import { makeTrafficFlowLayers } from '@/layers/TrafficFlowLayer'
import { makeCircleCoords, haversineKm } from '@/lib/geoUtils'
import { fetchTrafficDensity, fetchRoads } from '@/lib/overpass'
import { spawnAgentsInRadius, spawnAgentsFromTraffic } from '@/lib/spawnAgents'
import { createBehaviors, tickAgents } from '@/lib/agentBehaviors'
import type {
  AgentBehavior,
  AgentCapture,
  Building,
  BillboardPlacement,
  CapturedSceneImage,
  LatLng,
  OohMapApiResponse,
  OohMapPoint,
  OohMapPointTuple,
  PedestrianAgent,
  PedestrianInterviewSession,
  SceneResponseApiResponse,
  RoadSegment,
  StreetFixture,
  TrafficPoint,
  WalkClip,
} from '@/types'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
const SELECTION_RADIUS_KM = 1
const WALK_DATA_URL = '/generated/ai4animation-low-poly-guy.json'
const OOH_POINT_LIMIT = 6000

const INITIAL_VIEW_STATE = {
  longitude: -118.2437,
  latitude: 34.0551,
  zoom: 15.35,
  pitch: 68,
  bearing: -28,
}

const FALLBACK_AREA = {
  lat: INITIAL_VIEW_STATE.latitude,
  lng: INITIAL_VIEW_STATE.longitude,
}

const INITIAL_BILLBOARDS: BillboardPlacement[] = [
]

// --- Billboard sighting detection ---

const SIGHTING_LAT_SCALE = 110540
const SIGHTING_LNG_SCALE = 111320
const SIGHTING_COOLDOWN_MS = 25000  // ms before same agent-billboard pair can trigger again
const SIGHTING_DISPLAY_MS = 4500    // ms toast stays visible

interface BillboardSighting {
  id: string
  agentId: string
  agentName: string
  billboardName: string
  agentPosition: LatLng
  billboardPosition: LatLng
  timestamp: number
}

// SVG path data for each demographic icon (20×26 viewBox, filled #121212 on colored bg)
const DEMOGRAPHIC_DEFS = [
  {
    label: 'Commuter',
    color: '#F0C020',
    // circle head + upright rectangle body
    icon: <>
      <circle cx="10" cy="5" r="4" />
      <rect x="7" y="11" width="6" height="11" />
      <rect x="5" y="15" width="4" height="8" transform="rotate(-15 5 15)" />
      <rect x="11" y="15" width="4" height="8" transform="rotate(15 15 15)" />
    </>,
  },
  {
    label: 'Professional',
    color: '#4991FF',
    // circle head + body + small briefcase bottom
    icon: <>
      <circle cx="10" cy="5" r="4" />
      <rect x="7" y="11" width="6" height="9" />
      <rect x="5" y="15" width="4" height="7" transform="rotate(-12 5 15)" />
      <rect x="11" y="15" width="4" height="7" transform="rotate(12 15 15)" />
      <rect x="6" y="21" width="8" height="5" rx="1" />
      <rect x="8" y="20" width="4" height="2" />
    </>,
  },
  {
    label: 'Student',
    color: '#56B4E9',
    // circle head + body + backpack rectangle behind
    icon: <>
      <circle cx="9" cy="5" r="4" />
      <rect x="6" y="11" width="6" height="10" />
      <rect x="4" y="14" width="4" height="7" transform="rotate(-12 4 14)" />
      <rect x="10" y="14" width="4" height="7" transform="rotate(12 14 14)" />
      <rect x="13" y="9" width="5" height="9" rx="1" />
    </>,
  },
  {
    label: 'Senior',
    color: '#D02020',
    // slightly shorter head, hunched body, cane line
    icon: <>
      <circle cx="10" cy="5" r="3.5" />
      <rect x="7.5" y="10" width="5" height="9" transform="rotate(5 10 14)" />
      <rect x="5" y="14" width="4" height="6" transform="rotate(-20 5 14)" />
      <rect x="11" y="14" width="4" height="6" transform="rotate(8 15 14)" />
      <line x1="15" y1="14" x2="18" y2="25" strokeWidth="2" stroke="#121212" />
    </>,
  },
  {
    label: 'Tourist',
    color: '#009E73',
    // circle head + body + camera rect on chest
    icon: <>
      <circle cx="10" cy="5" r="4" />
      <rect x="7" y="11" width="6" height="10" />
      <rect x="5" y="15" width="4" height="7" transform="rotate(-12 5 15)" />
      <rect x="11" y="15" width="4" height="7" transform="rotate(12 15 15)" />
      <rect x="6.5" y="12" width="7" height="5" rx="1" />
      <circle cx="10" cy="14.5" r="1.5" fill="#F0F0F0" />
    </>,
  },
]

function detectBillboardSightings(
  agents: PedestrianAgent[],
  billboards: BillboardPlacement[],
  activeCooldowns: Set<string>,
): Array<{ agentId: string; agentName: string; billboardId: string; billboardName: string }> {
  const results: Array<{ agentId: string; agentName: string; billboardId: string; billboardName: string }> = []

  for (const agent of agents) {
    const lngScale = SIGHTING_LNG_SCALE * Math.cos(agent.position.lat * Math.PI / 180)
    for (const billboard of billboards) {
      const pairKey = `${agent.id}:${billboard.id}`
      if (activeCooldowns.has(pairKey)) continue

      const dx = (billboard.position.lng - agent.position.lng) * lngScale  // East, meters
      const dy = (billboard.position.lat - agent.position.lat) * SIGHTING_LAT_SCALE  // North, meters
      const distM = Math.sqrt(dx * dx + dy * dy)

      // Visibility range scales with billboard width (larger boards visible from further)
      const maxRangeM = Math.min(Math.max(billboard.widthM * 5, 50), 90)
      if (distM > maxRangeM) continue

      // Compass bearing from agent to billboard (0=North, clockwise), matches agent heading convention
      const bearingToBoard = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360

      // Billboard must be within agent's forward FOV (±60°)
      let agentAngleDiff = Math.abs(bearingToBoard - agent.heading)
      if (agentAngleDiff > 180) agentAngleDiff = 360 - agentAngleDiff
      if (agentAngleDiff > 60) continue

      // Agent must be on the front face of the billboard (within ±90° of billboard's facing direction)
      const bearingFromBoard = (bearingToBoard + 180) % 360
      let boardAngleDiff = Math.abs(bearingFromBoard - billboard.heading)
      if (boardAngleDiff > 180) boardAngleDiff = 360 - boardAngleDiff
      if (boardAngleDiff > 90) continue

      results.push({ agentId: agent.id, agentName: agent.name, billboardId: billboard.id, billboardName: billboard.name })
    }
  }

  return results
}

const STANDARD_STYLE_CONFIG: Array<[string, unknown]> = [
  ['show3dObjects', true],
  ['show3dLandmarks', true],
  ['show3dTrees', true],
  ['showPointOfInterestLabels', false],
  ['showPointOfInterestIcons', false],
  ['densityPointOfInterestLabels', 0],
  ['lightPreset', 'day'],
  ['colorBuildings', '#d8d1c3'],
  ['colorLand', '#ece9df'],
  ['colorRoads', '#f8f4ea'],
  ['colorWater', '#6fa8c8'],
]

function applyStandardStyleConfig(map: mapboxgl.Map, useCustomBuildings: boolean) {
  for (const [property, value] of STANDARD_STYLE_CONFIG) {
    try {
      map.setConfigProperty('basemap', property, value)
    } catch {
      // Some Mapbox Standard config options depend on the active GL/style version.
    }
  }
  // Belt-and-suspenders: hide any POI symbol layers directly (Standard style
  // separates icon layers from label layers in some versions).
  const ROAD_SOURCES = new Set(['road', 'road_label', 'motorway_label', 'road-label', 'street_label', 'ferry'])
  try {
    for (const layer of map.getStyle()?.layers ?? []) {
      if (layer.type !== 'symbol') continue
      const src = (layer as mapboxgl.SymbolLayer)['source-layer'] ?? ''
      const id = layer.id
      const isRoadLabel = ROAD_SOURCES.has(src) || src.startsWith('road') || id.startsWith('road') || id.includes('road-label') || id.includes('motorway')
      if (!isRoadLabel) {
        map.setLayoutProperty(id, 'visibility', 'none')
      }
    }
  } catch {
    // Standard style may restrict direct layer access; config path above is sufficient.
  }

  for (const [property, value] of [
    ['show3dBuildings', !useCustomBuildings],
    ['show3dFacades', !useCustomBuildings],
  ] as Array<[string, unknown]>) {
    try {
      map.setConfigProperty('basemap', property, value)
    } catch {
      // Keep the map usable if a style version does not expose this option.
    }
  }
}

function getMapBbox(map: mapboxgl.Map) {
  const bounds = map.getBounds()
  if (!bounds) return null

  return [
    bounds.getWest(),
    bounds.getSouth(),
    bounds.getEast(),
    bounds.getNorth(),
  ].map(value => value.toFixed(6)).join(',')
}

function formatMediaTypeName(value: string) {
  return value
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function getMediaTypeLabels(mediaTypeCodes: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(mediaTypeCodes).map(([label, code]) => [code, formatMediaTypeName(label)])
  )
}

function toOohMapPoint(point: OohMapPointTuple, mediaTypeLabels: Record<string, string>): OohMapPoint {
  const [id, lng, lat, mediaTypeCode, priceAmount, weeklyImpressions, visibilityScore, sourceUrlIndex] = point
  return {
    id,
    position: { lat, lng },
    mediaTypeCode,
    mediaTypeLabel: mediaTypeLabels[mediaTypeCode] ?? mediaTypeCode.toUpperCase(),
    priceAmount,
    weeklyImpressions,
    visibilityScore,
    sourceUrlIndex,
  }
}

function generateSyntheticTraffic(center: LatLng, radiusKm: number): TrafficPoint[] {
  const points: TrafficPoint[] = []
  const categories: Array<TrafficPoint['category']> = ['restaurant', 'retail', 'transit', 'cafe', 'office', 'transit-hub']
  const weights = [0.8, 0.6, 0.9, 0.75, 0.5, 1.0]
  const lngScale = Math.cos((center.lat * Math.PI) / 180)
  const seed = (center.lat * 1000 + center.lng * 1000) | 0

  let n = seed
  const rand = () => { n = (n * 1664525 + 1013904223) & 0xffffffff; return (n >>> 0) / 0xffffffff }

  for (let i = 0; i < 60; i++) {
    const angle = rand() * Math.PI * 2
    const dist = rand() * radiusKm * 0.9
    const lat = center.lat + (dist / 110.574) * Math.sin(angle)
    const lng = center.lng + (dist / (111.32 * lngScale)) * Math.cos(angle)
    const ci = i % categories.length
    points.push({
      id: `syn-${i}`,
      position: { lat, lng },
      weight: weights[ci] * (0.7 + rand() * 0.3),
      category: categories[ci],
    })
  }

  return points
}

function generateSyntheticRoads(center: LatLng, radiusKm: number): RoadSegment[] {
  const lngScale = Math.cos((center.lat * Math.PI) / 180)
  const latDeg = radiusKm / 110.574
  const lngDeg = radiusKm / (111.32 * lngScale)
  const roads: RoadSegment[] = []
  for (let i = -3; i <= 3; i++) {
    const lat = center.lat + i * (latDeg / 3.5)
    roads.push({ id: `syn-h-${i}`, path: [{ lat, lng: center.lng - lngDeg }, { lat, lng: center.lng + lngDeg }], kind: i === 0 ? 'primary' : 'residential', weight: i === 0 ? 0.9 : 0.6 })
  }
  for (let i = -3; i <= 3; i++) {
    const lng = center.lng + i * (lngDeg / 3.5)
    roads.push({ id: `syn-v-${i}`, path: [{ lat: center.lat - latDeg, lng }, { lat: center.lat + latDeg, lng }], kind: i === 0 ? 'primary' : 'residential', weight: i === 0 ? 0.9 : 0.6 })
  }
  return roads
}

function isOohMapPoint(value: unknown): value is OohMapPoint {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'mediaTypeCode' in value &&
    'weeklyImpressions' in value &&
    'visibilityScore' in value
  )
}

export default function MapCanvas({ focusArea, countryIso }: { focusArea?: { lat: number; lng: number } | null; countryIso?: string | null } = {}) {
  const [mapStyleReady, setMapStyleReady] = useState(false)
  const [walkClipReady, setWalkClipReady] = useState(false)
  const [oohDataReady, setOohDataReady] = useState(false)
  const [buildingsDataReady, setBuildingsDataReady] = useState(false)
  const [fixturesDataReady, setFixturesDataReady] = useState(false)
  const [activeTool, setActiveTool] = useState<MapTool>(null)
  const [mapInstance, setMapInstance] = useState<mapboxgl.Map | null>(null)
  const [selectedArea, setSelectedArea] = useState<LatLng | null>(null)
  const [pendingArea, setPendingArea] = useState<LatLng | null>(null)
  const [isSelectionLocked, setIsSelectionLocked] = useState(false)
  const [oohBbox, setOohBbox] = useState<string | null>(null)
  const [oohPoints, setOohPoints] = useState<OohMapPoint[]>([])
  const [oohSourceUrls, setOohSourceUrls] = useState<string[]>([])
  const [oohTotalPoints, setOohTotalPoints] = useState(0)
  const [oohStatus, setOohStatus] = useState('Loading OOH inventory...')
  const [selectedOohPointId, setSelectedOohPointId] = useState<string | null>(null)
  const [buildings, setBuildings] = useState<Building[]>([])
  const [buildingStatus, setBuildingStatus] = useState('Loading editable building context...')
  const [useCustomBuildings, setUseCustomBuildings] = useState(false)
  const [billboards, setBillboards] = useState<BillboardPlacement[]>(INITIAL_BILLBOARDS)
  const [selectedBillboardId, setSelectedBillboardId] = useState<string | null>(INITIAL_BILLBOARDS[0]?.id ?? null)
  const [activeBillboardTool, setActiveBillboardTool] = useState<'select' | 'place'>('select')
  const [sceneCapture, setSceneCapture] = useState<CapturedSceneImage | null>(null)
  const [captureStatus, setCaptureStatus] = useState('No scene captured yet.')
  const [quickResponse, setQuickResponse] = useState<SceneResponseApiResponse | null>(null)
  const [quickResponseError, setQuickResponseError] = useState<string | null>(null)
  const [isQuickAnalyzing, setIsQuickAnalyzing] = useState(false)
  const [walkClip, setWalkClip] = useState<WalkClip | null>(null)
  const [walkStatus, setWalkStatus] = useState('Loading AI4AnimationPy walk clip...')
  const [animationTime, setAnimationTime] = useState(0)
  const agentsRef = useRef<PedestrianAgent[]>([])
  const behaviorsRef = useRef<AgentBehavior[]>([])
  const billboardsRef = useRef<BillboardPlacement[]>(INITIAL_BILLBOARDS)
  const sightingCooldownRef = useRef<Record<string, number>>({})
  const [sightingNotifications, setSightingNotifications] = useState<BillboardSighting[]>([])
  const pendingInterviewsRef = useRef<Array<{ agentId: string; agentName: string; billboardId: string; billboardName: string }>>([])
  const activeInterviewsRef = useRef<Map<string, PedestrianInterviewSession>>(new Map())
  const [interviewSessions, setInterviewSessions] = useState<PedestrianInterviewSession[]>([])
  const [agentCaptures, setAgentCaptures] = useState<AgentCapture[]>([])
  const [streetFixtures, setStreetFixtures] = useState<StreetFixture[]>([])
  const [trafficPoints, setTrafficPoints] = useState<TrafficPoint[]>([])
  const [roads, setRoads] = useState<RoadSegment[]>([])
  const [trafficStatus, setTrafficStatus] = useState('Select an area to see traffic flow.')
  const [flowTime, setFlowTime] = useState(0)
  const [streetFixtureStatus, setStreetFixtureStatus] = useState('Loading street fixtures...')
  const [trafficPhaseTime, setTrafficPhaseTime] = useState(() => Math.floor(Date.now() / 1000))
  const [streetViewLocation, setStreetViewLocation] = useState<LatLng | null>(null)
  const [streetViewHover, setStreetViewHover] = useState<{ x: number; y: number } | null>(null)
  const [fps, setFps] = useState(0)

  const contextArea = selectedArea ?? FALLBACK_AREA
  const selectedBillboard = billboards.find(billboard => billboard.id === selectedBillboardId) ?? null

  const loadingProgress = useMemo(() => {
    let p = 0
    if (mapStyleReady)      p += 40
    if (walkClipReady)      p += 10
    if (oohDataReady)       p += 20
    if (buildingsDataReady) p += 15
    if (fixturesDataReady)  p += 7
    return p
  }, [mapStyleReady, walkClipReady, oohDataReady, buildingsDataReady, fixturesDataReady])

  const loadingLabel = !mapStyleReady        ? 'LOADING 3D SCENE'
    : !oohDataReady                          ? 'FETCHING OOH INVENTORY'
    : !buildingsDataReady                    ? 'LOADING BUILDINGS'
    : !fixturesDataReady                     ? 'MAPPING FIXTURES'
    : !walkClipReady                         ? 'LOADING ANIMATION'
    : 'FINALIZING'
  const selectedOohPoint = selectedOohPointId
    ? oohPoints.find(point => point.id === selectedOohPointId) ?? null
    : null
  const currentWalkFrame = walkClip?.frames.length
    ? walkClip.frames[Math.floor((animationTime * walkClip.fps) % walkClip.frames.length)]
    : null

  const pendingAreaOohCount = useMemo(() => {
    if (!pendingArea) return 0
    return oohPoints.filter(p => haversineKm(pendingArea, p.position) <= SELECTION_RADIUS_KM).length
  }, [pendingArea, oohPoints])

  const deckRef = useRef<DeckGLRef | null>(null)
  const mapRef = useRef<MapRef | null>(null)
  const configuredMapRef = useRef<mapboxgl.Map | null>(null)
  const contextAreaRef = useRef(contextArea)
  useEffect(() => { contextAreaRef.current = contextArea }, [contextArea])

  const layers = useMemo(
    () => {
      const base = [
        ...(useCustomBuildings ? makeBuildingLayers(buildings) : []),
        ...(selectedArea ? makeTrafficFlowLayers(trafficPoints, roads, flowTime) : []),
        ...makeStreetFixtureLayers(streetFixtures, trafficPhaseTime),
        ...makeBillboardLayers(billboards, selectedBillboardId, setSelectedBillboardId),
        ...(pendingArea ?? selectedArea ? [makeSelectionLayer((pendingArea ?? selectedArea)!, SELECTION_RADIUS_KM)] : []),
      ]

      // Sighting highlight: animated beam + agent ring + billboard ring
      if (sightingNotifications.length > 0) {
        const pulse = 0.5 + 0.5 * Math.sin(animationTime * 5)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sl = base as any[]
        sl.push(
          new PathLayer<BillboardSighting>({
            id: 'sighting-beams',
            data: sightingNotifications,
            getPath: (n) => [
              [n.agentPosition.lng, n.agentPosition.lat, 0],
              [n.billboardPosition.lng, n.billboardPosition.lat, 0],
            ],
            getColor: () => [73, 145, 255, Math.round(100 + 120 * pulse)],
            getWidth: 2,
            widthUnits: 'pixels',
          }),
          new ScatterplotLayer<BillboardSighting>({
            id: 'sighting-agent-rings',
            data: sightingNotifications,
            getPosition: (n) => [n.agentPosition.lng, n.agentPosition.lat, 0],
            getRadius: 3 + 2 * pulse,
            radiusUnits: 'meters',
            getFillColor: [0, 0, 0, 0],
            getLineColor: () => [73, 145, 255, Math.round(180 + 75 * pulse)],
            stroked: true,
            filled: false,
            getLineWidth: 2,
            lineWidthUnits: 'pixels',
          }),
          new ScatterplotLayer<BillboardSighting>({
            id: 'sighting-billboard-rings',
            data: sightingNotifications,
            getPosition: (n) => [n.billboardPosition.lng, n.billboardPosition.lat, 0],
            getRadius: 5 + 3 * pulse,
            radiusUnits: 'meters',
            getFillColor: () => [73, 145, 255, Math.round(30 + 40 * pulse)],
            getLineColor: () => [73, 200, 255, Math.round(200 + 55 * pulse)],
            stroked: true,
            filled: true,
            getLineWidth: 2,
            lineWidthUnits: 'pixels',
          }),
        )
      }

      // When a country ISO is set the Mapbox country layer handles masking — skip the Deck.gl circle mask
      if (!focusArea || countryIso) return base

      const center: [number, number] = [focusArea.lng, focusArea.lat]
      const ring = new PathLayer({
        id: 'focus-ring',
        data: [{ path: makeCircleCoords(center, 2) }],
        getPath: (d: { path: [number, number][] }) => d.path,
        getColor: [208, 32, 32, 220],
        getWidth: 3,
        widthUnits: 'pixels',
      })

      return [...base, ring]
    },
    [
      animationTime,
      billboards,
      buildings,
      countryIso,
      focusArea,
      oohPoints,
      pendingArea,
      selectedArea,
      selectedBillboardId,
      selectedOohPointId,
      sightingNotifications,
      streetFixtures,
      trafficPhaseTime,
      trafficPoints,
      roads,
      flowTime,
      useCustomBuildings,
    ]
  )

  useEffect(() => {
    let cancelled = false

    fetch(WALK_DATA_URL)
      .then(async res => {
        if (!res.ok) throw new Error(`Walk clip failed with status ${res.status}`)
        return await res.json() as WalkClip
      })
      .then(clip => {
        if (cancelled) return
        setWalkClip(clip)
        setWalkClipReady(true)
        setWalkStatus(`${clip.frames.length} AI4AnimationPy frames ready`)
      })
      .catch(error => {
        if (cancelled) return
        setWalkClip(null)
        setWalkClipReady(true)
        setWalkStatus(error instanceof Error ? error.message : 'Walk clip unavailable')
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let animationFrame = 0
    let prevTime = performance.now()
    const startedAt = prevTime

    const tick = () => {
      const now = performance.now()
      const dt = Math.min((now - prevTime) / 1000, 0.05)
      prevTime = now

      if (agentsRef.current.length > 0) {
        const center = contextAreaRef.current
        const result = tickAgents(agentsRef.current, behaviorsRef.current, dt, center, 80)
        agentsRef.current = result.agents
        behaviorsRef.current = result.behaviors

        // Billboard sighting detection
        const activeCooldowns = new Set<string>()
        for (const [key, lastSeen] of Object.entries(sightingCooldownRef.current)) {
          if (now - lastSeen < SIGHTING_COOLDOWN_MS) activeCooldowns.add(key)
        }
        const newSightings = detectBillboardSightings(agentsRef.current, billboardsRef.current, activeCooldowns)
        if (newSightings.length > 0) {
          for (const s of newSightings) {
            sightingCooldownRef.current[`${s.agentId}:${s.billboardId}`] = now
          }
          setSightingNotifications(prev => [
            ...prev,
            ...newSightings.map(s => {
              const ag = agentsRef.current.find(a => a.id === s.agentId)
              const bb = billboardsRef.current.find(b => b.id === s.billboardId)
              return {
                id: `${s.agentId}-${s.billboardId}-${now}`,
                agentId: s.agentId,
                agentName: s.agentName,
                billboardName: s.billboardName,
                agentPosition: ag?.position ?? { lat: 0, lng: 0 },
                billboardPosition: bb?.position ?? { lat: 0, lng: 0 },
                timestamp: now,
              }
            }),
          ])

          setAgentCaptures(prev => [
            ...prev,
            ...newSightings.map(s => ({
              id: `${s.agentId}-${s.billboardId}-${now}`,
              agentName: s.agentName,
              billboardName: s.billboardName,
              imageUrl: '',
              thought: null,
              timestamp: now,
            })),
          ])

          // Queue managed-agent interviews for each new sighting
          for (const s of newSightings) {
            pendingInterviewsRef.current.push({
              agentId: s.agentId,
              agentName: s.agentName,
              billboardId: s.billboardId,
              billboardName: s.billboardName,
            })
          }

          // First-person captures: snapshot + AI thought for each new sighting
          for (const s of newSightings) {
            const agent = agentsRef.current.find(a => a.id === s.agentId)
            const billboard = billboardsRef.current.find(b => b.id === s.billboardId)
            if (!agent || !billboard || !MAPBOX_TOKEN) continue

            const captureId = `${s.agentId}-${s.billboardId}-${Math.floor(now)}`
            const { lat, lng } = agent.position
            const bearing = Math.round(agent.heading)
            const imageUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${lng.toFixed(6)},${lat.toFixed(6)},18,${bearing},60/400x312@2x?access_token=${MAPBOX_TOKEN}`

            // Add capture immediately so the photo appears right away
            setAgentCaptures(prev => [
              { id: captureId, agentName: s.agentName, billboardName: s.billboardName, imageUrl, thought: null, timestamp: now },
              ...prev,
            ])

            // Fetch AI thought and patch it in when ready
            const billboardCreativeText = billboard.creativeText
            const billboardFormat = billboard.format
            fetch('/api/agent-reaction', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({
                agentName: s.agentName,
                billboardName: s.billboardName,
                creativeText: billboardCreativeText,
                format: billboardFormat,
              }),
            })
              .then(r => r.json())
              .then((data: { thought?: string }) => {
                const thought = data.thought ?? 'Interesting…'
                setAgentCaptures(prev => prev.map(c => c.id === captureId ? { ...c, thought } : c))
              })
              .catch(() => {
                setAgentCaptures(prev => prev.map(c => c.id === captureId ? { ...c, thought: 'Interesting…' } : c))
              })
          }
        }
      }

      setAnimationTime((now - startedAt) / 1000)
      animationFrame = window.requestAnimationFrame(tick)
    }

    tick()

    return () => {
      window.cancelAnimationFrame(animationFrame)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { billboardsRef.current = billboards }, [billboards])

  // Apply any creative generated on the company-fetch page to all billboards
  useEffect(() => {
    try {
      const pending = localStorage.getItem('sightline:pending-creative')
      if (pending) {
        setBillboards(current => current.map(b => ({ ...b, mediaUrl: pending })))
        localStorage.removeItem('sightline:pending-creative')
      }
    } catch { /* storage unavailable */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (sightingNotifications.length === 0) return
    const oldest = Math.min(...sightingNotifications.map(n => n.timestamp))
    const delay = Math.max(SIGHTING_DISPLAY_MS - (performance.now() - oldest), 0)
    const timer = setTimeout(() => {
      const cutoff = performance.now() - SIGHTING_DISPLAY_MS
      setSightingNotifications(prev => prev.filter(n => n.timestamp > cutoff))
    }, delay)
    return () => clearTimeout(timer)
  }, [sightingNotifications])

  useEffect(() => {
    if (!mapInstance) return

    const updateBbox = () => {
      setOohBbox(getMapBbox(mapInstance))
    }

    updateBbox()
    mapInstance.on('moveend', updateBbox)

    return () => {
      mapInstance.off('moveend', updateBbox)
    }
  }, [mapInstance])

  useEffect(() => {
    if (!oohBbox) return

    const controller = new AbortController()
    const params = new URLSearchParams({
      bbox: oohBbox,
      limit: String(OOH_POINT_LIMIT),
      includeSourceUrls: 'true',
    })

    setOohStatus('Loading OOH inventory in view...')

    fetch(`/api/ooh-map?${params.toString()}`, { signal: controller.signal })
      .then(async res => {
        if (!res.ok) throw new Error(`OOH inventory failed with status ${res.status}`)
        return await res.json() as OohMapApiResponse
      })
      .then(data => {
        const labels = getMediaTypeLabels(data.metadata.media_type_codes)
        const points = data.points.map(point => toOohMapPoint(point, labels))

        setOohPoints(points)
        setOohSourceUrls(data.source_urls ?? [])
        setOohTotalPoints(data.metadata.total_points)
        setOohDataReady(true)
        setSelectedOohPointId(current => current && points.some(point => point.id === current) ? current : null)
        setOohStatus(points.length > 0
          ? `${points.length.toLocaleString()} of ${data.metadata.total_points.toLocaleString()} OOH locations in view${data.metadata.limited ? ' (limited)' : ''}`
          : 'No OOH locations in this viewport')
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setOohPoints([])
        setSelectedOohPointId(null)
        setOohStatus(error instanceof Error ? error.message : 'OOH inventory unavailable')
      })

    return () => controller.abort()
  }, [oohBbox])

  useEffect(() => {
    const controller = new AbortController()

    setBuildingStatus('Loading editable building context...')

    fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: contextArea.lat,
        lng: contextArea.lng,
        radiusKm: SELECTION_RADIUS_KM,
      }),
      signal: controller.signal,
    })
      .then(async res => {
        if (!res.ok) throw new Error(`Building lookup failed with status ${res.status}`)
        return await res.json() as { buildings: Building[] }
      })
      .then(data => {
        const styledBuildingCount = data.buildings.filter(building => building.poiCategory).length
        setBuildings(data.buildings)
        setUseCustomBuildings(data.buildings.length > 0)
        setBuildingsDataReady(true)
        setBuildingStatus(data.buildings.length > 0
          ? `${data.buildings.length} editable OSM buildings, ${styledBuildingCount} POI-styled`
          : 'No editable buildings nearby; using Mapbox buildings')
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setBuildings([])
        setUseCustomBuildings(false)
        setBuildingStatus('Building lookup unavailable; using Mapbox buildings')
      })

    return () => controller.abort()
  }, [contextArea.lat, contextArea.lng])

  useEffect(() => {
    const id = setInterval(() => setTrafficPhaseTime(Math.floor(Date.now() / 1000)), 500)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    setStreetFixtureStatus('Loading street fixtures...')

    fetch('/api/street-fixtures', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lat: contextArea.lat,
        lng: contextArea.lng,
        radiusKm: SELECTION_RADIUS_KM,
      }),
      signal: controller.signal,
    })
      .then(async res => {
        if (!res.ok) throw new Error(`Street fixture lookup failed with status ${res.status}`)
        return await res.json() as { fixtures: StreetFixture[] }
      })
      .then(data => {
        setStreetFixtures(data.fixtures)
        setFixturesDataReady(true)
        const counts = data.fixtures.reduce<Record<string, number>>((acc, f) => {
          acc[f.kind] = (acc[f.kind] ?? 0) + 1
          return acc
        }, {})
        const summary = Object.entries(counts)
          .map(([kind, n]) => `${n} ${kind}`)
          .join(', ')
        setStreetFixtureStatus(data.fixtures.length > 0 ? summary : 'No street fixtures found')
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        setStreetFixtures([])
        setFixturesDataReady(true)
        setStreetFixtureStatus('Street fixture lookup unavailable')
      })

    return () => controller.abort()
  }, [contextArea.lat, contextArea.lng])

  useEffect(() => {
    const area = selectedArea ?? pendingArea ?? (mapStyleReady ? FALLBACK_AREA : null)
    if (!area || !mapStyleReady) return
    let cancelled = false

    setRoads(generateSyntheticRoads(area, 1.0))
    setTrafficPoints(generateSyntheticTraffic(area, 1.0))
    setTrafficStatus('Fetching OSM road network...')

    // Fetch actual curved road geometries from OSM
    fetchRoads(area, 1.0)
      .then(osmRoads => {
        if (cancelled) return
        setRoads(osmRoads.length > 0 ? osmRoads : generateSyntheticRoads(area, 1.0))
        setTrafficStatus(osmRoads.length > 0 ? `${osmRoads.length} OSM road segments` : 'Synthetic grid (OSM unavailable)')
      })
      .catch(() => { /* keep synthetic roads */ })

    // Fetch real activity nodes in parallel
    fetchTrafficDensity(area, 1.0)
      .then(points => {
        if (cancelled) return
        if (points.length > 0) setTrafficPoints(points)
      })
      .catch(() => { /* keep synthetic points */ })

    return () => { cancelled = true }
  }, [selectedArea?.lat, selectedArea?.lng, pendingArea?.lat, pendingArea?.lng, mapStyleReady])

  useEffect(() => {
    const start = performance.now()
    let raf: number
    const tick = () => {
      setFlowTime((performance.now() - start) / 1000)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    let raf: number
    let frames = 0
    let last = performance.now()

    const tick = () => {
      frames++
      const now = performance.now()
      if (now - last >= 500) {
        setFps(Math.round((frames * 1000) / (now - last)))
        frames = 0
        last = now
      }
      raf = requestAnimationFrame(tick)
    }

    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const handleMapReady = useCallback((event: { target: mapboxgl.Map }) => {
    const map = event.target
    setMapInstance(map)
    if (configuredMapRef.current === map) return
    configuredMapRef.current = map

    let didMarkReady = false

    const markReady = () => {
      if (didMarkReady) return
      didMarkReady = true
      applyStandardStyleConfig(map, useCustomBuildings)
      setMapStyleReady(true)
    }

    const setup = () => {
      applyStandardStyleConfig(map, useCustomBuildings)

      try {
        if (!map.getSource('mapbox-dem')) {
          map.addSource('mapbox-dem', {
            type: 'raster-dem',
            url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
            tileSize: 512,
            maxzoom: 14,
          })
        }

        map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })
      } catch {
        // Terrain is visual enhancement only; the map can still be considered ready.
      }

      map.once('idle', markReady)
      window.setTimeout(markReady, 2500)
    }

    if (map.isStyleLoaded()) setup()
    else map.once('style.load', setup)
    window.setTimeout(markReady, 3500)
  }, [useCustomBuildings])

  useEffect(() => {
    let raf = 0

    const configureWhenAvailable = () => {
      const map = mapRef.current?.getMap()
      if (map) {
        handleMapReady({ target: map })
        return
      }
      raf = requestAnimationFrame(configureWhenAvailable)
    }

    configureWhenAvailable()
    return () => cancelAnimationFrame(raf)
  }, [handleMapReady])

  useEffect(() => {
    if (!mapInstance) return
    applyStandardStyleConfig(mapInstance, useCustomBuildings)
  }, [mapInstance, useCustomBuildings])


  const addBillboardAt = useCallback((position: LatLng) => {
    const nextBillboard: BillboardPlacement = {
      id: `bb-${Date.now()}`,
      name: `Billboard ${billboards.length + 1}`,
      position,
      widthM: 12,
      heightM: 5,
      clearanceM: 6,
      heading: 90,
      format: 'digital',
      material: 'digital-day',
      creativeText: 'NEW LAUNCH',
      primaryColor: '#ffcf5c',
      secondaryColor: '#111318',
      brightness: 75,
      weeklyReach: 64000,
    }

    setBillboards(current => [...current, nextBillboard])
    setSelectedBillboardId(nextBillboard.id)
  }, [billboards.length])

  const updateBillboard = useCallback((id: string, patch: Partial<BillboardPlacement>) => {
    setBillboards(current => current.map(billboard =>
      billboard.id === id ? { ...billboard, ...patch } : billboard
    ))
  }, [])

  const duplicateBillboard = useCallback((id: string) => {
    setBillboards(current => {
      const source = current.find(billboard => billboard.id === id)
      if (!source) return current

      const duplicate: BillboardPlacement = {
        ...source,
        id: `bb-${Date.now()}`,
        name: `${source.name} Copy`,
        position: {
          lat: source.position.lat + 0.00018,
          lng: source.position.lng + 0.00018,
        },
      }

      setSelectedBillboardId(duplicate.id)
      return [...current, duplicate]
    })
  }, [])

  const deleteBillboard = useCallback((id: string) => {
    setBillboards(current => {
      const next = current.filter(billboard => billboard.id !== id)
      setSelectedBillboardId(selectedBillboardId === id ? (next[0]?.id ?? null) : selectedBillboardId)
      return next
    })
  }, [selectedBillboardId])

  const handleMapClick = useCallback((info: PickingInfo) => {
    if (activeTool === 'streetview') {
      if (info.coordinate) {
        const [lng, lat] = info.coordinate
        if (typeof lng === 'number' && typeof lat === 'number') {
          setStreetViewLocation({ lat, lng })
        }
      }
      return
    }

    if (pendingArea || selectedArea) return

    const pickedBillboardId = (info.object as { placement?: BillboardPlacement } | null)?.placement?.id
    if (pickedBillboardId) {
      setSelectedBillboardId(pickedBillboardId)
      setActiveBillboardTool('select')
      return
    }

    if (!info.coordinate) return

    const [lng, lat] = info.coordinate
    if (typeof lng !== 'number' || typeof lat !== 'number') return

    if (isOohMapPoint(info.object)) {
      setSelectedOohPointId(info.object.id)
      if (activeBillboardTool === 'select' && !isSelectionLocked) {
        setPendingArea({ lat: info.object.position.lat, lng: info.object.position.lng })
      }
      return
    }

    if (activeBillboardTool === 'place') {
      addBillboardAt({ lat, lng })
      return
    }

    if (isSelectionLocked) return

    setPendingArea({ lat, lng })
  }, [activeBillboardTool, activeTool, addBillboardAt, isSelectionLocked, pendingArea, selectedArea])

  const handleMapHover = useCallback((info: PickingInfo) => {
    if (activeTool !== 'streetview') {
      setStreetViewHover(null)
      return
    }

    if (info.x === undefined || info.y === undefined || !info.coordinate) {
      setStreetViewHover(null)
      return
    }

    // If a focus circle is active, hide pin outside its 2 km radius
    if (focusArea && !countryIso) {
      const [lng, lat] = info.coordinate as [number, number]
      if (haversineKm({ lat, lng }, focusArea) > 2) {
        setStreetViewHover(null)
        return
      }
    }

    setStreetViewHover({ x: info.x, y: info.y })
  }, [activeTool, countryIso, focusArea])

  const handleConfirmArea = useCallback(() => {
    if (!pendingArea) return
    setSelectedArea(pendingArea)
    setPendingArea(null)

    const spawned = trafficPoints.length > 0
      ? spawnAgentsFromTraffic(trafficPoints, 200, buildings)
      : spawnAgentsInRadius(pendingArea, 800, 200, buildings)
    agentsRef.current = spawned
    behaviorsRef.current = createBehaviors(spawned)
    setFocusedAgentIdx(0)
    setHasCrowd(true)

    // Fly to street level so the 3D crowd figures are visible (they're ~3px at city zoom)
    mapInstance?.flyTo({
      center: [pendingArea.lng, pendingArea.lat],
      zoom: 18,
      pitch: INITIAL_VIEW_STATE.pitch,
      bearing: INITIAL_VIEW_STATE.bearing,
      duration: 1500,
    })
  }, [buildings, mapInstance, pendingArea, trafficPoints])

  const handleCancelArea = useCallback(() => {
    setPendingArea(null)
  }, [])

  const handleLockToggle = useCallback(() => {
    if (!selectedArea) return
    setIsSelectionLocked(locked => !locked)
  }, [selectedArea])

  const [hasCrowd, setHasCrowd] = useState(false)
  const [focusedAgentIdx, setFocusedAgentIdx] = useState(0)

  const handleAgentCycle = useCallback(() => {
    setFocusedAgentIdx(prev => {
      const total = agentsRef.current.length
      if (total === 0) return 0
      return (prev + 1) % total
    })
  }, [])

  const handleCrowdToggle = useCallback(() => {
    if (hasCrowd) {
      agentsRef.current = []
      behaviorsRef.current = []
      setHasCrowd(false)
    } else {
      const spawned = trafficPoints.length > 0
        ? spawnAgentsFromTraffic(trafficPoints, 200, buildings)
        : spawnAgentsInRadius(contextArea, 800, 200, buildings)
      agentsRef.current = spawned
      behaviorsRef.current = createBehaviors(spawned)
      setFocusedAgentIdx(0)
      setHasCrowd(true)
    }
  }, [buildings, contextArea, hasCrowd, trafficPoints])

  const spawnBaseWalker = handleCrowdToggle

  const captureSceneView = useCallback(async () => {
    const canvas = document.querySelector<HTMLCanvasElement>('.mapboxgl-canvas')
    if (!canvas) {
      setCaptureStatus('Could not find the 3D scene canvas.')
      return null
    }

    try {
      const capture = {
        dataUrl: canvas.toDataURL('image/jpeg', 0.82),
        capturedAt: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      }
      setSceneCapture(capture)
      setCaptureStatus('Scene camera view captured.')
      return capture
    } catch {
      setCaptureStatus('Scene capture was blocked by the browser. Upload a screenshot instead.')
      return null
    }
  }, [])

  const askAIAboutSnapshot = useCallback(async () => {
    setIsQuickAnalyzing(true)
    setQuickResponse(null)
    setQuickResponseError(null)

    try {
      const capture = await captureSceneView()
      if (!capture) {
        throw new Error('Could not capture the current 3D view.')
      }

      const res = await fetch('/api/scene-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneImage: { dataUrl: capture.dataUrl },
          brief: 'Quick test from the current Sightline 3D map view. Describe the scene and likely viewer response to the visible outdoor ads.',
          viewerProfile: 'urban pedestrian or commuter glancing at a messy 3D street scene',
        }),
      })

      const body = await res.json() as SceneResponseApiResponse | { error?: string }
      if (!res.ok) {
        throw new Error('error' in body && body.error ? body.error : `AI request failed with status ${res.status}`)
      }

      setQuickResponse(body as SceneResponseApiResponse)
    } catch (err: unknown) {
      setQuickResponseError(err instanceof Error ? err.message : 'Could not get AI analysis of the snapshot.')
    } finally {
      setIsQuickAnalyzing(false)
    }
  }, [captureSceneView])

  useEffect(() => {
    if (!mapInstance || !countryIso) return

    const addMask = () => {
      try {
        if (!mapInstance.getSource('country-boundaries-mask')) {
          mapInstance.addSource('country-boundaries-mask', {
            type: 'vector',
            url: 'mapbox://mapbox.country-boundaries-v1',
          })
        }
        if (!mapInstance.getLayer('country-outside-mask')) {
          // slot:'middle' places the fill between terrain/roads and labels in Mapbox Standard v3
          mapInstance.addLayer({
            id: 'country-outside-mask',
            slot: 'middle',
            type: 'fill',
            source: 'country-boundaries-mask',
            'source-layer': 'country_boundaries',
            filter: ['!=', ['get', 'iso_3166_1'], countryIso],
            paint: {
              'fill-color': '#0f1117',
              'fill-opacity': 0.82,
            },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any)
        }
      } catch {
        // Standard style slot errors are non-fatal; map renders without the country mask
      }
    }

    if (mapInstance.isStyleLoaded()) addMask()
    else mapInstance.once('style.load', addMask)

    return () => {
      if (mapInstance.getLayer('country-outside-mask')) mapInstance.removeLayer('country-outside-mask')
      if (mapInstance.getSource('country-boundaries-mask')) mapInstance.removeSource('country-boundaries-mask')
    }
  }, [mapInstance, countryIso])

  if (!MAPBOX_TOKEN) {
    return null
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }} onContextMenu={e => e.preventDefault()}>
      <MapLoadingScreen ready={mapStyleReady} progress={loadingProgress} label={loadingLabel} />
      <div style={{ position: 'absolute', inset: 0 }}>
        <DeckGL
          ref={deckRef}
          initialViewState={focusArea
            ? { ...INITIAL_VIEW_STATE, longitude: focusArea.lng, latitude: focusArea.lat }
            : INITIAL_VIEW_STATE}
          controller={pendingArea ? { dragPan: false } : true}
          layers={layers}
          onClick={handleMapClick}
          onHover={handleMapHover}
          style={{ position: 'absolute', inset: '0', cursor: activeTool === 'streetview' ? 'none' : undefined }}
        >
          <MapboxMap
            ref={mapRef}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle="mapbox://styles/mapbox/standard"
            onLoad={handleMapReady}
            onRender={handleMapReady}
            preserveDrawingBuffer
            maxPitch={85}
            minZoom={countryIso ? 3 : 11}
          />
        </DeckGL>
        {walkClip && (
          <CrowdLayer
            agents={agentsRef.current}
            walkClip={walkClip}
            deckRef={deckRef}
            elapsedSeconds={animationTime}
            focusedAgentIdx={hasCrowd ? focusedAgentIdx : undefined}
            onAgentCycle={hasCrowd ? handleAgentCycle : undefined}
          />
        )}
        <BillboardMeshLayer billboards={billboards} deckRef={deckRef} />
      </div>

      {activeTool === 'builder' && (
        <BillboardStudioPanel
          billboards={billboards}
          selectedBillboard={selectedBillboard}
          selectedArea={selectedArea}
          activeTool={activeBillboardTool}
          onToolChange={setActiveBillboardTool}
          onAddBillboard={addBillboardAt}
          onSelectBillboard={setSelectedBillboardId}
          onUpdateBillboard={updateBillboard}
          onDuplicateBillboard={duplicateBillboard}
          onDeleteBillboard={deleteBillboard}
        />
      )}

      {activeTool === 'settings' && (
        <AgencyDemoPanel
          selectedArea={selectedArea}
          fallbackArea={FALLBACK_AREA}
          sceneCapture={sceneCapture}
          captureStatus={captureStatus}
          onCaptureScene={captureSceneView}
          onSceneUpload={setSceneCapture}
        />
      )}

      {activeTool === 'dashboard' && (
        <DashboardOverlay onClose={() => setActiveTool(null)} captures={agentCaptures} />
      )}

      {pendingArea && (
        <AreaConfirmDialog
          oohCount={pendingAreaOohCount}
          radiusKm={SELECTION_RADIUS_KM}
          onConfirm={handleConfirmArea}
          onCancel={handleCancelArea}
        />
      )}


      {activeTool === 'streetview' && streetViewHover && (
        <StreetViewCursor x={streetViewHover.x} y={streetViewHover.y} />
      )}

      {activeTool === 'streetview' && streetViewLocation && (
        <StreetViewPanel
          location={streetViewLocation}
          onClose={() => { setStreetViewLocation(null); setActiveTool(null) }}
        />
      )}

      {selectedOohPoint && (
        <div style={{
          position: 'absolute',
          bottom: 24,
          left: 24,
          zIndex: 30,
          width: 288,
          background: 'rgba(10,13,20,0.88)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(255,255,255,0.13)',
          borderRadius: 14,
          fontFamily: 'system-ui, sans-serif',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(180,200,255,0.65)', textTransform: 'uppercase' }}>
              OOH Listing
            </span>
            <button
              onClick={() => setSelectedOohPointId(null)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', fontSize: 16, lineHeight: 1, padding: '0 2px' }}
            >
              ×
            </button>
          </div>
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#e8eeff', marginBottom: 10 }}>
              {selectedOohPoint.mediaTypeLabel}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(180,200,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Monthly Rate</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: selectedOohPoint.priceAmount > 0 ? '#ffcf5c' : 'rgba(255,255,255,0.35)' }}>
                  {selectedOohPoint.priceAmount > 0 ? `$${selectedOohPoint.priceAmount.toLocaleString()}` : 'Call for price'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(180,200,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Visibility</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: selectedOohPoint.visibilityScore >= 80 ? '#55ff88' : selectedOohPoint.visibilityScore >= 60 ? '#ffcf5c' : '#ff8855' }}>
                  {selectedOohPoint.visibilityScore}<span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>/100</span>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(180,200,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Weekly Impressions</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(220,230,255,0.85)' }}>
                  {selectedOohPoint.weeklyImpressions > 0 ? selectedOohPoint.weeklyImpressions.toLocaleString() : '—'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(180,200,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Est. CPM</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(220,230,255,0.85)' }}>
                  {selectedOohPoint.priceAmount > 0 && selectedOohPoint.weeklyImpressions > 0
                    ? `$${((selectedOohPoint.priceAmount / (selectedOohPoint.weeklyImpressions * 4)) * 1000).toFixed(2)}`
                    : '—'}
                </div>
              </div>
            </div>
            {oohSourceUrls[selectedOohPoint.sourceUrlIndex] && (
              <a
                href={oohSourceUrls[selectedOohPoint.sourceUrlIndex]}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block',
                  padding: '7px 10px',
                  background: 'rgba(73,145,255,0.14)',
                  border: '1px solid rgba(73,145,255,0.3)',
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#91c8ff',
                  textDecoration: 'none',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                View original listing ↗
              </a>
            )}
          </div>
        </div>
      )}

      <MapToolbar activeTool={activeTool} onToolChange={setActiveTool} onSpawnCrowd={handleCrowdToggle} hasCrowd={hasCrowd} dashboardEnabled={hasCrowd} />

      {sightingNotifications.length > 0 && (
        <div style={{
          position: 'absolute',
          top: 48,
          left: 12,
          zIndex: 999,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          maxWidth: 260,
          pointerEvents: 'none',
        }}>
          {sightingNotifications.map(n => {
            const demoIdx = (parseInt(n.agentId.replace(/\D+/g, '').slice(-4) || '0', 10)) % DEMOGRAPHIC_DEFS.length
            const demo = DEMOGRAPHIC_DEFS[demoIdx]
            return (
              <div key={n.id} style={{
                background: '#121212',
                border: `3px solid ${demo.color}`,
                display: 'flex',
                overflow: 'hidden',
              }}>
                {/* Demographic icon block */}
                <div style={{
                  width: 40,
                  flexShrink: 0,
                  background: demo.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg viewBox="0 0 20 26" width={20} height={26} fill="#121212">
                    {demo.icon}
                  </svg>
                </div>
                {/* Text block */}
                <div style={{ padding: '6px 10px', minWidth: 0 }}>
                  <div style={{
                    fontSize: 8,
                    fontWeight: 900,
                    letterSpacing: '0.16em',
                    color: demo.color,
                    textTransform: 'uppercase',
                    marginBottom: 2,
                  }}>
                    {demo.label} · SAW IT
                  </div>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: '#F0F0F0',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {n.agentName}
                  </div>
                  <div style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: 'rgba(240,240,240,0.45)',
                    letterSpacing: '0.04em',
                    marginTop: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    ↗ {n.billboardName}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{
        position: 'absolute',
        top: 12,
        left: 12,
        fontFamily: 'monospace',
        fontSize: 12,
        color: fps < 30 ? '#ff5555' : fps < 50 ? '#ffaa33' : '#55ff88',
        background: 'rgba(0,0,0,0.45)',
        padding: '2px 7px',
        borderRadius: 4,
        pointerEvents: 'none',
        userSelect: 'none',
        zIndex: 1000,
      }}>
        {fps} FPS
      </div>
    </div>
  )
}
