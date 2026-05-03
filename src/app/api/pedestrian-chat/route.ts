import { NextRequest, NextResponse } from 'next/server'

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export async function POST(req: NextRequest) {
  const { agentName, billboardName, messages }: {
    agentName: string
    billboardName: string
    messages: ChatMessage[]
  } = await req.json()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 })

  const system = `You are ${agentName}, a pedestrian who just walked past the "${billboardName}" billboard in a busy urban area. Respond as this real person would — casual, specific, a little distracted. You have genuine opinions about the ads you see every day. Keep every reply to 1–2 short sentences. Don't mention your own name. Don't be sycophantic.`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 128,
        system,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Anthropic error ${res.status}: ${text.slice(0, 200)}` }, { status: 500 })
    }

    const json = await res.json() as { content: Array<{ type: string; text: string }> }
    const reply = json.content.find(b => b.type === 'text')?.text?.trim() ?? ''
    return NextResponse.json({ reply })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
