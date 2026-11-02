import { useEffect, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Html, Lightformer, OrbitControls, RoundedBox } from '@react-three/drei'
import type { Group, Mesh } from 'three'
import { easing } from 'maath'
import { mix } from '../../../lib/bands'
import { useLabView } from '../player'

/* ----------------------------------------------------------------------------
   "Cosy diorama" kit — soft pastel, rounded, matte, toy-like.
   Art reference: Bruno Simon, My Room in 3D (github.com/brunosimon/my-room-in-3d)
   ---------------------------------------------------------------------------- */

export const PAL = {
  cream: '#fbf6ee',
  sand: '#efe3cf',
  sandDeep: '#e2d2b8',
  sage: '#b9d3c2',
  sageDeep: '#8fb9a2',
  teal: '#5fb3a6',
  tealDeep: '#2f8f83',
  sky: '#a9cfe6',
  peach: '#f6c3a3',
  coral: '#ef8f6b',
  heat: '#d9573b',
  amber: '#f2b84b',
  ink: '#3b3a36',
  bark: '#b98a64',
}

/** Matte "clay" material shortcut. */
export function Matte({ color, emissive, emissiveIntensity = 0 }: { color: string; emissive?: string; emissiveIntensity?: number }) {
  return <meshStandardMaterial color={color} roughness={0.92} metalness={0} emissive={emissive ?? '#000'} emissiveIntensity={emissiveIntensity} />
}

/** Lights + soft environment. Warm key, cool fill, soft shadows. */
export function DioramaLights({ night = false }: { night?: boolean }) {
  return (
    <>
      <hemisphereLight args={[night ? '#5b6b9a' : '#fff6e8', night ? '#1a1f33' : '#c9d6dd', night ? 0.7 : 1.35]} />
      <directionalLight
        position={[6, 10, 4]}
        intensity={night ? 1.1 : 2.4}
        color={night ? '#ffd9a8' : '#fff1dc'}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        shadow-radius={6}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <directionalLight position={[-6, 4, -5]} intensity={night ? 0.25 : 0.45} color={night ? '#7d93ff' : '#cfe3ff'} />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={night ? 0.6 : 1.6} position={[0, 5, -6]} scale={[10, 4, 1]} color={night ? '#8fa2ff' : '#ffffff'} />
        <Lightformer form="circle" intensity={night ? 0.4 : 1.2} position={[6, 3, 4]} scale={3} color="#ffe2c4" />
      </Environment>
    </>
  )
}

/** The floating island every structure sits on: a soft two-tone rounded slab. */
export function Island({ radius = 4.2, children, bob = true }: { radius?: number; children?: ReactNode; bob?: boolean }) {
  const g = useRef<Group>(null)
  useFrame(({ clock }) => {
    if (!bob || !g.current) return
    g.current.position.y = Math.sin(clock.elapsedTime * 0.8) * 0.06
  })
  return (
    <group ref={g}>
      {/* grass/cream top */}
      <mesh position={[0, -0.12, 0]} receiveShadow>
        <cylinderGeometry args={[radius, radius, 0.24, 72]} />
        <Matte color={PAL.cream} />
      </mesh>
      {/* soft rim */}
      <mesh position={[0, -0.24, 0]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <torusGeometry args={[radius, 0.12, 16, 96]} />
        <Matte color={PAL.sand} />
      </mesh>
      {/* earthy underside */}
      <mesh position={[0, -0.75, 0]} castShadow>
        <cylinderGeometry args={[radius - 0.05, radius * 0.72, 0.9, 72]} />
        <Matte color={PAL.sandDeep} />
      </mesh>
      {children}
    </group>
  )
}

/** Small cute tree: trunk + two stacked blobs. */
export function Tree({ position, scale = 1, color = PAL.sage }: { position: [number, number, number]; scale?: number; color?: string }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.07, 0.1, 0.5, 12]} />
        <Matte color={PAL.bark} />
      </mesh>
      <mesh position={[0, 0.72, 0]} castShadow>
        <sphereGeometry args={[0.34, 24, 24]} />
        <Matte color={color} />
      </mesh>
      <mesh position={[0.1, 1.02, 0.04]} castShadow>
        <sphereGeometry args={[0.22, 24, 24]} />
        <Matte color={PAL.sageDeep} />
      </mesh>
    </group>
  )
}

