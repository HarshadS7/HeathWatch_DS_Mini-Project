import { RoundedBox } from '@react-three/drei'
import type { SceneProps } from './types'
import { Arrow3D, Eased, Island, Matte, PAL, PointerFlag, Tag, Tree, WeatherMast, softHeat } from '../three/Diorama'

interface LNode { id: string; stationId: string; date: string; temperatureC: number; next: string | null }
interface LState { head: string | null; tail: string | null; size: number; limit: number; nodes: LNode[]; pending: LNode | null }

/* Linked list as a row of capsules joined by next-arrows; HEAD / TAIL flags; a new node hovers until linked. */
export function ListScene({ trace, step, reduced }: SceneProps) {
  const cur = trace.steps[step]
  const s = cur.state as LState
  const gap = 1.45
  const x0 = -((s.limit - 1) * gap) / 2
  const x = (i: number) => x0 + i * gap
  const pos = new Map(s.nodes.map((n, i) => [n.id, i]))
  const evicted = cur.event.type === 'evict' ? (cur.event.node as string) : null

  return (
    <group position={[0, -0.5, 0]}>
      <Island radius={4.8} bob={!reduced}>
        {/* track */}
        <RoundedBox args={[s.limit * gap + 0.4, 0.06, 1.3]} radius={0.03} position={[0, 0.03, 0]} receiveShadow>
          <Matte color="#f1e8da" />
        </RoundedBox>
        <WeatherMast position={[-3.2, 0, -2.6]} spin={!reduced} />
        <Tree position={[3.4, 0, -2.4]} scale={0.85} />
        <Tree position={[3.9, 0, 1.6]} scale={0.6} />
      </Island>

      {s.nodes.map((n) => (
        <Eased key={n.id} to={[x(pos.get(n.id)!), 0.45, 0]} from={[x(pos.get(n.id)!), 1.6, 0]} reduced={reduced}>
          <RoundedBox args={[0.95, 0.55, 0.7]} radius={0.24} smoothness={5} castShadow>
            <meshStandardMaterial color={softHeat(n.temperatureC)} roughness={0.85} />
          </RoundedBox>
          <Tag text={`${n.temperatureC.toFixed(1)}° · ${n.date.slice(5)}`} position={[0, 0.62, 0]} size={0.14} bold />
        </Eased>
      ))}
      {s.nodes.map((n, i) => (n.next ? <Arrow3D key={'a' + n.id} from={[x(i) + 0.5, 0]} to={[x(i + 1) - 0.5, 0]} y={0.45} color={PAL.tealDeep} /> : null))}
      {s.nodes.length > 0 && <Tag text="null" position={[x(s.nodes.length - 1) + 0.85, 0.45, 0]} size={0.12} bg={null} color="#a59a8a" />}

      {s.pending && (
        <Eased key={'p' + s.pending.id} to={[x(Math.min(s.nodes.length, s.limit - 1)) + 0.4, 1.7, 0.6]} reduced={reduced}>
          <RoundedBox args={[0.95, 0.55, 0.7]} radius={0.24} smoothness={5} castShadow>
            <meshStandardMaterial color={softHeat(s.pending.temperatureC)} roughness={0.85} transparent opacity={0.85} />
          </RoundedBox>
          <Tag text="new node" position={[0, 0.62, 0]} size={0.13} bg={PAL.teal} color="#fff" bold />
        </Eased>
      )}
      {evicted && <Tag text="oldest removed ↓" position={[x(0) - 0.6, 1.5, 0.8]} size={0.14} bg={PAL.heat} color="#fff" bold />}

      {s.head && (
        <Eased to={[x(pos.get(s.head) ?? 0) - 0.15, 0, -0.95]} reduced={reduced}>
          <PointerFlag label="HEAD" color={PAL.tealDeep} />
        </Eased>
      )}
      {s.tail && (
        <Eased to={[x(pos.get(s.tail) ?? 0) + 0.15, 0, 0.95]} reduced={reduced}>
          <PointerFlag label="TAIL" color="#e39b2d" />
        </Eased>
      )}
    </group>
  )
}
