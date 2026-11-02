import { Line } from '@react-three/drei'
import { seenUpTo, type SceneProps } from './types'
import { Eased, Island, Matte, PAL, Tag, Tree, softHeat } from '../three/Diorama'

interface BNode { id: string; key: string; t: number; l: string | null; r: string | null }
interface BState { root: string | null; size: number; height: number; nodes: BNode[] }

/*
  BST as a standing "mobile": in-order position across, depth downward.
  A chronological build visibly leans into a staircase (skew); a balanced rebuild is a compact triangle.
  Visited nodes glow teal, pruned subtrees fade, emitted nodes get a gold ring.
*/
export function BstScene({ trace, step, reduced }: SceneProps) {
  const s = trace.steps[step].state as BState
  const ev = trace.steps[step].event
  const byId = new Map(s.nodes.map((n) => [n.id, n]))

  // layout: in-order index -> x, depth -> y
  const order: string[] = []
  const depth = new Map<string, number>()
  const walk = (id: string | null, d: number) => {
    const n = id ? byId.get(id) : undefined
    if (!n) return
    walk(n.l, d + 1)
    depth.set(n.id, d)
    order.push(n.id)
    walk(n.r, d + 1)
  }
  walk(s.root, 0)
  const maxD = Math.max(0, ...depth.values())
  const dx = Math.min(0.6, 6.4 / Math.max(1, order.length - 1))
  const dy = Math.min(0.6, 3.4 / Math.max(1, maxD))
  const P = new Map(order.map((id, i) => [id, [(i - (order.length - 1) / 2) * dx, 4.1 - depth.get(id)! * dy, 0] as [number, number, number]]))

  const visited = new Set(seenUpTo(trace, step, 'visit').concat(seenUpTo(trace, step, 'go_left'), seenUpTo(trace, step, 'go_right'), seenUpTo(trace, step, 'found')))
  const emitted = new Set(seenUpTo(trace, step, 'emit'))
  const pruned = new Set<string>()
  const mark = (id: string | null) => {
    const n = id ? byId.get(id) : undefined
    if (!n) return
    pruned.add(n.id)
    mark(n.l)
    mark(n.r)
  }
  seenUpTo(trace, step, 'prune').forEach(mark)
  const active = ev.node as string | undefined

  return (
    <group position={[0, -2.3, 0]}>
      <Island radius={4.6} bob={!reduced}>
        <mesh position={[0, 0.3, -0.2]} castShadow>
          <cylinderGeometry args={[0.07, 0.1, 0.6, 12]} />
          <Matte color={PAL.bark} />
        </mesh>
        <Tree position={[-3.6, 0, -1.8]} scale={0.8} />
        <Tree position={[3.5, 0, 1.6]} scale={0.7} />
        <Tag text={`height ${s.height} · ${s.size} nodes · ideal ⌈log₂(n+1)⌉ = ${Math.ceil(Math.log2(s.size + 1))}`} position={[0, 0.35, 2.6]} size={0.17} bold />
      </Island>

      {s.nodes.map((n) =>
        [n.l, n.r].map((c) => {
          const a = P.get(n.id)
          const b = c ? P.get(c) : undefined
          if (!a || !b) return null
          const on = visited.has(n.id) && (visited.has(c!) || emitted.has(c!))
          return <Line key={n.id + c} points={[a, b]} color={pruned.has(c!) ? '#d8d0c4' : on ? PAL.tealDeep : '#bfb3a3'} lineWidth={on ? 3.2 : 1.6} />
        }),
      )}

      {s.nodes.map((n) => {
        const p = P.get(n.id)
        if (!p) return null
        const isActive = n.id === active
        const color = pruned.has(n.id) ? '#ddd6cb' : softHeat(n.t)
        return (
          <Eased key={n.id} to={[p[0], p[1], isActive ? 0.45 : visited.has(n.id) ? 0.2 : 0]} reduced={reduced}>
            <mesh castShadow scale={isActive ? 1.3 : 1}>
              <sphereGeometry args={[0.2, 28, 28]} />
              <meshStandardMaterial color={color} roughness={0.8} transparent opacity={pruned.has(n.id) ? 0.45 : 1} emissive={visited.has(n.id) ? PAL.teal : '#000'} emissiveIntensity={visited.has(n.id) ? 0.35 : 0} />
            </mesh>
            {(visited.has(n.id) || emitted.has(n.id)) && (
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.28, 0.035, 12, 40]} />
                <Matte color={emitted.has(n.id) ? '#e7b53f' : PAL.tealDeep} />
              </mesh>
            )}
            {isActive ? (
              <Tag text={`${n.key.slice(5)} · ${n.t.toFixed(1)}°`} position={[0, 0.5, 0]} size={0.15} bg={PAL.tealDeep} color="#fff" bold />
            ) : (
              <Tag text={n.key.slice(8)} position={[0, 0.34, 0]} size={0.11} bg={null} color={pruned.has(n.id) ? '#b8ad9d' : PAL.ink} />
            )}
          </Eased>
        )
      })}
    </group>
  )
}
