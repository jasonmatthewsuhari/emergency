'use client'

import { useEffect, useRef } from 'react'
import type { DeckGLRef } from '@deck.gl/react'
import * as THREE from 'three'
import type { BillboardPlacement } from '@/types'

const METERS_PER_LAT = 110540
const METERS_PER_LNG = 111320
const CYL_AXIS = new THREE.Vector3(0, 1, 0)

function bearingVector(degrees: number) {
  const r = degrees * Math.PI / 180
  return { east: Math.sin(r), north: Math.cos(r) }
}

function offsetLngLat(
  origin: { lat: number; lng: number },
  eastM: number,
  northM: number,
  lngScale: number,
) {
  return {
    lat: origin.lat + northM / METERS_PER_LAT,
    lng: origin.lng + eastM / lngScale,
  }
}

interface BoardEntry {
  panel: THREE.Mesh
  poleLeft: THREE.Mesh
  poleRight: THREE.Mesh
  texture: THREE.Texture | null
  videoEl: HTMLVideoElement | null
  mediaUrl: string | undefined
}

interface Props {
  billboards: BillboardPlacement[]
  deckRef: React.RefObject<DeckGLRef | null>
}

// Pre-allocated scratch vectors — never reallocated in the hot path
const _right = new THREE.Vector3()
const _up    = new THREE.Vector3()
const _norm  = new THREE.Vector3()
const _cen   = new THREE.Vector3()
const _vDir  = new THREE.Vector3()
const _vMid  = new THREE.Vector3()
const _mtx   = new THREE.Matrix4()

