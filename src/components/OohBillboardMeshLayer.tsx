'use client'

import { useEffect, useRef } from 'react'
import type { DeckGLRef } from '@deck.gl/react'
import * as THREE from 'three'
import type { OohMapPoint } from '@/types'

const METERS_PER_LAT = 110540
const METERS_PER_LNG = 111320

interface MtSpec { w: number; h: number; cl: number; hasPole: boolean }

const MT_SPEC: Record<string, MtSpec> = {
  bb: { w: 12,  h: 5,   cl: 4, hasPole: true  },
  db: { w: 14,  h: 7,   cl: 5, hasPole: true  },
  bs: { w: 1.5, h: 2,   cl: 0, hasPole: false },
  ds: { w: 2,   h: 1.5, cl: 2, hasPole: true  },
  mu: { w: 8,   h: 6,   cl: 0, hasPole: false },
  sf: { w: 1.2, h: 1.8, cl: 1, hasPole: true  },
  tr: { w: 1.5, h: 1.2, cl: 1, hasPole: true  },
}
const FALLBACK_SPEC: MtSpec = { w: 4, h: 2, cl: 2, hasPole: true }

// Colors match LowPolyWalker preview display materials
const MT_COLOR: Record<string, THREE.Color> = {
  bb: new THREE.Color(1,     0.812, 0.361),
  db: new THREE.Color(0.286, 0.569, 1    ),
  bs: new THREE.Color(0.569, 0.839, 0.769),
  ds: new THREE.Color(0.471, 0.863, 1    ),
  mu: new THREE.Color(1,     0.455, 0.627),
  sf: new THREE.Color(0.761, 0.627, 1    ),
  tr: new THREE.Color(1,     0.592, 0.325),
}
const FALLBACK_COLOR = new THREE.Color(0.87, 0.89, 0.93)

function idToHeading(id: string): number {
  let h = 5381
  for (let i = 0; i < id.length; i++) h = ((h << 5) + h) ^ id.charCodeAt(i)
  return ((h >>> 0) / 0xffffffff) * 360
}

// Pre-allocated scratch — never reallocated in the hot path
const _r      = new THREE.Vector3()
const _u      = new THREE.Vector3()
const _n      = new THREE.Vector3()
const _c      = new THREE.Vector3()
const _s      = new THREE.Vector3()
const _e      = new THREE.Vector3()
const _d      = new THREE.Vector3()
const _mid    = new THREE.Vector3()
const _panelMtx = new THREE.Matrix4()
const _backMtx  = new THREE.Matrix4()
const _poleMtx  = new THREE.Matrix4()
const _quat   = new THREE.Quaternion()
const CYL_AXIS = new THREE.Vector3(0, 1, 0)
const ZERO_MTX = new THREE.Matrix4().makeScale(0, 0, 0)

interface SceneState {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.Camera
  faceMesh:      THREE.InstancedMesh | null
  backMesh:      THREE.InstancedMesh | null
  leftPoleMesh:  THREE.InstancedMesh | null
  rightPoleMesh: THREE.InstancedMesh | null
}

interface Props {
  oohPoints: OohMapPoint[]
  deckRef: React.RefObject<DeckGLRef | null>
}

