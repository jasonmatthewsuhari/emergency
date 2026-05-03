'use client'

import dynamic from 'next/dynamic'

const StreetViewExplorer = dynamic(() => import('@/components/StreetViewExplorer'), { ssr: false })

export default function StreetViewPage() {
  return <StreetViewExplorer />
}
