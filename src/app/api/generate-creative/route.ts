import { NextRequest, NextResponse } from 'next/server'
import type { CompanyBrief } from '@/types'

export const maxDuration = 300

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const WAVESPEED_BASE = 'https://api.wavespeed.ai/api/v3'
const OPENAI_API_URL = 'https://api.openai.com/v1/images/generations'

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
  const negZone = widthM > heightM ? 'right third' : 'bottom quarter'
  const brandColor = brief.visualSystem.primaryColor
    ? hexToColorName(brief.visualSystem.primaryColor)
    : 'a deep brand color'
  const style = brief.visualSystem.styleReference ?? 'modern premium commercial photography'
  const audience = brief.audience.description || 'the target audience'
  const message = brief.campaign.coreMessage || brief.identity.description
  const cta = brief.campaign.callToAction ? ` with the energy of "${brief.campaign.callToAction}"` : ''
  const action = mode === 'video'
    ? 'Seamlessly looping atmospheric moment:'
    : 'Bold striking outdoor billboard image:'

  return cleanProviderPrompt([
    `${action} ${brief.identity.companyName}, ${brief.identity.industry} brand${cta}.`,
    `${style} visual style, ${orientation} format, dominated by ${brandColor} palette.`,
    `Scene shows ${audience} experiencing ${message} — vivid, emotionally charged, full of energy.`,
    `The ${negZone} of the frame is a completely flat solid ${brandColor} color field — no objects, textures, or people in that zone, reserved for text overlay.`,
    'No typography, no letters, no logos, no symbols anywhere in the image.',
  ].join(' '))
}

function isProviderRejectedError(message: string): boolean {
  return /provider rejected|request rejected|content policy|safety|moderation/i.test(message)
}

// gpt-image-1 (OpenAI direct) size strings
function getBillboardImageSize(widthM: number, heightM: number): string {
  const ratio = widthM / heightM
  if (ratio >= 1.2) return '1536x1024'
  if (ratio < 0.85) return '1024x1536'
  return '1024x1024'
}

