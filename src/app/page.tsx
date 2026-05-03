'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import useEmblaCarousel from 'embla-carousel-react'
import { Skeleton } from 'boneyard-js/react'
import { DEFAULT_GLOBE, globeStyle } from '@/components/GlobePositioner'
import type { CompanyBrief } from '@/types'

const COUNTRY_INFO: Record<string, { name: string; lat: number; lng: number }> = {
  AU: { name: 'Australia',              lat: -25.27, lng:  133.78 },
  CA: { name: 'Canada',                 lat:  56.13, lng: -106.35 },
  DE: { name: 'Germany',                lat:  51.17, lng:   10.45 },
  ES: { name: 'Spain',                  lat:  40.46, lng:   -3.75 },
  FR: { name: 'France',                 lat:  46.23, lng:    2.21 },
  GB: { name: 'United Kingdom',         lat:  55.38, lng:   -3.44 },
  IT: { name: 'Italy',                  lat:  41.87, lng:   12.57 },
  MX: { name: 'Mexico',                 lat:  23.63, lng: -102.55 },
  NL: { name: 'Netherlands',            lat:  52.13, lng:    5.29 },
  PL: { name: 'Poland',                 lat:  51.92, lng:   19.15 },
  SG: { name: 'Singapore',             lat:   1.35, lng:  103.82 },
  US: { name: 'United States',            lat: 37.09, lng: -95.71 },
}

function flagEmoji(iso: string): string {
  return [...iso.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 - 65 + c.charCodeAt(0))).join('')
}

interface CountryOption { iso: string; name: string; lat: number; lng: number; count: number | null }

const MAP_FOCUS_STORAGE_KEY = 'sightline:map-focus'

function countrySearchLabel(o: CountryOption): string {
  return `${o.name.toUpperCase()} ${flagEmoji(o.iso)}`
}

function CountrySearch({ options, onSelect }: {
  options: CountryOption[]
  onSelect: (o: CountryOption) => void
}) {
  const [query, setQuery]   = useState('')
  const [open,  setOpen]    = useState(false)
  const selected = options.find(o => query === countrySearchLabel(o))

  const visible = (query.trim()
    ? options.filter(o => {
        const q = query.toLowerCase()
        return countrySearchLabel(o).toLowerCase().includes(q) ||
          o.iso.toLowerCase().includes(q)
      })
    : options
  ).slice(0, 10)

  return (
    <div style={{ position: 'fixed', top: '1.25rem', right: '1.25rem', zIndex: 100, width: 300 }}>
      {selected ? (
        <div
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(12, 14, 22, 0.92)', border: '1px solid #2a2d3a',
            color: '#e8e8e8', padding: '8px 12px', fontSize: 12,
            letterSpacing: '0.04em', fontFamily: 'inherit',
            backdropFilter: 'blur(8px)', textTransform: 'uppercase',
          }}
        >
          {countrySearchLabel(selected)}
        </div>
      ) : (
        <>
      {/* dropdown list — rendered ABOVE the input */}
      {open && visible.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: 'rgba(12, 14, 22, 0.97)',
          border: '1px solid #2a2d3a',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          maxHeight: 320, overflowY: 'auto',
        }}>
          {visible.map(o => (
            <div
              key={o.iso}
              onMouseDown={() => { onSelect(o); setQuery(countrySearchLabel(o)); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '7px 12px', cursor: 'pointer', fontSize: 12,
                color: '#e8e8e8', letterSpacing: '0.02em',
                borderBottom: '1px solid #1a1d2a',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#1a1d2e')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {o.name.toUpperCase()}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 8 }}>
                <span style={{ fontSize: 18, lineHeight: 1 }}>{flagEmoji(o.iso)}</span>
                {o.count != null && (
                  <span style={{ color: '#888', fontSize: 11 }}>({o.count})</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* search input */}
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search countries…"
        style={{
          width: '100%', boxSizing: 'border-box',
          background: 'rgba(12, 14, 22, 0.92)', border: '1px solid #2a2d3a',
          color: '#e8e8e8', padding: '8px 12px', fontSize: 12,
          letterSpacing: '0.04em', outline: 'none', fontFamily: 'inherit',
          backdropFilter: 'blur(8px)',
        }}
      />
        </>
      )}
    </div>
  )
}

const LandingMapPreview = dynamic(() => import('@/components/LandingMapPreview'), { ssr: false })
const LowPolyWalker = dynamic(() => import('@/components/LowPolyWalker'), { ssr: false })

function MapPreviewSkeleton() {
  return (
    <div className="landing-map-skeleton" aria-hidden="true">
      <div className="landing-map-skeleton__ring" />
      <div className="landing-map-skeleton__dot landing-map-skeleton__dot--one" />
      <div className="landing-map-skeleton__dot landing-map-skeleton__dot--two" />
      <div className="landing-map-skeleton__dot landing-map-skeleton__dot--three" />
    </div>
  )
}

function LandingMapPreviewFixture() {
  return (
    <div className="landing-map-fixture" aria-hidden="true">
      <div className="landing-map-fixture__globe" />
      <div className="landing-map-fixture__orbit landing-map-fixture__orbit--one" />
      <div className="landing-map-fixture__orbit landing-map-fixture__orbit--two" />
      <div className="landing-map-fixture__marker landing-map-fixture__marker--one" />
      <div className="landing-map-fixture__marker landing-map-fixture__marker--two" />
      <div className="landing-map-fixture__marker landing-map-fixture__marker--three" />
      <div className="landing-map-fixture__panel">
        <span />
        <span />
        <span />
      </div>
    </div>
  )
}

function OnboardingLoader() {
  return (
    <div className="onboarding-loader" role="status" aria-live="polite" aria-label="Loading Sightline">
      <div className="onboarding-loader__mark" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="onboarding-loader__copy">
        <strong>SIGHTLINE</strong>
        <span>Loading map intelligence</span>
      </div>
      <div className="onboarding-loader__bar" aria-hidden="true">
        <span />
      </div>
    </div>
  )
}

function Tip({ children }: { children: string }) {
  return (
    <span className="rv-tip">
      <em className="rv-tip-icon">?</em>
      <span className="rv-tip-box">{children}</span>
    </span>
  )
}

function WandBtn({ fieldLabel, currentValue, onUpdate }: {
  fieldLabel: string
  currentValue: string
  onUpdate: (newVal: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  const handleSend = async () => {
    if (!input.trim() || loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/field-reword', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ fieldLabel, currentValue, instruction: input.trim() }),
      })
      const json = await res.json() as { newValue?: string; error?: string }
      if (json.newValue) { onUpdate(json.newValue); setOpen(false); setInput('') }
    } finally {
      setLoading(false)
    }
  }

  return (
    <span style={{ position: 'relative', display: 'inline-flex', marginLeft: 4 }}>
      <button
        type="button"
        title="AI reword"
        onClick={() => setOpen(p => !p)}
        style={{
          width: 14, height: 14, borderRadius: '50%',
          background: open ? '#D02020' : '#1a1d27',
          border: '1px solid ' + (open ? '#D02020' : '#2a2d3a'),
          color: open ? '#fff' : '#555',
          fontSize: 8, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0, userSelect: 'none', letterSpacing: 0, padding: 0,
        }}
      >✦</button>
      {open && (
        <div
          onMouseDown={e => e.stopPropagation()}
          style={{
            position: 'absolute', bottom: 'calc(100% + 7px)', left: 0,
            background: '#1a1d27', border: '1px solid #2a2d3a', borderRadius: 6,
            padding: '10px 12px', width: 200, zIndex: 600,
            boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
            display: 'flex', flexDirection: 'column', gap: 7,
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); handleSend() }
              if (e.key === 'Escape') setOpen(false)
            }}
            placeholder="Make it more punchy…"
            style={{
              background: '#0f1117', border: '1px solid #2a2d3a',
              color: '#e8e8e8', padding: '6px 8px', fontSize: 11,
              borderRadius: 4, outline: 'none', fontFamily: 'inherit',
              width: '100%', boxSizing: 'border-box',
            }}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || loading}
            style={{
              background: '#D02020', border: 'none', color: '#fff',
              padding: '5px 0', borderRadius: 3, fontSize: 10,
              fontWeight: 700, letterSpacing: '0.08em',
              cursor: (!input.trim() || loading) ? 'not-allowed' : 'pointer',
              opacity: (!input.trim() || loading) ? 0.4 : 1,
            }}
          >{loading ? 'REWORDING…' : 'REWORD ✦'}</button>
        </div>
      )}
    </span>
  )
}

type LeftView = 'hero' | 'brief'
type ObMode  = 'choose' | 'url' | 'manual' | 'review' | 'generating' | 'preview'

interface CreativeOverlay {
  brandName: string
  tagline: string | null
  cta: string | null
  primaryColor: string | null
  secondaryColor: string | null
}

interface GeneratedCreative {
  url: string
  prompt: string
  overlay: CreativeOverlay
  mode: 'image'
}

