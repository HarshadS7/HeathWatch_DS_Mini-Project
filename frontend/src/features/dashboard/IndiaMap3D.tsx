import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Bounds, Line, OrbitControls, useBounds } from '@react-three/drei'
import { NeutralToneMapping, PCFShadowMap, Vector3 } from 'three'
import { mix } from '../../lib/bands'
import { useIsDark } from '../../lib/useIsDark'
import type { Band, GraphEdge, StationSummary } from '../../lib/types'
import { IndiaRelief, proj, ReliefGround, RELIEF_TOP, stateAt, STATES } from '../../components/three/IndiaRelief'
import { DioramaLights, Eased } from '../lab/three/Diorama'
import { MapLegend } from './IndiaMap'
import { Maximize2, Minus, Plus } from 'lucide-react'

interface Props {
  stations: StationSummary[]
  selected: string
  hover: string | null
  onSelect: (id: string) => void
  onHover: (id: string | null) => void
  edges?: GraphEdge[]
  components?: string[][]
  showEdges?: boolean
  className?: string
}

const BAND_HEX: Record<Band, string> = { normal: '#9aa3ad', watch: '#e7a83a', heat: '#df6f3c', severe: '#b8441c' }
const PIN_H: Record<Band, number> = { normal: 0.16, watch: 0.3, heat: 0.44, severe: 0.58 }
const BAND_RANK: Band[] = ['normal', 'watch', 'heat', 'severe']
const LIFT = 0.3

/** Projects each pin's label anchor to screen space every frame and positions plain DOM labels (outside the canvas). */
function LabelProjector({ anchors, els }: { anchors: Map<string, [number, number, number]>; els: React.RefObject<Map<string, HTMLSpanElement>> }) {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const v = useMemo(() => new Vector3(), [])
  useFrame(() => {
    anchors.forEach((a, id) => {
      const el = els.current?.get(id)
      if (!el) return
      v.set(...a).project(camera)
      el.style.transform = `translate(-50%, -100%) translate(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height}px)`
    })
  })
  return null
}

/** Applies button zoom steps to the orthographic camera (ctrl/pinch zoom is handled by OrbitControls). */
function ZoomStep({ cmd }: { cmd: { n: number; f: number } }) {
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as { update?: () => void } | null
  useEffect(() => {
    if (!cmd.n) return
    camera.zoom = Math.min(400, Math.max(40, camera.zoom * cmd.f))
    camera.updateProjectionMatrix()
    controls?.update?.()
  }, [cmd, camera, controls])
  return null
}

/**
 * Re-fits the camera on "Reset view" and on real canvas resizes only. (Bounds' own `observe` also
 * re-fits whenever the page scrolls, because R3F's size includes the canvas offset, which would undo
 * the user's zoom, rotation and pan.)
 */
function FitOnTrigger({ trigger }: { trigger: number }) {
  const api = useBounds()
  const width = useThree((s) => s.size.width)
  const height = useThree((s) => s.size.height)
  useEffect(() => {
    if (width && height) api.refresh().clip().fit()
  }, [trigger, width, height, api])
  return null
}