/** Weather mast with a spinning cup anemometer and a little thermometer — ties every diorama to the heat theme. */
export function WeatherMast({ position, spin = true }: { position: [number, number, number]; spin?: boolean }) {
  const cups = useRef<Group>(null)
  useFrame((_, dt) => {
    if (spin && cups.current) cups.current.rotation.y += dt * 2.2
  })
  return (
    <group position={position}>
      <mesh position={[0, 0.06, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.28, 0.32, 0.12, 24]} />
        <Matte color={PAL.sand} />
      </mesh>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.045, 1.7, 12]} />
        <Matte color="#e9e4dc" />
      </mesh>
      <group ref={cups} position={[0, 1.78, 0]}>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2
          return (
            <group key={i} rotation={[0, a, 0]}>
              <mesh position={[0.22, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.012, 0.012, 0.44, 8]} />
                <Matte color="#e9e4dc" />
              </mesh>
              <mesh position={[0.44, 0, 0]}>
                <sphereGeometry args={[0.075, 16, 16, 0, Math.PI]} />
                <Matte color={PAL.coral} />
              </mesh>
            </group>
          )
        })}
      </group>
      {/* thermometer */}
      <group position={[0.16, 0.85, 0.06]}>
        <RoundedBox args={[0.1, 0.5, 0.06]} radius={0.04} castShadow>
          <Matte color="#fffaf3" />
        </RoundedBox>
        <mesh position={[0, -0.24, 0.02]}>
          <sphereGeometry args={[0.055, 16, 16]} />
          <Matte color={PAL.heat} emissive={PAL.heat} emissiveIntensity={0.25} />
        </mesh>
        <mesh position={[0, -0.04, 0.035]}>
          <boxGeometry args={[0.025, 0.36, 0.01]} />
          <Matte color={PAL.heat} />
        </mesh>
      </group>
    </group>
  )
}

/** Label pinned to a 3D point, drawn as a DOM pill (always crisp and legible, no font download). */
export function Tag({
  text,
  position,
  color = PAL.ink,
  bg = '#fffdf8',
  size = 0.2,
  bold = false,
}: {
  text: string
  position: [number, number, number]
  color?: string
  bg?: string | null
  size?: number
  bold?: boolean
}) {
  return (
    <Html position={position} center zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <span
        style={{
          display: 'inline-block',
          whiteSpace: 'nowrap',
          font: `${bold ? 700 : 500} ${Math.round(Math.max(10, size * 78))}px "Inter Variable", system-ui, sans-serif`,
          color,
          background: bg ?? 'transparent',
          padding: bg ? '2px 8px' : 0,
          borderRadius: 999,
          boxShadow: bg ? '0 2px 8px rgba(60, 45, 30, 0.12)' : 'none',
          textShadow: bg ? 'none' : '0 1px 0 rgba(255,255,255,0.7)',
        }}
      >
        {text}
      </span>
    </Html>
  )
}

/** Pointer flag (FRONT / REAR / HEAD / CUR …): a soft pin with a pennant and a label. */
export function PointerFlag({ label, color, groupRef }: { label: string; color: string; groupRef?: React.Ref<Group> }) {
  return (
    <group ref={groupRef}>
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 1.1, 10]} />
        <Matte color="#efe8dd" />
      </mesh>
      <mesh position={[0, 1.12, 0]} castShadow>
        <sphereGeometry args={[0.09, 16, 16]} />
        <Matte color={color} />
      </mesh>
      <RoundedBox args={[0.5, 0.3, 0.05]} radius={0.06} position={[0.28, 0.92, 0]} castShadow>
        <Matte color={color} />
      </RoundedBox>
      <mesh position={[0, 0.03, 0]} receiveShadow>
        <cylinderGeometry args={[0.16, 0.2, 0.06, 20]} />
        <Matte color={color} />
      </mesh>
      <Tag text={label} position={[0, 1.5, 0]} color="#fff" bg={color} size={0.17} bold />
    </group>
  )
}

