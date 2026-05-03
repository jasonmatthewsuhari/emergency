'use client'

import React, { useEffect, useRef, useState } from 'react'

const LOG_THRESHOLDS = [
  { at: 5,  text: 'Mapbox GL renderer online' },
  { at: 20, text: 'Terrain elevation tiles loading' },
  { at: 40, text: '3D scene geometry ready' },
  { at: 60, text: 'OOH inventory fetched' },
  { at: 75, text: 'Building context parsed' },
  { at: 85, text: 'Walk animation frames ready' },
  { at: 93, text: 'Street fixtures mapped' },
  { at: 100, text: 'All systems nominal' },
]

export default function MapLoadingScreen({
  ready,
  progress,
  label,
}: {
  ready: boolean
  progress: number
  label: string
}) {
  const [minTimePassed, setMinTimePassed] = useState(false)
  const [hiding, setHiding] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [logLines, setLogLines] = useState<string[]>([])
  const [internalProgress, setInternalProgress] = useState<number | null>(null)
  const shownRef = useRef(new Set<string>())

  useEffect(() => {
    const t = setTimeout(() => setMinTimePassed(true), 1600)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!ready || !minTimePassed) return
    setInternalProgress(100)
    const t1 = setTimeout(() => setHiding(true), 500)
    const t2 = setTimeout(() => setHidden(true), 1250)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [ready, minTimePassed])

  const effectiveProgress = internalProgress ?? progress

  useEffect(() => {
    for (const entry of LOG_THRESHOLDS) {
      if (effectiveProgress >= entry.at && !shownRef.current.has(entry.text)) {
        shownRef.current.add(entry.text)
        setLogLines(prev => [...prev, entry.text])
      }
    }
  }, [effectiveProgress])

  if (hidden) return null

  const isComplete = ready && minTimePassed
  const displayPct = Math.round(effectiveProgress)

  return (
    <>
      <style>{`
        @keyframes sl-scan {
          from { transform: translateY(-100%) }
          to   { transform: translateY(110vh) }
        }
        @keyframes sl-shimmer {
          from { transform: translateX(-200%) }
          to   { transform: translateX(500%) }
        }
        @keyframes sl-fadein-up {
          from { opacity: 0; transform: translateY(6px) }
          to   { opacity: 1; transform: translateY(0) }
        }
        @keyframes sl-reveal {
          from { clip-path: inset(0 100% 0 0) }
          to   { clip-path: inset(0 0%   0 0) }
        }

        @keyframes sl-glow-pulse {
          0%, 100% { opacity: 0.55 }
          50%       { opacity: 1 }
        }
        @keyframes sl-corner-in {
          from { opacity: 0; transform: scale(0.6) }
          to   { opacity: 1; transform: scale(1) }
        }
      `}</style>

      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: '#07090f',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          opacity: hiding ? 0 : 1,
          transition: 'opacity 0.8s cubic-bezier(0.4,0,0.2,1)',
          pointerEvents: hiding ? 'none' : 'all',
          userSelect: 'none', overflow: 'hidden',
        }}
      >
        {/* Dot-grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(208,32,32,0.10) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
        }} />

        {/* Corner brackets */}
        {([
          { top: 24, left: 24,    borderTop: '1px solid', borderLeft: '1px solid' },
          { top: 24, right: 24,   borderTop: '1px solid', borderRight: '1px solid' },
          { bottom: 24, left: 24,  borderBottom: '1px solid', borderLeft: '1px solid' },
          { bottom: 24, right: 24, borderBottom: '1px solid', borderRight: '1px solid' },
        ] as React.CSSProperties[]).map((style, i) => (
          <div key={i} style={{
            position: 'absolute', width: 20, height: 20,
            borderColor: 'rgba(208,32,32,0.25)',
            animation: `sl-corner-in 0.5s ${i * 0.07}s ease both`,
            ...style,
          }} />
        ))}

        {/* Moving scanline */}
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 100,
          background: 'linear-gradient(180deg, transparent, rgba(208,32,32,0.04), transparent)',
          animation: 'sl-scan 4.5s linear infinite',
          pointerEvents: 'none',
        }} />

        {/* Content */}
        <div style={{
          position: 'relative',
          width: 'min(520px, 88vw)',
          display: 'flex', flexDirection: 'column', gap: 36,
        }}>

          {/* Logo */}
          <div>
            <div style={{ lineHeight: 0.86, letterSpacing: '-0.045em' }}>
              <div style={{
                fontFamily: 'var(--font-outfit, "Outfit", system-ui, sans-serif)',
                fontSize: 'clamp(4rem, 8vw, 8.5rem)',
                fontWeight: 900, textTransform: 'uppercase',
                color: '#F0F0F0',
                animation: 'sl-reveal 0.85s cubic-bezier(0.4,0,0.2,1) both',
              }}>SIGHT</div>
              <div style={{
                fontFamily: 'var(--font-outfit, "Outfit", system-ui, sans-serif)',
                fontSize: 'clamp(4rem, 8vw, 8.5rem)',
                fontWeight: 900, textTransform: 'uppercase',
                WebkitTextStroke: '3px #F0F0F0', color: 'transparent',
                animation: 'sl-reveal 0.85s 0.12s cubic-bezier(0.4,0,0.2,1) both',
              }}>LINE</div>
            </div>
            {/* Red accent sweep */}
            <div style={{
              height: 2, background: '#D02020', marginTop: 10,
              animation: 'sl-reveal 0.5s 0.55s ease both',
              boxShadow: '0 0 18px rgba(208,32,32,0.75), 0 0 4px rgba(208,32,32,0.5)',
            }} />
          </div>

          {/* Boot log */}
          <div style={{
            height: 100,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            overflow: 'hidden', gap: 5,
          }}>
            {logLines.slice(-6).map((line, i, arr) => {
              const isLatest = i === arr.length - 1
              return (
                <div key={line} style={{
                  display: 'flex', gap: 10, alignItems: 'center',
                  animation: 'sl-fadein-up 0.22s ease both',
                  fontFamily: '"Courier New", Courier, monospace',
                  fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
                  color: isLatest ? '#c4c4cc' : '#252835',
                }}>
                  <span style={{ color: isLatest ? '#D02020' : '#1a1c28', flexShrink: 0 }}>
                    {isLatest ? '▶' : '✓'}
                  </span>
                  {line}
                </div>
              )
            })}
          </div>

          {/* Progress */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {/* Bar track */}
            <div style={{
              width: '100%', height: 2,
              background: '#0e111c',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Fill */}
              <div style={{
                position: 'absolute', left: 0, top: 0, height: '100%',
                width: `${effectiveProgress}%`,
                background: isComplete
                  ? 'linear-gradient(90deg, #999, #fff)'
                  : 'linear-gradient(90deg, #7a0000, #D02020, #ff5050)',
                transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1), background 0.4s ease',
                boxShadow: isComplete
                  ? '0 0 10px #fff, 0 0 24px rgba(255,255,255,0.35)'
                  : '0 0 8px #D02020, 0 0 20px rgba(208,32,32,0.45)',
              }}>
                {!isComplete && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)',
                    animation: 'sl-shimmer 1.9s ease-in-out infinite',
                  }} />
                )}
              </div>
            </div>

            {/* Labels */}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontFamily: '"Courier New", Courier, monospace',
              fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
            }}>
              <span style={{
                color: isComplete ? '#888' : '#D02020',
                animation: isComplete ? undefined : 'sl-glow-pulse 2s ease-in-out infinite',
              }}>
                {isComplete ? 'SCENE READY' : label}
              </span>
              <span style={{
                color: isComplete ? '#e0e0e0' : '#30334a',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {displayPct}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
