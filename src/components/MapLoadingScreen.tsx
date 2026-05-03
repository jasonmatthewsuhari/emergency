'use client'

import React, { useEffect, useState } from 'react'

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

  useEffect(() => {
    const t = setTimeout(() => setMinTimePassed(true), 1600)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!ready || !minTimePassed) return
    const t1 = setTimeout(() => setHiding(true), 250)
    const t2 = setTimeout(() => setHidden(true), 1000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [ready, minTimePassed])

  if (hidden) return null

  return (
    <div
      className="onboarding-loader"
      role="status"
      aria-live="polite"
      aria-label="Loading Sightline"
      style={{
        opacity: hiding ? 0 : 1,
        transition: 'opacity 0.75s cubic-bezier(0.4,0,0.2,1)',
        pointerEvents: hiding ? 'none' : 'all',
        zIndex: 9999,
      }}
    >
      <div className="onboarding-loader__mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="onboarding-loader__copy">
        <strong>SIGHTLINE</strong>
        <span>{label || 'Loading map intelligence'}</span>
      </div>
      <div className="onboarding-loader__bar" aria-hidden="true">
        <span />
      </div>
    </div>
  )
}
