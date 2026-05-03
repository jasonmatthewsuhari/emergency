'use client'

import { useRef } from 'react'
import PolaroidStream from '@/components/PolaroidStream'

export default function PolaroidsPage() {
  const scrollRootRef = useRef<HTMLElement | null>(null)

  return (
    <main className="polaroids-shell" ref={scrollRootRef}>
      <PolaroidStream scrollRootRef={scrollRootRef} />
    </main>
  )
}
