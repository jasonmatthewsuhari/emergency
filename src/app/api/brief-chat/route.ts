import { NextRequest, NextResponse } from 'next/server'
import type { CompanyBrief } from '@/types'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  const { messages, currentBrief }: { messages: ChatMessage[]; currentBrief: CompanyBrief } =
    await req.json()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 })

  const system = `You are a creative brief editor for Sightline, an OOH (out-of-home) advertising platform. Help users refine their advertising campaign brief before it goes to image generation.

Always respond with valid JSON only — no prose outside the JSON object:
{
  "message": "1-2 sentence friendly response explaining what you changed",
  "brief": { ...complete updated CompanyBrief... }
}

CompanyBrief schema:
{
  "url": string,
  "identity": {
    "companyName": string,
    "industry": string,
    "description": string,
    "brandAdjectives": [string, string, string],
    "tagline": string | null
  },
  "visualSystem": {
    "primaryColor": string (hex) | null,
    "secondaryColor": string (hex) | null,
    "fonts": string[] | null,
    "styleReference": string | null,
    "avoidList": string[] | null
  },
  "campaign": {
    "coreMessage": string,
    "offerOrHook": string | null,
    "callToAction": string | null,
    "campaignObjective": "awareness"|"conversion"|"foot traffic"|"app downloads" | null
  },
  "audience": {
    "description": string,
    "tone": string | null,
    "contextWhenSeen": string | null
  }
}

Current brief:
${JSON.stringify(currentBrief, null, 2)}

Rules:
- Only modify what the user asks about. Keep everything else exactly the same.
- brandAdjectives must always be exactly 3 strings.
- Be concrete — if they say "more playful", actually change tone/adjectives/coreMessage to reflect that.
- Keep responses short and confident.`

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Anthropic error ${res.status}: ${text.slice(0, 200)}` }, { status: 500 })
    }

    const json = await res.json() as { content: Array<{ type: string; text: string }> }
    const text = json.content.find(b => b.type === 'text')?.text?.trim() ?? ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'No JSON in response', raw: text }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0])
    return NextResponse.json({ message: parsed.message, brief: parsed.brief })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
