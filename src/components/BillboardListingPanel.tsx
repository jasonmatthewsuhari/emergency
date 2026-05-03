'use client'

import { useState, useMemo } from 'react'
import type { OohMapPoint } from '@/types'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

const MT_SPEC: Record<string, { w: number; h: number; cl: number; label: string }> = {
  bb: { w: 12,  h: 5,   cl: 4, label: 'Billboard' },
  db: { w: 14,  h: 7,   cl: 5, label: 'Digital Billboard' },
  bs: { w: 1.5, h: 2,   cl: 0, label: 'Bus Shelter' },
  ds: { w: 2,   h: 1.5, cl: 2, label: 'Digital Sign' },
  mu: { w: 8,   h: 6,   cl: 0, label: 'Mural / Wallscape' },
  sf: { w: 1.2, h: 1.8, cl: 1, label: 'Street Furniture' },
  tr: { w: 1.5, h: 1.2, cl: 1, label: 'Transit Panel' },
}

const MT_COLOR: Record<string, string> = {
  bb: '#ffcf5c',
  db: '#4991ff',
  bs: '#91d6c5',
  ds: '#78dcff',
  mu: '#ff74a0',
  sf: '#c2a0ff',
  tr: '#ff9753',
}

// Deterministic pseudo-random from string seed
function seededRand(seed: string, n: number): number[] {
  let h = 5381
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h) ^ seed.charCodeAt(i)
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    h = ((h * 1664525) + 1013904223) & 0xffffffff
    out.push((h >>> 0) / 0xffffffff)
  }
  return out
}

const WEEK_LABELS = ['This week', 'Next week', 'Week 3', 'Week 4', 'Week 5', 'Week 6']
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function getAvailability(id: string) {
  const rands = seededRand(id, WEEK_LABELS.length)
  return WEEK_LABELS.map((label, i) => ({
    label,
    status: rands[i] < 0.35 ? 'booked' : rands[i] < 0.5 ? 'pending' : 'available',
  })) as Array<{ label: string; status: 'available' | 'booked' | 'pending' }>
}

