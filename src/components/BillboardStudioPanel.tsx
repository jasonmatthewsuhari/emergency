'use client'

import type { BillboardFormat, BillboardMaterial, BillboardPlacement } from '@/types'

interface BillboardStudioPanelProps {
  billboards: BillboardPlacement[]
  selectedBillboard: BillboardPlacement | null
  onSelectBillboard: (id: string) => void
  onUpdateBillboard: (id: string, patch: Partial<BillboardPlacement>) => void
  onDuplicateBillboard: (id: string) => void
  onDeleteBillboard: (id: string) => void
}

const FORMAT_LABELS: Record<BillboardFormat, string> = {
  digital: 'Digital',
  static: 'Static',
  poster: 'Poster',
  wallscape: 'Wallscape',
}

const MATERIAL_LABELS: Record<BillboardMaterial, string> = {
  'digital-day': 'Digital day',
  'digital-night': 'Digital night',
  'printed-vinyl': 'Printed vinyl',
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getScore(placement: BillboardPlacement) {
  const areaScore = Math.min(36, placement.widthM * placement.heightM * 0.42)
  const formatScore = placement.format === 'digital' ? 18 : placement.format === 'wallscape' ? 15 : 11
  const clearanceScore = Math.min(18, placement.clearanceM * 2.2)
  const brightnessScore = placement.brightness * 0.14
  return Math.round(Math.min(99, 18 + areaScore + formatScore + clearanceScore + brightnessScore))
}

function getTotalReach(billboards: BillboardPlacement[]) {
  return billboards.reduce((sum, billboard) => sum + billboard.weeklyReach, 0)
}

export default function BillboardStudioPanel({
  billboards,
  selectedBillboard,
  onSelectBillboard,
  onUpdateBillboard,
  onDuplicateBillboard,
  onDeleteBillboard,
}: BillboardStudioPanelProps) {
  const totalReach = getTotalReach(billboards)
  const averageScore = billboards.length
    ? Math.round(billboards.reduce((sum, billboard) => sum + getScore(billboard), 0) / billboards.length)
    : 0

  return (
    <aside className="billboard-studio" aria-label="Billboard placement studio">
      <div className="billboard-studio__header">
        <div>
          <p className="billboard-eyebrow">3D Placement Studio</p>
          <h2>Billboards</h2>
        </div>
        <span>{billboards.length} placed</span>
      </div>
      <div className="billboard-color-bar"><span /><span /><span /></div>

      <div className="billboard-metrics">
        <div>
          <span>Avg score</span>
          <strong>{averageScore || '-'}</strong>
        </div>
        <div>
          <span>Weekly reach</span>
          <strong>{totalReach ? totalReach.toLocaleString() : '-'}</strong>
        </div>
      </div>

      <div className="billboard-list">
        {billboards.map(billboard => (
          <button
            type="button"
            className={billboard.id === selectedBillboard?.id ? 'is-selected' : ''}
            key={billboard.id}
            onClick={() => onSelectBillboard(billboard.id)}
          >
            <span>
              <strong>{billboard.name}</strong>
              <small>{FORMAT_LABELS[billboard.format]} / {billboard.position.lat.toFixed(5)}, {billboard.position.lng.toFixed(5)}</small>
            </span>
            <em>{getScore(billboard)}</em>
          </button>
        ))}
      </div>

      {selectedBillboard ? (
        <div className="billboard-editor">
          <label>
            <span>Name</span>
            <input
              value={selectedBillboard.name}
              onChange={event => onUpdateBillboard(selectedBillboard.id, { name: event.target.value })}
            />
          </label>

          <label>
            <span>Creative text</span>
            <input
              value={selectedBillboard.creativeText}
              onChange={event => onUpdateBillboard(selectedBillboard.id, { creativeText: event.target.value })}
            />
          </label>

          <div className="billboard-editor__grid">
            <label>
              <span>Format</span>
              <select
                value={selectedBillboard.format}
                onChange={event => onUpdateBillboard(selectedBillboard.id, { format: event.target.value as BillboardFormat })}
              >
                {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                  <option value={value} key={value}>{label}</option>
                ))}
              </select>
            </label>

            <label>
              <span>Reach</span>
              <input
                type="number"
                min={1000}
                step={1000}
                value={selectedBillboard.weeklyReach}
                onChange={event => onUpdateBillboard(selectedBillboard.id, {
                  weeklyReach: Math.max(0, Number(event.target.value) || 0),
                })}
              />
            </label>
          </div>

          <label>
            <span>Material shader</span>
            <select
              value={selectedBillboard.material}
              onChange={event => onUpdateBillboard(selectedBillboard.id, { material: event.target.value as BillboardMaterial })}
            >
              {Object.entries(MATERIAL_LABELS).map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
              ))}
            </select>
          </label>

          <div className="billboard-editor__grid">
            <label>
              <span>Panel</span>
              <input
                type="color"
                value={selectedBillboard.primaryColor}
                onChange={event => onUpdateBillboard(selectedBillboard.id, { primaryColor: event.target.value })}
              />
            </label>
            <label>
              <span>Text</span>
              <input
                type="color"
                value={selectedBillboard.secondaryColor}
                onChange={event => onUpdateBillboard(selectedBillboard.id, { secondaryColor: event.target.value })}
              />
            </label>
          </div>

          <label className="billboard-range">
            <span>Width {selectedBillboard.widthM.toFixed(1)}m</span>
            <input
              type="range"
              min={3}
              max={32}
              step={0.5}
              value={selectedBillboard.widthM}
              onChange={event => onUpdateBillboard(selectedBillboard.id, { widthM: Number(event.target.value) })}
            />
          </label>

          <label className="billboard-range">
            <span>Height {selectedBillboard.heightM.toFixed(1)}m</span>
            <input
              type="range"
              min={2}
              max={18}
              step={0.5}
              value={selectedBillboard.heightM}
              onChange={event => onUpdateBillboard(selectedBillboard.id, { heightM: Number(event.target.value) })}
            />
          </label>

          <label className="billboard-range">
            <span>Clearance {selectedBillboard.clearanceM.toFixed(1)}m</span>
            <input
              type="range"
              min={0.5}
              max={18}
              step={0.5}
              value={selectedBillboard.clearanceM}
              onChange={event => onUpdateBillboard(selectedBillboard.id, { clearanceM: Number(event.target.value) })}
            />
          </label>

          <label className="billboard-range">
            <span>Heading {Math.round(selectedBillboard.heading)}°</span>
            <input
              type="range"
              min={0}
              max={359}
              step={1}
              value={selectedBillboard.heading}
              onChange={event => onUpdateBillboard(selectedBillboard.id, { heading: Number(event.target.value) })}
            />
          </label>

          <label className="billboard-range">
            <span>Brightness {selectedBillboard.brightness}%</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={selectedBillboard.brightness}
              onChange={event => onUpdateBillboard(selectedBillboard.id, { brightness: Number(event.target.value) })}
            />
          </label>

          <div className="billboard-nudge" aria-label="Fine position controls">
            <button type="button" onClick={() => onUpdateBillboard(selectedBillboard.id, {
              position: { ...selectedBillboard.position, lat: selectedBillboard.position.lat + 0.00005 },
            })}>N</button>
            <button type="button" onClick={() => onUpdateBillboard(selectedBillboard.id, {
              position: { ...selectedBillboard.position, lng: selectedBillboard.position.lng - 0.00005 },
            })}>W</button>
            <button type="button" onClick={() => onUpdateBillboard(selectedBillboard.id, {
              widthM: clampNumber(selectedBillboard.widthM + 1, 3, 32),
              heightM: clampNumber(selectedBillboard.heightM + 0.5, 2, 18),
            })}>Grow</button>
            <button type="button" onClick={() => onUpdateBillboard(selectedBillboard.id, {
              position: { ...selectedBillboard.position, lng: selectedBillboard.position.lng + 0.00005 },
            })}>E</button>
            <button type="button" onClick={() => onUpdateBillboard(selectedBillboard.id, {
              position: { ...selectedBillboard.position, lat: selectedBillboard.position.lat - 0.00005 },
            })}>S</button>
            <button type="button" onClick={() => onUpdateBillboard(selectedBillboard.id, {
              widthM: clampNumber(selectedBillboard.widthM - 1, 3, 32),
              heightM: clampNumber(selectedBillboard.heightM - 0.5, 2, 18),
            })}>Shrink</button>
          </div>

          <div className="billboard-actions">
            <button type="button" onClick={() => onDuplicateBillboard(selectedBillboard.id)}>Duplicate</button>
            <button type="button" className="is-danger" onClick={() => onDeleteBillboard(selectedBillboard.id)}>Delete</button>
          </div>
        </div>
      ) : (
        <p className="billboard-empty">Click the map to place a billboard, then click it to edit.</p>
      )}
    </aside>
  )
}
