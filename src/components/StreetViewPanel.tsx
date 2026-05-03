'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { BillboardPlacement, LatLng } from '@/types'

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

const BILLBOARD_W = 320
const BILLBOARD_H = 120
const BILLBOARD_POLE_H = 64
const PLACE_DISTANCE_M = 20

// ── Geo helpers ──────────────────────────────────────────────────────────────
function bearingTo(from: LatLng, to: LatLng): number {
  const dLng = (to.lng - from.lng) * Math.PI / 180
  const lat1 = from.lat * Math.PI / 180
  const lat2 = to.lat * Math.PI / 180
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360
}

function distanceTo(from: LatLng, to: LatLng): number {
  const R = 6371000
  const dLat = (to.lat - from.lat) * Math.PI / 180
  const dLng = (to.lng - from.lng) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function projectForward(from: LatLng, headingDeg: number, distanceM: number): LatLng {
  const R = 6371000
  const brng = headingDeg * Math.PI / 180
  const lat1 = from.lat * Math.PI / 180
  const lon1 = from.lng * Math.PI / 180
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(distanceM / R) +
    Math.cos(lat1) * Math.sin(distanceM / R) * Math.cos(brng)
  )
  const lon2 = lon1 + Math.atan2(
    Math.sin(brng) * Math.sin(distanceM / R) * Math.cos(lat1),
    Math.cos(distanceM / R) - Math.sin(lat1) * Math.sin(lat2)
  )
  return { lat: lat2 * 180 / Math.PI, lng: lon2 * 180 / Math.PI }
}

// ── Maps script loader (singleton) ───────────────────────────────────────────
let _mapsPromise: Promise<void> | null = null

