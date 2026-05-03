import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

export async function POST(req: NextRequest) {
  const { agentName, billboardName, creativeText, format }: {
    agentName: string
    billboardName: string
    creativeText: string
    format: string
  } = await req.json()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 })

  const system = `You generate a brief, authentic first-person thought from a pedestrian who just noticed an outdoor advertisement while walking past it. Keep it to 1–2 short sentences. Make it feel like a natural, fleeting thought — the kind you'd have mid-stride. Vary the tone: sometimes engaged, sometimes skeptical, sometimes indifferent or amused. Output ONLY valid JSON: {"thought": "..."}. No markdown, no explanation.`

  const userMessage = `Pedestrian: ${agentName}
Billboard location: ${billboardName}
Ad copy: "${creativeText}"
Ad format: ${format}

Generate their split-second reaction.`

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
        max_tokens: 120,
        system,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Anthropic error ${res.status}: ${text.slice(0, 200)}` }, { status: 500 })
    }

    const json = await res.json() as { content: Array<{ type: string; text: string }> }
    const rawText = json.content.find(b => b.type === 'text')?.text?.trim() ?? ''
    const match = rawText.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ thought: 'Hm, interesting.' })

    const parsed = JSON.parse(match[0]) as { thought?: string }
    return NextResponse.json({ thought: parsed.thought ?? 'Interesting…' })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
