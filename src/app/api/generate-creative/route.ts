import { NextRequest, NextResponse } from 'next/server'
import type { CompanyBrief } from '@/types'

export const maxDuration = 300

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const WAVESPEED_BASE = 'https://api.wavespeed.ai/api/v3'

interface GenerateCreativeRequest {
  brief: CompanyBrief
  widthM: number
  heightM: number
  mode: 'image' | 'video'
  promptOverride?: string
}

// Convert hex color codes to natural language so the model doesn't render them as text
function hexToColorName(hex: string): string {
  const h = hex.replace('#', '').toLowerCase()
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2 / 255

  // Named color shortcuts for common brand colors
  const named: Record<string, string> = {
    'ffe500': 'vivid electric yellow', 'ffff00': 'pure yellow', 'ff0000': 'bold red',
    '000000': 'pure black', 'ffffff': 'pure white', '0000ff': 'pure blue',
    'ff6600': 'vivid orange', '00ff00': 'pure green', 'ff69b4': 'hot pink',
    '1a1a2e': 'deep navy', '2d7dff': 'bright blue', '28b487': 'teal green',
  }
  if (named[h]) return named[h]

  const lightness = l < 0.2 ? 'deep ' : l < 0.4 ? 'dark ' : l > 0.8 ? 'light ' : l > 0.9 ? 'pale ' : ''
  if (max === min) return `${lightness}gray`
  if (r > g && r > b) return g > b * 1.3 ? `${lightness}warm orange` : `${lightness}red`
  if (g > r && g > b) return r > b * 1.1 ? `${lightness}yellow-green` : `${lightness}green`
  if (b > r && b > g) return r > g * 1.1 ? `${lightness}purple` : `${lightness}blue`
  if (r > b && g > b) return `${lightness}yellow`
  if (r > g && b > g) return `${lightness}magenta`
  return `${lightness}cyan`
}

function stripHexCodes(prompt: string): string {
  return prompt.replace(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g, (match) => {
    const full = match.length === 4
      ? `#${match[1]}${match[1]}${match[2]}${match[2]}${match[3]}${match[3]}`
      : match
    return hexToColorName(full)
  })
}

function cleanProviderPrompt(prompt: string): string {
  return stripHexCodes(prompt)
    .replace(/\b(no|without)\s+(?:text|letters|logos?|words?)(?:\s*,?\s*(?:or\s+)?(?:text|letters|logos?|words?))*\b/gi, 'clean brand-safe scene')
    .replace(/\b(no|without)\s+(text|letters|logos?|words?)\b/gi, 'clean brand-safe scene')
    .replace(/\b(where|space)\s+white\s+text\s+will\s+be\s+printed\b/gi, 'reserved for later design overlay')
    .replace(/\bthe\s+ad\s+fails\b/gi, 'the composition should stay clean')
    .replace(/\s+/g, ' ')
    .trim()
}

function buildFallbackPrompt(brief: CompanyBrief, widthM: number, heightM: number, mode: 'image' | 'video'): string {
  const orientation = widthM > heightM ? 'landscape' : widthM < heightM ? 'portrait' : 'square'
  const negativeSpace = widthM > heightM ? 'right half' : 'lower third'
  const brandColor = brief.visualSystem.primaryColor
    ? hexToColorName(brief.visualSystem.primaryColor)
    : 'the primary brand color'
  const style = brief.visualSystem.styleReference ?? 'modern premium commercial visual style'
  const audience = brief.audience.description || 'the target audience'
  const message = brief.campaign.coreMessage || brief.identity.description
  const action = mode === 'video'
    ? 'A subtle seamless loop with natural movement.'
    : 'A single clear billboard-ready moment.'

  return cleanProviderPrompt([
    `${action} ${brief.identity.companyName} in ${brief.identity.industry}.`,
    `Show the product or service benefit for ${audience}: ${message}.`,
    `${orientation} outdoor advertising composition, ${style}, dominated by ${brandColor}.`,
    `Keep the ${negativeSpace} as a simple uninterrupted brand-color area reserved for later design overlay.`,
    'Avoid typography, symbols, distorted faces, clutter, watermarks, and unsafe content.',
  ].join(' '))
}

function isProviderRejectedError(message: string): boolean {
  return /provider rejected|request rejected|content policy|safety|moderation/i.test(message)
}