/** Gentle constrained orbit — the dollhouse view. */
export function DollhouseControls() {
  return (
    <OrbitControls
      makeDefault
      enablePan
      screenSpacePanning
      enableZoom={false} // plain wheel steps through the trace; zoom is ctrl/pinch/buttons (see ZoomSync)
      minPolarAngle={Math.PI * 0.18}
      maxPolarAngle={Math.PI * 0.38}
      minAzimuthAngle={-Math.PI * 0.12}
      maxAzimuthAngle={Math.PI * 0.5}
      enableDamping
      dampingFactor={0.08}
    />
  )
}

/** Tiny decorative clouds drifting around the island. */
export function Cloud({ position, speed = 0.15 }: { position: [number, number, number]; speed?: number }) {
  const g = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (g.current) g.current.position.x = position[0] + Math.sin(clock.elapsedTime * speed) * 0.6
  })
  return (
    <mesh ref={g} position={position}>
      <sphereGeometry args={[0.32, 20, 20]} />
      <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.85} />
      <mesh position={[0.32, -0.05, 0]}>
        <sphereGeometry args={[0.24, 20, 20]} />
        <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.85} />
      </mesh>
      <mesh position={[-0.3, -0.07, 0.05]}>
        <sphereGeometry args={[0.2, 20, 20]} />
        <meshStandardMaterial color="#ffffff" roughness={1} transparent opacity={0.85} />
      </mesh>
    </mesh>
  )
}

/** Group that eases toward `to` every frame (snaps under reduced motion). Key children by stable ids. */
export function Eased({ to, children, reduced, from }: { to: [number, number, number]; children: ReactNode; reduced?: boolean; from?: [number, number, number] }) {
  const g = useRef<Group>(null)
  const init = useRef(false)
  useFrame((_, dt) => {
    if (!g.current) return
    if (!init.current) {
      g.current.position.set(...(from ?? to))
      init.current = true
    }
    if (reduced) g.current.position.set(...to)
    else easing.damp3(g.current.position, to, 0.2, dt)
  })
  return <group ref={g}>{children}</group>
}

/** Flat arrow on/above the floor from a to b (shaft + cone head). */
export function Arrow3D({ from, to, color = PAL.ink, y = 0.3, thick = 0.035 }: { from: [number, number]; to: [number, number]; color?: string; y?: number; thick?: number }) {
  const dx = to[0] - from[0]
  const dz = to[1] - from[1]
  const len = Math.hypot(dx, dz)
  if (len < 0.01) return null
  const ang = Math.atan2(dx, dz)
  return (
    <group position={[from[0], y, from[1]]} rotation={[0, ang, 0]}>
      <mesh position={[0, 0, (len - 0.18) / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[thick, thick, len - 0.18, 10]} />
        <Matte color={color} />
      </mesh>
      <mesh position={[0, 0, len - 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[thick * 3.2, 0.2, 14]} />
        <Matte color={color} />
      </mesh>
    </group>
  )
}

/** Soft pastel heat ramp for the dioramas (cream → peach → coral → brick), 25–47 °C. Exact values are always on the labels. */
const SOFT = ['#fdf0d5', '#f9d9a9', '#f6b98a', '#ef8f6b', '#e06a4c', '#c4482f']
export function softHeat(t: number) {
  const x = Math.min(1, Math.max(0, (t - 25) / 22)) * (SOFT.length - 1)
  const i = Math.min(SOFT.length - 2, Math.floor(x))
  return mix(SOFT[i], SOFT[i + 1], x - i)
}

/** Applies the Lab zoom factor to the orthographic camera smoothly; a reset also restores pan/rotation. */
export function ZoomSync({ base }: { base: number }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as { reset?: () => void } | null
  const zoom = useLabView((s) => s.zoom)
  const resets = useLabView((s) => s.resets)
  useEffect(() => {
    if (resets) controls?.reset?.()
  }, [resets, controls])
  useFrame((_, dt) => {
    const target = base * zoom
    if (Math.abs(camera.zoom - target) < 0.05) return
    camera.zoom += (target - camera.zoom) * (1 - Math.exp(-dt * 10))
    camera.updateProjectionMatrix()
  })
  return null
}