export default function OohBillboardMeshLayer({ oohPoints, deckRef }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const pointsRef  = useRef(oohPoints)
  pointsRef.current = oohPoints
  const sceneRef   = useRef<SceneState | null>(null)

  // Setup renderer + scene once
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight, false)

    const scene  = new THREE.Scene()
    const camera = new THREE.Camera()
    camera.matrixAutoUpdate = false

    const onResize = () => renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
    window.addEventListener('resize', onResize)

    sceneRef.current = { renderer, scene, camera, faceMesh: null, backMesh: null, leftPoleMesh: null, rightPoleMesh: null }

    return () => {
      window.removeEventListener('resize', onResize)
      sceneRef.current = null
      renderer.dispose()
    }
  }, [])

  // Rebuild InstancedMeshes when oohPoints changes
  useEffect(() => {
    const s = sceneRef.current
    if (!s) return

    for (const key of ['faceMesh', 'backMesh', 'leftPoleMesh', 'rightPoleMesh'] as const) {
      const mesh = s[key]
      if (mesh) {
        s.scene.remove(mesh)
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
        s[key] = null
      }
    }

    const n = oohPoints.length
    if (n === 0) return

    // Materials match LowPolyWalker: dark metal structure + emissive display face
    const faceMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })
    const backMat = new THREE.MeshBasicMaterial({
      color: 0x1d252b,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    })
    const leftPoleMat  = new THREE.MeshBasicMaterial({ color: 0x2f3a40 })
    const rightPoleMat = new THREE.MeshBasicMaterial({ color: 0x2f3a40 })

    // Geometries match LowPolyWalker preview models
    const faceGeo = new THREE.PlaneGeometry(1, 1)
    const backGeo = new THREE.PlaneGeometry(1, 1)
    const poleGeo = new THREE.CylinderGeometry(0.055, 0.055, 1, 5)

    const faceMesh      = new THREE.InstancedMesh(faceGeo, faceMat, n)
    const backMesh      = new THREE.InstancedMesh(backGeo, backMat, n)
    const leftPoleMesh  = new THREE.InstancedMesh(poleGeo,        leftPoleMat,  n)
    const rightPoleMesh = new THREE.InstancedMesh(poleGeo.clone(), rightPoleMat, n)

    for (const mesh of [faceMesh, backMesh, leftPoleMesh, rightPoleMesh]) {
      mesh.matrixAutoUpdate = false
      mesh.frustumCulled   = false
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    }

    // Per-instance face colors
    for (let i = 0; i < n; i++) {
      faceMesh.setColorAt(i, MT_COLOR[oohPoints[i].mediaTypeCode] ?? FALLBACK_COLOR)
    }
    if (faceMesh.instanceColor) faceMesh.instanceColor.needsUpdate = true

    // Hide all structural meshes until first tick
    for (let i = 0; i < n; i++) {
      backMesh.setMatrixAt(i, ZERO_MTX)
      leftPoleMesh.setMatrixAt(i, ZERO_MTX)
      rightPoleMesh.setMatrixAt(i, ZERO_MTX)
    }
    backMesh.instanceMatrix.needsUpdate      = true
    leftPoleMesh.instanceMatrix.needsUpdate  = true
    rightPoleMesh.instanceMatrix.needsUpdate = true

    // Render order: dark back frame renders before (behind) the emissive face
    backMesh.renderOrder = -1
    faceMesh.renderOrder  = 0

    s.scene.add(backMesh, faceMesh, leftPoleMesh, rightPoleMesh)
    s.faceMesh      = faceMesh
    s.backMesh      = backMesh
    s.leftPoleMesh  = leftPoleMesh
    s.rightPoleMesh = rightPoleMesh
  }, [oohPoints])

  // Render loop — syncs camera and updates instance matrices every frame
  useEffect(() => {
    let raf = 0

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const s = sceneRef.current
      if (!s || !s.faceMesh || !s.backMesh || !s.leftPoleMesh || !s.rightPoleMesh) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let vp: any
      try { vp = deckRef.current?.deck?.getViewports?.()[0] } catch { return }
      if (!vp) return

      // Sync camera from Deck.gl viewport
      s.camera.matrixWorldInverse.fromArray(vp.viewMatrix)
      s.camera.matrixWorld.copy(s.camera.matrixWorldInverse).invert()
      s.camera.projectionMatrix.fromArray(vp.projectionMatrix)
      s.camera.projectionMatrixInverse.copy(s.camera.projectionMatrix).invert()

      const proj = (lng: number, lat: number, alt: number): [number, number, number] =>
        vp.projectPosition([lng, lat, alt]) as [number, number, number]

      const pts = pointsRef.current
      for (let i = 0; i < pts.length; i++) {
        const pt   = pts[i]
        const spec = MT_SPEC[pt.mediaTypeCode] ?? FALLBACK_SPEC

        const lngScale = METERS_PER_LNG * Math.cos(pt.position.lat * Math.PI / 180)
        const hdgRad   = idToHeading(pt.id) * Math.PI / 180
        const sideE    = Math.sin(hdgRad + Math.PI / 2)
        const sideN    = Math.cos(hdgRad + Math.PI / 2)
        const hw       = spec.w / 2

        const lLng = pt.position.lng + (-sideE * hw) / lngScale
        const lLat = pt.position.lat + (-sideN * hw) / METERS_PER_LAT
        const rLng = pt.position.lng + ( sideE * hw) / lngScale
        const rLat = pt.position.lat + ( sideN * hw) / METERS_PER_LAT

        const bz = spec.cl
        const tz = spec.cl + spec.h

        const [lbx, lby, lbz] = proj(lLng, lLat, bz)
        const [rbx, rby, rbz] = proj(rLng, rLat, bz)
        const [rtx, rty, rtz] = proj(rLng, rLat, tz)
        const [ltx, lty, ltz] = proj(lLng, lLat, tz)

        _r.set(rbx - lbx, rby - lby, rbz - lbz)
        _u.set(ltx - lbx, lty - lby, ltz - lbz)
        _n.crossVectors(_r, _u).normalize()
        _c.set(
          (lbx + rbx + rtx + ltx) / 4,
          (lby + rby + rty + lty) / 4,
          (lbz + rbz + rtz + ltz) / 4,
        )

        // Display face
        _panelMtx.set(
          _r.x, _u.x, _n.x, _c.x,
          _r.y, _u.y, _n.y, _c.y,
          _r.z, _u.z, _n.z, _c.z,
          0,    0,    0,    1,
        )
        s.faceMesh.setMatrixAt(i, _panelMtx)

        // Dark backboard — same orientation, 1.1× wide and 1.15× tall to act as a frame border
        // (mirrors the billboardBack/billboardFace size ratio in LowPolyWalker)
        _backMtx.copy(_panelMtx)
        const el = _backMtx.elements  // column-major: [0..2]=right, [4..6]=up, [8..10]=normal, [12..14]=pos
        el[0] *= 1.1;  el[1] *= 1.1;  el[2] *= 1.1   // scale right column
        el[4] *= 1.15; el[5] *= 1.15; el[6] *= 1.15  // scale up column
        s.backMesh.setMatrixAt(i, _backMtx)

        // Two poles at left and right edges, ground → panel bottom (matching LowPolyWalker)
        if (spec.hasPole && bz > 0) {
          // Left pole
          const [lgx, lgy, lgz] = proj(lLng, lLat, 0)
          const [lex, ley, lez] = proj(lLng, lLat, bz)
          _s.set(lgx, lgy, lgz)
          _e.set(lex, ley, lez)
          _d.subVectors(_e, _s)
          const lLen = _d.length()
          if (lLen > 0.0001) {
            _d.divideScalar(lLen)
            _mid.addVectors(_s, _e).multiplyScalar(0.5)
            if (_d.dot(CYL_AXIS) < -0.9999) {
              _poleMtx.makeRotationX(Math.PI)
            } else {
              _quat.setFromUnitVectors(CYL_AXIS, _d)
              _poleMtx.makeRotationFromQuaternion(_quat)
            }
            _poleMtx.setPosition(_mid)
            _poleMtx.elements[4] *= lLen
            _poleMtx.elements[5] *= lLen
            _poleMtx.elements[6] *= lLen
            s.leftPoleMesh.setMatrixAt(i, _poleMtx)
          } else {
            s.leftPoleMesh.setMatrixAt(i, ZERO_MTX)
          }

          // Right pole
          const [rgx, rgy, rgz] = proj(rLng, rLat, 0)
          const [rex, rey, rez] = proj(rLng, rLat, bz)
          _s.set(rgx, rgy, rgz)
          _e.set(rex, rey, rez)
          _d.subVectors(_e, _s)
          const rLen = _d.length()
          if (rLen > 0.0001) {
            _d.divideScalar(rLen)
            _mid.addVectors(_s, _e).multiplyScalar(0.5)
            if (_d.dot(CYL_AXIS) < -0.9999) {
              _poleMtx.makeRotationX(Math.PI)
            } else {
              _quat.setFromUnitVectors(CYL_AXIS, _d)
              _poleMtx.makeRotationFromQuaternion(_quat)
            }
            _poleMtx.setPosition(_mid)
            _poleMtx.elements[4] *= rLen
            _poleMtx.elements[5] *= rLen
            _poleMtx.elements[6] *= rLen
            s.rightPoleMesh.setMatrixAt(i, _poleMtx)
          } else {
            s.rightPoleMesh.setMatrixAt(i, ZERO_MTX)
          }
        } else {
          s.leftPoleMesh.setMatrixAt(i, ZERO_MTX)
          s.rightPoleMesh.setMatrixAt(i, ZERO_MTX)
        }
      }

      s.faceMesh.instanceMatrix.needsUpdate      = true
      s.backMesh.instanceMatrix.needsUpdate      = true
      s.leftPoleMesh.instanceMatrix.needsUpdate  = true
      s.rightPoleMesh.instanceMatrix.needsUpdate = true
      s.renderer.render(s.scene, s.camera)
    }

    raf = requestAnimationFrame(tick)
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
