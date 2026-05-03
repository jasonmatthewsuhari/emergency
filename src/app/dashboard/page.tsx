'use client'

import { useRef, useState } from 'react'
import PolaroidStream from '@/components/PolaroidStream'

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
  context: string
  seconds: number
  attention: number
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

const billboards: BillboardData[] = [
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
  { persona: 'Pedestrian commute', context: 'Walking', seconds: 8.4, attention: 76 },
  { persona: 'Taxi queue', context: 'Waiting', seconds: 21.7, attention: 89 },
  { persona: 'Retail shopper', context: 'Shopping', seconds: 14.2, attention: 81 },
  { persona: 'Driver approach', context: 'Driving', seconds: 3.8, attention: 42 },
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

export default function DashboardPage() {
  const [selectedBillboard, setSelectedBillboard] = useState(billboards[0].id)
  const [selectedPersona, setSelectedPersona] = useState(personaExposure[1].persona)
  const polaroidScrollRef = useRef<HTMLDivElement | null>(null)

  const board = billboards.find(b => b.id === selectedBillboard) ?? billboards[0]

  return (
    <main className="bh-dash">
      <div className="bh-dash__left">

        {/* Header: yellow title | billboard switcher | red score */}
        <header className="bh-dash__header" aria-label="OOH Performance Dashboard">
          <div className="bh-dash__title">
            <p>Sightline Intelligence</p>
            <h1>
              <span>OOH</span>
              <span>Performance</span>
              <span>Cockpit</span>
            </h1>
          </div>

          <div className="bh-billboard-switcher" role="tablist" aria-label="Select billboard">
            {billboards.map(b => (
              <button
                key={b.id}
                type="button"
                role="tab"
                aria-selected={selectedBillboard === b.id}
                className={selectedBillboard === b.id ? 'is-active' : ''}
                onClick={() => setSelectedBillboard(b.id)}
              >
                <span className="bh-billboard-switcher__name">{b.name}</span>
                <span className="bh-billboard-switcher__score">{b.score}</span>
              </button>
            ))}
          </div>

          <div className="bh-score" aria-label={`Sightline Score ${board.score} out of 100`}>
            <strong>{board.score}</strong>
            <span>/100</span>
            <p>Sightline Score</p>
          </div>
        </header>

        {/* Body: path viz (left) + metrics column (right) */}
        <div className="bh-dash__body">

          <section className="bh-path-panel" aria-label="Approach path visibility model">
            <div className="bh-panel-header">
              <span>Visibility Model</span>
              <strong>{board.primaryMetrics[0].value} visible</strong>
            </div>

            <div className="bh-path" role="img" aria-label="Sightline diagram showing approach path coverage">
              <div className="bh-path__street" />
              <div className="bh-path__sightline bh-path__sightline--a" />
              <div className="bh-path__sightline bh-path__sightline--b" />
              <div className="bh-path__sightline bh-path__sightline--c" />
              <div className="bh-path__billboard">
                <span>{board.headline}</span>
                <strong>{board.brand}</strong>
              </div>
              <span className="bh-path__marker bh-path__marker--driver">Driver</span>
              <span className="bh-path__marker bh-path__marker--pedestrian">Pedestrian</span>
              <span className="bh-path__blocker bh-path__blocker--trees">Trees</span>
              <span className="bh-path__blocker bh-path__blocker--pole">Pole</span>
            </div>

            <div className="bh-personas" role="tablist" aria-label="Persona exposure paths">
              {personaExposure.map(p => (
                <button
                  key={p.persona}
                  type="button"
                  role="tab"
                  aria-selected={selectedPersona === p.persona}
                  className={selectedPersona === p.persona ? 'is-active' : ''}
                  onClick={() => setSelectedPersona(p.persona)}
                >
                  <span>{p.persona.split(' ')[0]}</span>
                  <strong>{p.seconds.toFixed(1)}s</strong>
                </button>
              ))}
            </div>
          </section>

          <div className="bh-metrics-col">
            <div className="bh-metric-grid" aria-label="Location quality metrics">
              {board.primaryMetrics.map(m => <BhMetricCard metric={m} key={m.id} />)}
            </div>

            <div className="bh-bottom-row">
              <div className="bh-exposure" aria-label={`Attention weighted exposure index ${board.exposureIndex}`}>
                <span>Exposure Index</span>
                <strong>{board.exposureIndex}</strong>
              </div>

              <div className="bh-winner" aria-label="A/B creative comparison">
                <article>
                  <span>Creative A</span>
                  <strong>{board.abA.score}</strong>
                  <em>Wins</em>
                </article>
                <article>
                  <span>Creative B</span>
                  <strong>{board.abB.score}</strong>
                  <em>−{board.abA.score - board.abB.score} pts</em>
                </article>
              </div>
            </div>
          </div>
        </div>

        {/* Footer: creative diagnostic chips + export */}
        <footer className="bh-dash__footer" aria-label="Creative diagnostics and export">
          <div className="bh-creative-chips" role="list" aria-label="Creative diagnostic signals">
            {board.creativeMetrics.map(m => (
              <div key={m.id} className={`bh-chip is-${m.tone}`} role="listitem">
                <span className="bh-chip__label">{m.label}</span>
                <span className="bh-chip__value">{m.value}</span>
              </div>
            ))}
          </div>

          <details className="bh-export">
            <summary>Export</summary>
            <div className="bh-export__menu">
              {exportOptions.map(opt => (
                <button type="button" key={opt}>{opt}</button>
              ))}
            </div>
          </details>
        </footer>
      </div>

      {/* Right 40% */}
      <div className="bh-dash__right" ref={polaroidScrollRef}>
        <PolaroidStream className="polaroids-stream--dashboard" scrollRootRef={polaroidScrollRef} />
      </div>
    </main>
  )
}
