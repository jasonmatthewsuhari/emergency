'use client'

import { useEffect, useRef, useState } from 'react'
import type { LatLng } from '@/types'

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

// ── Billboard geometry ──────────────────────────────────────────────────────
const BILLBOARD_W = 320        // px at scale 1
const BILLBOARD_H = 120        // matches 512:192 SVG ratio
const BILLBOARD_POLE_H = 64    // px
const BILLBOARD_PITCH = 14     // degrees above horizon the billboard center sits
const BILLBOARD_HEADING_OFFSET = 0  // degrees from initial heading

// ── Maps script loader (singleton) ─────────────────────────────────────────
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

// ── AR panorama view ────────────────────────────────────────────────────────
interface BillboardState {
  x: number
  y: number
  scale: number
  visible: boolean
}

function StreetViewARView({ location, apiKey }: { location: LatLng; apiKey: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<number | null>(null)
  const [bb, setBb] = useState<BillboardState | null>(null)

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

      const project = () => {
        if (cancelled || !containerRef.current) return
        const pov = pano.getPov()
        const zoom = pano.getZoom() ?? 1

        // Anchor to the first observed heading
        if (anchorRef.current === null) anchorRef.current = pov.heading

        const anchor = anchorRef.current + BILLBOARD_HEADING_OFFSET
        // How far has camera turned away from the billboard's heading (sign-correct)
        let dH = ((anchor - pov.heading) + 540) % 360 - 180

        const dP = BILLBOARD_PITCH - (pov.pitch ?? 0)

        // FOV: 90° per zoom-1 halving
        const hFOV = 180 / Math.pow(2, zoom - 1)
        const { width, height } = containerRef.current.getBoundingClientRect()
        const vFOV = hFOV * (height / width)

        const nx = dH / (hFOV / 2)   // [-1, 1] in view
        const ny = dP / (vFOV / 2)   // positive = up

        const x = width / 2 + nx * (width / 2)
        const y = height / 2 - ny * (height / 2)

        const baseScale = Math.pow(2, zoom - 1)
        const edgeFade = Math.max(0, 1 - Math.abs(nx) * 0.85)
        const scale = baseScale * edgeFade

        setBb({
          x,
          y,
          scale,
          visible: Math.abs(nx) < 1.3 && Math.abs(ny) < 1.5 && scale > 0.05,
        })
      }

      pano.addListener('pov_changed', project)
      pano.addListener('status_changed', project)
    }).catch(() => {/* silently ignore load errors */})

    return () => { cancelled = true }
  }, [location, apiKey])

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {bb?.visible && (
        <div
          style={{
            position: 'absolute',
            left: bb.x,
            top: bb.y,
            transform: `translate(-50%, -100%) scale(${bb.scale})`,
            transformOrigin: '50% 100%',
            pointerEvents: 'none',
            willChange: 'transform, left, top',
          }}
        >
          {/* Glow halo */}
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

          {/* Billboard face */}
          <img
            src="/billboard-creative.svg"
            alt="Billboard"
            style={{
              display: 'block',
              width: BILLBOARD_W,
              height: BILLBOARD_H,
              boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
              border: '2px solid rgba(255,255,255,0.12)',
              position: 'relative',
            }}
          />

          {/* Support pole */}
          <div
            style={{
              width: 5,
              height: BILLBOARD_POLE_H,
              background: 'linear-gradient(to bottom, #999, #555)',
              margin: '0 auto',
            }}
          />
        </div>
      )}
    </div>
  )
}

// ── Main panel ──────────────────────────────────────────────────────────────
interface StreetViewPanelProps {
  location: LatLng
  onClose: () => void
}

export default function StreetViewPanel({ location, onClose }: StreetViewPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  if (!GOOGLE_MAPS_KEY) return null

  const embedSrc = `https://www.google.com/maps/embed/v1/streetview?key=${GOOGLE_MAPS_KEY}&location=${location.lat},${location.lng}&fov=80`
  const coordLabel = `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}`

  return (
    <>
      {/* ── Thumbnail (embed iframe — no AR overhead) ────────────────────── */}
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
          <span style={{ fontFamily: 'monospace', fontSize: 10, letterSpacing: '0.1em', color: '#009E73', textTransform: 'uppercase' }}>
            STREET VIEW · {coordLabel}
          </span>
          <button
            type="button"
            aria-label="Close street view"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#F0F0F0', cursor: 'pointer', padding: '0 2px', fontSize: 16, lineHeight: 1 }}
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
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#F0F0F0" strokeWidth="2.5" strokeLinecap="square" aria-hidden="true">
                  <circle cx="10" cy="10" r="6" />
                  <line x1="14.5" y1="14.5" x2="20" y2="20" />
                  <line x1="10" y1="7" x2="10" y2="13" />
                  <line x1="7" y1="10" x2="13" y2="10" />
                </svg>
                <div style={{ fontFamily: 'monospace', fontSize: 9, color: '#009E73', letterSpacing: '0.12em', marginTop: 4 }}>
                  AR MODE
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Expanded dialog (JS Maps API + AR overlay) ───────────────────── */}
      {isExpanded && (
        <div
          className="bh-overlay-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setIsExpanded(false) }}
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
              <span style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.12em', color: '#009E73', textTransform: 'uppercase' }}>
                AR VIEW · {coordLabel}
              </span>
              <button
                type="button"
                aria-label="Close street view dialog"
                onClick={() => setIsExpanded(false)}
                style={{ background: 'none', border: '2px solid #F0F0F0', color: '#F0F0F0', cursor: 'pointer', padding: '2px 10px', fontSize: 13, fontFamily: 'monospace', letterSpacing: '0.08em' }}
              >
                CLOSE
              </button>
            </div>

            <StreetViewARView location={location} apiKey={GOOGLE_MAPS_KEY} />
          </div>
        </div>
      )}
    </>
  )
}
