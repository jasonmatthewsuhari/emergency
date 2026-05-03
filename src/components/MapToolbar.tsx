'use client'

import { useState } from 'react'

export type MapTool = 'builder' | 'dashboard' | 'settings' | 'streetview' | 'spawn-pedestrian' | null

interface MapToolbarProps {
  activeTool: MapTool
  onToolChange: (tool: MapTool) => void
  onSpawnCrowd?: () => void
  hasCrowd?: boolean
  dashboardEnabled?: boolean
  showTrafficLines?: boolean
  onTrafficLinesToggle?: () => void
}

const ACTIVE_COLOR: Record<string, string> = {
  builder:            '#D02020',
  dashboard:          '#1040C0',
  settings:           '#F0C020',
  streetview:         '#009E73',
  'spawn-pedestrian': '#16a34a',
}

const LABEL: Record<string, string> = {
  builder:            'Billboard Studio',
  dashboard:          'OOH Cockpit',
  settings:           'Scene Analysis',
  streetview:         'Street View',
  'spawn-pedestrian': 'Spawn Pedestrian',
}

export default function MapToolbar({ activeTool, onToolChange, onSpawnCrowd, hasCrowd, dashboardEnabled, showTrafficLines, onTrafficLinesToggle }: MapToolbarProps) {
  const toggle = (tool: Exclude<MapTool, null>) => {
    onToolChange(activeTool === tool ? null : tool)
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 32,
        right: 32,
        zIndex: 40,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
      role="toolbar"
      aria-label="Map tools"
    >
      <ToolButton
        label={showTrafficLines === false ? 'Show foot traffic' : 'Hide foot traffic'}
        active={showTrafficLines === false}
        activeColor="#888888"
        onClick={() => onTrafficLinesToggle?.()}
      >
        <TrafficLinesIcon />
      </ToolButton>

      <ToolButton
        label={hasCrowd ? 'Clear crowd' : 'Spawn crowd'}
        active={hasCrowd ?? false}
        activeColor="#7c3aed"
        onClick={() => onSpawnCrowd?.()}
      >
        <PersonIcon />
      </ToolButton>

      <ToolButton
        label={activeTool === 'spawn-pedestrian' ? 'Cancel spawn' : LABEL['spawn-pedestrian']}
        active={activeTool === 'spawn-pedestrian'}
        activeColor={ACTIVE_COLOR['spawn-pedestrian']}
        onClick={() => toggle('spawn-pedestrian')}
      >
        <SpawnPedestrianIcon />
      </ToolButton>

      <ToolButton
        label={LABEL.streetview}
        active={activeTool === 'streetview'}
        activeColor={ACTIVE_COLOR.streetview}
        onClick={() => toggle('streetview')}
      >
        <StreetViewIcon />
      </ToolButton>

      <ToolButton
        label={LABEL.builder}
        active={activeTool === 'builder'}
        activeColor={ACTIVE_COLOR.builder}
        onClick={() => toggle('builder')}
      >
        <HammerIcon />
      </ToolButton>

      <ToolButton
        label={LABEL.dashboard}
        active={activeTool === 'dashboard'}
        activeColor={ACTIVE_COLOR.dashboard}
        disabled={!dashboardEnabled}
        onClick={() => toggle('dashboard')}
      >
        <DashboardIcon />
      </ToolButton>

      <ToolButton
        label={LABEL.settings}
        active={activeTool === 'settings'}
        activeColor={ACTIVE_COLOR.settings}
        onClick={() => toggle('settings')}
      >
        <SettingsIcon />
      </ToolButton>
    </div>
  )
}

interface ToolButtonProps {
  label: string
  active: boolean
  activeColor: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}

function ToolButton({ label, active, activeColor, disabled, onClick, children }: ToolButtonProps) {
  const [hovered, setHovered] = useState(false)
  const isYellow = activeColor === '#F0C020'
  const fg = active ? (isYellow ? '#121212' : '#F0F0F0') : '#121212'
  const bg = active ? activeColor : '#F0F0F0'
  const shadow = active ? '2px 2px 0 #121212' : '4px 4px 0 #121212'
  const translate = active ? 'translate(2px, 2px)' : 'translate(0, 0)'

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      {hovered && (
        <div
          style={{
            position: 'absolute',
            right: 'calc(100% + 10px)',
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#121212',
            color: '#F0F0F0',
            fontSize: 12,
            fontFamily: 'monospace',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            padding: '4px 8px',
            border: '2px solid #F0F0F0',
            pointerEvents: 'none',
            zIndex: 50,
          }}
        >
          {label}
        </div>
      )}
      <button
        type="button"
        aria-label={label}
        aria-pressed={active}
        disabled={disabled}
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: 52,
          height: 52,
          border: '3px solid #121212',
          borderRadius: 0,
          background: bg,
          color: fg,
          boxShadow: shadow,
          transform: translate,
          transition: 'transform 0.08s, box-shadow 0.08s, background 0.1s',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.3 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          flexShrink: 0,
        }}
      >
        {children}
      </button>
    </div>
  )
}

// ── Icons ────────────────────────────────────────────────────────────────────

function StreetViewIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {/* head */}
      <circle cx="12" cy="4" r="3" />
      {/* body */}
      <rect x="10" y="8" width="4" height="7" />
      {/* drop ring */}
      <ellipse cx="12" cy="20" rx="6" ry="2.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
      {/* legs connecting body to ring */}
      <line x1="10" y1="15" x2="8.5" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
      <line x1="14" y1="15" x2="15.5" y2="18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
    </svg>
  )
}

function PersonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="7" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0H4Z" />
    </svg>
  )
}

function HammerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
      <rect x="11" y="2" width="9" height="5" />
      <path d="M11 2 3 10" />
      <path d="M3 10 7 14" />
      <path d="M7 14 18 7" />
    </svg>
  )
}

function DashboardIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <rect x="3" y="3" width="8" height="8" />
      <rect x="13" y="3" width="8" height="8" />
      <rect x="3" y="13" width="8" height="8" />
      <rect x="13" y="13" width="8" height="8" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" aria-hidden="true">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
      <circle cx="8" cy="6" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="16" cy="12" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="10" cy="18" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  )
}

function SpawnPedestrianIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {/* person */}
      <circle cx="10" cy="5" r="2.5" />
      <path d="M6 14a4 4 0 0 1 8 0H6Z" />
      <rect x="9" y="8" width="2" height="5" rx="1" />
      {/* plus pin */}
      <circle cx="18" cy="17" r="5" fill="none" stroke="currentColor" strokeWidth="2" />
      <line x1="18" y1="14.5" x2="18" y2="19.5" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
      <line x1="15.5" y1="17" x2="20.5" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="square" />
    </svg>
  )
}

function TrafficLinesIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" aria-hidden="true">
      <path d="M3 20 Q8 12 12 12 Q16 12 21 4" />
      <path d="M3 14 Q7 10 10 10" strokeOpacity="0.5" />
      <path d="M14 14 Q18 10 21 10" strokeOpacity="0.5" />
    </svg>
  )
}
