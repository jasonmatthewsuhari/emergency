'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  AgencyDemoEvent,
  AgencyDemoRun,
  CapturedSceneImage,
  LatLng,
  SceneResponseApiResponse,
} from '@/types'

const DEFAULT_BRIEF = 'Launch a 4-week OOH campaign for a premium gym targeting young professionals near the selected area. Budget: SGD 20k.'

interface AgencyDemoPanelProps {
  selectedArea: LatLng | null
  fallbackArea: LatLng
  sceneCapture: CapturedSceneImage | null
  captureStatus: string
  onCaptureScene: () => Promise<CapturedSceneImage | null>
  onSceneUpload: (image: CapturedSceneImage) => void
}

interface UploadedImage {
  dataUrl: string
  fileName: string
}

function formatCoord(area: LatLng): string {
  return `${area.lat.toFixed(4)}, ${area.lng.toFixed(4)}`
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Could not read image file.'))
    }
    reader.onerror = () => reject(new Error('Could not read image file.'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Could not load image.'))
    image.src = src
  })
}

async function compressImageDataUrl(dataUrl: string): Promise<string> {
  const image = await loadImage(dataUrl)
  const maxEdge = 1400
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare image compression.')
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  return canvas.toDataURL('image/jpeg', 0.82)
}

export default function AgencyDemoPanel({
  selectedArea,
  fallbackArea,
  sceneCapture,
  captureStatus,
  onCaptureScene,
  onSceneUpload,
}: AgencyDemoPanelProps) {
  const [brief, setBrief] = useState(DEFAULT_BRIEF)
  const [run, setRun] = useState<AgencyDemoRun | null>(null)
  const [visibleEvents, setVisibleEvents] = useState<AgencyDemoEvent[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [isWaitingForApproval, setIsWaitingForApproval] = useState(false)
  const [hasApproval, setHasApproval] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adImage, setAdImage] = useState<UploadedImage | null>(null)
  const [sceneResponse, setSceneResponse] = useState<SceneResponseApiResponse | null>(null)
  const [isAnalyzingScene, setIsAnalyzingScene] = useState(false)
  const [sceneResponseError, setSceneResponseError] = useState<string | null>(null)

  const area = selectedArea ?? fallbackArea
  const completedEvents = visibleEvents.filter(event => event.status === 'complete').length
  const progress = run ? Math.round((completedEvents / run.events.length) * 100) : 0

  const sortedCandidates = useMemo(
    () => [...(run?.candidates ?? [])].sort((a, b) => b.sightlineScore - a.sightlineScore),
    [run]
  )

  const startRun = useCallback(async () => {
    setError(null)
    setRun(null)
    setVisibleEvents([])
    setHasApproval(false)
    setIsWaitingForApproval(false)
    setIsRunning(true)

    try {
      const res = await fetch('/api/agency-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area, brief }),
      })

      if (!res.ok) throw new Error(`Demo run failed with status ${res.status}`)

      const nextRun = await res.json() as AgencyDemoRun
      setRun(nextRun)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not start agency demo')
      setIsRunning(false)
    }
  }, [area, brief])

  useEffect(() => {
    if (!run || !isRunning || isWaitingForApproval) return

    const nextEvent = run.events[visibleEvents.length]
    if (!nextEvent) {
      setIsRunning(false)
      return
    }

    if (nextEvent.status === 'needs-approval' && !hasApproval) {
      const timer = window.setTimeout(() => {
        setVisibleEvents(events => [...events, nextEvent])
        setIsWaitingForApproval(true)
      }, nextEvent.delayMs)

      return () => window.clearTimeout(timer)
    }

    const eventToAdd = nextEvent.status === 'needs-approval'
      ? { ...nextEvent, status: 'complete' as const, title: 'Vendor outreach approved' }
      : nextEvent

    const timer = window.setTimeout(() => {
      setVisibleEvents(events => [...events, eventToAdd])
    }, nextEvent.delayMs)

    return () => window.clearTimeout(timer)
  }, [hasApproval, isRunning, isWaitingForApproval, run, visibleEvents.length])

  const approveInquiry = useCallback(() => {
    setHasApproval(true)
    setIsWaitingForApproval(false)
    setVisibleEvents(events => events.map(event =>
      event.id === 'evt_inquiry_approval'
        ? {
            ...event,
            status: 'complete',
            title: 'Approved vendor inquiry checkpoint',
            detail: 'Human approval captured. The agent can continue preparing the inquiry packet and campaign recommendation.',
          }
        : event
    ))
  }, [])

  const handleSceneUpload = useCallback(async (file: File | undefined) => {
    if (!file) return
    setSceneResponseError(null)

    try {
      const dataUrl = await compressImageDataUrl(await readFileAsDataUrl(file))
      onSceneUpload({
        dataUrl,
        capturedAt: `Uploaded ${file.name}`,
      })
    } catch (err: unknown) {
      setSceneResponseError(err instanceof Error ? err.message : 'Could not upload scene screenshot.')
    }
  }, [onSceneUpload])

  const handleAdUpload = useCallback(async (file: File | undefined) => {
    if (!file) {
      setAdImage(null)
      return
    }
    setSceneResponseError(null)

    try {
      setAdImage({
        dataUrl: await compressImageDataUrl(await readFileAsDataUrl(file)),
        fileName: file.name,
      })
    } catch (err: unknown) {
      setSceneResponseError(err instanceof Error ? err.message : 'Could not upload ad creative.')
    }
  }, [])

  const analyzeSceneResponse = useCallback(async () => {
    if (!sceneCapture) {
      setSceneResponseError('Capture or upload a scene image first.')
      return
    }

    setIsAnalyzingScene(true)
    setSceneResponseError(null)
    setSceneResponse(null)

    try {
      const res = await fetch('/api/scene-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneImage: { dataUrl: sceneCapture.dataUrl },
          adImage: adImage ? { dataUrl: adImage.dataUrl } : null,
          brief,
          viewerProfile: 'urban pedestrian or commuter with short dwell time, partial phone distraction, and normal sensitivity to visual clutter',
        }),
      })

      const body = await res.json() as SceneResponseApiResponse | { error?: string }
      if (!res.ok) {
        throw new Error('error' in body && body.error ? body.error : `Scene response failed with status ${res.status}`)
      }

      setSceneResponse(body as SceneResponseApiResponse)
    } catch (err: unknown) {
      setSceneResponseError(err instanceof Error ? err.message : 'Could not analyze scene response.')
    } finally {
      setIsAnalyzingScene(false)
    }
  }, [adImage, brief, sceneCapture])

  return (
    <aside className="agency-panel" aria-label="Managed agent agency demo">
      <div className="agency-panel__header">
        <div>
          <p className="agency-eyebrow">Managed Agents Demo</p>
          <h1>AI OOH Agency Operator</h1>
        </div>
        <span className="agency-badge">Session</span>
      </div>

      <p className="agency-copy">
        Run discovery, qualification, Sightline simulation, vendor inquiry prep, and proposal generation as one managed agent workflow.
      </p>

      <label className="agency-field">
        <span>Campaign brief</span>
        <textarea value={brief} onChange={event => setBrief(event.target.value)} />
      </label>

      <div className="agency-area">
        <span>Selected area</span>
        <strong>{formatCoord(area)}</strong>
      </div>

      <section className="vision-lab" aria-label="Scene response simulator">
        <div className="vision-lab__header">
          <div>
            <p className="agency-eyebrow">Multimodal Agent</p>
            <h2>Viewer Response</h2>
          </div>
          <button type="button" onClick={() => void onCaptureScene()}>Capture View</button>
        </div>

        <p className="vision-lab__status">
          {sceneCapture ? `${captureStatus} ${sceneCapture.capturedAt}` : captureStatus}
        </p>

        <div className="vision-grid">
          <label className="vision-upload">
            <span>Scene image</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={event => void handleSceneUpload(event.target.files?.[0])}
            />
            {sceneCapture ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sceneCapture.dataUrl} alt="Captured 3D scene view" />
            ) : <small>Capture or upload</small>}
          </label>

          <label className="vision-upload">
            <span>Ad creative</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={event => void handleAdUpload(event.target.files?.[0])}
            />
            {adImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={adImage.dataUrl} alt={adImage.fileName} />
            ) : <small>Optional upload</small>}
          </label>
        </div>

        <button
          className="vision-analyze"
          type="button"
          onClick={() => void analyzeSceneResponse()}
          disabled={!sceneCapture || isAnalyzingScene}
        >
          {isAnalyzingScene ? 'Analyzing' : 'Analyze Simple Response'}
        </button>

        {sceneResponseError ? <p className="agency-error">{sceneResponseError}</p> : null}

        {sceneResponse ? (
          <div className="vision-result">
            <article>
              <span>Scene</span>
              <p>{sceneResponse.result.sceneDescription}</p>
            </article>
            <article>
              <span>Ad</span>
              <p>{sceneResponse.result.adDescription}</p>
            </article>
            <article>
              <span>First impression</span>
              <p>{sceneResponse.result.firstImpression}</p>
            </article>
            <article>
              <span>Attention</span>
              <p>{sceneResponse.result.likelyAttention}</p>
            </article>
            <article>
              <span>Confusion</span>
              <p>{sceneResponse.result.likelyConfusion}</p>
            </article>
            <article>
              <span>Recommendation</span>
              <p>{sceneResponse.result.simpleRecommendation}</p>
            </article>
            <footer>
              <span>{sceneResponse.model}</span>
              <strong>${sceneResponse.budget.remainingUsd.toFixed(2)} budget left</strong>
            </footer>
          </div>
        ) : null}
      </section>

      <button className="agency-primary" type="button" onClick={startRun} disabled={isRunning}>
        {isRunning ? 'Agent Running' : 'Run Agency Agent'}
      </button>

      {error ? <p className="agency-error">{error}</p> : null}

      {run ? (
        <>
          <div className="agency-session">
            <span>{run.agentId}</span>
            <strong>{run.sessionId}</strong>
            <div className="agency-progress" aria-label={`Agent progress ${progress}%`}>
              <div style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="agency-timeline">
            {visibleEvents.map(event => (
              <article className={`agency-event agency-event--${event.status}`} key={event.id}>
                <div>
                  <span>{event.phase}</span>
                  <strong>{event.title}</strong>
                </div>
                <p>{event.detail}</p>
                <footer>
                  <span>{event.actor}</span>
                  {event.toolName ? <code>{event.toolName}</code> : null}
                </footer>
              </article>
            ))}
          </div>

          {isWaitingForApproval ? (
            <div className="agency-approval">
              <strong>Human approval gate</strong>
              <p>In production this is where the agent pauses before sending vendor inquiries, spending money, or sharing client data.</p>
              <button type="button" onClick={approveInquiry}>Approve Inquiry Drafts</button>
            </div>
          ) : null}

          {sortedCandidates.length > 0 ? (
            <div className="agency-candidates">
              <h2>Shortlist</h2>
              {sortedCandidates.map(candidate => (
                <article key={candidate.id}>
                  <div>
                    <strong>{candidate.name}</strong>
                    <span>{candidate.sightlineScore}</span>
                  </div>
                  <p>{candidate.format}</p>
                  <small>{candidate.monthlyEstimate} / {candidate.estimatedWeeklyReach.toLocaleString()} weekly reach</small>
                </article>
              ))}
            </div>
          ) : null}

          {!isRunning && !isWaitingForApproval ? (
            <div className="agency-proposal">
              <h2>Proposal</h2>
              <p>{run.proposal.recommendation}</p>
              <strong>{run.proposal.budgetPlan}</strong>
              <ul>
                {run.proposal.nextActions.map(action => <li key={action}>{action}</li>)}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </aside>
  )
}
