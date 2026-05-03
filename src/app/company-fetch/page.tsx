'use client'

import { useState } from 'react'
import type { CompanyBrief } from '@/types'

type FetchState = 'idle' | 'loading' | 'done' | 'error'
type GenerateMode = 'image' | 'video'
type GenerateState = 'idle' | 'generating' | 'done' | 'error'

interface CreativeOverlay {
  brandName: string
  tagline: string | null
  cta: string | null
  primaryColor: string | null
  secondaryColor: string | null
}

// Standard landscape billboard dimensions used for generation
const DEFAULT_WIDTH_M = 14
const DEFAULT_HEIGHT_M = 6

export default function CompanyFetchPage() {
  const [url, setUrl] = useState('')
  const [state, setState] = useState<FetchState>('idle')
  const [brief, setBrief] = useState<CompanyBrief | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFetch() {
    if (!url.trim()) return
    setState('loading')
    setBrief(null)
    setError(null)
    try {
      const res = await fetch('/api/company-brief', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      const json = await res.json() as { brief?: CompanyBrief; error?: string }
      if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`)
      setBrief(json.brief!)
      setState('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setState('error')
    }
  }

  return (
    <div style={{
      height: '100vh',
      background: '#0f1117',
      color: '#e8e8e8',
      fontFamily: 'var(--font-outfit, Outfit, system-ui, sans-serif)',
      padding: '48px 24px 80px',
      overflowY: 'auto',
      boxSizing: 'border-box',
    }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#D02020', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, background: '#1A5CE5', display: 'inline-block' }} />
            <span style={{ width: 10, height: 10, background: '#E5C21A', display: 'inline-block' }} />
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.02em', margin: 0, color: '#fff' }}>
            COMPANY BRIEF
          </h1>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#888', letterSpacing: '0.04em' }}>
            DROP A URL — GET A BRAND BRIEF + AI CREATIVE
          </p>
        </div>

        {/* Input */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 40 }}>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleFetch()}
            placeholder="https://example.com"
            style={{
              flex: 1,
              background: '#1a1d27',
              border: '1px solid #2a2d3a',
              borderRadius: 6,
              padding: '12px 16px',
              fontSize: 15,
              color: '#e8e8e8',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleFetch}
            disabled={state === 'loading' || !url.trim()}
            style={{
              background: state === 'loading' ? '#2a2d3a' : '#D02020',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '12px 24px',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '0.06em',
              cursor: state === 'loading' ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            {state === 'loading' ? 'FETCHING…' : 'FETCH →'}
          </button>
        </div>

        {/* Error */}
        {state === 'error' && (
          <div style={{
            background: '#1f0f0f',
            border: '1px solid #5a1a1a',
            borderRadius: 6,
            padding: '14px 18px',
            color: '#ff6b6b',
            fontSize: 14,
            marginBottom: 32,
          }}>
            {error}
          </div>
        )}

        {/* Creative first, brief below */}
        {state === 'done' && brief && (
          <>
            <CreativeGenerator brief={brief} />
            <div style={{ marginTop: 32 }}>
              <BriefDisplay brief={brief} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function CreativeGenerator({ brief }: { brief: CompanyBrief }) {
  const [mode, setMode] = useState<GenerateMode>('image')
  const [genState, setGenState] = useState<GenerateState>('idle')
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [overlay, setOverlay] = useState<CreativeOverlay | null>(null)
  const [usedPrompt, setUsedPrompt] = useState<string | null>(null)
  const [genError, setGenError] = useState<string | null>(null)

  async function handleGenerate() {
    setGenState('generating')
    setResultUrl(null)
    setOverlay(null)
    setUsedPrompt(null)
    setGenError(null)

    try {
      const res = await fetch('/api/generate-creative', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          brief,
          widthM: DEFAULT_WIDTH_M,
          heightM: DEFAULT_HEIGHT_M,
          mode,
        }),
      })
      const json = await res.json() as { url?: string; prompt?: string; overlay?: CreativeOverlay; error?: string }
      if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`)
      setResultUrl(json.url!)
      setOverlay(json.overlay ?? null)
      setUsedPrompt(json.prompt ?? null)
      setGenState('done')
      try { localStorage.setItem('sightline:pending-creative', json.url!) } catch { /* storage unavailable */ }
    } catch (err) {
      setGenError(err instanceof Error ? err.message : String(err))
      setGenState('error')
    }
  }

  const isGenerating = genState === 'generating'

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{
        background: '#1a1d27',
        border: '1px solid #2a2d3a',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: '#D0202018',
          borderBottom: '1px solid #D0202040',
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#D02020', display: 'inline-block' }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#D02020' }}>GENERATE CREATIVE</span>
          </div>
          <span style={{ fontSize: 11, color: '#555', letterSpacing: '0.04em' }}>
            {DEFAULT_WIDTH_M}m × {DEFAULT_HEIGHT_M}m billboard
          </span>
        </div>

        <div style={{ padding: '18px 18px 20px' }}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            {(['image', 'video'] as const).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setGenState('idle'); setResultUrl(null); setUsedPrompt(null); setGenError(null) }}
                disabled={isGenerating}
                style={{
                  background: mode === m ? '#D02020' : '#12151e',
                  color: mode === m ? '#fff' : '#666',
                  border: `1px solid ${mode === m ? '#D02020' : '#2a2d3a'}`,
                  borderRadius: 5,
                  padding: '7px 18px',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  textTransform: 'uppercase',
                }}
              >
                {m === 'image' ? '📸 Image' : '🎬 Video'}
              </button>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#555', alignSelf: 'center' }}>
              {mode === 'image' ? '~15–30s' : '~60–120s'}
            </span>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            style={{
              width: '100%',
              background: isGenerating ? '#2a2d3a' : '#D02020',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '13px 0',
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              marginBottom: 16,
            }}
          >
            {isGenerating
              ? (mode === 'video' ? 'GENERATING VIDEO… (up to 2 min)' : 'GENERATING IMAGE…')
              : `GENERATE ${mode.toUpperCase()} →`}
          </button>

          {/* Error */}
          {genState === 'error' && genError && (
            <div style={{
              background: '#1f0f0f',
              border: '1px solid #5a1a1a',
              borderRadius: 6,
              padding: '12px 16px',
              color: '#ff6b6b',
              fontSize: 13,
              marginBottom: 16,
            }}>
              {genError}
            </div>
          )}

          {/* Prompt used */}
          {usedPrompt && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase' }}>
                Prompt used
              </div>
              <div style={{
                background: '#12151e',
                border: '1px solid #2a2d3a',
                borderRadius: 5,
                padding: '10px 14px',
                fontSize: 13,
                color: '#aaa',
                lineHeight: 1.5,
                fontStyle: 'italic',
              }}>
                {usedPrompt}
              </div>
            </div>
          )}

          {/* Result */}
          {genState === 'done' && resultUrl && (
            <BillboardPreview url={resultUrl} mode={mode} overlay={overlay} />
          )}
        </div>
      </div>
    </div>
  )
}

