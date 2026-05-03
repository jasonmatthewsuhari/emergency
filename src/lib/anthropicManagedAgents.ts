import type { BillboardPlacement, LatLng, ManagedAgentDisplayEvent, ManagedAgentResources, PedestrianInterviewLine } from '@/types'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1'
const ANTHROPIC_VERSION = '2023-06-01'
const MANAGED_AGENTS_BETA = 'managed-agents-2026-04-01'
const DEFAULT_MODEL = 'claude-sonnet-4-6'

interface AnthropicErrorBody {
  error?: {
    type?: string
    message?: string
  }
}

interface AnthropicSession {
  id: string
  status: string
  agent?: { id?: string }
}

interface AnthropicEventsList {
  data?: AnthropicEvent[]
  next_page?: string | null
}

type AnthropicEvent = {
  id?: string
  type?: string
  processed_at?: string | null
  content?: Array<{ type?: string; text?: string }>
  name?: string
  input?: unknown
  error?: { type?: string; message?: string }
  stop_reason?: unknown
}

export class ManagedAgentsConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ManagedAgentsConfigError'
  }
}

function getApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new ManagedAgentsConfigError('Missing ANTHROPIC_API_KEY. Set it in .env.local or the server environment, then restart Next.js.')
  }
  return apiKey
}

async function anthropicRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ANTHROPIC_API_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-beta': MANAGED_AGENTS_BETA,
      'x-api-key': getApiKey(),
      ...init?.headers,
    },
  })

  if (!res.ok) {
    let message = `Anthropic Managed Agents API error: ${res.status}`
    try {
      const body = await res.json() as AnthropicErrorBody
      if (body.error?.message) message = `${message} ${body.error.message}`
    } catch {
      const text = await res.text()
      if (text) message = `${message} ${text.slice(0, 240)}`
    }
    throw new Error(message)
  }

  return await res.json() as T
}

export function getConfiguredManagedAgentResources(): ManagedAgentResources | null {
  const agentId = process.env.ANTHROPIC_MANAGED_AGENT_ID
  const environmentId = process.env.ANTHROPIC_MANAGED_ENVIRONMENT_ID
  if (!agentId || !environmentId) return null
  return { agentId, environmentId }
}

export async function createSightlineManagedAgentResources(): Promise<ManagedAgentResources> {
  const suffix = Date.now().toString(36)
  const environment = await anthropicRequest<{ id: string }>('/environments', {
    method: 'POST',
    body: JSON.stringify({
      name: `sightline-ooh-agency-${suffix}`,
      description: 'Cloud environment for Sightline OOH agency operator sessions.',
      config: {
        type: 'cloud',
        networking: {
          type: 'unrestricted',
        },
      },
      metadata: {
        app: 'sightline',
        purpose: 'ooh-agency-demo',
      },
    }),
  })

  const agent = await anthropicRequest<{ id: string }>('/agents', {
    method: 'POST',
    body: JSON.stringify({
      name: `Sightline OOH Agency Operator ${suffix}`,
      description: 'Discovers, qualifies, simulates, and prepares inquiry packets for physical OOH ad campaigns.',
      model: {
        id: process.env.ANTHROPIC_MANAGED_MODEL || DEFAULT_MODEL,
      },
      system: buildSightlineAgentSystemPrompt(),
      tools: [
        {
          type: 'agent_toolset_20260401',
          default_config: { enabled: false },
          configs: [
            { name: 'web_search', enabled: true },
            { name: 'web_fetch', enabled: true },
            { name: 'bash', enabled: true },
            { name: 'read', enabled: true },
            { name: 'write', enabled: true },
          ],
        },
      ],
      metadata: {
        app: 'sightline',
        purpose: 'ooh-agency-demo',
      },
    }),
  })

  return {
    agentId: agent.id,
    environmentId: environment.id,
  }
}

export async function startSightlineAgencySession(input: {
  area: LatLng
  brief: string
  resources?: ManagedAgentResources | null
}): Promise<AnthropicSession & ManagedAgentResources> {
  const resources = input.resources ?? getConfiguredManagedAgentResources()
  if (!resources) {
    throw new ManagedAgentsConfigError('Missing Managed Agents resources. Create them from the demo setup button or set ANTHROPIC_MANAGED_AGENT_ID and ANTHROPIC_MANAGED_ENVIRONMENT_ID.')
  }

  const session = await anthropicRequest<AnthropicSession>('/sessions', {
    method: 'POST',
    body: JSON.stringify({
      agent: resources.agentId,
      environment_id: resources.environmentId,
      title: 'Sightline OOH agency campaign run',
      metadata: {
        app: 'sightline',
        lat: String(input.area.lat),
        lng: String(input.area.lng),
      },
    }),
  })

  await sendSessionMessage(session.id, buildCampaignRunPrompt(input.area, input.brief))

  return {
    ...session,
    ...resources,
  }
}

export async function sendSessionMessage(sessionId: string, text: string): Promise<void> {
  await anthropicRequest(`/sessions/${sessionId}/events`, {
    method: 'POST',
    body: JSON.stringify({
      events: [
        {
          type: 'user.message',
          content: [
            {
              type: 'text',
              text,
            },
          ],
        },
      ],
    }),
  })
}