export default function BillboardMeshLayer({ billboards, deckRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const billboardsRef = useRef(billboards)
  billboardsRef.current = billboards

  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.Camera
    entries: Map<string, BoardEntry>
  } | null>(null)

  // Setup — runs once on mount
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false)

    const scene = new THREE.Scene()
    const camera = new THREE.Camera()
    camera.matrixAutoUpdate = false

    const handleResize = () => renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
    window.addEventListener('resize', handleResize)

    sceneRef.current = { renderer, scene, camera, entries: new Map() }

    return () => {
      window.removeEventListener('resize', handleResize)
      for (const e of sceneRef.current?.entries.values() ?? []) cleanupEntry(e)
      renderer.dispose()
      sceneRef.current = null
    }
  }, [])

  // Render loop — stable, reads exclusively from refs
  useEffect(() => {
    let raf = 0

    const animate = () => {
      raf = requestAnimationFrame(animate)
      const s = sceneRef.current
      if (!s) return

      let vp
      try {
        vp = deckRef.current?.deck?.getViewports?.()[0]
      } catch {
        return
      }
      if (!vp) return

      // Sync camera from Deck.gl viewport (same pattern as CrowdLayer)
      s.camera.matrixWorldInverse.fromArray(vp.viewMatrix)
      s.camera.matrixWorld.copy(s.camera.matrixWorldInverse).invert()
      s.camera.projectionMatrix.fromArray(vp.projectionMatrix)
      s.camera.projectionMatrixInverse.copy(s.camera.projectionMatrix).invert()

      const boards = billboardsRef.current
      const currentIds = new Set(boards.map(b => b.id))

      for (const [id, entry] of s.entries) {
        if (!currentIds.has(id)) {
          s.scene.remove(entry.panel, entry.poleLeft, entry.poleRight)
          cleanupEntry(entry)
          s.entries.delete(id)
        }
      }

      const proj = (lng: number, lat: number, alt: number): [number, number, number] =>
        vp.projectPosition([lng, lat, alt]) as [number, number, number]

      for (const board of boards) {
        const lngScale = METERS_PER_LNG * Math.cos(board.position.lat * Math.PI / 180)
        const side = bearingVector(board.heading + 90)
        const hw  = board.widthM / 2
        const pi  = board.widthM * 0.28

        const leftPos  = offsetLngLat(board.position, -side.east * hw, -side.north * hw, lngScale)
        const rightPos = offsetLngLat(board.position,  side.east * hw,  side.north * hw, lngScale)
        const plPos    = offsetLngLat(board.position, -side.east * pi, -side.north * pi, lngScale)
        const prPos    = offsetLngLat(board.position,  side.east * pi,  side.north * pi, lngScale)

        const bz = board.clearanceM
        const tz = board.clearanceM + board.heightM

        // Project the 4 panel corners
        const [lbx, lby, lbz] = proj(leftPos.lng,  leftPos.lat,  bz)
        const [rbx, rby, rbz] = proj(rightPos.lng, rightPos.lat, bz)
        const [rtx, rty, rtz] = proj(rightPos.lng, rightPos.lat, tz)
        const [ltx, lty, ltz] = proj(leftPos.lng,  leftPos.lat,  tz)

        // Project pole endpoints
        const [plbx, plby, plbz] = proj(plPos.lng, plPos.lat, 0)
        const [pltx, plty, pltz] = proj(plPos.lng, plPos.lat, bz)
        const [prbx, prby, prbz] = proj(prPos.lng, prPos.lat, 0)
        const [prtx, prty, prtz] = proj(prPos.lng, prPos.lat, bz)

        let entry = s.entries.get(board.id)

        if (!entry) {
          // PlaneGeometry(1,1): local verts span -0.5..0.5 in X and Y
          // The matrix maps these to projected world-space corners
          const geo = new THREE.PlaneGeometry(1, 1)
          const mat = new THREE.MeshBasicMaterial({
            side: THREE.DoubleSide,
            color: parseInt(board.primaryColor.replace('#', ''), 16),
          })

          const panel = new THREE.Mesh(geo, mat)
          panel.matrixAutoUpdate = false
          panel.frustumCulled = false

          const poleMat  = new THREE.MeshBasicMaterial({ color: 0x8a9ab0 })
          const poleGeo  = new THREE.CylinderGeometry(0.08, 0.08, 1, 6)
          const poleLeft = new THREE.Mesh(poleGeo, poleMat)
          const poleRight = new THREE.Mesh(poleGeo.clone(), poleMat)
          poleLeft.matrixAutoUpdate  = false
          poleRight.matrixAutoUpdate = false
          poleLeft.frustumCulled  = false
          poleRight.frustumCulled = false

          entry = { panel, poleLeft, poleRight, texture: null, videoEl: null, mediaUrl: Symbol() as unknown as undefined }
          s.scene.add(panel, poleLeft, poleRight)
          s.entries.set(board.id, entry)
        }

        // Reload texture when mediaUrl changes
        if (entry.mediaUrl !== board.mediaUrl) {
          const mat = entry.panel.material as THREE.MeshBasicMaterial
          if (entry.texture) { entry.texture.dispose(); entry.texture = null }
          if (entry.videoEl) { entry.videoEl.pause(); entry.videoEl.src = ''; entry.videoEl = null }
          mat.map = null

          if (board.mediaUrl) {
            const isVideo = /\.(mp4|webm|ogg)(\?|$)/i.test(board.mediaUrl)
            if (isVideo) {
              const vid = document.createElement('video')
              vid.src = board.mediaUrl
              vid.loop = true; vid.muted = true; vid.playsInline = true
              vid.play().catch(() => {})
              const tex = new THREE.VideoTexture(vid)
              tex.flipY = true
              entry.texture = tex
              entry.videoEl = vid
            } else {
              entry.texture = new THREE.TextureLoader().load(board.mediaUrl)
            }
            mat.map = entry.texture
            mat.color.set(0xffffff)
          } else {
            mat.color.set(parseInt(board.primaryColor.replace('#', ''), 16))
          }
          mat.needsUpdate = true
          entry.mediaUrl = board.mediaUrl
        }

        if (entry.texture instanceof THREE.VideoTexture) entry.texture.needsUpdate = true

        // Build panel matrix from projected corners.
        // PlaneGeometry(1,1) local coords: (-0.5,-0.5)=lb, (0.5,-0.5)=rb, (0.5,0.5)=rt, (-0.5,0.5)=lt
        // X column = full right vector (rb - lb)
        // Y column = full up vector   (lt - lb)
        // Z column = normal (X × Y, normalised)
        // Translation = center of the quad
        _right.set(rbx - lbx, rby - lby, rbz - lbz)  // width vector
        _up.set(ltx - lbx, lty - lby, ltz - lbz)      // height vector
        _norm.crossVectors(_right, _up).normalize()
        _cen.set(
          (lbx + rbx + rtx + ltx) / 4,
          (lby + rby + rty + lty) / 4,
          (lbz + rbz + rtz + ltz) / 4,
        )

        _mtx.set(
          _right.x, _up.x, _norm.x, _cen.x,
          _right.y, _up.y, _norm.y, _cen.y,
          _right.z, _up.z, _norm.z, _cen.z,
          0,        0,     0,       1,
        )
        // matrixAutoUpdate=false means THREE.js only re-syncs matrixWorld when
        // matrixWorldNeedsUpdate=true, which is only set on first add(). Copy both
        // so the renderer always sees the current transform.
        entry.panel.matrix.copy(_mtx)
        entry.panel.matrixWorld.copy(_mtx)

        // Poles: same matrix approach as CrowdLayer placeLimb
        placeLimb(entry.poleLeft,  plbx, plby, plbz, pltx, plty, pltz)
        placeLimb(entry.poleRight, prbx, prby, prbz, prtx, prty, prtz)
      }

      s.renderer.render(s.scene, s.camera)
    }

    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  )
}

function placeLimb(
  mesh: THREE.Mesh,
  sx: number, sy: number, sz: number,
  ex: number, ey: number, ez: number,
) {
  _vDir.set(ex - sx, ey - sy, ez - sz)
  const len = _vDir.length()
  if (len < 0.0001) return
  _vDir.divideScalar(len)
  _vMid.set((sx + ex) / 2, (sy + ey) / 2, (sz + ez) / 2)

  const dot = _vDir.dot(CYL_AXIS)
  if (dot < -0.9999) {
    _mtx.makeRotationX(Math.PI)
  } else {
    _mtx.makeRotationFromQuaternion(
      new THREE.Quaternion().setFromUnitVectors(CYL_AXIS, _vDir)
    )
  }
  _mtx.setPosition(_vMid)
  // Scale local Y axis to pole length — column 1 is elements[4..6] in Three.js column-major
  _mtx.elements[4] *= len
  _mtx.elements[5] *= len
  _mtx.elements[6] *= len

  mesh.matrix.copy(_mtx)
  mesh.matrixWorld.copy(_mtx)
}

function cleanupEntry(entry: BoardEntry) {
  entry.texture?.dispose()
  if (entry.videoEl) { entry.videoEl.pause(); entry.videoEl.src = '' }
  entry.panel.geometry.dispose()
  ;(entry.panel.material as THREE.Material).dispose()
}