function BillboardPreview({ url, mode, overlay }: { url: string; mode: GenerateMode; overlay: CreativeOverlay | null }) {
  const textColor = overlay?.secondaryColor ?? '#ffffff'
  const accentColor = overlay?.primaryColor ?? '#D02020'

  return (
    <div style={{ marginTop: 4 }}>
      <div style={{ fontSize: 11, color: '#555', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase' }}>
        Billboard preview
      </div>
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${DEFAULT_WIDTH_M} / ${DEFAULT_HEIGHT_M}`,
        borderRadius: 6,
        overflow: 'hidden',
        border: '1px solid #2a2d3a',
        background: '#000',
      }}>
        {mode === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Billboard background" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <video src={url} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
        {overlay && (
          <div style={{
            position: 'absolute',
            inset: 0,
            // gradient scrim so text is always legible regardless of background
            background: 'linear-gradient(to left, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.45) 45%, transparent 70%)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-end',
            padding: '5% 6%',
            pointerEvents: 'none',
          }}>
            <div style={{ textAlign: 'right', maxWidth: '52%' }}>
              {overlay.brandName && (
                <div style={{
                  fontSize: 'clamp(13px, 3.2vw, 36px)',
                  fontWeight: 900,
                  letterSpacing: '0.04em',
                  color: '#fff',
                  lineHeight: 1.0,
                  marginBottom: '0.3em',
                  textTransform: 'uppercase',
                  fontFamily: 'inherit',
                }}>
                  {overlay.brandName}
                </div>
              )}
              {overlay.tagline && (
                <div style={{
                  fontSize: 'clamp(8px, 1.4vw, 14px)',
                  fontWeight: 400,
                  color: 'rgba(255,255,255,0.8)',
                  lineHeight: 1.4,
                  marginBottom: '0.9em',
                  fontFamily: 'inherit',
                }}>
                  {overlay.tagline}
                </div>
              )}
              {overlay.cta && (
                <div style={{
                  display: 'inline-block',
                  background: accentColor,
                  color: '#fff',
                  fontSize: 'clamp(7px, 1.2vw, 12px)',
                  fontWeight: 800,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  padding: '0.45em 1em',
                  borderRadius: 2,
                  fontFamily: 'inherit',
                }}>
                  {overlay.cta}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a
          href="/"
          style={{
            fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textDecoration: 'none',
            background: '#D02020', color: '#fff', borderRadius: 5, padding: '7px 16px',
            display: 'inline-block',
          }}
        >
          VIEW ON MAP →
        </a>
        <a
          href={url}
          download={`creative.${mode === 'video' ? 'mp4' : 'jpg'}`}
          style={{
            fontSize: 12, color: '#555', textDecoration: 'none',
            letterSpacing: '0.04em', border: '1px solid #2a2d3a',
            borderRadius: 4, padding: '5px 12px',
          }}
        >
          Download ↓
        </a>
      </div>
    </div>
  )
}

function BriefDisplay({ brief }: { brief: CompanyBrief }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <Section label="IDENTITY" accent="#D02020">
        <Row label="Company" value={brief.identity.companyName} />
        <Row label="Industry" value={brief.identity.industry} />
        <Row label="Description" value={brief.identity.description} />
        <Row label="Personality" value={brief.identity.brandAdjectives.join('  ·  ')} />
        {brief.identity.tagline && <Row label="Tagline" value={`"${brief.identity.tagline}"`} />}
      </Section>

      <Section label="VISUAL SYSTEM" accent="#1A5CE5">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          {brief.visualSystem.primaryColor && (
            <ColorChip label="Primary" hex={brief.visualSystem.primaryColor} />
          )}
          {brief.visualSystem.secondaryColor && (
            <ColorChip label="Secondary" hex={brief.visualSystem.secondaryColor} />
          )}
        </div>
        {brief.visualSystem.fonts && brief.visualSystem.fonts.length > 0 && (
          <Row label="Fonts" value={brief.visualSystem.fonts.join(', ')} />
        )}
        {brief.visualSystem.styleReference && (
          <Row label="Style ref" value={brief.visualSystem.styleReference} />
        )}
        {brief.visualSystem.avoidList && brief.visualSystem.avoidList.length > 0 && (
          <Row label="Avoid" value={brief.visualSystem.avoidList.join('  ·  ')} />
        )}
        {brief.visualSystem.logoUrl && (
          <Row label="Logo URL" value={brief.visualSystem.logoUrl} mono />
        )}
      </Section>

      <Section label="CAMPAIGN" accent="#E5C21A">
        <Row label="Core message" value={brief.campaign.coreMessage} highlight />
        {brief.campaign.offerOrHook && <Row label="Offer / hook" value={brief.campaign.offerOrHook} />}
        {brief.campaign.callToAction && <Row label="CTA" value={brief.campaign.callToAction} />}
        {brief.campaign.campaignObjective && <Row label="Objective" value={brief.campaign.campaignObjective} />}
      </Section>

      <Section label="AUDIENCE" accent="#36c27a">
        <Row label="Who they are" value={brief.audience.description} highlight />
        {brief.audience.tone && <Row label="Tone" value={brief.audience.tone} />}
        {brief.audience.contextWhenSeen && <Row label="Context" value={brief.audience.contextWhenSeen} />}
      </Section>

      <details style={{ marginTop: 8 }}>
        <summary style={{ color: '#555', fontSize: 12, cursor: 'pointer', letterSpacing: '0.04em' }}>RAW JSON</summary>
        <pre style={{
          marginTop: 10,
          background: '#1a1d27',
          border: '1px solid #2a2d3a',
          borderRadius: 6,
          padding: 16,
          fontSize: 12,
          color: '#aaa',
          overflowX: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}>
          {JSON.stringify(brief, null, 2)}
        </pre>
      </details>
    </div>
  )
}

function Section({ label, accent, children }: { label: string; accent: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#1a1d27',
      border: '1px solid #2a2d3a',
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      <div style={{
        background: accent + '18',
        borderBottom: `1px solid ${accent}40`,
        padding: '10px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, display: 'inline-block' }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: accent }}>{label}</span>
      </div>
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, highlight, mono }: { label: string; value: string; highlight?: boolean; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{
        minWidth: 110,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.06em',
        color: '#555',
        paddingTop: 2,
        textTransform: 'uppercase',
        flexShrink: 0,
      }}>
        {label}
      </span>
      <span style={{
        fontSize: highlight ? 15 : 14,
        color: highlight ? '#fff' : '#ccc',
        fontWeight: highlight ? 600 : 400,
        fontFamily: mono ? 'monospace' : 'inherit',
        wordBreak: 'break-all',
      }}>
        {value}
      </span>
    </div>
  )
}

function ColorChip({ label, hex }: { label: string; hex: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 28,
        height: 28,
        borderRadius: 4,
        background: hex,
        border: '1px solid rgba(255,255,255,0.1)',
        flexShrink: 0,
      }} />
      <div>
        <div style={{ fontSize: 11, color: '#888', letterSpacing: '0.04em' }}>{label}</div>
        <div style={{ fontSize: 13, color: '#ddd', fontFamily: 'monospace' }}>{hex}</div>
      </div>
    </div>
  )
}
