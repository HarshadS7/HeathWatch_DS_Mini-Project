import { Line } from '@react-three/drei'
import { seenUpTo, type SceneProps } from './types'
import { Eased, Matte, PAL, Tag } from '../three/Diorama'
import { useMemo, useState } from 'react'
import { IndiaRelief, proj, ReliefGround, RELIEF_TOP, stateAt } from '../../../components/three/IndiaRelief'

interface GState { visited: string[]; frontier: string[]; order: string[]; components: string[][] }

const COMP = ['#5fb3a6', '#ef8f6b', '#8e9be6', '#e7b53f', '#b98ac9']

/* Hot-region graph on a 3D India plate: pins at grid cells, hot ones tall; traversal lights pins and edges. */
export function GraphScene({ trace, step, graph }: SceneProps) {
  const [hover, setHover] = useState<string | null>(null)
  const stateOf = useMemo(() => new Map((graph?.stations ?? []).map((st) => [st.id, stateAt(st.lon, st.lat)])), [graph])
  if (!graph) return null
  const cur = trace.steps[step]
  const s = cur.state as GState
  const hot = new Set(graph.hot)
  const visited = new Set(s.visited)
  const frontier = new Set(s.frontier)
  const compOf = new Map<string, number>()
  s.components.forEach((c, i) => c.forEach((id) => compOf.set(id, i)))
  const explored = new Set(seenUpTo<string>(trace, step, 'explore_edge', 'u').map((u, i) => u + '|' + seenUpTo<string>(trace, step, 'explore_edge', 'v')[i]))
  const P = new Map(graph.stations.map((st) => [st.id, proj(st.lon, st.lat)]))
  const active = (cur.event.v as string) ?? null
  const orderIdx = new Map(s.order.map((id, i) => [id, i + 1]))
  const poppedState = hover ? stateOf.get(hover)?.index : undefined
  const LIFT = 0.3
  const liftOf = (id: string) => (poppedState != null && stateOf.get(id)?.index === poppedState ? LIFT : 0)

  return (
    <group position={[0, -0.7, 0.3]} rotation={[0, Math.PI / 4, 0]} scale={1.35}>
      <ReliefGround />
      <IndiaRelief colorOf={(i) => (i === poppedState ? '#f1e2c8' : '#ead9bd')} liftOf={(i) => (i === poppedState ? LIFT : 0)} />

      {graph.edges.map((e) => {
        const a = P.get(e.a)
        const b = P.get(e.b)
        if (!a || !b) return null
        const both = hot.has(e.a) && hot.has(e.b)
        const on = explored.has(e.a + '|' + e.b) || explored.has(e.b + '|' + e.a)
        return (
          <Line
            key={e.a + e.b}
            points={[[a[0], RELIEF_TOP + 0.05, a[1]], [(a[0] + b[0]) / 2, RELIEF_TOP + 0.3, (a[1] + b[1]) / 2], [b[0], RELIEF_TOP + 0.05, b[1]]]}
            color={on ? PAL.tealDeep : both ? PAL.coral : '#cfc6b8'}
            lineWidth={on ? 4 : both ? 2 : 1}
            dashed={!both}
            dashSize={0.12}
            gapSize={0.1}
          />
        )
      })}

      {graph.stations.map((st) => {
        const p = P.get(st.id)!
        const isHot = hot.has(st.id)
        const h = isHot ? 0.75 : 0.32
        const isVis = visited.has(st.id)
        const c = compOf.get(st.id)
        return (
          <Eased
            key={st.id}
            to={[p[0], RELIEF_TOP + liftOf(st.id), p[1]]}
          >
          <group
            onPointerOver={(e) => (e.stopPropagation(), setHover(st.id), (document.body.style.cursor = 'pointer'))}
            onPointerOut={() => (setHover(null), (document.body.style.cursor = ''))}
          >
            {c != null && (
              <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.36, 32]} />
                <meshStandardMaterial color={COMP[c % COMP.length]} transparent opacity={0.55} />
              </mesh>
            )}
            <mesh position={[0, h / 2, 0]} castShadow>
              <capsuleGeometry args={[isHot ? 0.12 : 0.07, h - 0.1, 6, 16]} />
              <meshStandardMaterial color={isHot ? (isVis ? PAL.heat : PAL.coral) : '#cfc6b8'} roughness={0.85} emissive={st.id === active ? PAL.amber : '#000'} emissiveIntensity={st.id === active ? 0.6 : 0} />
            </mesh>
            {frontier.has(st.id) && (
              <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.22, 0.04, 10, 32]} />
                <Matte color={PAL.amber} />
              </mesh>
            )}
            {isHot && <Tag text={orderIdx.has(st.id) ? `${orderIdx.get(st.id)} · ${st.id}` : st.id} position={[0, h + 0.3, 0]} size={0.14} bg={isVis ? PAL.tealDeep : '#fffdf8'} color={isVis ? '#fff' : PAL.ink} bold={isVis} />}
            {hover === st.id && (
              <Tag text={`${st.name} · ${stateOf.get(st.id)?.name ?? ''}`} position={[0, h + (isHot ? 0.62 : 0.4), 0]} size={0.15} bg={PAL.ink} color="#fff" bold />
            )}
          </group>
          </Eased>
        )
      })}
    </group>
  )
}
