import { Suspense, useState } from 'react'
import { useIsDark } from '../../lib/useIsDark'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, Html, PerformanceMonitor } from '@react-three/drei'
import { NeutralToneMapping, PCFShadowMap } from 'three'
import type { QueueState, StructureKey, TraceStep } from '../../lib/types'
import { DioramaLights, DollhouseControls, ZoomSync } from './three/Diorama'
import { QueueScene } from './scenes/QueueScene'
import { ListScene } from './scenes/ListScene'
import { BstScene } from './scenes/BstScene'
import { HashScene } from './scenes/HashScene'
import { GraphScene } from './scenes/GraphScene'
import { SortScene } from './scenes/SortScene'
import { StackScene } from './scenes/StackScene'
import type { SceneProps } from './scenes/types'

const SCENES: Record<Exclude<StructureKey, 'queue'>, (p: SceneProps) => React.ReactNode> = {
  list: ListScene,
  bst: BstScene,
  hash: HashScene,
  graph: GraphScene,
  sort: SortScene,
  stack: StackScene,
}

/** The single WebGL canvas for the Lab (lazy-loaded so the dashboard never pays for three.js). */
export default function Stage({ structure, ...p }: SceneProps & { structure: StructureKey }) {
  const [dpr, setDpr] = useState(1.5)
  const night = useIsDark()

  const Scene = structure === 'queue' ? null : SCENES[structure]
  return (
    <Canvas
      style={{ position: 'absolute', inset: 0 }}
      orthographic
      shadows={{ type: PCFShadowMap }}
      dpr={dpr}
      frameloop={p.reduced ? 'demand' : 'always'}
      camera={{ position: [9, 8.2, 9], zoom: 70, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, toneMapping: NeutralToneMapping, toneMappingExposure: night ? 0.95 : 1.05 }}
      aria-label={`3D view of the ${structure} at the current trace step`}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)} flipflops={3} onFallback={() => setDpr(1)} />
      <AdaptiveDpr pixelated={false} />
      <DioramaLights night={night} />
      <ZoomSync base={70} />
      {/* sentinel: drei leaves the FIRST <Html> mounted in a canvas empty, so this absorbs it and every real label renders */}
      <Html position={[0, -100, 0]} />
      <Suspense fallback={null}>
        {Scene ? <Scene {...p} /> : <QueueScene step={p.trace.steps[p.step] as TraceStep<QueueState>} reduced={p.reduced} />}
      </Suspense>
      <DollhouseControls />
    </Canvas>
  )
}
