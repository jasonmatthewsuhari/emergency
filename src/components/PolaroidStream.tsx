'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, RefObject } from 'react'
import type { AgentCapture } from '@/types'

type PolaroidItem = {
  id: string
  username: string
  text: string[]
  rotation: number
  shift: number
  reverse: boolean
  size: 'compact' | 'standard' | 'large'
  colors: [string, string, string]
  avatar: string
}

const INITIAL_ITEMS = 14
const LOAD_MORE_COUNT = 8

const usernames = [
  '@mika.frames',
  '@citygrain',
  '@northlens',
  '@studio.row',
  '@lightnotes',
  '@orbitwalk',
  '@paperhour',
  '@slowarchive',
]

const textSnippets = [
  ['soft light over the corner booth', 'a quiet frame from the walk home', 'caption placeholder'],
  ['three blocks later the sky opened up', 'saving this color for later', 'field note 014'],
  ['the sign looked better from across the lane', 'passing traffic, wet pavement, blue hour'],
  ['quick proof before the crew moved on', 'angles, glare, and a clean edge', 'mock copy line'],
  ['found between two storefront reflections', 'the whole street became a lightbox'],
  ['late afternoon test roll', 'good contrast at walking speed', 'tiny detail, big mood'],
  ['held the shot for one extra second', 'the shadow made the frame work'],
  ['placeholder story from the sidewalk', 'more notes appear as the page keeps going'],
]

const palettes: Array<[string, string, string]> = [
  ['#f7d86a', '#f06449', '#263238'],
  ['#85d7d0', '#3157d5', '#fff6d8'],
  ['#f3a6b2', '#1f7a5b', '#151515'],
  ['#b8d95f', '#eb5f28', '#f9f4e7'],
  ['#f4efe2', '#2f7de1', '#d91f32'],
  ['#d9c2ff', '#ffcb47', '#20242c'],
]

const sizeVariants: PolaroidItem['size'][] = ['standard', 'compact', 'large', 'standard']

function createPolaroidItem(index: number): PolaroidItem {
  const palette = palettes[index % palettes.length]

  return {
    id: `polaroid-${index}`,
    username: usernames[index % usernames.length],
    text: textSnippets[index % textSnippets.length],
    rotation: ((index * 7) % 17) - 8,
    shift: ((index * 19) % 44) - 18,
    reverse: index % 2 === 1,
    size: sizeVariants[index % sizeVariants.length],
    colors: palette,
    avatar: palette[(index + 1) % palette.length],
  }
}

function PolaroidCard({ item }: { item: PolaroidItem }) {
  const cardStyle = {
    '--polaroid-rotation': `${item.rotation}deg`,
    '--polaroid-shift': `${item.shift}px`,
    '--photo-a': item.colors[0],
    '--photo-b': item.colors[1],
    '--photo-c': item.colors[2],
    '--avatar-color': item.avatar,
  } as CSSProperties

  return (
    <figure className={`polaroid-card is-${item.size}`} style={cardStyle}>
      <div className="polaroid-photo" aria-hidden="true">
        <span />
      </div>
      <figcaption className="polaroid-meta">
        <span className="polaroid-avatar" aria-hidden="true" />
        <strong>{item.username}</strong>
      </figcaption>
    </figure>
  )
}

function TextStack({ item }: { item: PolaroidItem }) {
  return (
    <div className="polaroid-copy">
      {item.text.map((line, lineIndex) => (
        <p className={`polaroid-copy__line line-${lineIndex + 1}`} key={`${item.id}-${line}`}>
          {line}
        </p>
      ))}
    </div>
  )
}

function LivePolaroidRow({ capture, index }: { capture: AgentCapture; index: number }) {
  const reverse = index % 2 === 1
  const rotation = ((index * 11) % 11) - 5
  const shift = ((index * 13) % 20) - 10
  const palette = palettes[index % palettes.length]

  const cardStyle = {
    '--polaroid-rotation': `${rotation}deg`,
    '--polaroid-shift': `${shift}px`,
    '--photo-a': palette[0],
    '--photo-b': palette[1],
    '--photo-c': palette[2],
    '--avatar-color': '#4991FF',
  } as CSSProperties

  return (
    <article className={`polaroid-row${reverse ? ' is-reversed' : ''}`}>
      <div className="polaroid-copy">
        {capture.thought == null ? (
          <p className="polaroid-copy__line line-1" style={{ opacity: 0.45, fontStyle: 'italic' }}>thinking…</p>
        ) : (
          <p className="polaroid-copy__line line-1">{capture.thought}</p>
        )}
        <p className="polaroid-copy__line line-2" style={{ opacity: 0.6 }}>{capture.billboardName}</p>
      </div>
      <figure className="polaroid-card is-standard" style={cardStyle}>
        <div className={capture.imageUrl ? 'polaroid-photo polaroid-photo--live' : 'polaroid-photo'} aria-hidden="true">
          {capture.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={capture.imageUrl}
              alt=""
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span />
          )}
        </div>
        <figcaption className="polaroid-meta">
          <span className="polaroid-avatar" aria-hidden="true" />
          <strong>{capture.agentName}</strong>
        </figcaption>
      </figure>
    </article>
  )
}

export default function PolaroidStream({
  className = '',
  scrollRootRef,
  liveCaptures = [],
}: {
  className?: string
  scrollRootRef?: RefObject<HTMLElement | null>
  liveCaptures?: AgentCapture[]
}) {
  const [itemCount, setItemCount] = useState(INITIAL_ITEMS)
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  const loadingRef = useRef(false)
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const items = useMemo(
    () => Array.from({ length: itemCount }, (_, index) => createPolaroidItem(index)),
    [itemCount]
  )

  useEffect(() => {
    const sentinel = sentinelRef.current

    if (!sentinel) {
      return undefined
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || loadingRef.current) {
          return
        }

        loadingRef.current = true
        setItemCount((current) => current + LOAD_MORE_COUNT)

        loadingTimerRef.current = setTimeout(() => {
          loadingRef.current = false
        }, 180)
      },
      {
        root: scrollRootRef?.current ?? null,
        rootMargin: '560px 0px',
        threshold: 0,
      }
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()

      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current)
      }
    }
  }, [scrollRootRef])

  return (
    <section className={`polaroids-stream ${className}`} aria-label="Polaroid stream">
      {liveCaptures.map((capture, i) => (
        <LivePolaroidRow key={capture.id} capture={capture} index={i} />
      ))}
      {items.map((item) => (
        <article className={`polaroid-row ${item.reverse ? 'is-reversed' : ''}`} key={item.id}>
          <TextStack item={item} />
          <PolaroidCard item={item} />
        </article>
      ))}

      <div className="polaroids-sentinel" ref={sentinelRef} aria-hidden="true" />
    </section>
  )
}
