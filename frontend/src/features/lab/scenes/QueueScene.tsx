import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { easing } from 'maath'
import { Color, type Group, type MeshStandardMaterial } from 'three'
import type { QueueSlot, QueueState, TraceStep } from '../../../lib/types'
import { Cloud, Island, Matte, PAL, PointerFlag, Tag, Tree, WeatherMast, softHeat } from '../three/Diorama'

/*
  Circular queue as a carousel of rounded slot pads on a floating island.
  - Readings are little temperature-tinted crates with a tag.
  - FRONT (teal) and REAR (amber) flags walk around the ring; crossing slot 0 = wraparound.
  - A producer chute (left) drops crates in; a consumer tray (right) receives dequeued ones.
  Everything is positioned from the CURRENT TRACE STEP only (layout(state, event)),
  and eased toward those targets each frame — so scrubbing backwards is exact.
*/

const RING_R = 2.35
const PRODUCER: [number, number, number] = [-3.3, 1.9, 1.6]
const CONSUMER: [number, number, number] = [3.25, 0.55, 1.75]

const slotAngle = (i: number, n: number) => Math.PI / 2 - (i / n) * Math.PI * 2 // clockwise from the back
const slotPos = (i: number, n: number, r = RING_R): [number, number, number] => {
  const a = slotAngle(i, n)
  return [Math.cos(a) * r, 0, -Math.sin(a) * r]
}

interface Placed {
  item: QueueSlot
  target: [number, number, number]
  mood: 'resting' | 'arriving' | 'rejected' | 'reading' | 'leaving'
}

function layout(step: TraceStep<QueueState>): Placed[] {
  const s = step.state
  const n = s.capacity
  const ev = step.event
  const out: Placed[] = []
  s.slots.forEach((it, i) => {
    if (!it) return
    const [x, , z] = slotPos(i, n)
    const reading = ev.type === 'read' && ev.slot === i
    out.push({ item: it, target: [x, reading ? 1.15 : 0.42, z], mood: reading ? 'reading' : 'resting' })
  })
  // the item being enqueued waits at the producer chute until written
  const evItem = ev.item as QueueSlot | undefined
  if (evItem && (ev.type === 'call' || ev.type === 'check') && ev.op === 'enqueue') {
    out.push({ item: evItem, target: PRODUCER, mood: 'arriving' })
  }
  if (evItem && ev.type === 'reject_full') out.push({ item: evItem, target: [PRODUCER[0] - 0.4, 0.42, PRODUCER[2] + 0.9], mood: 'rejected' })
  // a dequeued crate travels to the consumer tray (the engine includes the item on every dequeue step after the read)
  if (evItem && ev.op === 'dequeue' && ['clear', 'advance_front', 'wrap', 'count'].includes(ev.type)) {
    out.push({ item: evItem, target: CONSUMER, mood: 'leaving' })
  }
  return out
}

function Crate({ p, reduced }: { p: Placed; reduced: boolean }) {
  const g = useRef<Group>(null)
  const mat = useRef<MeshStandardMaterial>(null)
  const invalidate = useThree((s) => s.invalidate)
  const base = useMemo(() => new Color(softHeat(p.item.temperatureC)), [p.item.temperatureC])
  const first = useRef(true)

  useFrame((state, dt) => {
    if (!g.current) return
    if (first.current) {
      // spawn above the target so new crates "drop in"
      g.current.position.set(p.target[0], p.target[1] + (p.mood === 'arriving' ? 0.8 : 2.2), p.target[2])
      first.current = false
    }
    const t = p.target
    if (reduced) g.current.position.set(t[0], t[1], t[2])
    else easing.damp3(g.current.position, t, 0.22, dt)
    const shake = p.mood === 'rejected' && !reduced ? Math.sin(state.clock.elapsedTime * 28) * 0.06 : 0
    g.current.rotation.z = shake
    const s = p.mood === 'reading' ? 1.12 : 1
    easing.damp3(g.current.scale, [s, s, s], 0.15, dt)
    if (mat.current) {
      const target = p.mood === 'rejected' ? new Color('#c9c4bb') : base
      easing.dampC(mat.current.color, target, 0.2, dt)
    }
    invalidate()
  })

  return (
    <group ref={g}>
      <RoundedBox args={[0.62, 0.5, 0.62]} radius={0.12} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial ref={mat} color={base} roughness={0.85} />
      </RoundedBox>
      {/* little lid band */}
      <RoundedBox args={[0.66, 0.08, 0.66]} radius={0.04} position={[0, 0.2, 0]}>
        <Matte color="#fff7ec" />
      </RoundedBox>
      <Tag
        text={`${p.item.stationId} ${p.item.temperatureC.toFixed(1)}°`}
        position={[0, 0.62, 0]}
        size={0.15}
        bg={p.mood === 'rejected' ? '#ffe1d6' : '#fffdf8'}
        color={p.mood === 'rejected' ? '#b4381e' : PAL.ink}
        bold
      />
      {p.mood === 'rejected' && <Tag text="REJECTED · queue full" position={[0, 1.0, 0]} size={0.14} bg="#d9573b" color="#fff" bold />}
    </group>
  )
}

