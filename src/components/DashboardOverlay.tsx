'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import PolaroidStream from '@/components/PolaroidStream'
import AgentCameraFeed from '@/components/AgentCameraFeed'
import type { AgentCapture, BillboardPlacement, OohMapPoint, PedestrianAgent, SceneResponseResult, SceneResponseApiResponse } from '@/types'

interface MockSighting {
  agentName: string
  billboardName: string
  thought: string
  lat: number
  lng: number
  heading: number
}

const MOCK_SIGHTINGS: MockSighting[] = [
  { agentName: 'Agent Kai',   billboardName: 'Orchard MRT Billboard',         thought: 'Hard to miss at 30m — the yellow pops against the grey facade. Copy could be half the words.',                        lat: 1.3044, lng: 103.8322, heading: 200 },
  { agentName: 'Agent Mira',  billboardName: 'Bugis Junction Panel',           thought: 'Bus stop canopy ate the bottom third of the frame. Not sure who approved this spot for this format.',                  lat: 1.2997, lng: 103.8553, heading: 270 },
  { agentName: 'Agent Sol',   billboardName: 'Marina Bay Supersign',           thought: 'Unbeatable sightlines across the promenade. Creative feels generic for a placement this premium.',                     lat: 1.2844, lng: 103.8609, heading: 320 },
  { agentName: 'Agent Remy',  billboardName: 'Orchard MRT Billboard',         thought: 'QR code is invisible at walking pace. Headline lands in under a second — contrast is excellent.',                      lat: 1.3048, lng: 103.8318, heading: 160 },
  { agentName: 'Agent Zara',  billboardName: 'Dhoby Ghaut Transit Screen',    thought: 'High dwell time spot, digital format fits. Animation loops too fast for commuters to process.',                        lat: 1.2988, lng: 103.8456, heading: 90  },
  { agentName: 'Agent Theo',  billboardName: 'Marina Bay Supersign',           thought: 'Noticed it from the taxi. Driver asked what it was advertising — so did I, after reading it twice.',                  lat: 1.2836, lng: 103.8612, heading: 280 },
  { agentName: 'Agent Noa',   billboardName: 'Bugis Junction Panel',           thought: 'Color palette is strong and the brand clears immediately. Angle slightly off for westbound foot traffic.',             lat: 1.2999, lng: 103.8549, heading: 220 },
  { agentName: 'Agent Lena',  billboardName: 'Orchard MRT Billboard',         thought: 'Perfect height, completely unobstructed. CTA is buried in the lower-right where nobody glances.',                     lat: 1.3046, lng: 103.8324, heading: 180 },
  { agentName: 'Agent Finn',  billboardName: 'Dhoby Ghaut Transit Screen',    thought: 'Strong headline. Background too busy for this environment — competes with the station signage.',                        lat: 1.2985, lng: 103.8460, heading: 45  },
  { agentName: 'Agent Dara',  billboardName: 'Marina Bay Supersign',           thought: 'Stopped to read it. Means the copy is either great or confusing. A little of both, honestly.',                        lat: 1.2841, lng: 103.8605, heading: 350 },
  { agentName: 'Agent Yuki',  billboardName: 'Clarke Quay Riverside Banner',   thought: 'Nightlife crowd barely looks up. Needs motion or lighting to compete with the venue signs.',                          lat: 1.2906, lng: 103.8465, heading: 130 },
  { agentName: 'Agent Omar',  billboardName: 'Raffles Place Tower Screen',     thought: 'Finance crowd, lunch hour — they glance but rarely stop. Ten words max or it is wasted.',                             lat: 1.2840, lng: 103.8516, heading: 60  },
  { agentName: 'Agent Bea',   billboardName: 'Somerset Pedestrian Strip',      thought: 'Teenagers everywhere. Brand feels too corporate for the audience walking past.',                                      lat: 1.3006, lng: 103.8386, heading: 250 },
  { agentName: 'Agent Cruz',  billboardName: 'Clarke Quay Riverside Banner',   thought: 'Great format for the space. Visibility from the bridge is strong — evening lighting makes it pop.',                  lat: 1.2909, lng: 103.8462, heading: 100 },
  { agentName: 'Agent Ines',  billboardName: 'Tanjong Pagar Roadside Panel',   thought: 'Commuters in cars here. Read distance solid but creative needs bigger type at speed.',                               lat: 1.2762, lng: 103.8440, heading: 330 },
  { agentName: 'Agent Milo',  billboardName: 'Raffles Place Tower Screen',     thought: 'Premium digital format, zero clutter around it. Animation is smooth and holds well in daylight.',                    lat: 1.2843, lng: 103.8513, heading: 80  },
  { agentName: 'Agent Priya', billboardName: 'Little India Arch Billboard',    thought: 'Culturally sensitive spot. Creative needs to match the energy of the street or it gets ignored.',                    lat: 1.3066, lng: 103.8519, heading: 190 },
  { agentName: 'Agent Ethan', billboardName: 'Somerset Pedestrian Strip',      thought: 'Good foot traffic volume. Young crowd, phones out — a bold visual at eye level would outperform this.',              lat: 1.3003, lng: 103.8389, heading: 215 },
  { agentName: 'Agent Hana',  billboardName: 'Novena Medical Hub Screen',      thought: 'Slower-paced environment with long waits. Healthcare brands get real attention here — placement is smart.',           lat: 1.3203, lng: 103.8438, heading: 140 },
  { agentName: 'Agent Tomas', billboardName: 'Tanjong Pagar Roadside Panel',   thought: 'Panel faces oncoming traffic well. Morning rush sees it clearly — evening return misses the angle.',                 lat: 1.2759, lng: 103.8443, heading: 300 },
  { agentName: 'Agent Yuri',  billboardName: 'Little India Arch Billboard',    thought: 'Foot traffic is dense and slow — people do look up. Creative is fighting with the arch itself right now.',            lat: 1.3069, lng: 103.8516, heading: 210 },
  { agentName: 'Agent Asha',  billboardName: 'Novena Medical Hub Screen',      thought: 'Clean install, good height. Copy is too small — loses readability past 15m on this street.',                         lat: 1.3200, lng: 103.8441, heading: 160 },
  { agentName: 'Agent Cleo',  billboardName: 'Orchard MRT Billboard',         thought: 'Saw it on the escalator — two seconds of attention max. Needs one image and four words.',                             lat: 1.3042, lng: 103.8320, heading: 170 },
  { agentName: 'Agent Raj',   billboardName: 'Chinatown Heritage Strip',       thought: 'Tourism-heavy corridor. Foreign brand reference misses. Local context would perform significantly better.',           lat: 1.2838, lng: 103.8430, heading: 75  },
  { agentName: 'Agent Luna',  billboardName: 'Clarke Quay Riverside Banner',   thought: 'Saw it reflected in the water. Not intentional but actually a nice effect — adds dwell time.',                      lat: 1.2903, lng: 103.8468, heading: 115 },
  { agentName: 'Agent Felix', billboardName: 'Chinatown Heritage Strip',       thought: "High-contrast background on this block. The ad's pale palette disappears — needs a rethink.",                       lat: 1.2835, lng: 103.8433, heading: 50  },
  { agentName: 'Agent Suki',  billboardName: 'Bugis Junction Panel',           thought: "Second time past it today. Didn't process the message either time — layout is too fragmented.",                     lat: 1.2994, lng: 103.8556, heading: 240 },
  { agentName: 'Agent Drew',  billboardName: 'Marina Bay Supersign',           thought: 'Tourist hotspot. Call to action should be scannable in 2s or it only serves brand awareness.',                      lat: 1.2839, lng: 103.8608, heading: 305 },
  { agentName: 'Agent Nadia', billboardName: 'Raffles Place Tower Screen',     thought: 'Lunch crowd sits on those benches directly facing this. Probably the best 90-second exposure in the CBD.',           lat: 1.2841, lng: 103.8514, heading: 70  },
  { agentName: 'Agent Cole',  billboardName: 'Dhoby Ghaut Transit Screen',    thought: 'Transfer point — people pause here. Screen brightness calibrated well for the shade. Clean read.',                   lat: 1.2990, lng: 103.8458, heading: 120 },
]

