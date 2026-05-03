import { NextRequest, NextResponse } from 'next/server'
import { createAgencyDemoRun } from '@/lib/agencyDemo'
import type { LatLng } from '@/types'

const FALLBACK_AREA: LatLng = {
  lat: 1.3521,
  lng: 103.8198,
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      area?: Partial<LatLng>
      brief?: string
    }

    const area = {
      lat: typeof body.area?.lat === 'number' ? body.area.lat : FALLBACK_AREA.lat,
      lng: typeof body.area?.lng === 'number' ? body.area.lng : FALLBACK_AREA.lng,
    }

    return NextResponse.json(createAgencyDemoRun({ area, brief: body.brief }))
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('/api/agency-demo error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