function SlotPad({ i, n, active, filled }: { i: number; n: number; active: boolean; filled: boolean }) {
  const [x, , z] = slotPos(i, n)
  const a = slotAngle(i, n)
  const mat = useRef<MeshStandardMaterial>(null)
  useFrame((_, dt) => {
    if (!mat.current) return
    easing.dampC(mat.current.emissive, active ? new Color(PAL.teal) : new Color('#000000'), 0.15, dt)
  })
  return (
    <group position={[x, 0.06, z]} rotation={[0, a, 0]}>
      <RoundedBox args={[0.86, 0.12, 0.86]} radius={0.06} smoothness={4} receiveShadow castShadow>
        <meshStandardMaterial ref={mat} color={filled ? PAL.sand : '#f3ece1'} roughness={0.9} emissive="#000" emissiveIntensity={0.55} />
      </RoundedBox>
      <Tag text={String(i)} position={[Math.cos(0) * 0.0, 0.14, 0]} size={0.13} bg={null} color="#a59a8a" />
    </group>
  )
}

function Flag({ index, n, label, color, radius, reduced }: { index: number; n: number; label: string; color: string; radius: number; reduced: boolean }) {
  const g = useRef<Group>(null)
  const angle = useRef(slotAngle(index, n))
  const invalidate = useThree((s) => s.invalidate)
  useFrame((_, dt) => {
    if (!g.current) return
    // unwrap so the flag always walks forward (clockwise) around the ring, even across slot 0
    let target = slotAngle(index, n)
    while (target > angle.current + 1e-6) target -= Math.PI * 2
    while (target < angle.current - Math.PI * 2 + 1e-6) target += Math.PI * 2
    if (reduced) angle.current = target
    else {
      const k = 1 - Math.exp(-dt * 7)
      angle.current += (target - angle.current) * k
    }
    g.current.position.set(Math.cos(angle.current) * radius, 0, -Math.sin(angle.current) * radius)
    invalidate()
  })
  return <PointerFlag label={label} color={color} groupRef={g} />
}

export function QueueScene({ step, reduced }: { step: TraceStep<QueueState>; reduced: boolean }) {
  const s = step.state
  const n = s.capacity
  const placed = layout(step)
  const active = typeof step.event.slot === 'number' ? (step.event.slot as number) : step.event.type === 'call' && step.event.op === 'enqueue' ? s.rear : -1
  const full = s.count === s.capacity

  return (
    <group position={[0, -0.4, 0]}>
      <Island radius={4.3} bob={!reduced}>
        {/* ring track */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]} receiveShadow>
          <ringGeometry args={[RING_R - 0.62, RING_R + 0.62, 96]} />
          <Matte color={full ? '#f7dccf' : '#f1e8da'} />
        </mesh>
        {Array.from({ length: n }, (_, i) => (
          <SlotPad key={i} i={i} n={n} active={i === active} filled={!!s.slots[i]} />
        ))}

        {/* centre hub showing count/capacity */}
        <group position={[0, 0, 0]}>
          <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.85, 0.95, 0.36, 48]} />
            <Matte color={full ? PAL.peach : PAL.sage} />
          </mesh>
          <Tag text={`${s.count} / ${s.capacity}`} position={[0, 0.85, 0]} size={0.26} bold />
          <Tag text={full ? 'FULL' : s.count === 0 ? 'EMPTY' : 'count'} position={[0, 0.5, 0]} size={0.13} bg={full ? PAL.heat : null} color={full ? '#fff' : '#8b8173'} bold={full} />
        </group>

        <Flag index={s.front} n={n} label="FRONT" color={PAL.tealDeep} radius={RING_R + 1.02} reduced={reduced} />
        <Flag index={s.rear} n={n} label="REAR" color="#e39b2d" radius={RING_R - 1.0} reduced={reduced} />

        {/* producer chute + consumer tray */}
        <group position={[PRODUCER[0], 0, PRODUCER[2]]}>
          <RoundedBox args={[0.9, 1.3, 0.9]} radius={0.16} position={[0, 0.65, 0]} castShadow receiveShadow>
            <Matte color={PAL.sky} />
          </RoundedBox>
          <Tag text="replay producer" position={[0, 1.55, 0.6]} size={0.13} />
        </group>
        <group position={[CONSUMER[0], 0, CONSUMER[2]]}>
          <RoundedBox args={[1.1, 0.22, 1.1]} radius={0.08} position={[0, 0.11, 0]} castShadow receiveShadow>
            <Matte color={PAL.sage} />
          </RoundedBox>
          <Tag text="consumer → BST / list" position={[0, 1.2, 0.5]} size={0.13} />
        </group>

        <WeatherMast position={[-1.4, 0, -3.4]} spin={!reduced} />
        <Tree position={[2.6, 0, -2.9]} scale={0.9} />
        <Tree position={[3.5, 0, -1.6]} scale={0.65} color={PAL.sageDeep} />
        <Tree position={[-3.6, 0, -1.2]} scale={0.7} />
      </Island>

      {placed.map((p) => (
        <Crate key={p.item.id} p={p} reduced={reduced} />
      ))}

      {!reduced && (
        <>
          <Cloud position={[-3.5, 3.4, -3]} />
          <Cloud position={[3.8, 3.0, -2.2]} speed={0.1} />
        </>
      )}
    </group>
  )
}
