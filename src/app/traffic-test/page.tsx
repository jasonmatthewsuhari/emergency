'use client'

import { useState } from 'react'
import { fetchTrafficDensity } from '@/lib/overpass'
import type { TrafficPoint } from '@/types'

const WEIGHT_LABELS: Record<string, string> = {
  'transit-hub': 'Transit hub',
  restaurant: 'Restaurant',
  cafe: 'Cafe',
  bar: 'Bar',
  retail: 'Retail',
  grocery: 'Grocery',
  entertainment: 'Entertainment',
  hotel: 'Hotel',
  office: 'Office',
  school: 'School',
  medical: 'Medical',
  transit: 'Transit',
  parking: 'Parking',
  worship: 'Worship',
  residential: 'Residential',
  industrial: 'Industrial',
}

const PRESETS = [
  { label: 'Kent Ridge, SG', lat: 1.2935, lng: 103.7835 },
  { label: 'Downtown LA', lat: 34.0522, lng: -118.2437 },
  { label: 'Shibuya, Tokyo', lat: 35.6595, lng: 139.7004 },
  { label: 'Oxford St, London', lat: 51.5152, lng: -0.1416 },
]

function weightColor(w: number) {
  if (w >= 0.9) return '#60dfff'
  if (w >= 0.75) return '#ffaa38'
  if (w >= 0.6) return '#ffe066'
  if (w >= 0.45) return '#a8f0b0'
  return '#ccc'
}

export default function TrafficTestPage() {
  const [lat, setLat] = useState('1.2935')
  const [lng, setLng] = useState('103.7835')
  const [radius, setRadius] = useState('0.5')
  const [points, setPoints] = useState<TrafficPoint[] | null>(null)
  const [debug, setDebug] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState<number | null>(null)

  async function run() {
    setLoading(true)
    setError(null)
    setPoints(null)
    setDebug(null)
    setElapsed(null)
    const t0 = performance.now()
    try {
      const result = await fetchTrafficDensity(
        { lat: Number(lat), lng: Number(lng) },
        Number(radius)
      )
      setPoints(result)
      setDebug({ count: result.length, lat: Number(lat), lng: Number(lng), radiusKm: Number(radius) })
      setElapsed(performance.now() - t0)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const byCategory = points
    ? Object.entries(
        points.reduce<Record<string, TrafficPoint[]>>((acc, p) => {
          const k = p.category
          acc[k] = acc[k] ?? []
          acc[k].push(p)
          return acc
        }, {})
      ).sort((a, b) => b[1].length - a[1].length)
    : []

  const totalWeight = points?.reduce((s, p) => s + p.weight, 0) ?? 0

  return (
    <div style={{ minHeight: '100vh', background: '#0f1117', color: '#e8f0ff', fontFamily: 'system-ui, sans-serif', padding: '32px 24px' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800 }}>Traffic Density — Overpass Test</h1>
      <p style={{ margin: '0 0 28px', color: '#8090b0', fontSize: 14 }}>Fetches OSM amenity/transit nodes and computes weighted foot-traffic proxy.</p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {PRESETS.map(p => (
          <button
            key={p.label}
            onClick={() => { setLat(String(p.lat)); setLng(String(p.lng)) }}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.07)', color: '#cde', fontSize: 13, cursor: 'pointer' }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 24 }}>
        {[
          { label: 'Lat', value: lat, setter: setLat },
          { label: 'Lng', value: lng, setter: setLng },
          { label: 'Radius (km)', value: radius, setter: setRadius },
        ].map(({ label, value, setter }) => (
          <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#8090b0' }}>
            {label}
            <input
              value={value}
              onChange={e => setter(e.target.value)}
              style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(255,255,255,0.06)', color: '#e8f0ff', fontSize: 14, width: 140 }}
            />
          </label>
        ))}
        <button
          onClick={() => void run()}
          disabled={loading}
          style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: loading ? 'rgba(255,255,255,0.1)' : '#276bd8', color: loading ? '#8090b0' : '#fff', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Fetching...' : 'Fetch'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 14px', borderRadius: 8, background: 'rgba(220,60,60,0.18)', color: '#ff8888', fontSize: 13, marginBottom: 20 }}>
          {error}
        </div>
      )}

      {debug && (
        <pre style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', color: '#8090b0', fontSize: 12, marginBottom: 20 }}>
          {JSON.stringify(debug, null, 2)}
        </pre>
      )}

      {points && (
        <>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
            {[
              { label: 'Nodes', value: points.length.toLocaleString() },
              { label: 'Weighted score', value: totalWeight.toFixed(1) },
              { label: 'Avg weight', value: (totalWeight / Math.max(points.length, 1)).toFixed(2) },
              { label: 'Fetch time', value: elapsed ? `${elapsed.toFixed(0)} ms` : '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '12px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ fontSize: 11, color: '#7080a0', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{value}</div>
              </div>
            ))}
          </div>

          <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: '#a0b4d0' }}>By category</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 28 }}>
            {byCategory.map(([cat, pts]) => {
              const avgW = pts.reduce((s, p) => s + p.weight, 0) / pts.length
              const catWeight = pts.reduce((s, p) => s + p.weight, 0)
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.04)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: weightColor(avgW), flexShrink: 0 }} />
                  <span style={{ width: 160, fontSize: 13 }}>{WEIGHT_LABELS[cat] ?? cat}</span>
                  <span style={{ width: 48, fontSize: 13, fontWeight: 700 }}>{pts.length}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <div style={{ width: `${(catWeight / totalWeight) * 100}%`, height: '100%', background: weightColor(avgW), borderRadius: 3 }} />
                  </div>
                  <span style={{ width: 48, fontSize: 12, color: '#7080a0', textAlign: 'right' }}>{((catWeight / totalWeight) * 100).toFixed(1)}%</span>
                </div>
              )
            })}
          </div>

          <h2 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 12px', color: '#a0b4d0' }}>All nodes</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: '#7080a0', textAlign: 'left' }}>
                  {['ID', 'Category', 'Weight', 'Lat', 'Lng'].map(h => (
                    <th key={h} style={{ padding: '6px 10px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {points.sort((a, b) => b.weight - a.weight).map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '5px 10px', color: '#7080a0' }}>{p.id}</td>
                    <td style={{ padding: '5px 10px' }}>{WEIGHT_LABELS[p.category] ?? p.category}</td>
                    <td style={{ padding: '5px 10px' }}>
                      <span style={{ color: weightColor(p.weight), fontWeight: 700 }}>{p.weight.toFixed(2)}</span>
                    </td>
                    <td style={{ padding: '5px 10px', color: '#a0b8d0' }}>{p.position.lat.toFixed(5)}</td>
                    <td style={{ padding: '5px 10px', color: '#a0b8d0' }}>{p.position.lng.toFixed(5)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
