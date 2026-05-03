import { NextRequest, NextResponse } from 'next/server'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

export async function POST(req: NextRequest) {
  const { fieldLabel, currentValue, instruction }: {
    fieldLabel: string
    currentValue: string
    instruction: string
  } = await req.json()

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'Missing ANTHROPIC_API_KEY' }, { status: 500 })

  const system = `You are a brief copywriter for an OOH advertising platform. Reword a single field value based on the user's instruction.
Respond ONLY with valid JSON: {"newValue": "..."}
Keep the same meaning and approximate length unless told otherwise. Be concrete and direct.`

  const userMessage = `Field: ${fieldLabel}
Current value: ${currentValue || '(empty)'}
Instruction: ${instruction}`

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
        max_tokens: 256,
        system,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: `Anthropic error ${res.status}: ${text.slice(0, 200)}` }, { status: 500 })
    }

    const json = await res.json() as { content: Array<{ type: string; text: string }> }
    const text = json.content.find(b => b.type === 'text')?.text?.trim() ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ error: 'No JSON in response' }, { status: 500 })

    const parsed = JSON.parse(match[0])
    return NextResponse.json({ newValue: parsed.newValue })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
