'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import PolaroidStream from '@/components/PolaroidStream'
import type { AgentCapture, BillboardPlacement, OohMapPoint } from '@/types'

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
}

interface ChatMsg { role: 'user' | 'assistant'; content: string }

export default function DashboardOverlay({ onClose, captures, billboards = [], oohPoints = [], mapboxToken = '' }: Props) {
  const [boardIndex, setBoardIndex] = useState(0)
  const camPoints = oohPoints.length > 0 ? oohPoints.slice(0, 30) : []
  const [camIdx, setCamIdx] = useState(0)
  const safeCamIdx = camPoints.length > 0 ? camIdx % camPoints.length : 0
  const activeCam = camPoints[safeCamIdx] ?? null
  const rightPanelRef = useRef<HTMLDivElement | null>(null)

  const total = captures.length
  const safeIndex = total > 0 ? Math.min(boardIndex, total - 1) : 0
  const capture = captures[safeIndex] ?? null
  const metrics = MOCK_BILLBOARD_METRICS[safeIndex % MOCK_BILLBOARD_METRICS.length]

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

              {/* Camera feed */}
              <div style={{
                flex: 1, minWidth: 0,
                borderLeft: '4px solid #121212',
                background: '#0a0a0a',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {capture?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={capture.imageUrl}
                    alt="Agent POV"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0.92 }}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: '100%',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 6,
                  }}>
                    <div style={{ fontSize: 18, opacity: 0.25, color: '#fff' }}>⬛</div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', textTransform: 'uppercase' }}>No feed</div>
                  </div>
                )}

                {/* Scan-line overlay */}
                <div style={{
                  position: 'absolute', inset: 0, pointerEvents: 'none',
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
                }} />

                {/* Top-right: LIVE badge + cycle button */}
                <div style={{
                  position: 'absolute', top: 6, right: 6,
                  display: 'flex', gap: 4, alignItems: 'center',
                }}>
                  <div style={{
                    background: '#D02020', color: '#fff',
                    fontSize: 8, fontWeight: 900, letterSpacing: '0.12em',
                    padding: '2px 5px',
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}>
                    <span style={{
                      width: 5, height: 5, borderRadius: '50%',
                      background: '#fff',
                      display: 'inline-block',
                      animation: 'blink 1.2s step-start infinite',
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
                      border: '1.5px solid rgba(255,255,255,0.35)',
                      color: '#fff',
                      fontSize: 10, fontWeight: 900,
                      padding: '2px 7px',
                      cursor: total < 2 ? 'not-allowed' : 'pointer',
                      letterSpacing: '0.04em',
                      lineHeight: 1.4,
                    }}
                  >
                    {safeIndex + 1}/{total} →
                  </button>
                </div>

                {/* Bottom: agent name + billboard */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(transparent, rgba(0,0,0,0.72))',
                  padding: '14px 8px 6px',
                  pointerEvents: 'none',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 900, color: '#fff', letterSpacing: '-0.01em' }}>
                    {capture?.agentName ?? '—'}
                  </div>
                  <div style={{ fontSize: 8, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 1 }}>
                    {capture?.billboardName ?? metrics.name}
                  </div>
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

            {/* Metrics grid */}
            <div className="bh-metrics-col">
              <div className="bh-metric-grid">
                {metrics.primaryMetrics.map(m => (
                  <BhMetricCard key={m.id} metric={m} />
                ))}
              </div>
            </div>

          </div>

          {/* Right — polaroid stream */}
          <div className="bh-dash__right" ref={rightPanelRef}>
            <PolaroidStream className="polaroids-stream--dashboard" scrollRootRef={rightPanelRef} liveCaptures={captures} />
          </div>
        </main>
      </div>
    </div>
  )
}