// Seedream uses "WxH" with * separator
function getBillboardImageSize(widthM: number, heightM: number): string {
  const ratio = widthM / heightM
  if (ratio >= 1.7) return '1920*1080'
  if (ratio >= 1.2) return '1024*768'
  if (ratio < 0.65) return '1080*1920'
  return '1024*1024'
}

function getVideoAspectRatio(widthM: number, heightM: number): string {
  const ratio = widthM / heightM
  if (ratio >= 1.5) return '16:9'
  if (ratio < 0.7) return '9:16'
  return '1:1'
}

async function buildPrompt(brief: CompanyBrief, widthM: number, heightM: number, mode: 'image' | 'video'): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('Missing ANTHROPIC_API_KEY')

  const ratio = (widthM / heightM).toFixed(2)
  const orientation = widthM > heightM ? 'landscape' : widthM < heightM ? 'portrait' : 'square'

  const system = `You are a creative strategist at a top OOH agency. Your job is to find the single visual moment that makes someone feel what a brand stands for — before they read a word.

Start with the idea, not the camera. Ask: what specific human moment, transformation, or feeling does this brand own? Then describe THAT scene concisely.

Rules:
- Show the brand's actual product in use, the real audience in a real moment, or the exact transformation the brand delivers. Do not invent abstract metaphors.
- One scene, one emotion. If you need more than one sentence to explain the concept, it is too complicated for a billboard.
- The primary brand color should be the dominant color in the image — background, environment, or light.
- The ${widthM > heightM ? 'right half' : 'lower third'} of the frame MUST be a completely flat, solid, uninterrupted field of the primary brand color — no texture, no gradients, no people, no objects bleeding into it. This zone is where white text will be printed. If this zone is not clean, the ad fails.
- No photography jargon (no f-stops, focal lengths, lens types, lighting setups). Describe what is IN the scene, not how it is shot.
- For video: one looping moment that captures the brand feeling — not a story arc.
- No text, letters, logos, or words anywhere in the image.
- Under 80 words. Concrete nouns and active verbs only.
- Return ONLY the prompt.`

  const user = [
    `Brand: ${brief.identity.companyName} — ${brief.identity.industry}`,
    `Personality: ${brief.identity.brandAdjectives.join(', ')}`,
    `Visual style: ${brief.visualSystem.styleReference ?? 'modern and premium'}`,
    `Primary color: ${brief.visualSystem.primaryColor ?? 'brand-appropriate'}`,
    `Secondary color: ${brief.visualSystem.secondaryColor ?? 'complementary'}`,
    `Core message to evoke: ${brief.campaign.coreMessage}`,
    brief.campaign.callToAction ? `CTA context: ${brief.campaign.callToAction}` : '',
    `Audience: ${brief.audience.description}`,
    `Seen while: ${brief.audience.contextWhenSeen ?? 'mixed'}`,
    brief.visualSystem.avoidList?.length ? `Avoid: ${brief.visualSystem.avoidList.join(', ')}` : '',
    `Generation mode: ${mode}.`,
    `Billboard: ${orientation}, aspect ratio ${ratio}. Negative space should be on the ${widthM > heightM ? 'right side' : 'lower third'}.`,
  ].filter(Boolean).join('\n')

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'anthropic-version': '2023-06-01',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Anthropic error ${res.status}: ${text.slice(0, 200)}`)
  }

  const json = await res.json() as { content: Array<{ type: string; text: string }> }
  const raw = json.content.find(b => b.type === 'text')?.text?.trim()
  if (!raw) throw new Error('Empty prompt from Claude')
  // Strip any hex codes Claude included — they render as literal text in diffusion models
  return cleanProviderPrompt(raw)
}

interface WavespeedTaskResponse {
  code: number
  data: {
    id: string
    status: string
    outputs?: string[]
    urls?: { get: string }
    error?: string | { message?: string; detail?: string }
  }
}

function formatWavespeedError(error: WavespeedTaskResponse['data']['error']): string {
  if (!error) return 'unknown'
  if (typeof error === 'string') return error
  return error.message ?? error.detail ?? JSON.stringify(error)
}

async function pollUntilDone(pollUrl: string, apiKey: string, timeoutMs: number): Promise<string> {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 4000))

    let res: Response
    try {
      res = await fetch(pollUrl, { headers: { Authorization: `Bearer ${apiKey}` } })
    } catch {
      continue
    }
    if (!res.ok) continue

    const json = await res.json() as WavespeedTaskResponse
    const { status, outputs, error } = json.data

    if (status === 'completed' && outputs?.length) return outputs[0]
    if (status === 'failed') throw new Error(`WaveSpeed generation failed: ${formatWavespeedError(error)}`)
  }

  throw new Error('Generation timed out — WaveSpeed did not complete within the time limit')
}

async function generateImage(prompt: string, widthM: number, heightM: number): Promise<string> {
  const apiKey = process.env.WAVESPEED_API_KEY
  if (!apiKey) throw new Error('Missing WAVESPEED_API_KEY')

  // Seedream v4.5: sync mode returns result immediately, no polling needed
  const res = await fetch(`${WAVESPEED_BASE}/bytedance/seedream-v4.5`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      size: getBillboardImageSize(widthM, heightM),
      enable_base64_output: false,
      enable_sync_mode: true,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`WaveSpeed image error ${res.status}: ${text.slice(0, 200)}`)
  }

  const json = await res.json() as WavespeedTaskResponse
  const { status, outputs, urls, id } = json.data

  let imageUrl: string
  if (status === 'completed' && outputs?.length) {
    imageUrl = outputs[0]
  } else {
    const pollUrl = urls?.get ?? `${WAVESPEED_BASE}/predictions/${id}`
    imageUrl = await pollUntilDone(pollUrl, apiKey, 120_000)
  }

  // Convert to base64 so it can be embedded directly in BillboardPlacement state
  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) throw new Error(`Failed to fetch generated image: ${imgRes.status}`)
  const buffer = await imgRes.arrayBuffer()
  const contentType = imgRes.headers.get('content-type') ?? 'image/jpeg'
  return `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`
}

async function generateVideo(prompt: string, widthM: number, heightM: number): Promise<string> {
  const apiKey = process.env.WAVESPEED_API_KEY
  if (!apiKey) throw new Error('Missing WAVESPEED_API_KEY')

  const res = await fetch(`${WAVESPEED_BASE}/alibaba/wan-2.7/text-to-video`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      negative_prompt: 'text, letters, logos, captions, watermarks, distorted faces, clutter, unsafe content',
      aspect_ratio: getVideoAspectRatio(widthM, heightM),
      duration: 5,
      resolution: '720p',
      enable_prompt_expansion: false,
      seed: -1,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`WaveSpeed video error ${res.status}: ${text.slice(0, 200)}`)
  }

  const json = await res.json() as WavespeedTaskResponse
  const { status, outputs, urls, id } = json.data

  if (status === 'completed' && outputs?.length) return outputs[0]

  // Use the poll URL returned by WaveSpeed directly
  const pollUrl = urls?.get ?? `${WAVESPEED_BASE}/predictions/${id}`
  return pollUntilDone(pollUrl, apiKey, 240_000)
}

export async function POST(req: NextRequest) {
  let body: GenerateCreativeRequest
  try {
    body = await req.json() as GenerateCreativeRequest
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { brief, widthM, heightM, mode, promptOverride } = body
  if (!brief || !mode || typeof widthM !== 'number' || typeof heightM !== 'number') {
    return NextResponse.json({ error: 'Missing required fields: brief, widthM, heightM, mode' }, { status: 400 })
  }

  try {
    const promptFromOverride = promptOverride?.trim()
    let prompt = promptFromOverride || await buildPrompt(brief, widthM, heightM, mode)
    let url: string

    try {
      url = mode === 'video'
        ? await generateVideo(prompt, widthM, heightM)
        : await generateImage(prompt, widthM, heightM)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (promptFromOverride || !isProviderRejectedError(message)) throw err

      prompt = buildFallbackPrompt(brief, widthM, heightM, mode)
      url = mode === 'video'
        ? await generateVideo(prompt, widthM, heightM)
        : await generateImage(prompt, widthM, heightM)
    }

    return NextResponse.json({
      url,
      prompt,
      overlay: {
        brandName: brief.identity.companyName,
        tagline: brief.identity.tagline ?? null,
        cta: brief.campaign.callToAction ?? null,
        primaryColor: brief.visualSystem.primaryColor ?? null,
        secondaryColor: brief.visualSystem.secondaryColor ?? null,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