export async function getSession(sessionId: string): Promise<AnthropicSession> {
  return await anthropicRequest<AnthropicSession>(`/sessions/${sessionId}`)
}

export async function listSessionEvents(sessionId: string): Promise<AnthropicEvent[]> {
  const events: AnthropicEvent[] = []
  let page: string | null | undefined

  do {
    const params = new URLSearchParams({ order: 'asc', limit: '100' })
    if (page) params.set('page', page)

    const result = await anthropicRequest<AnthropicEventsList>(`/sessions/${sessionId}/events?${params.toString()}`)
    events.push(...(result.data ?? []))
    page = result.next_page
  } while (page)

  return events
}

export function toDisplayEvents(events: AnthropicEvent[]): ManagedAgentDisplayEvent[] {
  return events
    .filter(event => event.type && !event.type.startsWith('span.'))
    .map((event, index) => {
      const type = event.type ?? 'unknown'
      const id = event.id ?? `${type}_${index}`

      if (type === 'user.message') {
        return {
          id,
          type,
          actor: 'Sightline App',
          title: 'Sent campaign task',
          detail: textFromContent(event.content) || 'User message sent to the managed agent.',
          status: event.processed_at ? 'complete' : 'queued',
          processedAt: event.processed_at,
        }
      }

      if (type === 'agent.message') {
        return {
          id,
          type,
          actor: 'AI Agent',
          title: 'Agent response',
          detail: textFromContent(event.content) || 'Claude returned a message.',
          status: 'complete',
          processedAt: event.processed_at,
        }
      }

      if (type === 'agent.tool_use' || type === 'agent.mcp_tool_use' || type === 'agent.custom_tool_use') {
        return {
          id,
          type,
          actor: 'Managed Tool',
          title: `Using ${event.name ?? 'tool'}`,
          detail: stringifyToolInput(event.input),
          status: 'running',
          toolName: event.name,
          processedAt: event.processed_at,
        }
      }

      if (type === 'session.error') {
        return {
          id,
          type,
          actor: 'Session',
          title: event.error?.type ?? 'Session error',
          detail: event.error?.message ?? 'Managed Agents session reported an error.',
          status: 'error',
          processedAt: event.processed_at,
        }
      }

      if (type === 'session.status_idle') {
        return {
          id,
          type,
          actor: 'Session',
          title: 'Session idle',
          detail: event.stop_reason ? JSON.stringify(event.stop_reason) : 'The managed agent is waiting for the next event.',
          status: 'needs-approval',
          processedAt: event.processed_at,
        }
      }

      return {
        id,
        type,
        actor: 'Session',
        title: type,
        detail: 'Managed Agents event received.',
        status: event.processed_at ? 'complete' : 'queued',
        processedAt: event.processed_at,
      }
    })
}

export function buildCampaignRunPrompt(area: LatLng, brief: string): string {
  return [
    'Run Sightline as an AI-operated physical marketing / out-of-home agency desk.',
    '',
    `Campaign brief: ${brief}`,
    `Selected area: latitude ${area.lat}, longitude ${area.lng}.`,
    '',
    'Your job:',
    '1. Discover likely OOH opportunity types and relevant operators or venue categories for this area.',
    '2. Qualify the opportunities by audience, format fit, operational risk, creative constraints, and vendor questions.',
    '3. Use web search/fetch when useful. Be explicit about assumptions if exact inventory availability is not public.',
    '4. Simulate Sightline-style pre-flight scoring conceptually: visibility, dwell time, clutter, viewing angle, audience fit, creative readability, and inquiry priority.',
    '5. Draft the vendor inquiry packet, but do not claim to have sent anything.',
    '',
    'Important approval rule: stop after drafting the inquiry packet and ask for human approval before continuing to final recommendation. Do not book, email, spend money, sign contracts, or share client data.',
    '',
    'When approved in a later message, continue by producing a final campaign plan with shortlist, budget allocation, vendor questions, creative QA, and next actions.',
  ].join('\n')
}

function buildSightlineAgentSystemPrompt(): string {
  return [
    'You are Sightline, an AI-operated OOH agency desk for physical advertising campaigns.',
    'You discover possible out-of-home inventory paths, qualify opportunities, run pre-flight reasoning, prepare vendor inquiry packets, and produce buyer-facing campaign recommendations.',
    'You are careful with uncertainty: distinguish verified facts, assumptions, and recommended follow-up questions.',
    'You must never send real vendor outreach, commit spend, book inventory, sign contracts, or imply approval without explicit user confirmation.',
    'For the demo, show your work through concise phase-labeled outputs: Discovery, Qualification, Simulation, Inquiry Draft, Approval Needed, and Final Plan.',
  ].join('\n')
}

function textFromContent(content: AnthropicEvent['content']): string {
  return (content ?? [])
    .filter(block => block.type === 'text' && block.text)
    .map(block => block.text)
    .join('\n')
}

// ---- Pedestrian interview managed agents ----

let cachedInterviewAgentId: string | null = null

