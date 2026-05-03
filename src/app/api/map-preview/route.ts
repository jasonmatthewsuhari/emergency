import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

let cached: { points: unknown[]; mediaTypeCodes: Record<string, string> } | null = null

export async function GET() {
  if (!cached) {
    const filePath = path.join(process.cwd(), 'data', 'ooh-map', 'ooh-map-points.json')
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    // Return all points — file has 2500, well within client budget
    cached = { points: raw.points, mediaTypeCodes: raw.metadata.media_type_codes }
  }
  return NextResponse.json(cached)
}
