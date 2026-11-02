import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, PerformanceMonitor } from '@react-three/drei'
import { NeutralToneMapping, PCFSoftShadowMap } from 'three'
import type { QueueState, StructureKey, TraceStep } from '../../lib/types'
import { DioramaLights, DollhouseControls } from './three/Diorama'
import { QueueScene } from './scenes/QueueScene'

/** The single WebGL canvas for the Lab (lazy-loaded so the dashboard never pays for three.js). */
export default function Stage({ structure, step, reduced }: { structure: StructureKey; step: TraceStep; reduced: boolean }) {
  const [dpr, setDpr] = useState(1.5)
  const [night, setNight] = useState(() => document.documentElement.dataset.theme === 'dark')

  useEffect(() => {
    const obs = new MutationObserver(() => setNight(document.documentElement.dataset.theme === 'dark'))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])

  return (
    <Canvas
      style={{ position: 'absolute', inset: 0 }}
      orthographic
      shadows={{ type: PCFSoftShadowMap }}
      dpr={dpr}
      frameloop={reduced ? 'demand' : 'always'}
      camera={{ position: [9, 8.2, 9], zoom: 62, near: 0.1, far: 100 }}
      gl={{ antialias: true, alpha: true, toneMapping: NeutralToneMapping, toneMappingExposure: night ? 0.95 : 1.05 }}
      aria-label={`3D view of the ${structure} at the current trace step`}
    >
      <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)} flipflops={3} onFallback={() => setDpr(1)} />
      <AdaptiveDpr pixelated={false} />
      <DioramaLights night={night} />
      <Suspense fallback={null}>{structure === 'queue' && <QueueScene step={step as TraceStep<QueueState>} reduced={reduced} />}</Suspense>
      <DollhouseControls />
    </Canvas>
  )
}
