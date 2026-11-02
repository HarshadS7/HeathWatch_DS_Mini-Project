import { RoundedBox } from '@react-three/drei'
import type { SceneProps } from './types'
import { Eased, Island, Matte, PAL, Tag } from '../three/Diorama'

interface HState { capacity: number; size: number; collisions: number; loadFactor: number; buckets: string[][] }

/* Hash table: a grid of bucket wells; each chain stacks upward, so collisions are literally taller columns. */
export function HashScene({ trace, step, reduced }: SceneProps) {
  const cur = trace.steps[step]
  const s = cur.state as HState
  const ev = cur.event
  const key = String(cur.vars.key ?? '')
  const bucket = typeof cur.vars.bucket === 'number' ? (cur.vars.bucket as number) : -1
  const pos = typeof ev.pos === 'number' ? (ev.pos as number) : -1
  const cols = 8
  const gap = 0.92
  const rows = Math.ceil(s.capacity / cols)
  const at = (i: number): [number, number, number] => [((i % cols) - (cols - 1) / 2) * gap, 0, (Math.floor(i / cols) - (rows - 1) / 2) * gap * 1.05]

  return (
    <group position={[0, -0.6, 0.2]}>
      <Island radius={5} bob={!reduced}>
        <Tag
          text={`${s.size} keys · ${s.capacity} buckets · load ${s.loadFactor.toFixed(2)} · ${s.collisions} collisions`}
          position={[0, 0.3, rows * gap * 0.55 + 0.9]}
          size={0.16}
          bold
        />
      </Island>
      {s.buckets.map((chain, i) => {
        const p = at(i)
        const isB = i === bucket
        return (
          <group key={i} position={p}>
            <RoundedBox args={[0.78, 0.14, 0.78]} radius={0.06} position={[0, 0.07, 0]} receiveShadow castShadow>
              <meshStandardMaterial color={isB ? PAL.teal : chain.length ? PAL.sand : '#f3ece1'} roughness={0.9} />
            </RoundedBox>
            <Tag text={String(i)} position={[0, 0.16, 0.48]} size={0.1} bg={null} color="#a59a8a" />
            {chain.map((k, j) => {
              const probed = isB && j <= pos
              const hit = probed && k === key && (ev.type === 'found' || j < pos)
              const color = hit ? '#7cc49b' : probed ? (j === pos ? PAL.amber : '#f2c6b1') : j > 0 ? PAL.peach : PAL.sky
              return (
                <group key={k} position={[0, 0.34 + j * 0.42, 0]}>
                  <RoundedBox args={[0.6, 0.34, 0.6]} radius={0.1} smoothness={4} castShadow>
                    <Matte color={color} />
                  </RoundedBox>
                  {(isB || chain.length > 1) && <Tag text={k} position={[0, 0.36, 0]} size={0.12} bold={isB} />}
                </group>
              )
            })}
          </group>
        )
      })}
      {key && (
        <Eased to={bucket >= 0 ? [at(bucket)[0], 2.6 + (s.buckets[bucket]?.length ?? 0) * 0.42, at(bucket)[2]] : [0, 3, -3]} from={[0, 3.4, -3]} reduced={reduced}>
          <RoundedBox args={[0.6, 0.6, 0.6]} radius={0.16} castShadow>
            <Matte color={ev.type === 'miss' ? '#c9c4bb' : PAL.coral} />
          </RoundedBox>
          <Tag text={`"${key}"`} position={[0, 0.6, 0]} size={0.16} bg={PAL.ink} color="#fff" bold />
        </Eased>
      )}
    </group>
  )
}
