'use client'

import { useEffect, useRef } from 'react'
import type { DeckGLRef } from '@deck.gl/react'
import * as THREE from 'three'
import type { PedestrianAgent } from '@/types'

const METERS_PER_LAT = 110540
const METERS_PER_LNG = 111320

const BODY_PX = 42
const MIN_BODY_PX = 32
const MIN_ZOOM = 10
const HEAD_R_PX = 5.4
const HAIR_R_PX = 5.6
const TORSO_R_PX = 3.4
const LIMB_R_PX = 1.8
const FOOT_W_PX = 3.2
const SHADOW_R_PX = 8

const STEP_FREQ = 0.5
const LEG_SWING = 7.2
const ARM_SWING = 4.8
const BOB_AMP = 1.2

const CYL_AXIS = new THREE.Vector3(0, 1, 0)
const UP_AXIS = new THREE.Vector3(0, 0, 1)

const SHIRT_PALETTE = [
  0xff6b6b, 0x4ecdc4, 0xfeca57, 0x54a0ff,
  0xff9ff3, 0x5f27cd, 0x00d2d3, 0xff9f43,
]

const PANTS_PALETTE = [
  0x15191f, 0x263447, 0x30323a, 0x202020,
]

const SKIN_PALETTE = [
  0xffc994, 0xf2b178, 0x8f5f3c, 0xe0a46f,
]

const HAIR_PALETTE = [
  0x24140f, 0x111111, 0x5a3825, 0xc79a5c,
]

interface Props {
  agents: PedestrianAgent[]
  agentSourceRef?: React.RefObject<PedestrianAgent[]>
  deckRef: React.RefObject<DeckGLRef | null>
  elapsedSeconds: number
  maxAgents?: number
  agentVersion?: number
}