/** 3D infographic map: flat-topped state slabs with sunken borders; pins sized and coloured by monitoring band. */
export default function IndiaMap3D({ stations, selected, hover, onSelect, onHover, edges = [], components = [], showEdges = true, className }: Props) {
  const dark = useIsDark()
  const sand = dark ? '#b9a688' : '#ead9bd'
  const [hoverState, setHoverState] = useState<number | null>(null)
  const [refit, setRefit] = useState(0)
  const [zoomCmd, setZoomCmd] = useState({ n: 0, f: 1 })
  const zoomBy = (f: number) => setZoomCmd((c) => ({ n: c.n + 1, f }))
  // plain wheel keeps scrolling the page: stop it before OrbitControls sees it; ctrl/⌘ + wheel (and pinch) zooms
  const wrap = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = wrap.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) e.stopPropagation()
    }
    el.addEventListener('wheel', onWheel, { capture: true })
    return () => el.removeEventListener('wheel', onWheel, { capture: true })
  }, [])

  const stateOf = useMemo(() => new Map(stations.map((s) => [s.id, stateAt(s.lon, s.lat)?.index])), [stations])
  // state tint = hottest band among its monitored cells, mixed subtly into the sand
  const stateBand = new Map<number, Band>()
  stations.forEach((s) => {
    const i = stateOf.get(s.id)
    const b = s.latest?.band
    if (i != null && b && BAND_RANK.indexOf(b) >= BAND_RANK.indexOf(stateBand.get(i) ?? 'normal')) stateBand.set(i, b)
  })
  const poppedState = hover ? stateOf.get(hover) : hoverState
  const lift = (i: number | undefined) => (i != null && i === poppedState ? LIFT : 0)
  const hot = new Set(components.flat())
  const compOf = new Map<string, number>()
  components.forEach((c, i) => c.forEach((id) => compOf.set(id, i)))
  const P = new Map(stations.map((s) => [s.id, proj(s.lon, s.lat)]))
  const labelEls = useRef(new Map<string, HTMLSpanElement>())
  const anchors = new Map(
    stations.map((s) => {
      const p = P.get(s.id)!
      return [s.id, [p[0], RELIEF_TOP + lift(stateOf.get(s.id)) + PIN_H[s.latest?.band ?? 'normal'] + 0.06, p[1]] as [number, number, number]]
    }),
  )

  return (
    <div ref={wrap} className={className} style={{ position: 'relative' }}>
      <Canvas
        orthographic
        shadows={{ type: PCFShadowMap }}
        dpr={[1, 1.75]}
        camera={{ position: [2.2, 7.4, 8.6], zoom: 80, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true, toneMapping: NeutralToneMapping, toneMappingExposure: dark ? 0.95 : 1.05 }}
        style={{ position: 'absolute', inset: 0 }}
        onPointerMissed={() => onHover(null)}
        aria-label="3D map of India: states tinted by monitoring band, pins sized by band"
      >
        <DioramaLights night={dark} />
        <LabelProjector anchors={anchors} els={labelEls} />
        <ReliefGround />
        {/* drag to rotate, right-drag to pan, ctrl/pinch to zoom (plain wheel scrolls the page) */}
        <ZoomStep cmd={zoomCmd} />
        <OrbitControls makeDefault enableZoom minZoom={40} maxZoom={400} zoomToCursor enablePan screenSpacePanning minPolarAngle={0.15} maxPolarAngle={1.25} enableDamping dampingFactor={0.08} />
        <Bounds margin={1.02}>
          <FitOnTrigger trigger={refit} />
          <group>
            <IndiaRelief
              colorOf={(i) => (stateBand.has(i) ? mix(sand, BAND_HEX[stateBand.get(i)!], stateBand.get(i) === 'normal' ? 0.08 : 0.24) : sand)}
              liftOf={(i) => lift(i)}
              onHoverState={hover ? undefined : setHoverState}
            />
          </group>
        </Bounds>

        {showEdges &&
          edges.map((e) => {
            const a = P.get(e.a)
            const b = P.get(e.b)
            if (!a || !b) return null
            const on = hot.has(e.a) && hot.has(e.b) && compOf.get(e.a) === compOf.get(e.b)
            const y = RELIEF_TOP + 0.02
            return (
              <Line
                key={e.a + e.b}
                points={[[a[0], y, a[1]], [(a[0] + b[0]) / 2, y + (on ? 0.22 : 0.08), (a[1] + b[1]) / 2], [b[0], y, b[1]]]}
                color={on ? '#d9673a' : '#a8977d'}
                lineWidth={on ? 3 : 1}
                dashed={!on}
                dashSize={0.06}
                gapSize={0.06}
                transparent
                opacity={on ? 0.95 : 0.55}
              />
            )
          })}

        {stations.map((s) => {
          const p = P.get(s.id)!
          const band = s.latest?.band ?? 'normal'
          const h = PIN_H[band]
          const isSel = s.id === selected
          const isHover = s.id === hover
          const y = RELIEF_TOP + lift(stateOf.get(s.id))
          return (
            <Eased key={s.id} to={[p[0], y, p[1]]}>
              <group
                onPointerOver={(e) => (e.stopPropagation(), onHover(s.id), (document.body.style.cursor = 'pointer'))}
                onPointerOut={() => (onHover(null), (document.body.style.cursor = ''))}
                onClick={(e) => (e.stopPropagation(), onSelect(s.id))}
              >
                <mesh position={[0, h / 2, 0]} castShadow>
                  <capsuleGeometry args={[0.065, Math.max(0.01, h - 0.13), 6, 18]} />
                  <meshStandardMaterial color={s.latest ? BAND_HEX[band] : '#c9c2b6'} roughness={0.8} emissive={isHover ? '#ffb070' : '#000'} emissiveIntensity={isHover ? 0.25 : 0} />
                </mesh>
                {(isSel || isHover) && (
                  <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.13, 0.18, 40]} />
                    <meshStandardMaterial color={isSel ? '#2f8f83' : '#e7a83a'} />
                  </mesh>
                )}
              </group>
            </Eased>
          )
        })}
      </Canvas>

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {stations.map((s) => {
          const on = s.id === selected || s.id === hover
          return (
            <span
              key={s.id}
              ref={(el) => {
                if (el) labelEls.current.set(s.id, el)
                else labelEls.current.delete(s.id)
              }}
              className="absolute top-0 left-0 rounded-full px-2 py-0.5 whitespace-nowrap shadow-card"
              style={{
                font: `${on ? 700 : 600} ${on ? 12.5 : 11}px "Inter Variable", system-ui, sans-serif`,
                color: s.id === selected ? '#fff' : 'var(--ink)',
                background: s.id === selected ? 'var(--primary)' : 'color-mix(in srgb, var(--surface) 92%, transparent)',
                zIndex: on ? 2 : 1,
              }}
            >
              {on ? s.name : s.id}
              {on && s.latest && <span style={{ fontWeight: 500, opacity: 0.8 }}> {s.latest.temperatureC.toFixed(1)}°</span>}
            </span>
          )
        })}
      </div>
      {poppedState != null && (
        <div className="pointer-events-none absolute top-3 left-3 rounded-xl border border-line bg-surface/95 px-3 py-1.5 text-[12.5px] font-semibold shadow-lift backdrop-blur">
          {STATES[poppedState].name}
          {stateBand.has(poppedState) && <span className="ml-1.5 font-normal text-ink-3">· {stateBand.get(poppedState)}</span>}
        </div>
      )}
      <MapLegend showEdges={showEdges} />
      <div className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full border border-line bg-surface/90 p-1 shadow-card backdrop-blur">
        <button className="grid size-7 place-items-center rounded-full text-ink-2 hover:bg-sunken hover:text-ink" title="Zoom out" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.25)}>
          <Minus size={14} />
        </button>
        <button className="grid size-7 place-items-center rounded-full text-ink-2 hover:bg-sunken hover:text-ink" title="Zoom in" aria-label="Zoom in" onClick={() => zoomBy(1.25)}>
          <Plus size={14} />
        </button>
        <button
          onClick={() => setRefit((n) => n + 1)}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium text-ink-2 hover:bg-sunken hover:text-ink"
          title="Reset map view"
        >
          <Maximize2 size={13} /> Reset view
        </button>
      </div>
      <span className="pointer-events-none absolute right-3 bottom-3 text-[11.5px] text-ink-3">Drag to rotate · right-drag to pan · ctrl + scroll or pinch to zoom</span>
    </div>
  )
}