// WaveSpeed gpt-image-2 aspect_ratio strings
function getBillboardAspectRatio(widthM: number, heightM: number): string {
  const ratio = widthM / heightM
  if (ratio >= 1.7) return '16:9'
  if (ratio >= 1.2) return '4:3'
  if (ratio < 0.6) return '9:16'
  if (ratio < 0.85) return '3:4'
  return '1:1'
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
  const negZone = widthM > heightM ? 'right third' : 'bottom quarter'
  const negSide = widthM > heightM ? 'right side' : 'bottom'

  const system = `You are a world-class outdoor advertising creative director. You write image generation prompts that produce stunning, award-winning billboard visuals.

Your prompts describe a complete visual scene with enough richness that an image model can render it without ambiguity. Great billboard art works in 3 seconds — one striking visual idea, bold color, and emotional clarity.

What you produce:
- A vivid, specific scene description: setting, subject, action, mood, lighting, color atmosphere. Be generous with visual detail — image models render better with more specificity.
- The brand's personality and the CTA's energy should be baked into the visual mood. If the CTA is urgent, the image should feel urgent. If it's inviting, it should feel warm.
- Composition matters: for the designated negative space zone (where brand name, tagline, and CTA text will be overlaid later), describe a clear, uncluttered area with a flat wash of the primary brand color. Nothing should bleed into this zone.
- The primary brand color must dominate the palette — in the background, environment, lighting, or hero element.

Hard constraints (non-negotiable):
- Zero typography, letters, words, numbers, or symbols anywhere in the image.
- The ${negZone} of the frame is a flat, solid, uninterrupted wash of the primary brand color — no objects, people, or textures in this zone. This is where the copy will be placed.
- No watermarks, UI elements, or anything that looks like a frame or border.
- For video: describe a single seamlessly looping atmospheric moment, not a narrative arc.

Return ONLY the prompt. No preamble, no explanation.`

  const ctaLine = brief.campaign.callToAction
    ? `Call-to-action: "${brief.campaign.callToAction}" — the image's energy and mood should amplify this message`
    : ''

  const user = [
    `Brand: ${brief.identity.companyName} (${brief.identity.industry})`,
    `Brand personality: ${brief.identity.brandAdjectives.join(', ')}`,
    brief.identity.tagline ? `Tagline: "${brief.identity.tagline}"` : '',
    brief.identity.description ? `Brand story: ${brief.identity.description}` : '',
    `Core campaign message: ${brief.campaign.coreMessage}`,
    ctaLine,
    `Target audience: ${brief.audience.description}`,
    brief.audience.contextWhenSeen ? `Viewed while: ${brief.audience.contextWhenSeen}` : '',
    `Visual style: ${brief.visualSystem.styleReference ?? 'modern premium commercial'}`,
    `Primary brand color: ${brief.visualSystem.primaryColor ?? 'brand-appropriate'} — dominant in the image`,
    brief.visualSystem.secondaryColor ? `Secondary color: ${brief.visualSystem.secondaryColor} — accent use` : '',
    brief.visualSystem.avoidList?.length ? `Do not show: ${brief.visualSystem.avoidList.join(', ')}` : '',
    `Format: ${orientation} billboard, aspect ratio ${ratio}`,
    `Negative space zone for copy overlay: ${negZone} of the frame — flat solid primary brand color, nothing else`,
    `Composition: main visual subject on the ${negSide === 'right side' ? 'left two-thirds' : 'upper three-quarters'}, negative zone on the ${negSide}`,
    mode === 'video' ? 'Output type: seamlessly looping 5-second video moment' : 'Output type: single bold billboard image',
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
      max_tokens: 600,
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

interface OpenAIImageResponse {
  data: Array<{ b64_json?: string; url?: string }>
}

async function generateImageViaWavespeed(prompt: string, widthM: number, heightM: number, apiKey: string): Promise<string> {
  const res = await fetch(`${WAVESPEED_BASE}/openai/gpt-image-2/text-to-image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      aspect_ratio: getBillboardAspectRatio(widthM, heightM),
      resolution: '1k',
      quality: 'medium',
      enable_sync_mode: true,
      enable_base64_output: false,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`WaveSpeed gpt-image-2 error ${res.status}: ${text.slice(0, 200)}`)
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

  const imgRes = await fetch(imageUrl)
  if (!imgRes.ok) throw new Error(`Failed to fetch generated image: ${imgRes.status}`)
  const buffer = await imgRes.arrayBuffer()
  return `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`
}

async function generateImageViaOpenAI(prompt: string, widthM: number, heightM: number, apiKey: string): Promise<string> {
  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size: getBillboardImageSize(widthM, heightM),
      output_format: 'png',
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`OpenAI image error ${res.status}: ${text.slice(0, 200)}`)
  }

  const json = await res.json() as OpenAIImageResponse
  const item = json.data?.[0]
  if (!item) throw new Error('No image returned from OpenAI')

  if (item.b64_json) return `data:image/png;base64,${item.b64_json}`

  if (item.url) {
    const imgRes = await fetch(item.url)
    if (!imgRes.ok) throw new Error(`Failed to fetch generated image: ${imgRes.status}`)
    const buffer = await imgRes.arrayBuffer()
    return `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`
  }

  throw new Error('OpenAI response missing both b64_json and url')
}

async function generateImage(prompt: string, widthM: number, heightM: number): Promise<string> {
  const wavespeedKey = process.env.WAVESPEED_API_KEY
  if (wavespeedKey) return generateImageViaWavespeed(prompt, widthM, heightM, wavespeedKey)

  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) return generateImageViaOpenAI(prompt, widthM, heightM, openaiKey)

  throw new Error('Missing API key: set WAVESPEED_API_KEY or OPENAI_API_KEY')
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
