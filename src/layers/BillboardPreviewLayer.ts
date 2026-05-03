import { IconLayer, PathLayer } from '@deck.gl/layers'
import { billboardShaderExtensions } from '@/layers/RealisticShaderExtension'
import type { BillboardMaterial, LatLng } from '@/types'

interface BillboardPreview {
  id: string
  position: [number, number, number]
  angle: number
  sizeMeters: number
}

interface BillboardSupport {
  id: string
  path: [number, number, number][]
}

const BILLBOARD_ICON = {
  url: '/billboard-creative.svg',
  width: 512,
  height: 192,
  anchorX: 256,
  anchorY: 214,
  mask: false,
}

const BILLBOARD_HALO_ICON = {
  url: '/billboard-halo.svg',
  width: 768,
  height: 360,
  anchorX: 384,
  anchorY: 224,
  mask: true,
}

function offsetPoint(origin: LatLng, eastMeters: number, northMeters: number): LatLng {
  const metersPerDegreeLat = 111_320
  const metersPerDegreeLng = metersPerDegreeLat * Math.cos(origin.lat * Math.PI / 180)

  return {
    lat: origin.lat + northMeters / metersPerDegreeLat,
    lng: origin.lng + eastMeters / metersPerDegreeLng,
  }
}

export function makeBillboardPreviewLayers(center: LatLng, material: BillboardMaterial = 'digital-day') {
  const face = offsetPoint(center, 72, 38)
  const leftPost = offsetPoint(face, -3.6, 0)
  const rightPost = offsetPoint(face, 3.6, 0)
  const billboard: BillboardPreview = {
    id: 'primary-preview',
    position: [face.lng, face.lat, 11],
    angle: -8,
    sizeMeters: 8.6,
  }
  const supports: BillboardSupport[] = [
    {
      id: 'left-post',
      path: [[leftPost.lng, leftPost.lat, 0], [leftPost.lng, leftPost.lat, 9.4]],
    },
    {
      id: 'right-post',
      path: [[rightPost.lng, rightPost.lat, 0], [rightPost.lng, rightPost.lat, 9.4]],
    },
  ]

  return [
    new PathLayer<BillboardSupport>({
      id: 'billboard-preview-supports',
      data: supports,
      getPath: support => support.path,
      getColor: [172, 178, 176, 210],
      getWidth: 0.42,
      widthUnits: 'meters',
      widthMinPixels: 1,
      pickable: false,
    }),
    ...(material === 'digital-night'
      ? [
          new IconLayer<BillboardPreview>({
            id: 'billboard-preview-night-halo',
            data: [billboard],
            billboard: true,
            sizeUnits: 'meters',
            sizeBasis: 'height',
            sizeMinPixels: 170,
            sizeMaxPixels: 390,
            alphaCutoff: 0.01,
            getPosition: item => item.position,
            getIcon: () => BILLBOARD_HALO_ICON,
            getAngle: item => item.angle,
            getSize: item => item.sizeMeters * 1.65,
            getColor: [118, 190, 255, 145],
            pickable: false,
          }),
        ]
      : []),
    new IconLayer<BillboardPreview>({
      id: 'billboard-preview-face',
      data: [billboard],
      billboard: true,
      sizeUnits: 'meters',
      sizeBasis: 'height',
      sizeMinPixels: 116,
      sizeMaxPixels: 260,
      alphaCutoff: 0.02,
      getPosition: item => item.position,
      getIcon: () => BILLBOARD_ICON,
      getAngle: item => item.angle,
      getSize: item => item.sizeMeters,
      getColor: [255, 255, 255, 255],
      pickable: false,
      extensions: [billboardShaderExtensions[material]],
    }),
  ]
}
