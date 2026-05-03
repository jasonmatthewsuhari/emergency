'use client'

import dynamic from 'next/dynamic'

const LowPolyWalker = dynamic(() => import('@/components/LowPolyWalker'), { ssr: false })

export default function AI4AnimationPyPage() {
  return <LowPolyWalker />
}
