import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type CompactPoint = [
  id: string,
  lng: number,
  lat: number,
  mediaTypeCode: string,
  priceAmount: number,
  weeklyImpressions: number,
  visibilityScore: number,
  sourceUrlIndex: number,
]

interface MapPointPayload {
  metadata: {
    built_at: string
    count: number
    schema: string
    media_type_codes: Record<string, string>
  }
  source_urls: string[]
  points: CompactPoint[]
}

interface CachedPayload {
  loadedAt: number
  payload: MapPointPayload
}

let cachedPayload: CachedPayload | null = null

const POINTS_PATH = path.join(process.cwd(), 'data', 'ooh-map', 'ooh-map-points.json')
const DEFAULT_LIMIT = 5000
const MAX_LIMIT = 25000

async function loadPayload() {
  if (cachedPayload) return cachedPayload.payload

  const raw = await readFile(POINTS_PATH, 'utf8')
  const payload = JSON.parse(raw) as MapPointPayload
  cachedPayload = {
    loadedAt: Date.now(),
    payload,
  }
  return payload
}

function parseBbox(value: string | null) {
  if (!value) return null

  const parts = value.split(',').map(part => Number.parseFloat(part.trim()))
  if (parts.length !== 4 || parts.some(part => !Number.isFinite(part))) {
    throw new Error('bbox must be west,south,east,north')
  }

  const [west, south, east, north] = parts
  if (west >= east || south >= north) {
    throw new Error('bbox must be ordered as west,south,east,north')
  }

  return { west, south, east, north }
}

function parseLimit(value: string | null) {
  const parsed = Number.parseInt(value ?? '', 10)
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_LIMIT
  return Math.min(parsed, MAX_LIMIT)
}

function parseTypes(value: string | null) {
  if (!value) return null
  return new Set(value.split(',').map(type => type.trim()).filter(Boolean))
}

function pointInBbox(point: CompactPoint, bbox: NonNullable<ReturnType<typeof parseBbox>>) {
  const lng = point[1]
  const lat = point[2]
  return lng >= bbox.west && lng <= bbox.east && lat >= bbox.south && lat <= bbox.north
}

export async function GET(req: NextRequest) {
  try {
    const payload = await loadPayload()
    const { searchParams } = req.nextUrl
    const bbox = parseBbox(searchParams.get('bbox'))
    const limit = parseLimit(searchParams.get('limit'))
    const types = parseTypes(searchParams.get('types'))
    const includeSourceUrls = searchParams.get('includeSourceUrls') === 'true'

    const points: CompactPoint[] = []
    for (const point of payload.points) {
      if (bbox && !pointInBbox(point, bbox)) continue
      if (types && !types.has(point[3])) continue

      points.push(point)
      if (points.length >= limit) break
    }

    return NextResponse.json(
      {
        metadata: {
          built_at: payload.metadata.built_at,
          total_points: payload.metadata.count,
          returned_points: points.length,
          schema: payload.metadata.schema,
          media_type_codes: payload.metadata.media_type_codes,
          bbox,
          limited: points.length >= limit,
        },
        source_urls: includeSourceUrls ? payload.source_urls : undefined,
        points,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=600',
        },
      },
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