export async function getOrCreatePedestrianInterviewAgent(): Promise<string> {
  if (cachedInterviewAgentId) return cachedInterviewAgentId

  const agentId = process.env.ANTHROPIC_MANAGED_INTERVIEW_AGENT_ID
  if (agentId) {
    cachedInterviewAgentId = agentId
    return agentId
  }

  const agent = await anthropicRequest<{ id: string }>('/agents', {
    method: 'POST',
    body: JSON.stringify({
      name: `Sightline Pedestrian Interviewer ${Date.now().toString(36)}`,
      description: 'Simulates brief OOH ad recall interviews with pedestrians who just viewed a billboard.',
      model: { id: process.env.ANTHROPIC_MANAGED_MODEL || DEFAULT_MODEL },
      system: buildPedestrianInterviewSystemPrompt(),
      tools: [
        {
          type: 'agent_toolset_20260401',
          default_config: { enabled: false },
          configs: [],
        },
      ],
      metadata: { app: 'sightline', purpose: 'pedestrian-interview' },
    }),
  })

  cachedInterviewAgentId = agent.id
  return agent.id
}

export async function startPedestrianInterviewSession(input: {
  agentName: string
  billboardName: string
  billboard?: BillboardPlacement | null
  environmentId: string
  agentId: string
}): Promise<string> {
  const session = await anthropicRequest<AnthropicSession>('/sessions', {
    method: 'POST',
    body: JSON.stringify({
      agent: input.agentId,
      environment_id: input.environmentId,
      title: `Interview: ${input.agentName} saw "${input.billboardName}"`,
      metadata: { app: 'sightline', purpose: 'pedestrian-interview' },
    }),
  })

  await sendSessionMessage(session.id, buildPedestrianInterviewPrompt(input.agentName, input.billboardName, input.billboard ?? null))
  return session.id
}

export function parsePedestrianInterviewResponse(events: AnthropicEvent[]): {
  transcript: PedestrianInterviewLine[]
  score?: number
  feedback?: string
  status: 'running' | 'idle' | 'error'
} {
  const agentMessages = events.filter(e => e.type === 'agent.message')
  const hasIdle = events.some(e => e.type === 'session.status_idle')
  const hasError = events.some(e => e.type === 'session.error')

  if (hasError) return { transcript: [], status: 'error' }
  if (agentMessages.length === 0) return { transcript: [], status: 'running' }

  const rawText = agentMessages.map(e => textFromContent(e.content)).join('\n')
  const match = rawText.match(/\{[\s\S]*\}/)
  if (!match) {
    return { transcript: [{ role: 'interviewer', text: rawText.slice(0, 300) }], status: hasIdle ? 'idle' : 'running' }
  }

  try {
    const parsed = JSON.parse(match[0]) as {
      transcript?: PedestrianInterviewLine[]
      score?: number
      feedback?: string
    }
    return {
      transcript: Array.isArray(parsed.transcript) ? parsed.transcript : [],
      score: typeof parsed.score === 'number' ? parsed.score : undefined,
      feedback: typeof parsed.feedback === 'string' ? parsed.feedback : undefined,
      status: hasIdle ? 'idle' : 'running',
    }
  } catch {
    return { transcript: [{ role: 'interviewer', text: rawText.slice(0, 300) }], status: hasIdle ? 'idle' : 'running' }
  }
}

function buildPedestrianInterviewSystemPrompt(): string {
  return [
    'You are a field researcher for Sightline, an OOH advertising analytics platform.',
    'When given context about a pedestrian who just saw a billboard, simulate a brief 3-question street interview.',
    'Play both the researcher and the pedestrian authentically — the pedestrian should feel like a real person with opinions.',
    'Output ONLY valid JSON. No markdown, no explanation outside the JSON object.',
    'Format: { "transcript": [{"role": "interviewer"|"pedestrian", "text": "..."}...], "score": 0-100, "feedback": "one improvement suggestion" }',
    'The score (0-100) rates overall ad effectiveness based on recall, comprehension, and emotional resonance shown in the simulated answers.',
  ].join('\n')
}

function buildPedestrianInterviewPrompt(agentName: string, billboardName: string, billboard: BillboardPlacement | null): string {
  const details = billboard
    ? [
        `Format: ${billboard.format}`,
        `Creative: "${billboard.creativeText}"`,
        `Colors: ${billboard.primaryColor} / ${billboard.secondaryColor}`,
        `Size: ${billboard.widthM}m × ${billboard.heightM}m`,
        `Weekly reach: ${billboard.weeklyReach.toLocaleString()}`,
      ].join(', ')
    : `Billboard name: ${billboardName}`

  return [
    `Pedestrian name: ${agentName}`,
    `Billboard: ${billboardName}`,
    details,
    '',
    'Simulate a 3-question street interview. Return valid JSON only.',
  ].join('\n')
}

// ---- end pedestrian interview ----

function stringifyToolInput(input: unknown): string {
  if (input === undefined || input === null) return 'Tool call emitted by the managed agent.'
  if (typeof input === 'string') return input
  try {
    return JSON.stringify(input, null, 2)
  } catch {
    return 'Tool input could not be displayed.'
  }
}
