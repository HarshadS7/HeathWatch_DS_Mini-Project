import { RoundedBox } from '@react-three/drei'
import type { SceneProps } from './types'
import { Eased, Island, Matte, PAL, Tag } from '../three/Diorama'

interface SState { phase: 'postfix' | 'eval'; tokens: string[]; pos: number; ops: string[]; output: string[]; values: number[] }

const DISC = 0.34

function Tube({ x, label, items, color, reduced }: { x: number; label: string; items: string[]; color: string; reduced: boolean }) {
  return (
    <group position={[x, 0, -0.2]}>
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[0.62, 0.68, 0.12, 40]} />
        <Matte color={PAL.sand} />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 2.9, 40, 1, true]} />
        <meshStandardMaterial color="#ffffff" transparent opacity={0.18} roughness={0.1} side={2} />
      </mesh>
      {items.map((t, i) => (
        <Eased key={i + t} to={[0, 0.3 + i * DISC, 0]} from={[0, 3.4, 0]} reduced={reduced}>
          <mesh castShadow>
            <cylinderGeometry args={[0.44, 0.44, DISC - 0.04, 36]} />
            <Matte color={i === items.length - 1 ? color : '#efe3cf'} />
          </mesh>
          <Tag text={t} position={[0, 0, 0.5]} size={0.15} bg={null} bold />
        </Eased>
      ))}
      <Tag text={label} position={[0, 3.25, 0]} size={0.15} bg={PAL.ink} color="#fff" bold />
      {items.length > 0 && <Tag text="top" position={[0.85, 0.3 + (items.length - 1) * DISC, 0]} size={0.11} bg={null} color="#8b8173" />}
    </group>
  )
}

/* Stack: operator stack and value stack as glass tubes of discs; token tape across the back, postfix tape in front. */
export function StackScene({ trace, step, reduced }: SceneProps) {
  const s = trace.steps[step].state as SState
  const tape = (items: string[], z: number, hi: number, title: string) => {
    const gap = Math.min(0.6, 7 / Math.max(1, items.length))
    return (
      <group position={[0, 0.25, z]}>
        <Tag text={title} position={[-((items.length - 1) * gap) / 2 - 1.1, 0.1, 0]} size={0.13} bg={null} color="#8b8173" bold />
        {items.map((t, i) => (
          <group key={i} position={[(i - (items.length - 1) / 2) * gap, i === hi ? 0.18 : 0, 0]}>
            <RoundedBox args={[gap * 0.85, 0.3, 0.5]} radius={0.08} castShadow>
              <Matte color={i === hi ? PAL.teal : i < hi ? '#e9e1d4' : '#fffaf3'} />
            </RoundedBox>
            <Tag text={t} position={[0, 0.3, 0]} size={0.14} bg={null} bold={i === hi} />
          </group>
        ))}
      </group>
    )
  }
  return (
    <group position={[0, -1.2, 0]}>
      <Island radius={4.8} bob={!reduced} />
      {tape(s.tokens, -2.5, s.pos, s.phase === 'eval' ? 'postfix' : 'input')}
      <Tube x={-1.6} label="operator stack" items={s.ops} color={PAL.coral} reduced={reduced} />
      <Tube x={1.6} label="value stack" items={s.values.map((v) => (Math.round(v * 10) / 10).toString())} color={PAL.sky} reduced={reduced} />
      {s.phase === 'postfix' && tape(s.output, 2.4, -1, 'output')}
      <Tag text={s.phase === 'postfix' ? 'phase 1 · infix → postfix' : 'phase 2 · evaluate postfix'} position={[0, 0.3, 3.4]} size={0.16} bold />
    </group>
  )
}
