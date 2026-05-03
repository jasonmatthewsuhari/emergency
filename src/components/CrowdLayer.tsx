'use client'

import { useEffect, useRef } from 'react'
import type { DeckGLRef } from '@deck.gl/react'
import * as THREE from 'three'
import type { PedestrianAgent, WalkClip } from '@/types'

const LOOP_LENGTH_M = 14
const METERS_PER_LAT = 110540
const METERS_PER_LNG = 111320
const BODY_LEAN_SCALE = 0.24
const HEAD_LEAN_SCALE = 0.15
const BOB_SCALE = 0.96

const CYL_AXIS = new THREE.Vector3(0, 1, 0)

// PiP dimensions in CSS pixels
const PIP_W = 240
const PIP_H = 135
const PIP_GAP = 8
const PIP_MARGIN = 16

interface CrowdLayerProps {
  agents: PedestrianAgent[]
  walkClip: WalkClip | null
  deckRef: React.RefObject<DeckGLRef | null>
  elapsedSeconds: number
  maxAgents?: number
  focusedAgentIdx?: number
  onAgentCycle?: () => void
}

export default function CrowdLayer({
  agents,
  walkClip,
  deckRef,
  elapsedSeconds,
  maxAgents = 2000,
  focusedAgentIdx,
  onAgentCycle,
}: CrowdLayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const agentsRef = useRef(agents)
  const elapsedRef = useRef(elapsedSeconds)
  const walkClipRef = useRef(walkClip)
  const focusedAgentIdxRef = useRef(focusedAgentIdx)
  agentsRef.current = agents
  elapsedRef.current = elapsedSeconds
  walkClipRef.current = walkClip
  focusedAgentIdxRef.current = focusedAgentIdx

  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.Camera
    fpvCamera: THREE.PerspectiveCamera
    portraitCamera: THREE.PerspectiveCamera
    meshes: {
      shadow: THREE.InstancedMesh
      head: THREE.InstancedMesh
      torso: THREE.InstancedMesh
      leftArm: THREE.InstancedMesh
      rightArm: THREE.InstancedMesh
      leftLeg: THREE.InstancedMesh
      rightLeg: THREE.InstancedMesh
      carShadow: THREE.InstancedMesh
      carBody: THREE.InstancedMesh
      carCabin: THREE.InstancedMesh
      carWheelFrontLeft: THREE.InstancedMesh
      carWheelFrontRight: THREE.InstancedMesh
      carWheelRearLeft: THREE.InstancedMesh
      carWheelRearRight: THREE.InstancedMesh
    }
    dummy: THREE.Object3D
    vPelvis: THREE.Vector3
    vChest: THREE.Vector3
    vHead: THREE.Vector3
    vLShoulder: THREE.Vector3
    vRShoulder: THREE.Vector3
    vLHand: THREE.Vector3
    vRHand: THREE.Vector3
    vLHip: THREE.Vector3
    vRHip: THREE.Vector3
    vLFoot: THREE.Vector3
    vRFoot: THREE.Vector3
    vGround: THREE.Vector3
    vDir: THREE.Vector3
    vMid: THREE.Vector3
    vForward: THREE.Vector3
    vRight: THREE.Vector3
    vCarCenter: THREE.Vector3
    vCarCabin: THREE.Vector3
    vCarWheel: THREE.Vector3
    vBoxX: THREE.Vector3
    vBoxY: THREE.Vector3
    vBoxZ: THREE.Vector3
    // camera helpers — written by the focused-agent block, read by PiP render
    vFpvLookAt: THREE.Vector3
    vPortraitPos: THREE.Vector3
    vPortraitLookAt: THREE.Vector3
    vUpDir: THREE.Vector3
    vFocusedHead: THREE.Vector3  // saved before subsequent agents overwrite vHead
  } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: 'low-power',
    })
    renderer.shadowMap.enabled = false
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)

    const scene = new THREE.Scene()
    const camera = new THREE.Camera()
    camera.matrixAutoUpdate = false

    const fpvCamera = new THREE.PerspectiveCamera(80, PIP_W / PIP_H, 0.001, 100000)
    const portraitCamera = new THREE.PerspectiveCamera(55, PIP_W / PIP_H, 0.001, 100000)

    const n = maxAgents
    const skinMat   = new THREE.MeshBasicMaterial({ color: 0xffc994 })
    const shirtMat  = new THREE.MeshBasicMaterial({ color: 0x3091ff })
    const pantsMat  = new THREE.MeshBasicMaterial({ color: 0x050505 })
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x080c12, transparent: true, opacity: 0.4 })
    const carBodyMat = new THREE.MeshBasicMaterial({ color: 0xe84c3d })
    const carCabinMat = new THREE.MeshBasicMaterial({ color: 0x78c8f2 })
    const carWheelMat = new THREE.MeshBasicMaterial({ color: 0x11151c })

    const meshes = {
      shadow:   new THREE.InstancedMesh(new THREE.CylinderGeometry(2.16, 2.16, 0.05, 8), shadowMat, n),
      head:     new THREE.InstancedMesh(new THREE.SphereGeometry(0.84, 6, 4), skinMat, n),
      torso:    new THREE.InstancedMesh(new THREE.CylinderGeometry(0.39, 0.39, 1, 5), shirtMat, n),
      leftArm:  new THREE.InstancedMesh(new THREE.CylinderGeometry(0.255, 0.255, 1, 4), shirtMat, n),
      rightArm: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.255, 0.255, 1, 4), shirtMat, n),
      leftLeg:  new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.3, 1, 4), pantsMat, n),
      rightLeg: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.3, 1, 4), pantsMat, n),
      carShadow: new THREE.InstancedMesh(new THREE.CylinderGeometry(2.8, 2.8, 0.05, 8), shadowMat, n),
      carBody:   new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), carBodyMat, n),
      carCabin:  new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), carCabinMat, n),
      carWheelFrontLeft:  new THREE.InstancedMesh(new THREE.CylinderGeometry(0.48, 0.48, 0.42, 8), carWheelMat, n),
      carWheelFrontRight: new THREE.InstancedMesh(new THREE.CylinderGeometry(0.48, 0.48, 0.42, 8), carWheelMat, n),
      carWheelRearLeft:   new THREE.InstancedMesh(new THREE.CylinderGeometry(0.48, 0.48, 0.42, 8), carWheelMat, n),
      carWheelRearRight:  new THREE.InstancedMesh(new THREE.CylinderGeometry(0.48, 0.48, 0.42, 8), carWheelMat, n),
    }

    const dummy = new THREE.Object3D()
    dummy.scale.setScalar(0)
    dummy.updateMatrix()
    for (const mesh of Object.values(meshes)) {
      mesh.frustumCulled = false  // instances are far from origin in Deck.gl world space
      for (let i = 0; i < n; i++) mesh.setMatrixAt(i, dummy.matrix)
      mesh.instanceMatrix.needsUpdate = true
      scene.add(mesh)
    }

    const handleResize = () => {
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)
    }
    window.addEventListener('resize', handleResize)

    sceneRef.current = {
      renderer, scene, camera, fpvCamera, portraitCamera, meshes, dummy,
      vPelvis:    new THREE.Vector3(),
      vChest:     new THREE.Vector3(),
      vHead:      new THREE.Vector3(),
      vLShoulder: new THREE.Vector3(),
      vRShoulder: new THREE.Vector3(),
      vLHand:     new THREE.Vector3(),
      vRHand:     new THREE.Vector3(),
      vLHip:      new THREE.Vector3(),
      vRHip:      new THREE.Vector3(),
      vLFoot:     new THREE.Vector3(),
      vRFoot:     new THREE.Vector3(),
      vGround:    new THREE.Vector3(),
      vDir:       new THREE.Vector3(),
      vMid:       new THREE.Vector3(),
      vForward:   new THREE.Vector3(),
      vRight:     new THREE.Vector3(),
      vCarCenter: new THREE.Vector3(),
      vCarCabin:  new THREE.Vector3(),
      vCarWheel:  new THREE.Vector3(),
      vBoxX:      new THREE.Vector3(),
      vBoxY:      new THREE.Vector3(),
      vBoxZ:      new THREE.Vector3(),
      vFpvLookAt:      new THREE.Vector3(),
      vPortraitPos:    new THREE.Vector3(),
      vPortraitLookAt: new THREE.Vector3(),
      vUpDir:          new THREE.Vector3(),
      vFocusedHead:    new THREE.Vector3(),
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      renderer.dispose()
      sceneRef.current = null
    }
  }, [maxAgents])

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

      const clip = walkClipRef.current
      if (!clip) return

      const agents = agentsRef.current
      const elapsed = elapsedRef.current
      const focusedIdx = focusedAgentIdxRef.current

      s.camera.matrixWorldInverse.fromArray(vp.viewMatrix)
      s.camera.matrixWorld.copy(s.camera.matrixWorldInverse).invert()
      s.camera.projectionMatrix.fromArray(vp.projectionMatrix)
      s.camera.projectionMatrixInverse.copy(s.camera.projectionMatrix).invert()

      const { dummy, meshes } = s
      const { vPelvis, vChest, vHead, vLShoulder, vRShoulder, vLHand, vRHand,
              vLHip, vRHip, vLFoot, vRFoot, vGround, vDir, vMid,
              vForward, vRight, vCarCenter, vCarCabin, vCarWheel, vBoxX, vBoxY, vBoxZ,
              vFpvLookAt, vPortraitPos, vPortraitLookAt, vUpDir, vFocusedHead } = s

      const count = Math.min(agents.length, maxAgents)
      let hasPip = false
      dummy.scale.setScalar(0)
      dummy.position.set(0, 0, 0)
      dummy.quaternion.identity()
      dummy.updateMatrix()
      const hiddenMatrix = dummy.matrix

      for (let i = 0; i < count; i++) {
        const agent = agents[i]

        const frameIdx = Math.abs(
          Math.floor(
            ((elapsed * agent.speedMps + agent.phaseOffsetM) / clip.durationSeconds) * clip.frames.length
          ) % clip.frames.length
        )
        const frame = clip.frames[frameIdx]
        if (!frame) continue

        const loopOffset = ((elapsed * agent.speedMps + agent.phaseOffsetM) % LOOP_LENGTH_M) - LOOP_LENGTH_M / 2
        const bobM      = Math.max(0, frame.root[1] * BOB_SCALE)
        const bodyLean  = frame.bodyTilt * BODY_LEAN_SCALE
        const headLean  = frame.headTilt * HEAD_LEAN_SCALE

        const headingRad = agent.heading * Math.PI / 180
        const fwdEast  =  Math.sin(headingRad)
        const fwdNorth =  Math.cos(headingRad)
        const rightEast  =  Math.cos(headingRad)
        const rightNorth = -Math.sin(headingRad)
        const lngScale = METERS_PER_LNG * Math.cos(agent.position.lat * Math.PI / 180)

        const proj = (out: THREE.Vector3, rM: number, fM: number, altM: number) => {
          const east  = rightEast  * rM + fwdEast  * (fM + loopOffset)
          const north = rightNorth * rM + fwdNorth * (fM + loopOffset)
          const lng = agent.position.lng + east  / lngScale
          const lat = agent.position.lat + north / METERS_PER_LAT
          const [x, y, z] = vp.projectPosition([lng, lat, altM + bobM]) as [number, number, number]
          out.set(x, y, z)
        }

        proj(vPelvis,    0,     0,                                2.7)
        proj(vChest,     0,     bodyLean,                         5.16)
        proj(vHead,      0,     bodyLean + headLean,              6.42)
        proj(vLShoulder, -1.08, bodyLean,                         5.04)
        proj(vRShoulder,  1.08, bodyLean,                         5.04)
        proj(vLHand,     -1.32, Math.sin(frame.leftArm)  * 1.44,  2.94)
        proj(vRHand,      1.32, Math.sin(frame.rightArm) * 1.44,  2.94)
        proj(vLHip,      -0.6,  0,                                2.7)
        proj(vRHip,       0.6,  0,                                2.7)
        proj(vLFoot,     -0.66, Math.sin(frame.leftLeg)  * 1.74,  0.15)
        proj(vRFoot,      0.66, Math.sin(frame.rightLeg) * 1.74,  0.15)
        proj(vGround,    0,     0,                                0.09)

        const upDir = vDir.subVectors(vPelvis, vGround).normalize()

        const hideWalker = () => {
          meshes.shadow.setMatrixAt(i, hiddenMatrix)
          meshes.head.setMatrixAt(i, hiddenMatrix)
          meshes.torso.setMatrixAt(i, hiddenMatrix)
          meshes.leftArm.setMatrixAt(i, hiddenMatrix)
          meshes.rightArm.setMatrixAt(i, hiddenMatrix)
          meshes.leftLeg.setMatrixAt(i, hiddenMatrix)
          meshes.rightLeg.setMatrixAt(i, hiddenMatrix)
        }

        const hideCar = () => {
          meshes.carShadow.setMatrixAt(i, hiddenMatrix)
          meshes.carBody.setMatrixAt(i, hiddenMatrix)
          meshes.carCabin.setMatrixAt(i, hiddenMatrix)
          meshes.carWheelFrontLeft.setMatrixAt(i, hiddenMatrix)
          meshes.carWheelFrontRight.setMatrixAt(i, hiddenMatrix)
          meshes.carWheelRearLeft.setMatrixAt(i, hiddenMatrix)
          meshes.carWheelRearRight.setMatrixAt(i, hiddenMatrix)
        }

        if (agent.visual === 'car') {
          hideWalker()

          proj(vForward, 0, 1, 0.09)
          vForward.sub(vGround).normalize()
          proj(vRight, 1, 0, 0.09)
          vRight.sub(vGround).normalize()

          dummy.position.copy(vGround)
          dummy.quaternion.setFromUnitVectors(CYL_AXIS, upDir)
          dummy.scale.set(1.2, 1, 0.7)
          dummy.updateMatrix()
          meshes.carShadow.setMatrixAt(i, dummy.matrix)

          const placeCarBox = (
            mesh: THREE.InstancedMesh,
            center: THREE.Vector3,
            width: number,
            height: number,
            length: number,
          ) => {
            vBoxX.copy(vRight).multiplyScalar(width)
            vBoxY.copy(upDir).multiplyScalar(height)
            vBoxZ.copy(vForward).multiplyScalar(length)
            dummy.matrix.makeBasis(vBoxX, vBoxY, vBoxZ)
            dummy.matrix.setPosition(center)
            mesh.setMatrixAt(i, dummy.matrix)
          }

          const placeWheel = (mesh: THREE.InstancedMesh, rightM: number, forwardM: number) => {
            proj(vCarWheel, rightM, forwardM, 0.95)
            dummy.position.copy(vCarWheel)
            dummy.quaternion.setFromUnitVectors(CYL_AXIS, vRight)
            dummy.scale.set(1, 1, 1)
            dummy.updateMatrix()
            mesh.setMatrixAt(i, dummy.matrix)
          }

          proj(vCarCenter, 0, 0, 2.8)
          proj(vCarCabin, -0.18, -0.45, 5.0)
          placeCarBox(meshes.carBody, vCarCenter, 3.9, 2.35, 5.7)
          placeCarBox(meshes.carCabin, vCarCabin, 2.35, 2.15, 2.55)
          placeWheel(meshes.carWheelFrontLeft, -1.92, 1.72)
          placeWheel(meshes.carWheelFrontRight, 1.92, 1.72)
          placeWheel(meshes.carWheelRearLeft, -1.92, -1.72)
          placeWheel(meshes.carWheelRearRight, 1.92, -1.72)

          if (i === focusedIdx) {
            vUpDir.copy(upDir)
            vFocusedHead.copy(vCarCabin)
            proj(vFpvLookAt, 0, 3.4, 5.0)
            proj(vPortraitPos, 0, -6.2, 7.2)
            vPortraitLookAt.addVectors(vCarCenter, vCarCabin).multiplyScalar(0.5)
            hasPip = true
          }

          continue
        }

        hideCar()

        // Capture camera data for the focused agent before placeLimb overwrites vDir
        if (i === focusedIdx) {
          vUpDir.copy(upDir)
          vFocusedHead.copy(vHead)  // save before subsequent agents overwrite vHead
          // FPV: eye = head, look-at = 2m ahead at same eye level
          proj(vFpvLookAt, 0, bodyLean + headLean + 2, 6.42)
          // Portrait: camera 4m ahead, 1.5m above head height, looking back at torso/head
          proj(vPortraitPos, 0, bodyLean + headLean + 4, 6.42 + 1.5)
          vPortraitLookAt.addVectors(vHead, vChest).multiplyScalar(0.5)
          hasPip = true
        }

        dummy.position.copy(vGround)
        dummy.quaternion.setFromUnitVectors(CYL_AXIS, upDir)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        meshes.shadow.setMatrixAt(i, dummy.matrix)

        dummy.position.copy(vHead)
        dummy.quaternion.identity()
        dummy.scale.setScalar(1)
        dummy.updateMatrix()
        meshes.head.setMatrixAt(i, dummy.matrix)

        const placeLimb = (mesh: THREE.InstancedMesh, start: THREE.Vector3, end: THREE.Vector3) => {
          vDir.subVectors(end, start)
          const len = vDir.length()
          if (len < 0.0001) return
          vDir.divideScalar(len)

          vMid.addVectors(start, end).multiplyScalar(0.5)
          dummy.position.copy(vMid)

          const dot = vDir.dot(CYL_AXIS)
          if (dot < -0.9999) {
            dummy.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI)
          } else {
            dummy.quaternion.setFromUnitVectors(CYL_AXIS, vDir)
          }
          dummy.scale.set(1, len, 1)
          dummy.updateMatrix()
          mesh.setMatrixAt(i, dummy.matrix)
        }

        placeLimb(meshes.torso,    vPelvis,    vChest)
        placeLimb(meshes.leftArm,  vLShoulder, vLHand)
        placeLimb(meshes.rightArm, vRShoulder, vRHand)
        placeLimb(meshes.leftLeg,  vLHip,      vLFoot)
        placeLimb(meshes.rightLeg, vRHip,      vRFoot)
      }

      dummy.scale.setScalar(0)
      dummy.position.set(0, 0, 0)
      dummy.quaternion.identity()
      dummy.updateMatrix()
      for (const mesh of Object.values(meshes)) {
        for (let j = count; j < maxAgents; j++) mesh.setMatrixAt(j, dummy.matrix)
        mesh.instanceMatrix.needsUpdate = true
      }

      // --- Rendering ---
      // THREE.setViewport / setScissor take CSS pixel values; Three.js multiplies by pixelRatio internally.
      const canvas = canvasRef.current!
      const { renderer, scene, camera, fpvCamera, portraitCamera } = s
      const cw = canvas.clientWidth
      const ch = canvas.clientHeight

      if (hasPip) {
        // x in CSS pixels from left; y in CSS pixels from BOTTOM (WebGL origin)
        const px  = cw - PIP_W - PIP_MARGIN
        const py1 = PIP_MARGIN                    // portrait — lower on screen = lower WebGL y
        const py2 = PIP_MARGIN + PIP_H + PIP_GAP  // FPV — higher on screen = higher WebGL y

        // 1. Render main map overlay (full canvas, transparent background)
        renderer.autoClear = false
        renderer.setClearColor(0, 0)
        renderer.clear()
        renderer.setViewport(0, 0, cw, ch)
        renderer.render(scene, camera)

        renderer.setScissorTest(true)
        const meterScale = Math.max(vFpvLookAt.distanceTo(vFocusedHead) / 2, 0.01)
        const nearPlane = Math.max(meterScale * 0.2, 0.001)
        const farPlane  = meterScale * 4000

        // 2. Portrait (face cam) PiP — bottom slot
        renderer.setScissor(px, py1, PIP_W, PIP_H)
        renderer.setViewport(px, py1, PIP_W, PIP_H)
        renderer.clearDepth()
        renderer.setClearColor(0x080c14, 0.92)
        renderer.clearColor()

        portraitCamera.near = nearPlane
        portraitCamera.far  = farPlane
        portraitCamera.fov  = 55
        portraitCamera.aspect = PIP_W / PIP_H
        portraitCamera.updateProjectionMatrix()
        portraitCamera.position.copy(vPortraitPos)
        portraitCamera.up.copy(vUpDir)
        portraitCamera.lookAt(vPortraitLookAt)
        portraitCamera.updateMatrixWorld()
        renderer.render(scene, portraitCamera)

        // 3. FPV PiP — top slot
        renderer.setScissor(px, py2, PIP_W, PIP_H)
        renderer.setViewport(px, py2, PIP_W, PIP_H)
        renderer.clearDepth()
        renderer.clearColor()

        fpvCamera.near = nearPlane
        fpvCamera.far  = farPlane
        fpvCamera.fov  = 80
        fpvCamera.aspect = PIP_W / PIP_H
        fpvCamera.updateProjectionMatrix()
        fpvCamera.position.copy(vFocusedHead)
        fpvCamera.up.copy(vUpDir)
        fpvCamera.lookAt(vFpvLookAt)
        fpvCamera.updateMatrixWorld()
        renderer.render(scene, fpvCamera)

        renderer.setScissorTest(false)
        renderer.setClearColor(0, 0)
        renderer.setViewport(0, 0, cw, ch)
        renderer.autoClear = true

      } else {
        // Simple path: let Three.js auto-clear and render normally
        renderer.autoClear = true
        renderer.render(scene, camera)
      }
    }

    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showPip = focusedAgentIdx !== undefined && agents.length > 0

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
      {showPip && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {/* FPV PiP — upper slot */}
          <div style={{
            position: 'absolute',
            right: PIP_MARGIN,
            bottom: PIP_MARGIN + PIP_H + PIP_GAP,
            width: PIP_W,
            height: PIP_H,
            border: '1px solid rgba(73,145,255,0.45)',
            borderRadius: 3,
            pointerEvents: 'auto',
            cursor: 'pointer',
            boxShadow: '0 2px 16px rgba(0,0,0,0.6)',
          }}
            onClick={onAgentCycle}
          >
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              padding: '2px 7px',
              background: 'rgba(8,12,20,0.82)',
              color: 'rgba(130,185,255,0.9)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.12em',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              borderBottom: '1px solid rgba(73,145,255,0.3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>POV</span>
              <span style={{ opacity: 0.55 }}>#{(focusedAgentIdx ?? 0) + 1}</span>
            </div>
          </div>

          {/* Portrait (face cam) PiP — lower slot */}
          <div style={{
            position: 'absolute',
            right: PIP_MARGIN,
            bottom: PIP_MARGIN,
            width: PIP_W,
            height: PIP_H,
            border: '1px solid rgba(73,145,255,0.45)',
            borderRadius: 3,
            pointerEvents: 'auto',
            cursor: 'pointer',
            boxShadow: '0 2px 16px rgba(0,0,0,0.6)',
          }}
            onClick={onAgentCycle}
          >
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              padding: '2px 7px',
              background: 'rgba(8,12,20,0.82)',
              color: 'rgba(130,185,255,0.9)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.12em',
              fontFamily: 'monospace',
              textTransform: 'uppercase',
              borderBottom: '1px solid rgba(73,145,255,0.3)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>FACE CAM</span>
              <span style={{ opacity: 0.55, fontSize: 8 }}>CLICK TO CYCLE</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