const ADJECTIVES = [
  'bold', 'warm', 'premium', 'playful', 'clinical', 'minimal',
  'energetic', 'luxurious', 'technical', 'friendly', 'edgy',
  'professional', 'innovative', 'nostalgic', 'organic', 'sleek',
]
const OBJECTIVES = ['awareness', 'conversion', 'foot traffic', 'app downloads']
const BRIEF_SECTIONS = ['IDENTITY', 'VISUAL SYSTEM', 'THIS CAMPAIGN', 'AUDIENCE'] as const
const SCAN_STEPS = [
  { threshold: 8, label: 'Opening site' },
  { threshold: 22, label: 'Reading page structure' },
  { threshold: 38, label: 'Capturing brand signals' },
  { threshold: 55, label: 'Finding headlines and CTAs' },
  { threshold: 72, label: 'Deriving audience insights' },
  { threshold: 88, label: 'Building billboard direction' },
] as const

const DEFAULT_WIDTH_M = 14
const DEFAULT_HEIGHT_M = 6
const MIN_SCAN_PREVIEW_MS = 6500

function SiteScanPreview({ url, progress, status }: { url: string; progress: number; status: string }) {
  const currentStep = SCAN_STEPS.reduce((active, step, index) => (
    progress >= step.threshold ? index : active
  ), 0)
  const scrollOffset = Math.min(980, Math.max(0, progress - 8) * 10.5)
  const activeStep = SCAN_STEPS[currentStep]?.label ?? SCAN_STEPS[0].label

  return (
    <div className="site-scan">
      <div className="site-scan-head">
        <div>
          <span className="site-scan-kicker">Live crawler</span>
          <h2>Watching your site in real time</h2>
        </div>
        <div className="site-scan-percent">{Math.round(progress)}%</div>
      </div>
      <div className="site-scan-top">
        <span className="site-scan-dot site-scan-dot--red" />
        <span className="site-scan-dot site-scan-dot--yellow" />
        <span className="site-scan-dot site-scan-dot--blue" />
        <span className="site-scan-url">{url}</span>
      </div>
      <div className="site-scan-viewport">
        <iframe
          className="site-scan-frame"
          title="Website scan preview"
          src={url}
          referrerPolicy="no-referrer"
          style={{ transform: `translateY(-${scrollOffset}px)` }}
        />
        <div className="site-scan-line" />
        <div className="site-scan-hud">
          <span>Now reading</span>
          <strong>{activeStep}</strong>
        </div>
        <div className="site-scan-fallback">
          <span>Preview may be blocked by this site&apos;s embed policy.</span>
          <span>Scan is still running from the server.</span>
        </div>
      </div>
      <div className="site-scan-progress" aria-label="Scan progress">
        <div className="site-scan-progress__bar" style={{ width: `${Math.round(progress)}%` }} />
      </div>
      <div className="site-scan-meta">
        <span>{status}</span>
        <strong>{activeStep}</strong>
      </div>
      <div className="site-scan-steps">
        {SCAN_STEPS.map((step, index) => (
          <div
            key={step.label}
            className={`site-scan-step${index <= currentStep ? ' site-scan-step--active' : ''}`}
          >
            <span className="site-scan-step__mark">{index < currentStep ? 'OK' : String(index + 1).padStart(2, '0')}</span>
            <span>{step.label}</span>
          </div>
        ))}
      </div>
      <div className="pow-badge-wrap">
        <div className="pow-badge">
          <svg
            className="pow-badge__svg"
            viewBox="0 0 400 122"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="pow-grad" cx="50%" cy="50%" r="52%">
                <stop offset="0%" stopColor="#FFFDE7" />
                <stop offset="60%" stopColor="#FFE01B" />
                <stop offset="100%" stopColor="#FFC107" />
              </radialGradient>
            </defs>
            <polygon
              points="12,8 68,44 105,2 155,46 185,6 200,44 215,6 245,46 295,2 332,44 388,8 400,44 390,68 400,88 382,95 368,120 308,90 290,120 248,86 230,120 200,88 170,120 152,86 110,120 92,90 32,120 18,95 0,88 10,68 0,44 12,35"
              fill="rgba(0,0,0,0.22)"
              transform="translate(3,4)"
            />
            {([[12,8],[105,2],[185,6],[215,6],[295,2],[388,8],
               [400,44],[400,88],[368,120],[290,120],[230,120],
               [170,120],[110,120],[32,120],[0,88],[0,44]] as [number,number][]).map(([x,y], i) => (
              <line key={i} x1="200" y1="62" x2={x} y2={y}
                stroke="#000" strokeWidth="1" opacity="0.07" />
            ))}
            <polygon
              points="12,8 68,44 105,2 155,46 185,6 200,44 215,6 245,46 295,2 332,44 388,8 400,44 390,68 400,88 382,95 368,120 308,90 290,120 248,86 230,120 200,88 170,120 152,86 110,120 92,90 32,120 18,95 0,88 10,68 0,44 12,35"
              fill="url(#pow-grad)"
              stroke="#0d0d0d"
              strokeWidth="5"
              strokeLinejoin="bevel"
            />
          </svg>
          <div className="pow-badge__text">
            <span className="pow-badge__top">powered by</span>
            <span className="pow-badge__name">GPT Image 2</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()

  // ── Globe / location state ──
  const [focusPoint, setFocusPoint] = useState<{ lat: number; lng: number } | null>(null)
  const [focusCountry, setFocusCountry] = useState<{
    name: string; iso: string; count: number | null
  } | null>(null)
  const [countryCounts, setCountryCounts] = useState<Record<string, number>>({})
  const [countryCountsLoaded, setCountryCountsLoaded] = useState(false)
  const [mapReadyToMount, setMapReadyToMount] = useState(false)
  const [mapFullyLoaded, setMapFullyLoaded] = useState(false)

  useEffect(() => {
    fetch('/ooh-country-stats.json')
      .then(r => r.json())
      .then(setCountryCounts)
      .catch(() => {})
      .finally(() => setCountryCountsLoaded(true))
  }, [])

  useEffect(() => {
    const win = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
      cancelIdleCallback?: (handle: number) => void
    }

    if (win.requestIdleCallback) {
      const handle = win.requestIdleCallback(() => setMapReadyToMount(true), { timeout: 900 })
      return () => win.cancelIdleCallback?.(handle)
    }

    const timeout = window.setTimeout(() => setMapReadyToMount(true), 450)
    return () => window.clearTimeout(timeout)
  }, [])

  const countryOptions: CountryOption[] = Object.entries(COUNTRY_INFO)
    .map(([iso, info]) => ({ iso, ...info, count: countryCounts[iso] ?? null }))
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
  const onboardingLoaded = countryCountsLoaded && mapFullyLoaded

  // ── Panel state ──
  const [leftView, setLeftView] = useState<LeftView>('hero')
  const [obMode,   setObMode]   = useState<ObMode>('choose')
  const [activeBriefSection, setActiveBriefSection] = useState(0)
  const [briefCarouselRef, briefCarouselApi] = useEmblaCarousel({ loop: false, watchDrag: false })

  // ── Brief form state ──
  const [obUrl,        setObUrl]        = useState('')
  const [adjectives,   setAdjectives]   = useState<string[]>([])
  const [logoPreview,  setLogoPreview]  = useState<string | null>(null)
  const [dragOver,     setDragOver]     = useState(false)
  const [objective,    setObjective]    = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState({
    companyName: '', industry: '', description: '', tagline: '',
    primaryColor: '#D02020', secondaryColor: '#1040C0',
    fonts: '', styleReference: '', avoidList: '',
    coreMessage: '', offerOrHook: '', callToAction: '',
    audienceDescription: '', tone: '', contextWhenSeen: '',
  })

  // ── Creative generation state ──
  const [creative, setCreative]       = useState<GeneratedCreative | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)
  const [generateStatus, setGenerateStatus] = useState('')
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null)
  const [scanProgress, setScanProgress] = useState(0)

  // ── Preview editing state ──
  const [overlayEdit, setOverlayEdit]         = useState<CreativeOverlay | null>(null)
  const [editingPrompt, setEditingPrompt]     = useState('')
  const [previewTab, setPreviewTab]           = useState<'overlay' | 'prompt' | null>(null)
  const [regenerating, setRegenerating]       = useState(false)
  const [promptRegen, setPromptRegen]         = useState(false)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)

  // ── Field history (for AI-driven diff + undo) ──
  const [fieldHistory, setFieldHistory] = useState<Partial<Record<keyof typeof form, string>>>({})

  // ── Review / chat state ──
  const [reviewSource, setReviewSource] = useState<'url' | 'manual' | null>(null)
  const [chatOpen, setChatOpen]         = useState(false)
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [chatInput, setChatInput]       = useState('')
  const [chatLoading, setChatLoading]   = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages])

  useEffect(() => {
    if (obMode === 'review') setActiveBriefSection(0)
  }, [obMode])

  useEffect(() => {
    if (!briefCarouselApi) return
    briefCarouselApi.scrollTo(activeBriefSection)
  }, [activeBriefSection, briefCarouselApi])

  useEffect(() => {
    if (!briefCarouselApi) return

    const handleSelect = () => {
      setActiveBriefSection(briefCarouselApi.selectedScrollSnap())
    }

    briefCarouselApi.on('select', handleSelect)
    briefCarouselApi.on('reInit', handleSelect)
    handleSelect()

    return () => {
      briefCarouselApi.off('select', handleSelect)
      briefCarouselApi.off('reInit', handleSelect)
    }
  }, [briefCarouselApi])

  const scrollBriefPrev = useCallback((clearError = false) => {
    if (clearError) setGenerateError(null)
    if (briefCarouselApi) {
      briefCarouselApi.scrollPrev()
      return
    }
    setActiveBriefSection(i => Math.max(0, i - 1))
  }, [briefCarouselApi])

  const scrollBriefNext = useCallback((clearError = false) => {
    if (clearError) setGenerateError(null)
    if (briefCarouselApi) {
      briefCarouselApi.scrollNext()
      return
    }
    setActiveBriefSection(i => Math.min(BRIEF_SECTIONS.length - 1, i + 1))
  }, [briefCarouselApi])

  useEffect(() => {
    if (!previewModalOpen) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPreviewModalOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewModalOpen])

  useEffect(() => {
    if (obMode !== 'preview') setPreviewModalOpen(false)
  }, [obMode])

  useEffect(() => {
    if (obMode !== 'generating') return

    const progressCap = scanPreviewUrl
      ? generateStatus.toLowerCase().includes('generating') ? 96 : 74
      : 94

    const interval = window.setInterval(() => {
      setScanProgress(prev => {
        if (prev >= progressCap) return prev
        const step = progressCap > 90 ? 1.2 : 1.8
        return Math.min(progressCap, prev + step)
      })
    }, 220)

    return () => window.clearInterval(interval)
  }, [generateStatus, obMode, scanPreviewUrl])

  // ── Globe interaction ──
  const handleSelect = useCallback((
    lat: number, lng: number,
    name: string | null, iso: string | null, count: number | null,
  ) => {
    const info = iso ? COUNTRY_INFO[iso] : null
    setFocusPoint(info ? { lat: info.lat, lng: info.lng } : { lat, lng })
    setFocusCountry(name && iso ? { name, iso, count } : null)
  }, [])

  const handleCountrySearch = useCallback((o: CountryOption) => {
    handleSelect(o.lat, o.lng, o.name, o.iso, o.count)
  }, [handleSelect])

  const handleEnterMap = useCallback(() => {
    if (focusPoint) {
      sessionStorage.setItem(MAP_FOCUS_STORAGE_KEY, JSON.stringify({
        lat: focusPoint.lat,
        lng: focusPoint.lng,
        countryIso: focusCountry?.iso ?? null,
      }))
    } else {
      sessionStorage.removeItem(MAP_FOCUS_STORAGE_KEY)
    }
    router.push('/map')
  }, [focusCountry, focusPoint, router])

  const isEnabled = focusCountry !== null

  // ── Form helpers ──
  const setField = (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }))

  const toggleAdj = (adj: string) =>
    setAdjectives(prev =>
      prev.includes(adj) ? prev.filter(a => a !== adj)
        : prev.length < 3 ? [...prev, adj] : prev
    )

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file?.type.startsWith('image/')) setLogoPreview(URL.createObjectURL(file))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setLogoPreview(URL.createObjectURL(file))
  }

  const buildBrief = (): CompanyBrief => ({
    url: obUrl,
    identity: {
      companyName: form.companyName,
      industry: form.industry,
      description: form.description,
      brandAdjectives: (adjectives.length === 3 ? adjectives : [...adjectives, ...Array(3 - adjectives.length).fill('bold')]) as [string, string, string],
      tagline: form.tagline || undefined,
    },
    visualSystem: {
      primaryColor: form.primaryColor || undefined,
      secondaryColor: form.secondaryColor || undefined,
      fonts: form.fonts ? form.fonts.split(',').map(s => s.trim()).filter(Boolean) : [],
      styleReference: form.styleReference || undefined,
      avoidList: form.avoidList ? form.avoidList.split(',').map(s => s.trim()).filter(Boolean) : [],
    },
    campaign: {
      coreMessage: form.coreMessage,
      offerOrHook: form.offerOrHook || undefined,
      callToAction: form.callToAction || undefined,
      campaignObjective: (objective || undefined) as CompanyBrief['campaign']['campaignObjective'],
    },
    audience: {
      description: form.audienceDescription,
      tone: form.tone || undefined,
      contextWhenSeen: form.contextWhenSeen || undefined,
    },
  })

  const populateFormFromBrief = (brief: CompanyBrief) => {
    setForm({
      companyName: brief.identity.companyName,
      industry: brief.identity.industry,
      description: brief.identity.description,
      tagline: brief.identity.tagline ?? '',
      primaryColor: brief.visualSystem.primaryColor ?? '#D02020',
      secondaryColor: brief.visualSystem.secondaryColor ?? '#1040C0',
      fonts: brief.visualSystem.fonts?.join(', ') ?? '',
      styleReference: brief.visualSystem.styleReference ?? '',
      avoidList: brief.visualSystem.avoidList?.join(', ') ?? '',
      coreMessage: brief.campaign.coreMessage,
      offerOrHook: brief.campaign.offerOrHook ?? '',
      callToAction: brief.campaign.callToAction ?? '',
      audienceDescription: brief.audience.description,
      tone: brief.audience.tone ?? '',
      contextWhenSeen: brief.audience.contextWhenSeen ?? '',
    })
    setAdjectives([...brief.identity.brandAdjectives].filter(Boolean))
    setObjective(brief.campaign.campaignObjective ?? '')
  }

  const goBack = () => {
    if (obMode === 'preview' || obMode === 'generating') setObMode('url')
    else if (obMode === 'url' || obMode === 'review') setLeftView('hero')
    else setLeftView('hero')
  }

  const handleWandUpdate = (fieldKey: keyof typeof form, oldValue: string, newValue: string) => {
    setFieldHistory(prev => ({ ...prev, [fieldKey]: oldValue }))
    setForm(prev => ({ ...prev, [fieldKey]: newValue }))
  }

  const handleFieldUndo = (fieldKey: keyof typeof form) => {
    const oldValue = fieldHistory[fieldKey]
    if (oldValue === undefined) return
    setForm(prev => ({ ...prev, [fieldKey]: oldValue }))
    setFieldHistory(prev => { const next = { ...prev }; delete next[fieldKey]; return next })
  }

  const renderFieldDiff = (fieldKey: keyof typeof form) => {
    const prev = fieldHistory[fieldKey]
    if (prev === undefined) return null
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, marginTop: 4,
        padding: '4px 8px', background: 'rgba(208,32,32,0.07)',
        border: '1px solid rgba(208,32,32,0.18)', borderRadius: 3,
      }}>
        <span style={{ fontSize: 10, color: '#555', flexShrink: 0 }}>Was:</span>
        <span style={{
          flex: 1, fontSize: 10, color: '#666',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{prev || '(empty)'}</span>
        <button
          type="button"
          onClick={() => handleFieldUndo(fieldKey)}
          style={{
            flexShrink: 0, background: 'none',
            border: '1px solid rgba(208,32,32,0.35)',
            color: '#D02020', fontSize: 9, fontWeight: 700,
            letterSpacing: '0.06em', padding: '2px 6px',
            borderRadius: 2, cursor: 'pointer',
          }}
        >↩ UNDO</button>
      </div>
    )
  }

  const displayOverlay = overlayEdit ?? creative?.overlay

  const setOverlayField = (key: keyof CreativeOverlay) => (val: string) =>
    setOverlayEdit(prev => ({ ...(prev ?? creative!.overlay), [key]: val || null }))

  const handleRegenerate = async () => {
    if (!creative || regenerating) return
    const brief = buildBrief()
    setRegenerating(true)
    setGenerateError(null)
    try {
      const result = await generateCreative(brief, creative.mode)
      setCreative(result)
      setOverlayEdit(null)
      setEditingPrompt(result.prompt)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : String(err))
    } finally {
      setRegenerating(false)
    }
  }

  const handleRegenerateWithPrompt = async () => {
    if (!creative || !editingPrompt.trim() || promptRegen) return
    const brief = buildBrief()
    setPromptRegen(true)
    setGenerateError(null)
    try {
      const res = await fetch('/api/generate-creative', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          brief, widthM: DEFAULT_WIDTH_M, heightM: DEFAULT_HEIGHT_M,
          mode: creative.mode, promptOverride: editingPrompt.trim(),
        }),
      })
      const json = await res.json() as { url?: string; prompt?: string; overlay?: CreativeOverlay; error?: string }
      if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`)
      setCreative({ url: json.url!, prompt: json.prompt!, overlay: json.overlay!, mode: creative.mode })
      setOverlayEdit(null)
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : String(err))
    } finally {
      setPromptRegen(false)
    }
  }

  const handleDownload = () => {
    if (!creative) return
    const a = document.createElement('a')
    a.href = creative.url
    a.download = 'billboard.jpg'
    a.click()
  }

  const handleConfirmReview = async () => {
    const brief = buildBrief()
    sessionStorage.setItem('sightline:brief', JSON.stringify(brief))
    setObMode('generating')
    setGenerateError(null)
    setScanPreviewUrl(null)
    setScanProgress(0)
    setOverlayEdit(null)
    setPreviewTab(null)
    setGenerateStatus('Generating your billboard creative…')

    try {
      const result = await generateCreative(brief)
      setScanProgress(100)
      setCreative(result)
      setEditingPrompt(result.prompt)
      setObMode('preview')
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : String(err))
      setObMode('preview')
    }
  }

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return
    const userMsg = { role: 'user' as const, content: chatInput.trim() }
    const nextMessages = [...chatMessages, userMsg]
    setChatMessages(nextMessages)
    setChatInput('')
    setChatLoading(true)

    try {
      const res = await fetch('/api/brief-chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages, currentBrief: buildBrief() }),
      })
      const json = await res.json() as { message?: string; brief?: CompanyBrief; error?: string }
      if (json.brief) {
        const b = json.brief
        const newForm = {
          companyName: b.identity.companyName,
          industry: b.identity.industry,
          description: b.identity.description,
          tagline: b.identity.tagline ?? '',
          primaryColor: b.visualSystem.primaryColor ?? '#D02020',
          secondaryColor: b.visualSystem.secondaryColor ?? '#1040C0',
          fonts: b.visualSystem.fonts?.join(', ') ?? '',
          styleReference: b.visualSystem.styleReference ?? '',
          avoidList: b.visualSystem.avoidList?.join(', ') ?? '',
          coreMessage: b.campaign.coreMessage,
          offerOrHook: b.campaign.offerOrHook ?? '',
          callToAction: b.campaign.callToAction ?? '',
          audienceDescription: b.audience.description,
          tone: b.audience.tone ?? '',
          contextWhenSeen: b.audience.contextWhenSeen ?? '',
        }
        const updates: Partial<Record<keyof typeof form, string>> = {}
        for (const k of Object.keys(newForm) as (keyof typeof form)[]) {
          if (form[k] !== newForm[k]) updates[k] = form[k]
        }
        if (Object.keys(updates).length > 0) {
          setFieldHistory(prev => {
            const next = { ...prev }
            for (const [k, v] of Object.entries(updates) as [keyof typeof form, string][]) next[k] = v
            return next
          })
        }
        populateFormFromBrief(b)
      }
      setChatMessages(prev => [...prev, { role: 'assistant', content: json.message ?? 'Updated!' }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong. Try again.' }])
    } finally {
      setChatLoading(false)
    }
  }

  async function generateCreative(brief: CompanyBrief, mode: 'image' = 'image') {
    const res = await fetch('/api/generate-creative', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ brief, widthM: DEFAULT_WIDTH_M, heightM: DEFAULT_HEIGHT_M, mode }),
    })
    const json = await res.json() as { url?: string; prompt?: string; overlay?: CreativeOverlay; error?: string }
    if (!res.ok || json.error) throw new Error(json.error ?? `HTTP ${res.status}`)
    return { url: json.url!, prompt: json.prompt!, overlay: json.overlay!, mode }
  }

  const handleSubmitUrl = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!obUrl.trim()) return
    let submittedUrl: string
    try {
      submittedUrl = new URL(obUrl.trim()).toString()
    } catch {
      setGenerateError('Enter a valid website URL, including https://')
      return
    }
    const scanStartedAt = Date.now()
    setScanPreviewUrl(submittedUrl)
    setScanProgress(4)
    setObMode('generating')
    setGenerateError(null)
    setGenerateStatus('Scanning your site…')

    try {
      const briefRes = await fetch('/api/company-brief', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: submittedUrl }),
      })
      const briefJson = await briefRes.json() as { brief?: CompanyBrief; error?: string }
      if (!briefRes.ok || briefJson.error) throw new Error(briefJson.error ?? `HTTP ${briefRes.status}`)
      const brief = briefJson.brief!
      sessionStorage.setItem('sightline:brief', JSON.stringify(brief))
      populateFormFromBrief(brief)
      setScanProgress(prev => Math.max(prev, 76))
      setGenerateStatus('Generating your billboard creative…')
      const result = await generateCreative(brief)
      setCreative(result)
      setEditingPrompt(result.prompt)
      setScanProgress(100)
      setGenerateStatus('Finalizing scan insights...')
      const remainingPreviewMs = MIN_SCAN_PREVIEW_MS - (Date.now() - scanStartedAt)
      if (remainingPreviewMs > 0) {
        await new Promise(resolve => window.setTimeout(resolve, remainingPreviewMs))
      }
      setObMode('preview')
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : String(err))
      setScanPreviewUrl(null)
      setObMode('url')
    }
  }

  const handleSubmitManual = (e: React.FormEvent) => {
    e.preventDefault()
    const requiredFields = [
      { value: form.companyName, section: 0, label: 'Company name' },
      { value: form.description, section: 0, label: 'What you do' },
      { value: form.coreMessage, section: 2, label: 'The one thing this ad communicates' },
      { value: form.audienceDescription, section: 3, label: 'Who they are' },
    ]
    const missing = requiredFields.find(field => !field.value.trim())
    if (missing) {
      setActiveBriefSection(missing.section)
      setGenerateError(`${missing.label} is required.`)
      return
    }

    const brief = buildBrief()
    sessionStorage.setItem('sightline:brief', JSON.stringify(brief))
    setGenerateError(null)
    setReviewSource('manual')
    setChatMessages([])
    setObMode('review')
  }

  // ── Brief left-panel copy ──
  const briefHeadline = obMode === 'url' ? ['YOUR', 'SITE']
    : obMode === 'review' ? ['REVIEW', 'BRIEF']
    : obMode === 'preview' ? ['YOUR', 'AD']
    : obMode === 'generating' ? ['ONE SEC', '']
    : ['THE', 'BRIEF']
  const briefSub = obMode === 'url'
    ? "We'll scan it and pull your brand identity automatically."
    : obMode === 'review'
      ? reviewSource === 'url'
        ? 'Auto-filled from your site — edit anything, or chat to refine.'
        : ''
      : obMode === 'manual'
        ? 'Starred fields required. Rest is optional.'
        : obMode === 'generating'
          ? generateStatus
          : obMode === 'preview'
            ? 'Here\'s your AI-generated billboard. Looks good? Enter the map.'
            : 'Two minutes. Done.'

  return (
    <div className="landing-root">
      <div className="geo geo-circle-bg" />
      <div className="geo geo-dot-grid" />

      {/* Globe — right side, always present */}
      <div className="globe-area" style={globeStyle(DEFAULT_GLOBE)}>
        <Skeleton
          name="landing-map-preview"
          className="landing-map-boneyard"
          loading={!mapReadyToMount}
          fixture={<LandingMapPreviewFixture />}
          fallback={<MapPreviewSkeleton />}
          animate="shimmer"
          color="rgba(42, 45, 58, 0.86)"
          transition={300}
        >
          {/* position:absolute fills the Skeleton's position:relative container,
              giving the Mapbox Map a resolved height for its height:100% style */}
          <div style={{ position: 'absolute', inset: 0 }}>
            {mapReadyToMount ? (
              <LandingMapPreview
                onSelect={handleSelect}
                focusPoint={focusPoint}
                selectedCountryIso={focusCountry?.iso ?? null}
                countryCounts={countryCounts}
                onReady={() => setMapFullyLoaded(true)}
              />
            ) : (
              <LandingMapPreviewFixture />
            )}
          </div>
        </Skeleton>
      </div>

      {/* Country search — top right, above globe */}
      <CountrySearch options={countryOptions} onSelect={handleCountrySearch} />

      {!onboardingLoaded && <OnboardingLoader />}

      {/* ═══════════════════════════════════
          Left panel — hero or brief
      ═══════════════════════════════════ */}
      <div className={`title-block${leftView === 'brief' ? ' title-block--brief' : ''}`}>

        {/* ── HERO ── */}
        {leftView === 'hero' && (
          <div className="lp-hero">
            <h1 className="headline">
              <span className="headline-line" data-text="SIGHT" style={{ animationDelay: '0.2s' }}>SIGHT</span>
              <span className="headline-line accent-stroke" data-text="LINE" style={{ animationDelay: '0.38s' }}>LINE</span>
            </h1>

            <p className="tagline" style={{ animationDelay: '0.55s' }}>
              Map every surface. Own the real world.
            </p>

            <div className="color-bar" style={{ animationDelay: '0.7s' }}>
              <span className="bar-red" />
              <span className="bar-blue" />
            </div>

            {focusCountry ? (
              <div className="focus-chip">
                <span className="focus-dot" />
                <div className="focus-chip-body">
                  <span className="focus-country">{focusCountry.name}</span>
                  {focusCountry.count != null && (
                    <span className="focus-count">
                      {focusCountry.count.toLocaleString()} OOH locations
                    </span>
                  )}
                  <div className="focus-chip-row">
                    <span className="focus-coords">
                      {Math.abs(focusPoint!.lat).toFixed(2)}°{focusPoint!.lat >= 0 ? 'N' : 'S'}
                      {'  '}
                      {Math.abs(focusPoint!.lng).toFixed(2)}°{focusPoint!.lng >= 0 ? 'E' : 'W'}
                    </span>
                    <span className="focus-label">FOCUS AREA SET</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="globe-hint">↗ Click the globe to set your focus area</p>
            )}

            <button
              className="ob-continue-btn"
              disabled={!isEnabled}
              onClick={() => {
                setChatMessages([])
                setObMode('url')
                setLeftView('brief')
              }}
            >
              {isEnabled ? 'CONTINUE →' : 'PICK A COUNTRY'}
            </button>

            <div className="accent-square" />
            <div className="accent-circle" />
          </div>
        )}

        {/* ── BRIEF ── */}
        {leftView === 'brief' && (
          <div className="lp-brief">
            {/* Sticky header */}
            <div className="lp-brief-header">
              <button className="ob-panel-back" onClick={goBack}>← BACK</button>

              <h1 className="headline" style={{ marginTop: '1.25rem' }}>
                <span className="headline-line" data-text={briefHeadline[0]}>{briefHeadline[0]}</span>
                <span className="headline-line accent-stroke" data-text={briefHeadline[1]}>{briefHeadline[1]}</span>
              </h1>

              <div className="color-bar">
                <span className="bar-red" />
                <span className="bar-blue" />
              </div>

              <p className="ob-panel-sub">{briefSub}</p>

              {obMode === 'manual' && (
                <div className="ob-steps">
                  {BRIEF_SECTIONS.map((s, i) => (
                    <span key={s} className={`ob-step${i === activeBriefSection ? ' ob-step--active' : ''}`}>
                      <span className="ob-step-num">0{i + 1}</span>{s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Scrollable form body */}
            <div
              className={`lp-brief-body${obMode === 'generating' ? ' lp-brief-body--generating' : ''}`}
              style={obMode === 'review' ? { overflow: 'hidden' } : undefined}
            >

              {/* CHOOSE - temporarily hidden while the flow goes directly to AI-generated assets.
              {obMode === 'choose' && (
                <div className="ob-choose">
                  <button className="ob-mode-card ob-mode-card--url" onClick={() => setObMode('url')}>
                    <span className="ob-mode-card-tag">FASTER</span>
                    <div className="ob-mode-icon"><span className="ob-mode-icon-circle" /></div>
                    <h2 className="ob-mode-title">Enter your website</h2>
                    <p className="ob-mode-desc">Drop in your URL and we&apos;ll scan your brand details.</p>
                    <span className="ob-mode-arrow">→</span>
                  </button>

                  <button className="ob-mode-card ob-mode-card--manual" onClick={() => setObMode('manual')}>
                    <span className="ob-mode-card-tag">MORE CONTROL</span>
                    <div className="ob-mode-icon"><span className="ob-mode-icon-square" /></div>
                    <h2 className="ob-mode-title">Fill it out manually</h2>
                    <p className="ob-mode-desc">Identity, visuals, campaign, audience — one compact form.</p>
                    <span className="ob-mode-arrow">→</span>
                  </button>
                </div>
              )}
              */}

              {/* URL */}
              {obMode === 'url' && (
                <form className="ob-url-form" onSubmit={handleSubmitUrl}>
                  <div>
                    <label className="ob-label">Company website URL *</label>
                    <input
                      className="ob-input ob-input--lg"
                      type="url"
                      placeholder="https://yourcompany.com"
                      value={obUrl}
                      onChange={e => setObUrl(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  {generateError && (
                    <p style={{ color: '#ff6b6b', fontSize: 13, margin: '4px 0 0' }}>{generateError}</p>
                  )}
                  <button type="submit" className="ob-submit-btn">
                    ANALYSE &amp; GENERATE →
                  </button>
                </form>
              )}

              {/* REVIEW */}
              {obMode === 'review' && (
                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <style>{`
                    .rv-tip { position: relative; display: inline-flex; align-items: center; margin-left: 5px; }
                    .rv-tip-icon {
                      width: 14px; height: 14px; border-radius: 50%;
                      background: #1a1d27; border: 1px solid #2a2d3a;
                      color: #555; font-size: 8px; font-weight: 700; font-style: normal;
                      display: inline-flex; align-items: center; justify-content: center;
                      cursor: default; flex-shrink: 0; user-select: none; letter-spacing: 0;
                    }
                    .rv-tip-box {
                      position: absolute; bottom: calc(100% + 7px); left: 50%;
                      transform: translateX(-50%);
                      background: #1a1d27; border: 1px solid #2a2d3a;
                      color: #999; font-size: 11px; line-height: 1.55;
                      padding: 8px 11px; border-radius: 4px;
                      width: 210px; z-index: 500;
                      opacity: 0; pointer-events: none;
                      transition: opacity 0.12s;
                      white-space: normal; letter-spacing: 0.02em;
                      font-family: inherit;
                    }
                    .rv-tip:hover .rv-tip-box { opacity: 1; }
                    .rv-label { display: flex; align-items: center; margin-bottom: 5px; }
                    .rv-label .ob-label { margin-bottom: 0; }
                    .rv-section .ob-section-label { color: #121212; font-size: 1.5rem; align-items: baseline; }
                    .rv-section .ob-section-num { color: rgba(18,18,18,0.12); }
                    .rv-section { border-left-color: rgba(18,18,18,0.15) !important; }
                  `}</style>

                  {/* Sections container */}
                  <div className="ob-carousel ob-carousel--review">
                    {/* Step tabs */}
                    <nav className="ob-stepper" aria-label="Brief sections">
                      {BRIEF_SECTIONS.map((section, i) => (
                        <button
                          key={section}
                          type="button"
                          className={`ob-stepper-tab${i === activeBriefSection ? ' ob-stepper-tab--active' : ''}`}
                          onClick={() => briefCarouselApi?.scrollTo(i)}
                          aria-current={i === activeBriefSection ? 'step' : undefined}
                        >
                          <span className="ob-stepper-tab__num">{String(i + 1).padStart(2, '0')}</span>
                          <span className="ob-stepper-tab__label">{section}</span>
                        </button>
                      ))}
                    </nav>
                    <div className="ob-carousel-viewport" ref={briefCarouselRef}>
                      <div className="ob-carousel-track">

                    {/* 01 Identity */}
                    <div className={`ob-section rv-section ob-carousel-slide${activeBriefSection === 0 ? ' ob-carousel-slide--active' : ''}`}>
                      <div className="ob-section-label">
                        <span className="ob-section-num">01</span>IDENTITY
                      </div>
                      <div className="ob-row-2">
                        <div>
                          <div className="rv-label">
                            <label className="ob-label">Company name</label>
                            <Tip>Your brand&apos;s official name as it&apos;ll appear on the billboard.</Tip>
                            <WandBtn fieldLabel="Company name" currentValue={form.companyName} onUpdate={v => handleWandUpdate('companyName', form.companyName, v)} />
                          </div>
                          <input className="ob-input" value={form.companyName}
                            onChange={setField('companyName')} placeholder="Acme Corp" />
                          {renderFieldDiff('companyName')}
                        </div>
                        <div>
                          <div className="rv-label">
                            <label className="ob-label">Industry</label>
                            <Tip>The sector you operate in — helps pick the right visual language.</Tip>
                            <WandBtn fieldLabel="Industry" currentValue={form.industry} onUpdate={v => handleWandUpdate('industry', form.industry, v)} />
                          </div>
                          <input className="ob-input" value={form.industry}
                            onChange={setField('industry')} placeholder="Retail, Tech, F&B…" />
                          {renderFieldDiff('industry')}
                        </div>
                      </div>
                      <div>
                        <div className="rv-label">
                          <label className="ob-label">What you do — one sentence</label>
                          <Tip>A single clear sentence about your business. This shapes the ad&apos;s core visual concept.</Tip>
                          <WandBtn fieldLabel="What you do" currentValue={form.description} onUpdate={v => handleWandUpdate('description', form.description, v)} />
                        </div>
                        <textarea className="ob-textarea" value={form.description}
                          onChange={setField('description')} rows={2}
                          placeholder="We make electric bikes for urban commuters." />
                        {renderFieldDiff('description')}
                      </div>
                      <div>
                        <div className="rv-label">
                          <label className="ob-label">Brand adjectives</label>
                          <Tip>Three words that define your brand&apos;s personality. They guide the visual tone and feel of the image.</Tip>
                        </div>
                        <input className="ob-input"
                          value={adjectives.join(', ')}
                          onChange={e => {
                            const vals = e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                            setAdjectives(vals.slice(0, 3))
                          }}
                          placeholder="bold, minimal, premium" />
                        <span className="ob-adj-hint">Comma-separated, up to 3</span>
                      </div>
                      <div>
                        <div className="rv-label">
                          <label className="ob-label">Tagline / slogan</label>
                          <Tip>Your existing slogan, if any. Appears as overlay text directly on the billboard.</Tip>
                          <WandBtn fieldLabel="Tagline" currentValue={form.tagline} onUpdate={v => handleWandUpdate('tagline', form.tagline, v)} />
                        </div>
                        <input className="ob-input" value={form.tagline}
                          onChange={setField('tagline')} placeholder="Just do it." />
                        {renderFieldDiff('tagline')}
                      </div>
                    </div>

                    {/* 02 Visual */}
                    <div className={`ob-section rv-section ob-carousel-slide${activeBriefSection === 1 ? ' ob-carousel-slide--active' : ''}`}>
                      <div className="ob-section-label">
                        <span className="ob-section-num">02</span>VISUAL SYSTEM
                      </div>
                      <div className="ob-row-2">
                        <div>
                          <div className="rv-label">
                            <label className="ob-label">Primary color</label>
                            <Tip>The dominant color of the billboard. Used for the flat zone behind text overlays — must be a solid, uninterrupted area.</Tip>
                          </div>
                          <div className="ob-color-row">
                            <input type="color" className="ob-color-swatch"
                              value={form.primaryColor} onChange={setField('primaryColor')} />
                            <input className="ob-input ob-input--mono" value={form.primaryColor}
                              onChange={setField('primaryColor')} placeholder="#000000" maxLength={7} />
                          </div>
                        </div>
                        <div>
                          <div className="rv-label">
                            <label className="ob-label">Secondary color</label>
                            <Tip>An accent color for supporting elements and highlights in the image.</Tip>
                          </div>
                          <div className="ob-color-row">
                            <input type="color" className="ob-color-swatch"
                              value={form.secondaryColor} onChange={setField('secondaryColor')} />
                            <input className="ob-input ob-input--mono" value={form.secondaryColor}
                              onChange={setField('secondaryColor')} placeholder="#ffffff" maxLength={7} />
                          </div>
                        </div>
                      </div>
                      <div className="ob-row-2">
                        <div>
                          <div className="rv-label">
                            <label className="ob-label">Visual reference</label>
                            <Tip>Brands with an aesthetic similar to yours. Sets the visual ambition — e.g. &quot;Think Apple / Supreme&quot;.</Tip>
                            <WandBtn fieldLabel="Visual reference" currentValue={form.styleReference} onUpdate={v => handleWandUpdate('styleReference', form.styleReference, v)} />
                          </div>
                          <input className="ob-input" value={form.styleReference}
                            onChange={setField('styleReference')} placeholder="Think Apple / Supreme" />
                          {renderFieldDiff('styleReference')}
                        </div>
                        <div>
                          <div className="rv-label">
                            <label className="ob-label">What to avoid</label>
                            <Tip>Visual elements, styles, or references that don&apos;t fit your brand and should be excluded.</Tip>
                            <WandBtn fieldLabel="What to avoid" currentValue={form.avoidList} onUpdate={v => handleWandUpdate('avoidList', form.avoidList, v)} />
                          </div>
                          <input className="ob-input" value={form.avoidList}
                            onChange={setField('avoidList')} placeholder="Stock photos, pastel colors" />
                          {renderFieldDiff('avoidList')}
                        </div>
                      </div>
                    </div>

                    {/* 03 Campaign */}
                    <div className={`ob-section rv-section ob-carousel-slide${activeBriefSection === 2 ? ' ob-carousel-slide--active' : ''}`}>
                      <div className="ob-section-label">
                        <span className="ob-section-num">03</span>THIS CAMPAIGN
                      </div>
                      <div>
                        <div className="rv-label">
                          <label className="ob-label">The ONE thing this ad communicates</label>
                          <Tip>The single idea the ad must land. If you need more than one sentence to explain it, it&apos;s too complex for a billboard.</Tip>
                          <WandBtn fieldLabel="Core message" currentValue={form.coreMessage} onUpdate={v => handleWandUpdate('coreMessage', form.coreMessage, v)} />
                        </div>
                        <textarea className="ob-textarea" value={form.coreMessage}
                          onChange={setField('coreMessage')} rows={2}
                          placeholder="We're opening a store in your neighbourhood." />
                        {renderFieldDiff('coreMessage')}
                      </div>
                      <div className="ob-row-2">
                        <div>
                          <div className="rv-label">
                            <label className="ob-label">Offer or hook</label>
                            <Tip>A specific detail that grabs attention — a promotion, event, or time-limited offer. e.g. &quot;Launch event, 30% off&quot;.</Tip>
                            <WandBtn fieldLabel="Offer or hook" currentValue={form.offerOrHook} onUpdate={v => handleWandUpdate('offerOrHook', form.offerOrHook, v)} />
                          </div>
                          <input className="ob-input" value={form.offerOrHook}
                            onChange={setField('offerOrHook')} placeholder="Launch event, 30% off" />
                          {renderFieldDiff('offerOrHook')}
                        </div>
                        <div>
                          <div className="rv-label">
                            <label className="ob-label">Call to action</label>
                            <Tip>What you want people to do after seeing the ad. Appears as a button overlay on the billboard.</Tip>
                            <WandBtn fieldLabel="Call to action" currentValue={form.callToAction} onUpdate={v => handleWandUpdate('callToAction', form.callToAction, v)} />
                          </div>
                          <input className="ob-input" value={form.callToAction}
                            onChange={setField('callToAction')} placeholder="Visit us, Scan QR" />
                          {renderFieldDiff('callToAction')}
                        </div>
                      </div>
                      <div>
                        <div className="rv-label">
                          <label className="ob-label">Campaign objective</label>
                          <Tip>The primary goal of this campaign — shapes composition, text weight, and visual urgency.</Tip>
                        </div>
                        <div className="ob-obj-grid">
                          {OBJECTIVES.map(obj => (
                            <button key={obj} type="button"
                              className={`ob-obj-chip${objective === obj ? ' ob-obj-chip--active' : ''}`}
                              onClick={() => setObjective(prev => prev === obj ? '' : obj)}>{obj}</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 04 Audience */}
                    <div className={`ob-section rv-section ob-carousel-slide${activeBriefSection === 3 ? ' ob-carousel-slide--active' : ''}`}>
                      <div className="ob-section-label">
                        <span className="ob-section-num">04</span>AUDIENCE
                      </div>
                      <div>
                        <div className="rv-label">
                          <label className="ob-label">Who they are — one sentence</label>
                          <Tip>A brief portrait of your target audience — age, mindset, and what they care about. One sentence is enough.</Tip>
                          <WandBtn fieldLabel="Audience description" currentValue={form.audienceDescription} onUpdate={v => handleWandUpdate('audienceDescription', form.audienceDescription, v)} />
                        </div>
                        <textarea className="ob-textarea" value={form.audienceDescription}
                          onChange={setField('audienceDescription')} rows={2}
                          placeholder="25–40 year old urban commuters who care about sustainability." />
                        {renderFieldDiff('audienceDescription')}
                      </div>
                      <div className="ob-row-2">
                        <div>
                          <div className="rv-label">
                            <label className="ob-label">Tone</label>
                            <Tip>The emotional register of the ad — how it should feel to the viewer. e.g. Witty, serious, aspirational.</Tip>
                            <WandBtn fieldLabel="Tone" currentValue={form.tone} onUpdate={v => handleWandUpdate('tone', form.tone, v)} />
                          </div>
                          <input className="ob-input" value={form.tone}
                            onChange={setField('tone')} placeholder="Witty, serious, aspirational" />
                          {renderFieldDiff('tone')}
                        </div>
                        <div>
                          <div className="rv-label">
                            <label className="ob-label">Context when seen</label>
                            <Tip>Where and how people encounter this billboard. Influences contrast, text size, and how long they have to read it.</Tip>
                            <WandBtn fieldLabel="Context when seen" currentValue={form.contextWhenSeen} onUpdate={v => handleWandUpdate('contextWhenSeen', form.contextWhenSeen, v)} />
                          </div>
                          <input className="ob-input" value={form.contextWhenSeen}
                            onChange={setField('contextWhenSeen')} placeholder="Driving, walking" />
                          {renderFieldDiff('contextWhenSeen')}
                        </div>
                      </div>
                    </div>

                      </div>
                    </div>

                  </div>{/* end sections container */}

                  <button type="button" className="ob-submit-btn" style={{ flexShrink: 0 }} onClick={handleConfirmReview}>
                    GENERATE BILLBOARD →
                  </button>
                </div>
              )}

              {/* GENERATING */}
              {obMode === 'generating' && (
                scanPreviewUrl ? (
                  <SiteScanPreview url={scanPreviewUrl} progress={scanProgress} status={generateStatus} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '40px 0' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%',
                      border: '3px solid #2a2d3a',
                      borderTopColor: '#D02020',
                      animation: 'spin 0.8s linear infinite',
                    }} />
                    <div className="site-scan-progress site-scan-progress--compact" aria-label="Generation progress">
                      <div className="site-scan-progress__bar" style={{ width: `${Math.round(scanProgress)}%` }} />
                    </div>
                    <p style={{ fontSize: 13, color: '#888', letterSpacing: '0.06em', textAlign: 'center' }}>
                      {generateStatus}
                    </p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
                  </div>
                )
              )}

              {/* PREVIEW */}
              {obMode === 'preview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {generateError && (
                    <p style={{ color: '#ff6b6b', fontSize: 13, margin: 0 }}>{generateError} — you can still enter the map.</p>
                  )}

                  {creative && (
                    <>
                      {/* Billboard flat preview */}
                      <div style={{
                        position: 'relative', width: '100%',
                        aspectRatio: `${DEFAULT_WIDTH_M} / ${DEFAULT_HEIGHT_M}`,
                        borderRadius: 6, overflow: 'hidden',
                        border: '1px solid #2a2d3a', background: '#000',
                      }}>
                        {(regenerating || promptRegen) && (
                          <div style={{
                            position: 'absolute', inset: 0, zIndex: 10,
                            background: 'rgba(0,0,0,0.7)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12,
                          }}>
                            <div style={{
                              width: 28, height: 28, borderRadius: '50%',
                              border: '2px solid #2a2d3a', borderTopColor: '#D02020',
                              animation: 'spin 0.8s linear infinite',
                            }} />
                            <span style={{ fontSize: 11, color: '#888', letterSpacing: '0.06em' }}>
                              Regenerating…
                            </span>
                          </div>
                        )}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={creative.url} alt="Generated billboard"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        {/* Scrim + live overlay */}
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: 'linear-gradient(to left, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.4) 45%, transparent 70%)',
                          display: 'flex', flexDirection: 'column',
                          justifyContent: 'center', alignItems: 'flex-end',
                          padding: '5% 6%', pointerEvents: 'none',
                        }}>
                          <div style={{ textAlign: 'right', maxWidth: '52%' }}>
                            {displayOverlay?.brandName && (
                              <div style={{
                                fontSize: 'clamp(13px, 3.2vw, 36px)', fontWeight: 900,
                                letterSpacing: '0.04em', color: '#fff',
                                lineHeight: 1.0, marginBottom: '0.3em', textTransform: 'uppercase',
                              }}>{displayOverlay.brandName}</div>
                            )}
                            {displayOverlay?.tagline && (
                              <div style={{
                                fontSize: 'clamp(8px, 1.4vw, 14px)', fontWeight: 400,
                                color: 'rgba(255,255,255,0.8)', lineHeight: 1.4, marginBottom: '0.9em',
                              }}>{displayOverlay.tagline}</div>
                            )}
                            {displayOverlay?.cta && (
                              <div style={{
                                display: 'inline-block',
                                background: displayOverlay.primaryColor ?? '#D02020',
                                color: '#fff', fontSize: 'clamp(7px, 1.2vw, 12px)',
                                fontWeight: 800, letterSpacing: '0.12em',
                                textTransform: 'uppercase', padding: '0.45em 1em', borderRadius: 2,
                              }}>{displayOverlay.cta}</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action bar */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        {[
                          { label: regenerating ? 'REGENERATING…' : 'REGENERATE', onClick: handleRegenerate, disabled: regenerating || promptRegen },
                          { label: 'EDIT BRIEF', onClick: () => setObMode('review'), disabled: regenerating || promptRegen },
                          { label: 'DOWNLOAD', onClick: handleDownload, disabled: false },
                        ].map(({ label, onClick, disabled }) => (
                          <button
                            key={label}
                            onClick={onClick}
                            disabled={disabled}
                            style={{
                              flex: 1, padding: '8px 4px',
                              background: '#1a1d27',
                              border: '1px solid #2a2d3a',
                              color: disabled ? '#444' : '#aaa',
                              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                              cursor: disabled ? 'not-allowed' : 'pointer',
                              borderRadius: 4, transition: 'color 0.15s, border-color 0.15s',
                            }}
                            onMouseEnter={e => { if (!disabled) { e.currentTarget.style.borderColor = '#D02020'; e.currentTarget.style.color = '#e8e8e8' } }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2d3a'; e.currentTarget.style.color = disabled ? '#444' : '#aaa' }}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* Editing accordions */}
                      <div style={{ border: '1px solid #1a1d27', borderRadius: 6, overflow: 'hidden' }}>

                        {/* Overlay text accordion */}
                        <button
                          onClick={() => setPreviewTab(prev => prev === 'overlay' ? null : 'overlay')}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 14px', background: previewTab === 'overlay' ? '#1a1d27' : '#12151e',
                            border: 'none', borderBottom: '1px solid #1a1d27',
                            cursor: 'pointer', color: '#aaa', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                          }}
                        >
                          <span>OVERLAY TEXT</span>
                          <span style={{ fontSize: 14, color: '#555' }}>{previewTab === 'overlay' ? '−' : '+'}</span>
                        </button>
                        {previewTab === 'overlay' && (
                          <div style={{ padding: '12px 14px', background: '#0f1117', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {([
                              { key: 'brandName', label: 'Brand name', placeholder: 'ACME CORP' },
                              { key: 'tagline',   label: 'Tagline',    placeholder: 'Your slogan here' },
                              { key: 'cta',       label: 'Call to action', placeholder: 'Visit us' },
                            ] as { key: keyof CreativeOverlay; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
                              <div key={key}>
                                <label className="ob-label" style={{ marginBottom: 4 }}>{label}</label>
                                <input
                                  className="ob-input"
                                  value={(overlayEdit ?? creative.overlay)[key] ?? ''}
                                  onChange={e => setOverlayField(key)(e.target.value)}
                                  placeholder={placeholder}
                                />
                              </div>
                            ))}
                            <div>
                              <label className="ob-label" style={{ marginBottom: 4 }}>CTA color</label>
                              <div className="ob-color-row">
                                <input type="color" className="ob-color-swatch"
                                  value={(overlayEdit ?? creative.overlay).primaryColor ?? '#D02020'}
                                  onChange={e => setOverlayField('primaryColor')(e.target.value)} />
                                <input className="ob-input ob-input--mono"
                                  value={(overlayEdit ?? creative.overlay).primaryColor ?? ''}
                                  onChange={e => setOverlayField('primaryColor')(e.target.value)}
                                  placeholder="#D02020" maxLength={7} />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Prompt accordion */}
                        <button
                          onClick={() => setPreviewTab(prev => prev === 'prompt' ? null : 'prompt')}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 14px', background: previewTab === 'prompt' ? '#1a1d27' : '#12151e',
                            border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                          }}
                        >
                          <span>AI PROMPT</span>
                          <span style={{ fontSize: 14, color: '#555' }}>{previewTab === 'prompt' ? '−' : '+'}</span>
                        </button>
                        {previewTab === 'prompt' && (
                          <div style={{ padding: '12px 14px', background: '#0f1117', display: 'flex', flexDirection: 'column', gap: 10 }}>
                            <textarea
                              className="ob-textarea"
                              value={editingPrompt}
                              onChange={e => setEditingPrompt(e.target.value)}
                              rows={5}
                              style={{ fontStyle: 'italic', color: '#888', fontSize: 12 }}
                            />
                            <button
                              onClick={handleRegenerateWithPrompt}
                              disabled={promptRegen || regenerating || !editingPrompt.trim()}
                              className="ob-submit-btn"
                              style={{ marginTop: 0, opacity: (promptRegen || regenerating) ? 0.5 : 1 }}
                            >
                              {promptRegen ? 'GENERATING…' : 'REGENERATE WITH THIS PROMPT →'}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 3D OOH model preview */}
                      <div>
                        <div style={{ fontSize: 10, color: '#555', letterSpacing: '0.08em', fontWeight: 700, marginBottom: 8 }}>
                          3D PREVIEW
                        </div>
                        <div
                          className="ob-3d-preview-card"
                          role="button"
                          tabIndex={0}
                          aria-label="Open expanded 3D preview"
                          onClick={() => setPreviewModalOpen(true)}
                          onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              setPreviewModalOpen(true)
                            }
                          }}
                        >
                          <LowPolyWalker
                            externalMediaUrl={creative.url}
                            externalMediaType="image"
                            hideControls
                            billboardOnly
                          />
                        </div>
                      </div>

                      {previewModalOpen && typeof document !== 'undefined' && createPortal(
                        <div
                          className="ob-preview-modal"
                          role="presentation"
                          onMouseDown={event => {
                            if (event.target === event.currentTarget) setPreviewModalOpen(false)
                          }}
                        >
                          <div className="ob-preview-modal__dialog" role="dialog" aria-modal="true" aria-label="Expanded 3D preview">
                            <button
                              type="button"
                              className="ob-preview-modal__close"
                              aria-label="Close expanded 3D preview"
                              onClick={() => setPreviewModalOpen(false)}
                            >
                              {'\u00d7'}
                            </button>
                            <LowPolyWalker
                              externalMediaUrl={creative.url}
                              externalMediaType="image"
                              hideControls
                              billboardOnly
                            />
                          </div>
                        </div>,
                        document.body
                      )}
                    </>
                  )}

                  <button className="ob-submit-btn" onClick={handleEnterMap}>
                    ENTER MAP →
                  </button>
                </div>
              )}

              {/* MANUAL */}
              {obMode === 'manual' && (
                <form className="ob-manual-form ob-manual-form--carousel" onSubmit={handleSubmitManual}>
                  <div className="ob-carousel ob-carousel--manual">
                    {/* Step tabs */}
                    <nav className="ob-stepper ob-stepper--manual" aria-label="Brief sections">
                      {BRIEF_SECTIONS.map((section, i) => (
                        <button
                          key={section}
                          type="button"
                          className={`ob-stepper-tab${i === activeBriefSection ? ' ob-stepper-tab--active' : ''}`}
                          onClick={() => { setGenerateError(null); briefCarouselApi?.scrollTo(i) }}
                          aria-current={i === activeBriefSection ? 'step' : undefined}
                        >
                          <span className="ob-stepper-tab__num">{String(i + 1).padStart(2, '0')}</span>
                          <span className="ob-stepper-tab__label">{section}</span>
                        </button>
                      ))}
                    </nav>
                    <div className="ob-carousel-viewport" ref={briefCarouselRef}>
                      <div className="ob-carousel-track">

                  {/* 01 Identity */}
                  <div className={`ob-section ob-carousel-slide${activeBriefSection === 0 ? ' ob-carousel-slide--active' : ''}`}>
                    <div className="ob-section-label">
                      <span className="ob-section-num">01</span>IDENTITY
                    </div>
                    <div className="ob-row-2">
                      <div>
                        <label className="ob-label">Company name *</label>
                        <input className="ob-input" value={form.companyName}
                          onChange={setField('companyName')} placeholder="Acme Corp" />
                      </div>
                      <div>
                        <label className="ob-label">Industry</label>
                        <input className="ob-input" value={form.industry}
                          onChange={setField('industry')} placeholder="Retail, Tech, F&B…" />
                      </div>
                    </div>
                    <div>
                      <label className="ob-label">What you do — one sentence *</label>
                      <textarea className="ob-textarea" value={form.description}
                        onChange={setField('description')} rows={2}
                        placeholder="We make electric bikes for urban commuters." />
                    </div>
                    <div>
                      <label className="ob-label">Brand personality — pick 3</label>
                      <div className="ob-adj-grid">
                        {ADJECTIVES.map(adj => (
                          <button key={adj} type="button"
                            className={`ob-adj-chip${adjectives.includes(adj) ? ' ob-adj-chip--active' : ''}`}
                            onClick={() => toggleAdj(adj)}>{adj}</button>
                        ))}
                      </div>
                      <span className="ob-adj-hint">{adjectives.length}/3 selected</span>
                    </div>
                    <div>
                      <label className="ob-label">Tagline / slogan</label>
                      <input className="ob-input" value={form.tagline}
                        onChange={setField('tagline')} placeholder="Just do it." />
                    </div>
                  </div>

                  {/* 02 Visual */}
                  <div className={`ob-section ob-carousel-slide${activeBriefSection === 1 ? ' ob-carousel-slide--active' : ''}`}>
                    <div className="ob-section-label">
                      <span className="ob-section-num">02</span>VISUAL SYSTEM
                    </div>
                    <div className="ob-row-2">
                      <div>
                        <label className="ob-label">Primary color</label>
                        <div className="ob-color-row">
                          <input type="color" className="ob-color-swatch"
                            value={form.primaryColor} onChange={setField('primaryColor')} />
                          <input className="ob-input ob-input--mono" value={form.primaryColor}
                            onChange={setField('primaryColor')} placeholder="#000000" maxLength={7} />
                        </div>
                      </div>
                      <div>
                        <label className="ob-label">Secondary color</label>
                        <div className="ob-color-row">
                          <input type="color" className="ob-color-swatch"
                            value={form.secondaryColor} onChange={setField('secondaryColor')} />
                          <input className="ob-input ob-input--mono" value={form.secondaryColor}
                            onChange={setField('secondaryColor')} placeholder="#ffffff" maxLength={7} />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="ob-label">Logo</label>
                      <div
                        className={`ob-drop-zone${dragOver ? ' ob-drop-zone--over' : ''}`}
                        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileRef.current?.click()}
                      >
                        {logoPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={logoPreview} alt="Logo preview" className="ob-logo-preview" />
                        ) : (
                          <>
                            <span className="ob-drop-icon">+</span>
                            <span className="ob-drop-text">Drop logo or click to upload</span>
                            <span className="ob-drop-hint">PNG · SVG · JPG</span>
                          </>
                        )}
                        <input ref={fileRef} type="file" accept="image/*"
                          className="ob-file-hidden" onChange={handleFileChange} />
                      </div>
                    </div>
                    <div className="ob-row-2">
                      <div>
                        <label className="ob-label">Fonts</label>
                        <input className="ob-input" value={form.fonts}
                          onChange={setField('fonts')} placeholder="Helvetica, GT Walsheim" />
                      </div>
                      <div>
                        <label className="ob-label">Visual reference</label>
                        <input className="ob-input" value={form.styleReference}
                          onChange={setField('styleReference')} placeholder="Think Apple / Supreme" />
                      </div>
                    </div>
                    <div>
                      <label className="ob-label">What to avoid</label>
                      <input className="ob-input" value={form.avoidList}
                        onChange={setField('avoidList')} placeholder="Stock photos, pastel colors" />
                    </div>
                  </div>

                  {/* 03 Campaign */}
                  <div className={`ob-section ob-carousel-slide${activeBriefSection === 2 ? ' ob-carousel-slide--active' : ''}`}>
                    <div className="ob-section-label">
                      <span className="ob-section-num">03</span>THIS CAMPAIGN
                    </div>
                    <div>
                      <label className="ob-label">The ONE thing this ad communicates *</label>
                      <textarea className="ob-textarea" value={form.coreMessage}
                        onChange={setField('coreMessage')} rows={2}
                        placeholder="We're opening a store in your neighbourhood." />
                    </div>
                    <div className="ob-row-2">
                      <div>
                        <label className="ob-label">Offer or hook</label>
                        <input className="ob-input" value={form.offerOrHook}
                          onChange={setField('offerOrHook')} placeholder="Launch event, 30% off" />
                      </div>
                      <div>
                        <label className="ob-label">Call to action</label>
                        <input className="ob-input" value={form.callToAction}
                          onChange={setField('callToAction')} placeholder="Visit us, Scan QR" />
                      </div>
                    </div>
                    <div>
                      <label className="ob-label">Campaign objective</label>
                      <div className="ob-obj-grid">
                        {OBJECTIVES.map(obj => (
                          <button key={obj} type="button"
                            className={`ob-obj-chip${objective === obj ? ' ob-obj-chip--active' : ''}`}
                            onClick={() => setObjective(prev => prev === obj ? '' : obj)}>{obj}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 04 Audience */}
                  <div className={`ob-section ob-carousel-slide${activeBriefSection === 3 ? ' ob-carousel-slide--active' : ''}`}>
                    <div className="ob-section-label">
                      <span className="ob-section-num">04</span>AUDIENCE
                    </div>
                    <div>
                      <label className="ob-label">Who they are — one sentence *</label>
                      <textarea className="ob-textarea" value={form.audienceDescription}
                        onChange={setField('audienceDescription')} rows={2}
                        placeholder="25–40 year old urban commuters who care about sustainability." />
                    </div>
                    <div className="ob-row-2">
                      <div>
                        <label className="ob-label">Tone</label>
                        <input className="ob-input" value={form.tone}
                          onChange={setField('tone')} placeholder="Witty, serious, aspirational" />
                      </div>
                      <div>
                        <label className="ob-label">Context when seen</label>
                        <input className="ob-input" value={form.contextWhenSeen}
                          onChange={setField('contextWhenSeen')} placeholder="Driving, walking" />
                      </div>
                    </div>
                  </div>

                      </div>
                    </div>

                  </div>

                  {generateError && (
                    <p className="ob-form-error">{generateError}</p>
                  )}

                  <button type="submit" className="ob-submit-btn">
                    GENERATE &amp; PREVIEW →
                  </button>
                </form>
              )}

            </div>{/* lp-brief-body */}
          </div>
        )}

      </div>{/* title-block */}

      {/* ── Brief chat widget (review mode only) ── */}
      {obMode === 'review' && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 300,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
        }}>
          {chatOpen && (
            <div style={{
              width: 320, height: 400,
              background: '#12151e',
              border: '1px solid #2a2d3a',
              borderRadius: 8,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
            }}>
              {/* Chat header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '11px 14px',
                borderBottom: '1px solid #1a1d27',
                background: '#0f1117',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#e8e8e8' }}>
                  BRIEF ASSISTANT
                </span>
                <button onClick={() => setChatOpen(false)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#555', fontSize: 16, lineHeight: 1, padding: '0 2px',
                }}>✕</button>
              </div>

              {/* Messages */}
              <div ref={chatScrollRef} style={{
                flex: 1, overflowY: 'auto', padding: '12px 14px',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                {chatMessages.length === 0 && (
                  <p style={{ fontSize: 12, color: '#555', fontStyle: 'italic', textAlign: 'center', marginTop: 40, lineHeight: 1.6 }}>
                    Tell me what to change and I&apos;ll update the brief fields automatically.
                  </p>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    background: msg.role === 'user' ? '#D02020' : '#1a1d27',
                    color: '#e8e8e8',
                    padding: '8px 11px',
                    borderRadius: 6,
                    fontSize: 12,
                    lineHeight: 1.5,
                  }}>
                    {msg.content}
                  </div>
                ))}
                {chatLoading && (
                  <div style={{ alignSelf: 'flex-start', color: '#555', fontSize: 12, fontStyle: 'italic' }}>
                    Updating brief…
                  </div>
                )}
              </div>

              {/* Input row */}
              <div style={{
                padding: '10px 14px',
                borderTop: '1px solid #1a1d27',
                display: 'flex', gap: 8,
              }}>
                <input
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSend() } }}
                  placeholder="Make the tone more playful…"
                  style={{
                    flex: 1,
                    background: '#0f1117',
                    border: '1px solid #2a2d3a',
                    color: '#e8e8e8',
                    padding: '7px 10px',
                    fontSize: 12,
                    borderRadius: 4,
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={handleChatSend}
                  disabled={!chatInput.trim() || chatLoading}
                  style={{
                    background: '#D02020',
                    border: 'none',
                    color: '#fff',
                    padding: '7px 12px',
                    cursor: 'pointer',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    opacity: (!chatInput.trim() || chatLoading) ? 0.4 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  SEND
                </button>
              </div>
            </div>
          )}

          {/* Toggle pill */}
          <button
            onClick={() => setChatOpen(prev => !prev)}
            style={{
              background: chatOpen ? '#1a1d27' : '#D02020',
              border: '1px solid ' + (chatOpen ? '#2a2d3a' : 'transparent'),
              color: '#fff',
              padding: '9px 18px',
              borderRadius: 24,
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              display: 'flex', alignItems: 'center', gap: 7,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              transition: 'background 0.15s',
            }}
          >
            <span style={{ fontSize: 14 }}>{chatOpen ? '✕' : '✦'}</span>
            BRIEF CHAT
          </button>
        </div>
      )}

    </div>
  )
}
