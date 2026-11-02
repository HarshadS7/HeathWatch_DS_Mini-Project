import { RoundedBox } from '@react-three/drei'
import type { SceneProps } from './types'
import { Eased, Island, PAL, Tag, softHeat } from '../three/Diorama'

interface Rec { id: number; date: string; t: number }

/* Merge sort / binary search as a terrain of temperature bars. Bars are keyed by reading id, so a write slides the bar to its new slot. */
export function SortScene({ trace, step, reduced }: SceneProps) {
  const cur = trace.steps[step]
  const arr = cur.state as Rec[]
  const v = cur.vars as Record<string, number>
  const search = cur.event.op === 'search'
  const lo = v.lo ?? 0
  const hi = v.hi ?? arr.length - 1
  const gap = Math.min(0.62, 7.4 / Math.max(1, arr.length))
  const x = (i: number) => (i - (arr.length - 1) / 2) * gap
  const minT = Math.min(...arr.map((r) => r.t)) - 1.5
  const h = (t: number) => 0.35 + (t - minT) * 0.32
  const focus = search ? v.mid : v.k
  const done = cur.event.type === 'merge_done' || cur.event.type === 'bs_found'

  return (
    <group position={[0, -0.9, 0]}>
      <Island radius={4.9} bob={!reduced} />
      {/* active sub-array slab */}
      {arr.length > 0 && cur.event.type !== 'init' && (
        <Eased to={[(x(lo) + x(hi)) / 2, 0.04, 0]} reduced={reduced}>
          <RoundedBox args={[(hi - lo) * gap + gap * 0.9, 0.08, 1.1]} radius={0.04}>
            <meshStandardMaterial color={done ? '#9fd3b6' : search ? PAL.sky : PAL.sage} transparent opacity={0.85} roughness={0.9} />
          </RoundedBox>
        </Eased>
      )}
      {arr.map((r, i) => {
        const out = search && (i < lo || i > hi)
        const isF = i === focus
        return (
          <Eased key={r.id} to={[x(i), 0, isF ? 0.35 : 0]} reduced={reduced}>
            <RoundedBox args={[gap * 0.72, h(r.t), gap * 0.72]} radius={Math.min(0.1, gap * 0.2)} position={[0, h(r.t) / 2 + 0.08, 0]} castShadow>
              <meshStandardMaterial color={out ? '#ddd6cb' : softHeat(r.t)} roughness={0.85} transparent opacity={out ? 0.5 : 1} emissive={isF ? PAL.amber : '#000'} emissiveIntensity={isF ? 0.35 : 0} />
            </RoundedBox>
            <Tag text={r.t.toFixed(1)} position={[0, h(r.t) + 0.32, 0]} size={0.12} bg={isF ? PAL.ink : '#fffdf8'} color={isF ? '#fff' : PAL.ink} bold={isF} />
            <Tag text={String(i)} position={[0, 0.12, 0.55]} size={0.1} bg={null} color="#a59a8a" />
          </Eased>
        )
      })}
      {search &&
        (['lo', 'mid', 'hi'] as const).map((k, j) =>
          v[k] != null && v[k] >= 0 && v[k] < arr.length ? (
            <Eased key={k} to={[x(v[k]), 0.2, -0.9]} reduced={reduced}>
              <Tag text={k} position={[0, 0, j === 1 ? -0.3 : 0]} size={0.15} bg={k === 'mid' ? PAL.amber : PAL.tealDeep} color="#fff" bold />
            </Eased>
          ) : null,
        )}
      <Tag text={search ? `binary search · target ${v.target}` : 'merge sort by temperature (stable)'} position={[0, 0.3, 2.4]} size={0.16} bold />
    </group>
  )
}
