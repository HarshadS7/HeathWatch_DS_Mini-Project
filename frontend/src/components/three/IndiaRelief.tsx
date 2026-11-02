import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { easing } from 'maath'
import { ExtrudeGeometry, Path, Shape, Vector2, type Group } from 'three'
import states from '../../assets/geo/states.json'

/*
  India as flat-topped state slabs separated by narrow sunken valleys.
  Each state is extruded separately with an INWARD bevel (bevelOffset = -bevelSize): its top face is
  inset slightly and its sides slope out to the true border, so neighbouring states form a small V-valley.
*/
export const K = 0.25 // world units per degree
export const proj = (lon: number, lat: number): [number, number] => [(lon - 80.5) * K, -(lat - 22.5) * K]
const DEPTH = 0.3
const BEVEL = 0.034
export const RELIEF_TOP = DEPTH + BEVEL // y of the flat tops

interface StateGeo {
  index: number
  name: string
  geometry: ExtrudeGeometry
  rings: [number, number][][] // outer rings in lon/lat, for point-in-state tests
}

const ringArea = (r: Vector2[]) => Math.abs(r.reduce((a, p, i) => a + p.x * r[(i + 1) % r.length].y - r[(i + 1) % r.length].x * p.y, 0)) / 2

export const STATES: StateGeo[] = (states as unknown as { features: { properties: { ST_NM: string }; geometry: { coordinates: number[][][][] } }[] }).features.map((f, index) => {
  const shapes: Shape[] = []
  const rings: [number, number][][] = []
  for (const poly of f.geometry.coordinates) {
    const toV = (ring: number[][]) => ring.map(([lon, lat]) => {
      const [x, z] = proj(lon, lat)
      return new Vector2(x, -z)
    })
    const outer = toV(poly[0])
    if (ringArea(outer) < 0.004) continue // drop specks (tiny islands) that a bevel would invert
    const shape = new Shape(outer)
    poly.slice(1).forEach((h) => shape.holes.push(new Path(toV(h))))
    shapes.push(shape)
    rings.push(poly[0] as [number, number][])
  }
  const geometry = new ExtrudeGeometry(shapes, { depth: DEPTH, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelOffset: -BEVEL, bevelSegments: 2, curveSegments: 1 })
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, BEVEL, 0)
  return { index, name: f.properties.ST_NM, geometry, rings }
})

function inRing(lon: number, lat: number, ring: [number, number][]) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
export const stateAt = (lon: number, lat: number) => STATES.find((s) => s.rings.some((r) => inRing(lon, lat, r)))

/** One state slab; `lift` raises it smoothly (hover pop). */
function StateSlab({ s, color, lift, onHover }: { s: StateGeo; color: string; lift: number; onHover?: (i: number | null) => void }) {
  const g = useRef<Group>(null)
  useFrame((_, dt) => {
    if (g.current) easing.damp(g.current.position, 'y', lift, 0.12, dt)
  })
  return (
    <group ref={g}>
      <mesh geometry={s.geometry} castShadow receiveShadow onPointerOver={onHover && ((e) => (e.stopPropagation(), onHover(s.index)))} onPointerOut={onHover && (() => onHover(null))}>
        <meshStandardMaterial color={color} roughness={0.92} metalness={0} />
      </mesh>
    </group>
  )
}

/** Invisible ground that only shows the map's soft shadow (keep it outside <Bounds>). */
export function ReliefGround() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.002, 0]} receiveShadow>
      <circleGeometry args={[6.2, 64]} />
      <shadowMaterial transparent opacity={0.12} />
    </mesh>
  )
}

export function IndiaRelief({ colorOf, liftOf, onHoverState }: { colorOf: (i: number) => string; liftOf?: (i: number) => number; onHoverState?: (i: number | null) => void }) {
  return (
    <group>
      {STATES.map((s) => (
        <StateSlab key={s.index} s={s} color={colorOf(s.index)} lift={liftOf?.(s.index) ?? 0} onHover={onHoverState} />
      ))}
    </group>
  )
}