function loadMapsApi(key: string): Promise<void> {
  if (typeof google !== 'undefined' && google.maps?.StreetViewPanorama) return Promise.resolve()
  if (_mapsPromise) return _mapsPromise
  _mapsPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${key}`
    s.async = true
    s.onload = () => resolve()
    s.onerror = (e) => { _mapsPromise = null; reject(e) }
    document.head.appendChild(s)
  })
  return _mapsPromise
}

// ── AR panorama view ──────────────────────────────────────────────────────────
interface ProjectedBillboard {
  id: string
  x: number
  y: number
  scale: number
  visible: boolean
  label: string
}

interface StreetViewARViewProps {
  location: LatLng
  apiKey: string
  billboards: BillboardPlacement[]
  onPlaceBillboard: (pos: LatLng, heading: number) => void
}

function StreetViewARView({ location, apiKey, billboards, onPlaceBillboard }: StreetViewARViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const panoRef = useRef<google.maps.StreetViewPanorama | null>(null)
  const [projected, setProjected] = useState<ProjectedBillboard[]>([])
  const [placing, setPlacing] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    loadMapsApi(apiKey).then(() => {
      if (cancelled || !containerRef.current) return

      const pano = new google.maps.StreetViewPanorama(containerRef.current, {
        position: { lat: location.lat, lng: location.lng },
        pov: { heading: 0, pitch: 0 },
        zoom: 1,
        addressControl: false,
        fullscreenControl: false,
        motionTracking: false,
        motionTrackingControl: false,
        showRoadLabels: false,
      })
      panoRef.current = pano

      const project = () => {
        if (cancelled || !containerRef.current) return
        const pov = pano.getPov()
        const zoom = pano.getZoom() ?? 1
        const panoPos = pano.getPosition()
        if (!panoPos) return

        const viewerPos: LatLng = { lat: panoPos.lat(), lng: panoPos.lng() }
        const { width, height } = containerRef.current.getBoundingClientRect()
        const hFOV = 180 / Math.pow(2, zoom - 1)
        const vFOV = hFOV * (height / width)

        const next: ProjectedBillboard[] = []
        for (const bb of billboards) {
          const dist = distanceTo(viewerPos, bb.position)
          if (dist > 400) continue

          const heading = bearingTo(viewerPos, bb.position)
          const centerHeightM = bb.clearanceM + bb.heightM / 2
          const pitchDeg = Math.atan2(centerHeightM, Math.max(dist, 1)) * 180 / Math.PI

          const dH = ((heading - pov.heading) + 540) % 360 - 180
          const dP = pitchDeg - (pov.pitch ?? 0)

          const nx = dH / (hFOV / 2)
          const ny = dP / (vFOV / 2)

          const x = width / 2 + nx * (width / 2)
          const y = height / 2 - ny * (height / 2)

          // Physically correct angular size: how much of the FOV does this billboard occupy
          const angularFrac = (2 * Math.atan2(bb.widthM / 2, Math.max(dist, 5))) / (hFOV * Math.PI / 180)
          const edgeFade = Math.max(0, 1 - Math.abs(nx) * 0.85)
          const scale = angularFrac * (width / BILLBOARD_W) * Math.pow(2, zoom - 1) * edgeFade

          next.push({
            id: bb.id,
            x,
            y,
            scale,
            visible: Math.abs(nx) < 1.3 && Math.abs(ny) < 1.5 && scale > 0.02,
            label: bb.name,
          })
        }
        setProjected(next)
      }

      pano.addListener('pov_changed', project)
      pano.addListener('status_changed', project)
    }).catch(() => {})

    return () => { cancelled = true }
  }, [location, apiKey, billboards])

  const handlePlace = useCallback(() => {
    if (!panoRef.current) return
    const pov = panoRef.current.getPov()
    const panoPos = panoRef.current.getPosition()
    if (!panoPos) return
    const viewerPos: LatLng = { lat: panoPos.lat(), lng: panoPos.lng() }
    const placedPos = projectForward(viewerPos, pov.heading, PLACE_DISTANCE_M)
    onPlaceBillboard(placedPos, (pov.heading + 180) % 360)
    setPlacing(false)
  }, [onPlaceBillboard])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {/* Overlay layer — sits above the Maps canvas, clips at container boundary */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 100 }}>
      {projected.filter(p => p.visible).map(p => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            transform: `translate(-50%, -100%) scale(${p.scale})`,
            transformOrigin: '50% 100%',
            willChange: 'transform, left, top',
          }}
        >
          <img
            src="/billboard-halo.svg"
            alt=""
            style={{
              position: 'absolute',
              left: '50%',
              bottom: BILLBOARD_POLE_H,
              transform: 'translateX(-50%)',
              width: BILLBOARD_W * 1.6,
              height: BILLBOARD_H * 2.4,
              opacity: 0.85,
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: BILLBOARD_POLE_H + BILLBOARD_H + 6,
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'rgba(0,0,0,0.75)',
              color: '#009E73',
              fontFamily: 'monospace',
              fontSize: 9,
              letterSpacing: '0.1em',
              padding: '2px 6px',
              whiteSpace: 'nowrap',
            }}
          >
            {p.label}
          </div>
          <img
            src="/billboard-creative.svg"
            alt={p.label}
            style={{
              display: 'block',
              width: BILLBOARD_W,
              height: BILLBOARD_H,
              boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
              border: '2px solid rgba(255,255,255,0.12)',
              position: 'relative',
            }}
          />
          <div
            style={{
              width: 5,
              height: BILLBOARD_POLE_H,
              background: 'linear-gradient(to bottom, #999, #555)',
              margin: '0 auto',
            }}
          />
        </div>
      ))}
      </div>{/* end overlay layer */}

      {/* Place mode crosshair */}
      {placing && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 101,
          }}
        >
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
            <circle cx="28" cy="28" r="14" stroke="#009E73" strokeWidth="1.5" opacity="0.9" />
            <line x1="28" y1="4" x2="28" y2="18" stroke="#009E73" strokeWidth="1.5" />
            <line x1="28" y1="38" x2="28" y2="52" stroke="#009E73" strokeWidth="1.5" />
            <line x1="4" y1="28" x2="18" y2="28" stroke="#009E73" strokeWidth="1.5" />
            <line x1="38" y1="28" x2="52" y2="28" stroke="#009E73" strokeWidth="1.5" />
            <circle cx="28" cy="28" r="2" fill="#009E73" />
          </svg>
        </div>
      )}

      {/* Place controls */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'flex-end',
          zIndex: 101,
        }}
      >
        {placing ? (
          <>
            <div
              style={{
                background: 'rgba(0,0,0,0.8)',
                color: '#009E73',
                fontFamily: 'monospace',
                fontSize: 10,
                letterSpacing: '0.1em',
                padding: '4px 8px',
                border: '1px solid rgba(0,158,115,0.3)',
              }}
            >
              AIM AT PLACEMENT SPOT
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                onClick={() => setPlacing(false)}
                style={{
                  background: 'none',
                  border: '2px solid #444',
                  color: '#aaa',
                  cursor: 'pointer',
                  padding: '5px 12px',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  letterSpacing: '0.08em',
                }}
              >
                CANCEL
              </button>
              <button
                type="button"
                onClick={handlePlace}
                style={{
                  background: '#009E73',
                  border: 'none',
                  color: '#000',
                  cursor: 'pointer',
                  padding: '5px 12px',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                }}
              >
                PLACE HERE
              </button>
            </div>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setPlacing(true)}
            style={{
              background: '#121212',
              border: '2px solid #009E73',
              color: '#009E73',
              cursor: 'pointer',
              padding: '6px 14px',
              fontFamily: 'monospace',
              fontSize: 11,
              letterSpacing: '0.1em',
            }}
          >
            + PLACE BILLBOARD
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main panel ────────────────────────────────────────────────────────────────
interface StreetViewPanelProps {
  location: LatLng
  billboards: BillboardPlacement[]
  onClose: () => void
  onPlaceBillboard: (pos: LatLng, heading: number) => void
}

export default function StreetViewPanel({ location, billboards, onClose, onPlaceBillboard }: StreetViewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  if (!GOOGLE_MAPS_KEY) return null

  const embedSrc = `https://www.google.com/maps/embed/v1/streetview?key=${GOOGLE_MAPS_KEY}&location=${location.lat},${location.lng}&fov=80`
  const coordLabel = `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`

  return (
    <>
      {/* ── Thumbnail ─────────────────────────────────────────────────────── */}
      <div
        style={{
          position: 'fixed',
          bottom: 32,
          left: 32,
          zIndex: 50,
          width: 300,
          border: '3px solid #121212',
          boxShadow: '6px 6px 0 #121212',
          background: '#0f1117',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px',
            background: '#121212',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 10,
              letterSpacing: '0.1em',
              color: '#009E73',
              textTransform: 'uppercase',
            }}
          >
            STREET VIEW · {coordLabel}
          </span>
          <button
            type="button"
            aria-label="Close street view"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#F0F0F0',
              cursor: 'pointer',
              padding: '0 2px',
              fontSize: 16,
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        <div
          style={{ position: 'relative', cursor: 'pointer', height: 180 }}
          onClick={() => setIsExpanded(true)}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <iframe
            key={`thumb-${location.lat},${location.lng}`}
            src={embedSrc}
            width="100%"
            height="180"
            style={{ display: 'block', border: 'none', pointerEvents: 'none' }}
            allowFullScreen
            referrerPolicy="no-referrer-when-downgrade"
            title="Street View thumbnail"
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: isHovered ? 'rgba(0,0,0,0.52)' : 'rgba(0,0,0,0)',
              backdropFilter: isHovered ? 'blur(2px)' : 'none',
              transition: 'background 0.15s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isHovered && (
              <div style={{ textAlign: 'center' }}>
                <svg
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#F0F0F0"
                  strokeWidth="2.5"
                  strokeLinecap="square"
                  aria-hidden="true"
                >
                  <circle cx="10" cy="10" r="6" />
                  <line x1="14.5" y1="14.5" x2="20" y2="20" />
                  <line x1="10" y1="7" x2="10" y2="13" />
                  <line x1="7" y1="10" x2="13" y2="10" />
                </svg>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 9,
                    color: '#009E73',
                    letterSpacing: '0.12em',
                    marginTop: 4,
                  }}
                >
                  AR MODE
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Expanded AR dialog ────────────────────────────────────────────── */}
      {isExpanded && (
        <div
          className="bh-overlay-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsExpanded(false)
          }}
        >
          <div
            className="bh-overlay-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Street View AR"
            style={{ background: '#121212' }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                height: 52,
                borderBottom: '4px solid #121212',
                flexShrink: 0,
                background: '#121212',
                color: '#fff',
                padding: '0 20px',
              }}
            >
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  letterSpacing: '0.12em',
                  color: '#009E73',
                  textTransform: 'uppercase',
                }}
              >
                AR VIEW · {coordLabel}
              </span>
              <button
                type="button"
                aria-label="Close street view dialog"
                onClick={() => setIsExpanded(false)}
                style={{
                  background: 'none',
                  border: '2px solid #F0F0F0',
                  color: '#F0F0F0',
                  cursor: 'pointer',
                  padding: '2px 10px',
                  fontSize: 13,
                  fontFamily: 'monospace',
                  letterSpacing: '0.08em',
                }}
              >
                CLOSE
              </button>
            </div>

            <StreetViewARView
              location={location}
              apiKey={GOOGLE_MAPS_KEY}
              billboards={billboards}
              onPlaceBillboard={onPlaceBillboard}
            />
          </div>
        </div>
      )}
    </>
  )
}