function mockBillboardImageUrl(lat: number, lng: number, heading: number, token: string): string {
  const d = 20
  const rad = (heading * Math.PI) / 180
  const R = 6371000
  const dlat = (d / R) * Math.cos(rad) * (180 / Math.PI)
  const dlng = (d / R) * Math.sin(rad) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180)
  const camLat = lat + dlat
  const camLng = lng + dlng
  const bearing = ((heading + 180) % 360).toFixed(1)
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${camLng.toFixed(6)},${camLat.toFixed(6)},18,${bearing},60/400x240@2x?access_token=${token}`
}

async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(imageUrl)}`)
  if (!res.ok) throw new Error(`Could not fetch capture image (${res.status})`)
  const contentType = res.headers.get('content-type') ?? 'image/png'
  const buffer = await res.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  return `data:${contentType};base64,${btoa(binary)}`
}

function idToHeading(id: string): number {
  let h = 5381
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h) ^ id.charCodeAt(i)
  return ((h >>> 0) / 0xffffffff) * 360
}

function oohCamUrl(pt: OohMapPoint, token: string): string {
  const heading = idToHeading(pt.id)
  const d = 18
  const rad = (heading * Math.PI) / 180
  const R = 6371000
  const dlat = (d / R) * Math.cos(rad) * (180 / Math.PI)
  const dlng = (d / R) * Math.sin(rad) * (180 / Math.PI) / Math.cos(pt.position.lat * Math.PI / 180)
  const camLat = pt.position.lat + dlat
  const camLng = pt.position.lng + dlng
  const bearing = ((heading + 180) % 360).toFixed(1)
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${camLng.toFixed(6)},${camLat.toFixed(6)},18,${bearing},55/384x220@2x?access_token=${token}`
}

type MetricTone = 'good' | 'watch' | 'risk' | 'neutral'

interface ScoreMetric {
  id: string
  label: string
  value: string
  detail: string
  tone: MetricTone
  progress: number
}

interface PersonaExposure {
  persona: string
  seconds: number
}

interface BillboardData {
  id: string
  name: string
  score: number
  headline: string
  brand: string
  exposureIndex: number
  primaryMetrics: ScoreMetric[]
  creativeMetrics: ScoreMetric[]
  abA: { score: number }
  abB: { score: number }
}

const MOCK_BILLBOARD_METRICS: BillboardData[] = [
  {
    id: 'orchard',
    name: 'Orchard MRT',
    score: 86,
    headline: 'MOVE BETTER',
    brand: 'GymCo',
    exposureIndex: 72.4,
    primaryMetrics: [
      { id: 'visibility', label: 'Visibility', value: '78%', detail: 'Likely approach path sees the board across 142m of path.', tone: 'good', progress: 78 },
      { id: 'obstruction', label: 'Obstruction Risk', value: 'Low', detail: 'Tree canopy clips the lower-left edge during southbound approach.', tone: 'watch', progress: 28 },
      { id: 'angle', label: 'Viewing Angle', value: 'A−', detail: 'Faces pedestrian flow and slow taxi queue with minor driver skew.', tone: 'good', progress: 84 },
      { id: 'distance', label: 'Readable Distance', value: '64m', detail: 'Main message holds at 64m; CTA becomes clear around 31m.', tone: 'good', progress: 72 },
    ],
    creativeMetrics: [
      { id: 'clutter', label: 'Clutter', value: '42/100', detail: '', tone: 'watch', progress: 42 },
      { id: 'readability', label: 'Readability', value: '88', detail: '', tone: 'good', progress: 88 },
      { id: 'contrast', label: 'Contrast', value: '91', detail: '', tone: 'good', progress: 91 },
      { id: 'copy', label: 'Copy Length', value: 'Clear', detail: '', tone: 'good', progress: 92 },
      { id: 'brand', label: 'Logo / CTA', value: 'Good', detail: '', tone: 'watch', progress: 74 },
      { id: 'qr', label: 'QR Scan', value: 'Dwell only', detail: '', tone: 'neutral', progress: 55 },
    ],
    abA: { score: 88 },
    abB: { score: 77 },
  },
  {
    id: 'bugis',
    name: 'Bugis Junction',
    score: 74,
    headline: 'ESCAPE THE CITY',
    brand: 'TrailCo',
    exposureIndex: 58.2,
    primaryMetrics: [
      { id: 'visibility', label: 'Visibility', value: '61%', detail: 'Partially blocked by bus stop canopy during peak hours.', tone: 'watch', progress: 61 },
      { id: 'obstruction', label: 'Obstruction Risk', value: 'Medium', detail: 'Bus stop roof clips the upper third during rainy season.', tone: 'watch', progress: 52 },
      { id: 'angle', label: 'Viewing Angle', value: 'B+', detail: 'Strong for northbound shoppers; skewed for southbound traffic.', tone: 'good', progress: 72 },
      { id: 'distance', label: 'Readable Distance', value: '48m', detail: 'Street furniture reduces effective read distance significantly.', tone: 'watch', progress: 54 },
    ],
    creativeMetrics: [
      { id: 'clutter', label: 'Clutter', value: '61/100', detail: '', tone: 'risk', progress: 61 },
      { id: 'readability', label: 'Readability', value: '79', detail: '', tone: 'watch', progress: 79 },
      { id: 'contrast', label: 'Contrast', value: '84', detail: '', tone: 'good', progress: 84 },
      { id: 'copy', label: 'Copy Length', value: 'OK', detail: '', tone: 'watch', progress: 74 },
      { id: 'brand', label: 'Logo / CTA', value: 'Fair', detail: '', tone: 'watch', progress: 62 },
      { id: 'qr', label: 'QR Scan', value: 'No', detail: '', tone: 'risk', progress: 28 },
    ],
    abA: { score: 81 },
    abB: { score: 68 },
  },
  {
    id: 'marina',
    name: 'Marina Bay',
    score: 91,
    headline: 'THE FUTURE IS NOW',
    brand: 'TechX',
    exposureIndex: 88.7,
    primaryMetrics: [
      { id: 'visibility', label: 'Visibility', value: '92%', detail: 'Unobstructed sightlines across the promenade at 210m.', tone: 'good', progress: 92 },
      { id: 'obstruction', label: 'Obstruction Risk', value: 'None', detail: 'Open waterfront with no static obstructions identified.', tone: 'good', progress: 96 },
      { id: 'angle', label: 'Viewing Angle', value: 'A+', detail: 'Optimal facing for tourist foot traffic and vehicle approach.', tone: 'good', progress: 97 },
      { id: 'distance', label: 'Readable Distance', value: '82m', detail: 'High ambient light levels support exceptional read distance.', tone: 'good', progress: 88 },
    ],
    creativeMetrics: [
      { id: 'clutter', label: 'Clutter', value: '18/100', detail: '', tone: 'good', progress: 18 },
      { id: 'readability', label: 'Readability', value: '96', detail: '', tone: 'good', progress: 96 },
      { id: 'contrast', label: 'Contrast', value: '98', detail: '', tone: 'good', progress: 98 },
      { id: 'copy', label: 'Copy Length', value: 'Clear', detail: '', tone: 'good', progress: 96 },
      { id: 'brand', label: 'Logo / CTA', value: 'Strong', detail: '', tone: 'good', progress: 92 },
      { id: 'qr', label: 'QR Scan', value: 'Good', detail: '', tone: 'good', progress: 82 },
    ],
    abA: { score: 94 },
    abB: { score: 87 },
  },
]

const personaExposure: PersonaExposure[] = [
  { persona: 'Pedestrian commute', seconds: 8.4 },
  { persona: 'Taxi queue', seconds: 21.7 },
  { persona: 'Retail shopper', seconds: 14.2 },
  { persona: 'Driver approach', seconds: 3.8 },
]

const exportOptions = ['PDF brief', 'CSV metrics', 'Client deck', 'JSON payload']

function BhMetricCard({ metric }: { metric: ScoreMetric }) {
  return (
    <article className={`bh-metric is-${metric.tone}`}>
      <span className="bh-metric__label">{metric.label}</span>
      <strong className="bh-metric__value">{metric.value}</strong>
      <p className="bh-metric__detail">{metric.detail}</p>
      <div className="bh-metric__bar" aria-label={`${metric.label} ${metric.progress}%`}>
        <i style={{ width: `${metric.progress}%` }} />
      </div>
    </article>
  )
}

interface Props {
  onClose: () => void
  captures: AgentCapture[]
  billboards?: BillboardPlacement[]
  oohPoints?: OohMapPoint[]
  mapboxToken?: string
  agentsRef?: React.RefObject<PedestrianAgent[]>
}

interface ChatMsg { role: 'user' | 'assistant'; content: string }

export default function DashboardOverlay({ onClose, captures, billboards = [], oohPoints = [], mapboxToken = '', agentsRef }: Props) {
  const [boardIndex, setBoardIndex] = useState(0)
  const camPoints = oohPoints.length > 0 ? oohPoints.slice(0, 30) : []
  const [camIdx, setCamIdx] = useState(0)
  const safeCamIdx = camPoints.length > 0 ? camIdx % camPoints.length : 0
  const activeCam = camPoints[safeCamIdx] ?? null
  const rightPanelRef = useRef<HTMLDivElement | null>(null)

  // Mock simulation: sequential pedestrian sightings with a "thinking" phase
  const [mockCaptures, setMockCaptures] = useState<AgentCapture[]>([])
  const [dashNotif, setDashNotif] = useState<{ agentName: string; billboardName: string } | null>(null)
  const mockTimersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const mapboxTokenRef = useRef(mapboxToken)
  useEffect(() => { mapboxTokenRef.current = mapboxToken }, [mapboxToken])

  useEffect(() => {
    // Gap after each sighting before the next (ms). Loops — short gaps batch, long gaps breathe.
    const GAPS = [
      1100, 850, 7200, 950, 700, 400, 8500, 1300, 600, 10000,
      1200, 800, 5800, 500, 900, 6400, 1400, 650, 9100, 750,
      1000, 550, 7700, 1100, 800, 4900, 600, 850, 6200, 1300,
    ]
    const THINK_DELAYS = [
      2800, 1600, 3200, 2100, 1300, 2700, 1900, 3500, 1400, 2500,
      3000, 1700, 2400, 1200, 3100, 2200, 1500, 2900, 1800, 3300,
      2600, 1100, 2000, 3400, 1600, 2800, 1300, 2300, 3600, 1900,
    ]

    let runIdx = 0

    const fireNext = () => {
      const pos = runIdx % MOCK_SIGHTINGS.length
      const sighting = MOCK_SIGHTINGS[pos]
      const captureId = `mock-${runIdx}`
      const thinkDelay = THINK_DELAYS[runIdx % THINK_DELAYS.length]
      const nextGap = GAPS[runIdx % GAPS.length]
      runIdx++

      setDashNotif({ agentName: sighting.agentName, billboardName: sighting.billboardName })

      const imageUrl = mapboxTokenRef.current
        ? mockBillboardImageUrl(sighting.lat, sighting.lng, sighting.heading, mapboxTokenRef.current)
        : ''

      const capture: AgentCapture = {
        id: captureId,
        agentName: sighting.agentName,
        billboardName: sighting.billboardName,
        imageUrl,
        thought: null,
        timestamp: Date.now(),
      }
      setMockCaptures(prev => [capture, ...prev])

      const notifTimer = setTimeout(() => setDashNotif(null), 3200)
      const thoughtTimer = setTimeout(() => {
        setMockCaptures(prev =>
          prev.map(c => c.id === captureId ? { ...c, thought: sighting.thought } : c)
        )
      }, thinkDelay)
      const nextTimer = setTimeout(fireNext, nextGap)
      mockTimersRef.current.push(notifTimer, thoughtTimer, nextTimer)
    }

    const startTimer = setTimeout(fireNext, 1400)
    mockTimersRef.current.push(startTimer)

    return () => {
      mockTimersRef.current.forEach(clearTimeout)
      mockTimersRef.current = []
    }
  }, [])

  const allCaptures = [...mockCaptures, ...captures]

  const total = allCaptures.length
  const safeIndex = total > 0 ? Math.min(boardIndex, total - 1) : 0
  const capture = allCaptures[safeIndex] ?? null

  // Live metrics: periodically nudge numeric values to simulate a live feed
  const [liveMetrics, setLiveMetrics] = useState(() => MOCK_BILLBOARD_METRICS.map(b => ({
    ...b,
    primaryMetrics: b.primaryMetrics.map(m => ({ ...m })),
    creativeMetrics: b.creativeMetrics.map(m => ({ ...m })),
  })))

  useEffect(() => {
    const nudge = (v: number, delta: number, lo: number, hi: number) =>
      Math.min(hi, Math.max(lo, v + delta))

    const tick = () => {
      setLiveMetrics(prev => prev.map(board => {
        const primary = board.primaryMetrics.map(m => {
          if (!Number.isFinite(m.progress)) return m
          const delta = Math.round((Math.random() - 0.5) * 8)
          const p = nudge(m.progress, delta, 10, 99)
          // Re-derive tone from updated progress
          const tone: ScoreMetric['tone'] = p >= 75 ? 'good' : p >= 50 ? 'watch' : 'risk'
          // Update numeric value strings
          let value = m.value
          if (m.id === 'visibility') value = `${p}%`
          else if (m.id === 'distance') value = `${Math.round(p * 0.9)}m`
          return { ...m, progress: p, tone, value }
        })
        const creative = board.creativeMetrics.map(m => {
          if (!Number.isFinite(m.progress)) return m
          const delta = Math.round((Math.random() - 0.5) * 6)
          const p = nudge(m.progress, delta, 8, 99)
          const tone: ScoreMetric['tone'] = p >= 75 ? 'good' : p >= 50 ? 'watch' : 'risk'
          let value = m.value
          if (/^\d+$/.test(m.value)) value = `${p}`
          else if (/^\d+\/100$/.test(m.value)) value = `${p}/100`
          return { ...m, progress: p, tone, value }
        })
        const score = Math.round(
          primary.reduce((s, m) => s + m.progress, 0) / primary.length
        )
        return { ...board, primaryMetrics: primary, creativeMetrics: creative, score }
      }))
    }

    // Ticks fire at irregular intervals so it doesn't feel mechanical
    const intervals = [2800, 1900, 3500, 2200, 4100, 1700, 3000, 2600]
    let i = 0
    let timer: ReturnType<typeof setTimeout>

    const scheduleNext = () => {
      const delay = intervals[i % intervals.length]
      i++
      timer = setTimeout(() => { tick(); scheduleNext() }, delay)
    }
    scheduleNext()

    return () => clearTimeout(timer)
  }, [])

  const metrics = liveMetrics[safeIndex % liveMetrics.length]

  // Scene analysis state
  const [analysisCache, setAnalysisCache] = useState<Map<string, SceneResponseResult>>(new Map())
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  const analyzeCapture = useCallback(async () => {
    if (!capture?.imageUrl || analyzingId) return
    const id = capture.id
    setAnalyzingId(id)
    setAnalysisError(null)
    try {
      const dataUrl = await fetchImageAsBase64(capture.imageUrl)
      const res = await fetch('/api/scene-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneImage: { dataUrl },
          brief: `Agent ${capture.agentName} sighted ${capture.billboardName}`,
          viewerProfile: 'urban pedestrian with short dwell time, partial phone distraction, and normal sensitivity to visual clutter',
        }),
      })
      const body = await res.json() as SceneResponseApiResponse | { error?: string }
      if (!res.ok) throw new Error('error' in body && body.error ? body.error : `Analysis failed: ${res.status}`)
      setAnalysisCache(prev => new Map(prev).set(id, (body as SceneResponseApiResponse).result))
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Analysis failed.')
    } finally {
      setAnalyzingId(null)
    }
  }, [capture, analyzingId])

  // Chat state — reset when switching agents
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [bubble, setBubble] = useState<string | null>(null)
  const chatBodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setChatMsgs([])
    setChatInput('')
    setBubble(null)
    setAnalysisError(null)
  }, [safeIndex])

  useEffect(() => {
    if (chatBodyRef.current) chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight
  }, [chatMsgs])

  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || chatLoading || !capture) return
    const userMsg: ChatMsg = { role: 'user', content: chatInput.trim() }
    const next = [...chatMsgs, userMsg]
    setChatMsgs(next)
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await fetch('/api/pedestrian-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ agentName: capture.agentName, billboardName: capture.billboardName, messages: next }),
      })
      const json = await res.json() as { reply?: string; error?: string }
      const reply = json.reply ?? 'No response.'
      setChatMsgs(prev => [...prev, { role: 'assistant', content: reply }])
      setBubble(reply)
    } catch {
      setChatMsgs(prev => [...prev, { role: 'assistant', content: 'Could not reach the pedestrian.' }])
    } finally {
      setChatLoading(false)
    }
  }, [chatInput, chatLoading, chatMsgs, capture])

  const prevBoard = () => setBoardIndex(i => (i - 1 + total) % total)
  const nextBoard = () => setBoardIndex(i => (i + 1) % total)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prevBoard()
      if (e.key === 'ArrowRight') nextBoard()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="bh-overlay-backdrop"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="presentation"
    >
      <div className="bh-overlay-dialog" role="dialog" aria-modal="true" aria-label="OOH Performance Cockpit">

        {/* Sighting notification toast */}
        {dashNotif && (
          <div style={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 20,
            pointerEvents: 'none',
            background: '#121212',
            border: '3px solid #4991FF',
            display: 'flex',
            overflow: 'hidden',
          }}>
            <div style={{
              width: 38,
              flexShrink: 0,
              background: '#4991FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <svg viewBox="0 0 20 26" width={18} height={24} fill="#121212">
                <ellipse cx="10" cy="8" rx="5" ry="5.5" />
                <path d="M2 24c0-5 3.5-8 8-8s8 3 8 8" />
              </svg>
            </div>
            <div style={{ padding: '5px 10px', minWidth: 0 }}>
              <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.16em', color: '#4991FF', textTransform: 'uppercase', marginBottom: 2 }}>
                PEDESTRIAN · SAW IT
              </div>
              <div style={{ fontSize: 11, fontWeight: 900, color: '#F0F0F0', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
                {dashNotif.agentName}
              </div>
              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(240,240,240,0.45)', letterSpacing: '0.04em', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>
                ↗ {dashNotif.billboardName}
              </div>
            </div>
          </div>
        )}

        {/* Full-width header */}
        <header className="bh-cockpit-header">
          <div className="bh-cockpit-header__identity">
            <span className="bh-cockpit-header__brand">Sightline Intelligence</span>
            <span className="bh-cockpit-header__divider" />
            <span className="bh-cockpit-header__title">OOH Performance Cockpit</span>
          </div>
          <button className="bh-close-btn" onClick={onClose} aria-label="Close dashboard">×</button>
        </header>

        {/* Content: left panel + right polaroid */}
        <main className="bh-dash">
          <div className="bh-dash__left">

            {/* Agent navigator */}
            <div className="bh-subnav" aria-label="Agent selector">
              <button type="button" className="bh-subnav__arrow" onClick={prevBoard} aria-label="Previous agent" disabled={total < 2}>←</button>
              <div className="bh-subnav__center">
                <span className="bh-subnav__name">{capture?.agentName ?? '—'}</span>
                <span className="bh-subnav__score">{metrics.score}</span>
                <span className="bh-subnav__index">{total > 0 ? `${safeIndex + 1} / ${total}` : '0 / 0'}</span>
              </div>
              <button type="button" className="bh-subnav__arrow" onClick={nextBoard} aria-label="Next agent" disabled={total < 2}>→</button>
            </div>

            {/* Middle: path viz + agent card */}
            <div style={{ display: 'flex', flex: '0 0 42%', borderBottom: '4px solid #121212', overflow: 'hidden' }}>

              {/* Billboard cameras — single view with cycle */}
              <div style={{ flex: 1, minWidth: 0, background: '#0e0e0e', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
                {/* Image */}
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                  {activeCam && mapboxToken ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={oohCamUrl(activeCam, mapboxToken)} alt={activeCam.mediaTypeLabel} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.9 }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontWeight: 700, letterSpacing: '0.1em' }}>NO FEED</span>
                    </div>
                  )}
                  {/* Scan lines */}
                  <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)' }} />
                  {/* Top-left badge */}
                  <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(18,18,18,0.7)', color: 'rgba(255,255,255,0.55)', fontSize: 7, fontWeight: 900, letterSpacing: '0.12em', padding: '2px 5px' }}>
                    {activeCam ? `CAM ${String(safeCamIdx + 1).padStart(2, '0')}` : 'NO CAM'}
                  </div>
                  {/* Label gradient */}
                  {activeCam && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.65))', padding: '14px 8px 28px', pointerEvents: 'none' }}>
                      <div style={{ fontSize: 9, fontWeight: 800, color: '#fff', letterSpacing: '-0.01em' }}>{activeCam.mediaTypeLabel}</div>
                    </div>
                  )}
                </div>
                {/* Cycle bar */}
                <div style={{ display: 'flex', alignItems: 'center', height: 26, borderTop: '2px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
                  <button
                    onClick={() => setCamIdx(i => (i - 1 + Math.max(camPoints.length, 1)) % Math.max(camPoints.length, 1))}
                    disabled={camPoints.length < 2}
                    style={{ width: 28, height: '100%', background: 'none', border: 'none', color: camPoints.length < 2 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 900, cursor: camPoints.length < 2 ? 'not-allowed' : 'pointer' }}
                  >&lt;</button>
                  <div style={{ flex: 1, textAlign: 'center', fontSize: 8, fontWeight: 900, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)' }}>
                    {camPoints.length > 0 ? `${safeCamIdx + 1} / ${camPoints.length}` : '—'}
                  </div>
                  <button
                    onClick={() => setCamIdx(i => (i + 1) % Math.max(camPoints.length, 1))}
                    disabled={camPoints.length < 2}
                    style={{ width: 28, height: '100%', background: 'none', border: 'none', color: camPoints.length < 2 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 900, cursor: camPoints.length < 2 ? 'not-allowed' : 'pointer' }}
                  >&gt;</button>
                </div>
              </div>

              {/* Live agent POV — video call */}
              <div style={{
                flex: 1, minWidth: 0,
                borderLeft: '4px solid #121212',
                background: '#080a10',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* 3D agent model — live walk animation */}
                <AgentCameraFeed agentIndex={safeIndex} />

                {/* Scan-line overlay */}
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
                }} />

                {/* Corner brackets — video call chrome */}
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                  {/* top-left */}
                  <div style={{ position: 'absolute', top: 8, left: 8, width: 14, height: 14, borderTop: '2px solid rgba(73,145,255,0.7)', borderLeft: '2px solid rgba(73,145,255,0.7)' }} />
                  {/* top-right */}
                  <div style={{ position: 'absolute', top: 8, right: 8, width: 14, height: 14, borderTop: '2px solid rgba(73,145,255,0.7)', borderRight: '2px solid rgba(73,145,255,0.7)' }} />
                  {/* bottom-left */}
                  <div style={{ position: 'absolute', bottom: 8, left: 8, width: 14, height: 14, borderBottom: '2px solid rgba(73,145,255,0.7)', borderLeft: '2px solid rgba(73,145,255,0.7)' }} />
                  {/* bottom-right */}
                  <div style={{ position: 'absolute', bottom: 8, right: 8, width: 14, height: 14, borderBottom: '2px solid rgba(73,145,255,0.7)', borderRight: '2px solid rgba(73,145,255,0.7)' }} />
                </div>

                {/* Top bar: LIVE + cycle */}
                <div style={{
                  position: 'absolute', top: 6, left: 0, right: 0, paddingLeft: 28,
                  display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'space-between',
                  paddingRight: 28,
                }}>
                  <div style={{
                    background: '#D02020', color: '#fff',
                    fontSize: 8, fontWeight: 900, letterSpacing: '0.12em',
                    padding: '2px 5px',
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}>
                    <span style={{
                      width: 5, height: 5, borderRadius: '50%', background: '#fff',
                      display: 'inline-block', animation: 'blink 1.2s step-start infinite',
                    }} />
                    LIVE
                  </div>
                  <button
                    type="button"
                    onClick={nextBoard}
                    disabled={total < 2}
                    title="Cycle agent"
                    style={{
                      background: 'rgba(18,18,18,0.75)',
                      border: '1.5px solid rgba(73,145,255,0.5)',
                      color: 'rgba(73,145,255,0.9)',
                      fontSize: 9, fontWeight: 900,
                      padding: '2px 6px',
                      cursor: total < 2 ? 'not-allowed' : 'pointer',
                      letterSpacing: '0.04em',
                      lineHeight: 1.4,
                    }}
                  >
                    {total > 0 ? `${safeIndex + 1}/${total}` : '0/0'} →
                  </button>
                </div>

                {/* Bottom: agent identity + last billboard */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(4,6,16,0.9))',
                  padding: '18px 10px 8px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {/* Avatar circle */}
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%',
                      background: '#1040C0',
                      border: '2px solid rgba(73,145,255,0.7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg viewBox="0 0 20 26" width={10} height={14} fill="#fff">
                        <ellipse cx="10" cy="8" rx="5" ry="5.5" />
                        <path d="M2 24c0-5 3.5-8 8-8s8 3 8 8" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>
                        {capture?.agentName ?? '—'}
                      </div>
                      <div style={{ fontSize: 7, fontWeight: 700, color: 'rgba(73,145,255,0.8)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 1 }}>
                        AGENT · LIVE FEED
                      </div>
                    </div>
                  </div>
                  {capture && !analysisCache.has(capture.id) && (
                    <button
                      type="button"
                      onClick={() => void analyzeCapture()}
                      disabled={!!analyzingId}
                      style={{
                        marginTop: 6,
                        background: analyzingId === capture.id ? 'rgba(255,255,255,0.1)' : 'rgba(16,64,192,0.85)',
                        border: '1px solid rgba(73,145,255,0.4)',
                        color: '#fff',
                        fontSize: 9, fontWeight: 900, letterSpacing: '0.08em',
                        padding: '3px 8px',
                        cursor: analyzingId ? 'not-allowed' : 'pointer',
                        textTransform: 'uppercase',
                      }}
                    >
                      {analyzingId === capture.id ? 'Analyzing…' : 'Analyze Placement'}
                    </button>
                  )}
                  {capture && analysisCache.has(capture.id) && (
                    <div style={{ marginTop: 4, fontSize: 8, fontWeight: 700, color: '#4CAF50', letterSpacing: '0.08em' }}>
                      ✓ AI ANALYSIS READY
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pedestrian chat row */}
            <div style={{
              borderBottom: '4px solid #121212',
              background: '#F8F8F8',
              display: 'flex',
              flexDirection: 'column',
              flexShrink: 0,
            }}>
              {/* Message history */}
              {chatMsgs.length > 0 && (
                <div
                  ref={chatBodyRef}
                  style={{
                    maxHeight: 90,
                    overflowY: 'auto',
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 5,
                    borderBottom: '2px solid #e0e0e0',
                  }}
                >
                  {chatMsgs.map((m, i) => (
                    <div key={i} style={{
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      background: m.role === 'user' ? '#1040C0' : '#121212',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 600,
                      lineHeight: 1.45,
                      padding: '4px 8px',
                    }}>
                      {m.content}
                    </div>
                  ))}
                  {chatLoading && (
                    <div style={{ alignSelf: 'flex-start', fontSize: 10, color: '#888', fontStyle: 'italic' }}>…</div>
                  )}
                </div>
              )}
              {/* Input row */}
              <div style={{ display: 'flex', alignItems: 'stretch', height: 36 }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') sendChat() }}
                  placeholder={capture ? `Talk to ${capture.agentName}…` : 'No agent selected'}
                  disabled={!capture || chatLoading}
                  style={{
                    flex: 1,
                    border: 'none',
                    borderRight: '3px solid #121212',
                    background: 'transparent',
                    padding: '0 10px',
                    fontSize: 11,
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    color: '#121212',
                    outline: 'none',
                  }}
                />
                <button
                  onClick={sendChat}
                  disabled={!capture || !chatInput.trim() || chatLoading}
                  style={{
                    width: 52,
                    border: 'none',
                    background: chatLoading ? '#ccc' : '#1040C0',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: '0.06em',
                    cursor: (!capture || !chatInput.trim() || chatLoading) ? 'not-allowed' : 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {chatLoading ? '…' : 'SEND'}
                </button>
              </div>
            </div>

            {/* Creative chips strip */}
            <div className="bh-creative-chips" style={{ borderBottom: '4px solid #121212', flexShrink: 0, height: 48 }}>
              {metrics.creativeMetrics.map(m => (
                <div key={m.id} className={`bh-chip is-${m.tone}`}>
                  <span className="bh-chip__label">{m.label}</span>
                  <span className="bh-chip__value">{m.value}</span>
                </div>
              ))}
            </div>

            {/* Metrics grid — real AI analysis when available, otherwise mock */}
            <div className="bh-metrics-col">
              {analysisError && (
                <div style={{ padding: '8px 10px', fontSize: 9, color: '#D02020', fontWeight: 700 }}>{analysisError}</div>
              )}
              {capture && analysisCache.has(capture.id) ? (() => {
                const r = analysisCache.get(capture.id)!
                const aiMetrics: ScoreMetric[] = [
                  { id: 'impression', label: 'First Impression', value: 'AI', detail: r.firstImpression, tone: 'neutral', progress: 70 },
                  { id: 'attention', label: 'Likely Attention', value: 'AI', detail: r.likelyAttention, tone: 'good', progress: 75 },
                  { id: 'confusion', label: 'Confusion Risk', value: 'AI', detail: r.likelyConfusion, tone: 'watch', progress: 35 },
                  { id: 'recommendation', label: 'Recommendation', value: 'AI', detail: r.simpleRecommendation, tone: 'good', progress: 80 },
                ]
                return (
                  <>
                    <div style={{ padding: '4px 10px 2px', fontSize: 8, fontWeight: 900, color: '#1040C0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      AI Placement Analysis · {capture.agentName}
                    </div>
                    <div className="bh-metric-grid">
                      {aiMetrics.map(m => <BhMetricCard key={m.id} metric={m} />)}
                    </div>
                  </>
                )
              })() : (
                <div className="bh-metric-grid">
                  {metrics.primaryMetrics.map(m => (
                    <BhMetricCard key={m.id} metric={m} />
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Right — polaroid stream */}
          <div className="bh-dash__right" ref={rightPanelRef}>
            {allCaptures.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, padding: 24 }}>
                <div style={{ fontSize: 22, opacity: 0.15 }}>📷</div>
                <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', textAlign: 'center' }}>No captures yet</div>
                <div style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.15)', textAlign: 'center', lineHeight: 1.5, maxWidth: 140 }}>Agent sightings will appear here as they walk past OOH inventory</div>
              </div>
            ) : (
              <PolaroidStream className="polaroids-stream--dashboard" scrollRootRef={rightPanelRef} liveCaptures={allCaptures} />
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