export default function CrowdLayer({ agents, agentSourceRef, deckRef, elapsedSeconds, maxAgents = 300, agentVersion }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const agentsRef = useRef(agents)
  const elapsedRef = useRef(elapsedSeconds)

  useEffect(() => {
    agentsRef.current = agents
  }, [agents, agentVersion])

  useEffect(() => {
    elapsedRef.current = elapsedSeconds
  }, [elapsedSeconds])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'low-power' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)

    const scene = new THREE.Scene()
    const camera = new THREE.OrthographicCamera(
      -canvas.clientWidth / 2,
      canvas.clientWidth / 2,
      canvas.clientHeight / 2,
      -canvas.clientHeight / 2,
      0.1,
      1000,
    )
    camera.position.set(0, 0, 100)
    camera.lookAt(0, 0, 0)

    const n = maxAgents
    const headMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshBasicMaterial(), n)
    const hairMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 5, 4), new THREE.MeshBasicMaterial(), n)
    const torsoMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5), new THREE.MeshBasicMaterial(), n)
    const lArmMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 4), new THREE.MeshBasicMaterial(), n)
    const rArmMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 4), new THREE.MeshBasicMaterial(), n)
    const lLegMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 4), new THREE.MeshBasicMaterial(), n)
    const rLegMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 4), new THREE.MeshBasicMaterial(), n)
    const lFootMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), n)
    const rFootMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial(), n)
    const shadowMesh = new THREE.InstancedMesh(
      new THREE.CircleGeometry(1, 8),
      new THREE.MeshBasicMaterial({ color: 0x080c12, transparent: true, opacity: 0.3 }),
      n,
    )

    const col = new THREE.Color()
    for (let i = 0; i < n; i++) {
      col.setHex(SHIRT_PALETTE[i % SHIRT_PALETTE.length])
      torsoMesh.setColorAt(i, col)
      lArmMesh.setColorAt(i, col)
      rArmMesh.setColorAt(i, col)

      col.setHex(PANTS_PALETTE[i % PANTS_PALETTE.length])
      lLegMesh.setColorAt(i, col)
      rLegMesh.setColorAt(i, col)
      lFootMesh.setColorAt(i, col)
      rFootMesh.setColorAt(i, col)

      col.setHex(SKIN_PALETTE[i % SKIN_PALETTE.length])
      headMesh.setColorAt(i, col)

      col.setHex(HAIR_PALETTE[i % HAIR_PALETTE.length])
      hairMesh.setColorAt(i, col)
    }

    const coloredMeshes = [lLegMesh, rLegMesh, lFootMesh, rFootMesh, torsoMesh, lArmMesh, rArmMesh, headMesh, hairMesh]
    for (const mesh of coloredMeshes) mesh.instanceColor!.needsUpdate = true

    const allMeshes = [shadowMesh, lLegMesh, rLegMesh, lFootMesh, rFootMesh, torsoMesh, lArmMesh, rArmMesh, headMesh, hairMesh]
    for (const mesh of allMeshes) {
      mesh.frustumCulled = false
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      scene.add(mesh)
    }

    const dummy = new THREE.Object3D()
    dummy.scale.setScalar(0)
    dummy.updateMatrix()
    for (let i = 0; i < n; i++) for (const mesh of allMeshes) mesh.setMatrixAt(i, dummy.matrix)
    for (const mesh of allMeshes) mesh.instanceMatrix.needsUpdate = true

    const vHead = new THREE.Vector3()
    const vHair = new THREE.Vector3()
    const vPelvis = new THREE.Vector3()
    const vChest = new THREE.Vector3()
    const vGnd = new THREE.Vector3()
    const vLS = new THREE.Vector3()
    const vRS = new THREE.Vector3()
    const vLH = new THREE.Vector3()
    const vRH = new THREE.Vector3()
    const vLHip = new THREE.Vector3()
    const vRHip = new THREE.Vector3()
    const vLF = new THREE.Vector3()
    const vRF = new THREE.Vector3()
    const vDir = new THREE.Vector3()
    const vMid = new THREE.Vector3()

    const placeLimb = (mesh: THREE.InstancedMesh, i: number, a: THREE.Vector3, b: THREE.Vector3, radius: number) => {
      vDir.subVectors(b, a)
      const len = vDir.length()
      if (len < 1e-6) return
      vDir.divideScalar(len)
      vMid.addVectors(a, b).multiplyScalar(0.5)
      dummy.position.copy(vMid)
      dummy.quaternion.setFromUnitVectors(CYL_AXIS, vDir)
      dummy.scale.set(radius, len, radius)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }

    const placeFoot = (mesh: THREE.InstancedMesh, i: number, foot: THREE.Vector3, radius: number, stride: number) => {
      dummy.position.copy(foot)
      dummy.quaternion.setFromAxisAngle(UP_AXIS, stride > 0 ? 0.18 : -0.18)
      dummy.scale.set(radius, radius * 1.9, radius * 0.35)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    }

    const onResize = () => {
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
      camera.left = -canvas.clientWidth / 2
      camera.right = canvas.clientWidth / 2
      camera.top = canvas.clientHeight / 2
      camera.bottom = -canvas.clientHeight / 2
      camera.updateProjectionMatrix()
    }
    window.addEventListener('resize', onResize)

    let raf = 0

    const animate = () => {
      raf = requestAnimationFrame(animate)

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let vp: any
      try {
        const deck = (deckRef.current as { deck?: { getViewports?: () => unknown[] }, getViewports?: () => unknown[] } | null)?.deck
          ?? deckRef.current as { getViewports?: () => unknown[] } | null
        vp = deck?.getViewports?.()[0]
      } catch {
        return
      }
      if (!vp?.project) return

      const list = agentSourceRef?.current ?? agentsRef.current
      const elapsed = elapsedRef.current
      const count = Math.min(list.length, n)
      const zoom = (vp.zoom ?? 15) as number
      const viewW = (vp.width ?? canvas.clientWidth ?? 1200) as number
      const viewH = (vp.height ?? canvas.clientHeight ?? 800) as number
      const heightPx = zoom < MIN_ZOOM ? 0 : Math.max(MIN_BODY_PX, BODY_PX + Math.max(0, zoom - 16) * 5)
      const radiusScale = heightPx / BODY_PX
      for (let i = 0; i < count; i++) {
        const agent = list[i]
        const lngScale = METERS_PER_LNG * Math.cos(agent.position.lat * Math.PI / 180)
        const heading = agent.heading * Math.PI / 180
        const fwdE = Math.sin(heading)
        const fwdN = Math.cos(heading)

        const projectScreen = (eastM: number, northM: number) => {
          const [x, y] = vp.project([
            agent.position.lng + eastM / lngScale,
            agent.position.lat + northM / METERS_PER_LAT,
            0,
          ]) as [number, number, number]
          return { x: x - viewW / 2, y: viewH / 2 - y }
        }

        const ground = projectScreen(0, 0)
        const forwardPoint = projectScreen(fwdE * 4, fwdN * 4)
        let fwdX = forwardPoint.x - ground.x
        let fwdY = forwardPoint.y - ground.y
        const fwdLen = Math.hypot(fwdX, fwdY) || 1
        fwdX /= fwdLen
        fwdY /= fwdLen
        const rightX = fwdY
        const rightY = -fwdX

        const phase = elapsed * agent.speedMps * STEP_FREQ * Math.PI * 2 + agent.phaseOffsetM
        const legFwd = Math.sin(phase) * LEG_SWING * radiusScale
        const armFwd = -Math.sin(phase) * ARM_SWING * radiusScale
        const bob = Math.max(0, Math.sin(phase * 2)) * BOB_AMP * radiusScale

        const place = (out: THREE.Vector3, rightPx: number, fwdPx: number, upPx: number) => {
          out.set(
            ground.x + rightX * rightPx + fwdX * fwdPx,
            ground.y + rightY * rightPx + fwdY * fwdPx + upPx + bob,
            0,
          )
        }

        place(vGnd, 0, 0, 1)
        place(vPelvis, 0, 0, heightPx * 0.36)
        place(vChest, 0, 0, heightPx * 0.68)
        place(vHead, 0, 0, heightPx * 0.86)
        place(vHair, 0, -1.5 * radiusScale, heightPx * 0.93)
        place(vLS, -heightPx * 0.16, 0, heightPx * 0.65)
        place(vRS, heightPx * 0.16, 0, heightPx * 0.65)
        place(vLH, -heightPx * 0.22, armFwd, heightPx * 0.42)
        place(vRH, heightPx * 0.22, -armFwd, heightPx * 0.42)
        place(vLHip, -heightPx * 0.09, 0, heightPx * 0.36)
        place(vRHip, heightPx * 0.09, 0, heightPx * 0.36)
        place(vLF, -heightPx * 0.1, legFwd, heightPx * 0.02)
        place(vRF, heightPx * 0.1, -legFwd, heightPx * 0.02)

        dummy.position.copy(vGnd)
        dummy.quaternion.identity()
        dummy.scale.set(SHADOW_R_PX * radiusScale, SHADOW_R_PX * 0.42 * radiusScale, 1)
        dummy.updateMatrix()
        shadowMesh.setMatrixAt(i, dummy.matrix)

        dummy.position.copy(vHead)
        dummy.quaternion.identity()
        dummy.scale.setScalar(HEAD_R_PX * radiusScale)
        dummy.updateMatrix()
        headMesh.setMatrixAt(i, dummy.matrix)

        dummy.position.copy(vHair)
        dummy.quaternion.identity()
        dummy.scale.set(HAIR_R_PX * 1.04 * radiusScale, HAIR_R_PX * 0.72 * radiusScale, HAIR_R_PX * 0.5 * radiusScale)
        dummy.updateMatrix()
        hairMesh.setMatrixAt(i, dummy.matrix)

        placeLimb(torsoMesh, i, vPelvis, vChest, TORSO_R_PX * radiusScale)
        placeLimb(lArmMesh, i, vLS, vLH, LIMB_R_PX * radiusScale)
        placeLimb(rArmMesh, i, vRS, vRH, LIMB_R_PX * radiusScale)
        placeLimb(lLegMesh, i, vLHip, vLF, LIMB_R_PX * radiusScale)
        placeLimb(rLegMesh, i, vRHip, vRF, LIMB_R_PX * radiusScale)
        placeFoot(lFootMesh, i, vLF, FOOT_W_PX * radiusScale, legFwd)
        placeFoot(rFootMesh, i, vRF, FOOT_W_PX * radiusScale, -legFwd)
      }

      dummy.scale.setScalar(0)
      dummy.updateMatrix()
      for (let j = count; j < n; j++) for (const mesh of allMeshes) mesh.setMatrixAt(j, dummy.matrix)
      for (const mesh of allMeshes) mesh.instanceMatrix.needsUpdate = true

      renderer.render(scene, camera)
    }

    animate()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
    }
  }, [maxAgents, deckRef, agentSourceRef])

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 5 }}
    />
  )
}