function getNextAvailableStart(id: string): string {
  const rands = seededRand(id + 'date', 2)
  const now = new Date()
  const offsetDays = Math.floor(rands[0] * 14) + 2
  const date = new Date(now.getTime() + offsetDays * 86400000)
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`
}

function getMockAddress(lat: number, lng: number, id: string): string {
  const rands = seededRand(id + 'addr', 3)
  const streetNum = Math.floor(rands[0] * 900) + 100
  const streets = ['Market St', 'Broadway', 'Main Ave', 'Oak Blvd', 'Union Square', 'Park Ave', 'Commerce Rd', 'West Ave']
  const street = streets[Math.floor(rands[1] * streets.length)]
  const quadrant = lat > 0 ? (lng > 0 ? 'NE' : 'NW') : (lng > 0 ? 'SE' : 'SW')
  return `${streetNum} ${street} (${quadrant})`
}

interface Props {
  point: OohMapPoint
  mapboxToken?: string
  cursorX?: number
  cursorY?: number
  onClose: () => void
  onPlaceBillboard?: () => void
}

export default function BillboardListingPanel({ point, mapboxToken, cursorX, cursorY, onClose, onPlaceBillboard }: Props) {
  const [booked, setBooked] = useState(false)
  const [booking, setBooking] = useState(false)

  const spec = MT_SPEC[point.mediaTypeCode] ?? { w: 4, h: 2, cl: 2, label: point.mediaTypeLabel }
  const color = MT_COLOR[point.mediaTypeCode] ?? '#c8d4e8'
  const availability = useMemo(() => getAvailability(point.id), [point.id])
  const token = mapboxToken ?? MAPBOX_TOKEN
  const startDate = useMemo(() => getNextAvailableStart(point.id), [point.id])
  const address = useMemo(() => getMockAddress(point.position.lat, point.position.lng, point.id), [point])

  const staticMapUrl = token
    ? `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+${color.slice(1)}(${point.position.lng.toFixed(5)},${point.position.lat.toFixed(5)})/${point.position.lng.toFixed(5)},${point.position.lat.toFixed(5)},16,0/320x180@2x?access_token=${token}`
    : null

  const cpm = point.priceAmount > 0 && point.weeklyImpressions > 0
    ? ((point.priceAmount / (point.weeklyImpressions * 4)) * 1000).toFixed(2)
    : null

  const monthlyBudget = point.priceAmount > 0
    ? `$${point.priceAmount.toLocaleString()}`
    : 'Call for pricing'

  function handleBook() {
    setBooking(true)
    setTimeout(() => {
      setBooking(false)
      setBooked(true)
    }, 1200)
  }

  const isCursorMode = cursorX !== undefined && cursorY !== undefined
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const PANEL_W = 340
  const PANEL_MAX_H = Math.min(620, vh - 16)
  const left = isCursorMode ? Math.min(cursorX! + 14, vw - PANEL_W - 8) : undefined
  const top = isCursorMode ? Math.max(Math.min(cursorY! - 200, vh - PANEL_MAX_H - 8), 8) : undefined

  return (
    <div style={{
      position: isCursorMode ? 'fixed' : 'absolute',
      top: isCursorMode ? top : 0,
      left: isCursorMode ? left : undefined,
      right: isCursorMode ? undefined : 0,
      bottom: isCursorMode ? undefined : 0,
      maxHeight: isCursorMode ? PANEL_MAX_H : undefined,
      width: PANEL_W,
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(8,10,18,0.96)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderRadius: isCursorMode ? 12 : 0,
      borderLeft: isCursorMode ? undefined : '1px solid rgba(255,255,255,0.09)',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      overflowY: 'auto',
      boxShadow: isCursorMode ? '0 8px 32px rgba(0,0,0,0.6)' : undefined,
    }}>

      {/* Header */}
      <div style={{
        padding: '14px 16px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: '0.12em',
          color: color,
          textTransform: 'uppercase',
          background: `${color}18`,
          border: `1px solid ${color}40`,
          borderRadius: 4,
          padding: '3px 7px',
        }}>
          {spec.label}
        </span>
        <span style={{ flex: 1, fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(180,200,255,0.4)', textTransform: 'uppercase' }}>
          OOH Listing
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: 18, lineHeight: 1, padding: '0 2px' }}
          aria-label="Close listing"
        >
          ×
        </button>
      </div>

      {/* Static map preview */}
      {staticMapUrl && (
        <div style={{ position: 'relative', flexShrink: 0, height: 160, overflow: 'hidden' }}>
          <img
            src={staticMapUrl}
            alt="Billboard location"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, transparent 50%, rgba(8,10,18,0.9) 100%)',
          }} />
          <div style={{
            position: 'absolute',
            bottom: 10,
            left: 14,
            fontSize: 11,
            fontWeight: 600,
            color: 'rgba(220,230,255,0.8)',
          }}>
            {address}
          </div>
        </div>
      )}

      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Visibility score bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(180,200,255,0.5)', textTransform: 'uppercase' }}>
              Visibility Score
            </span>
            <span style={{
              fontSize: 14,
              fontWeight: 800,
              color: point.visibilityScore >= 80 ? '#55ff88' : point.visibilityScore >= 60 ? '#ffcf5c' : '#ff8855',
            }}>
              {point.visibilityScore}<span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.3)' }}>/100</span>
            </span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${point.visibilityScore}%`,
              borderRadius: 2,
              background: point.visibilityScore >= 80 ? '#55ff88' : point.visibilityScore >= 60 ? '#ffcf5c' : '#ff8855',
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>

        {/* Specs grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 14px' }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(180,200,255,0.45)', textTransform: 'uppercase', marginBottom: 3 }}>Dimensions</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eeff' }}>{spec.w}m × {spec.h}m</div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(180,200,255,0.45)', textTransform: 'uppercase', marginBottom: 3 }}>Clearance</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eeff' }}>{spec.cl}m above grade</div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(180,200,255,0.45)', textTransform: 'uppercase', marginBottom: 3 }}>Weekly Impressions</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eeff' }}>
              {point.weeklyImpressions > 0 ? point.weeklyImpressions.toLocaleString() : '—'}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(180,200,255,0.45)', textTransform: 'uppercase', marginBottom: 3 }}>Est. CPM</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#e8eeff' }}>{cpm ? `$${cpm}` : '—'}</div>
          </div>
        </div>

        {/* Pricing */}
        <div style={{
          padding: '12px 14px',
          background: 'rgba(255,207,92,0.06)',
          border: '1px solid rgba(255,207,92,0.18)',
          borderRadius: 10,
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(255,207,92,0.6)', textTransform: 'uppercase', marginBottom: 4 }}>
            Monthly Rate
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#ffcf5c', letterSpacing: '-0.02em' }}>
            {monthlyBudget}
          </div>
          {point.priceAmount > 0 && (
            <div style={{ fontSize: 10, color: 'rgba(255,207,92,0.5)', marginTop: 3 }}>
              ≈ ${(point.priceAmount / 4).toLocaleString(undefined, { maximumFractionDigits: 0 })} / week
            </div>
          )}
        </div>

        {/* Availability */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(180,200,255,0.5)', textTransform: 'uppercase', marginBottom: 8 }}>
            Availability
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {availability.map(slot => (
              <div key={slot.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: slot.status === 'available' ? '#55ff88' : slot.status === 'pending' ? '#ffcf5c' : '#ff5555',
                }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(220,230,255,0.75)', flex: 1 }}>{slot.label}</span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: slot.status === 'available' ? '#55ff88' : slot.status === 'pending' ? '#ffcf5c' : 'rgba(255,85,85,0.7)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}>
                  {slot.status === 'available' ? 'Open' : slot.status === 'pending' ? 'Hold' : 'Booked'}
                </span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(180,200,255,0.35)', marginTop: 8 }}>
            Next opening: {startDate}
          </div>
        </div>

        {/* CTA */}
        {!booked ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
            <button
              onClick={handleBook}
              disabled={booking}
              style={{
                width: '100%',
                padding: '13px 0',
                background: booking ? 'rgba(73,145,255,0.3)' : 'rgba(73,145,255,0.9)',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: '0.04em',
                color: '#fff',
                cursor: booking ? 'default' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {booking ? 'Processing…' : 'Book This Space'}
            </button>
            {onPlaceBillboard && (
              <button
                onClick={onPlaceBillboard}
                style={{
                  width: '100%',
                  padding: '10px 0',
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  color: 'rgba(220,230,255,0.65)',
                  cursor: 'pointer',
                }}
              >
                Preview on Map
              </button>
            )}
          </div>
        ) : (
          <div style={{
            marginTop: 'auto',
            padding: '14px',
            background: 'rgba(85,255,136,0.08)',
            border: '1px solid rgba(85,255,136,0.3)',
            borderRadius: 10,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>🎉</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#55ff88', marginBottom: 4 }}>Booking Confirmed!</div>
            <div style={{ fontSize: 11, color: 'rgba(220,230,255,0.55)', lineHeight: 1.5 }}>
              Your {spec.label} starting {startDate} has been reserved. A campaign manager will follow up within 24 hours.
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div style={{
          fontSize: 9,
          color: 'rgba(180,200,255,0.25)',
          lineHeight: 1.5,
          textAlign: 'center',
          paddingBottom: 4,
        }}>
          Demo listing only. Pricing and availability are illustrative.
          Real global inventory coming soon.
        </div>
      </div>
    </div>
  )
}
