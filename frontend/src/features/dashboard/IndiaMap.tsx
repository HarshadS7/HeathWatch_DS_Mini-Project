import { useMemo } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import type { FeatureCollection } from 'geojson'
import clsx from 'clsx'
import india from '../../assets/geo/india.json'
import states from '../../assets/geo/states.json'
import { BAND_META, BAND_ORDER } from '../../lib/bands'
import { fmtTemp } from '../../lib/format'
import type { GraphEdge, StationSummary } from '../../lib/types'

/** label offsets [dx, dy, anchor] to avoid collisions between nearby cities */
const LABEL: Record<string, [number, number, 'start' | 'end' | 'middle']> = {
  BOM: [-12, 4, 'end'],
  AMD: [-12, 4, 'end'],
  JDH: [-12, 4, 'end'],
  PNQ: [0, 22, 'middle'],
  PRY: [0, 24, 'middle'],
  LKO: [0, -14, 'middle'],
  MAA: [12, 4, 'start'],
  BLR: [-12, 4, 'end'],
  PAT: [0, -14, 'middle'],
}

const W = 560
const H = 600

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

export function IndiaMap({ stations, selected, hover, onSelect, onHover, edges = [], components = [], showEdges = true, className }: Props) {
  const { path, project, outline, stateLines } = useMemo(() => {
    const fc = india as unknown as FeatureCollection
    const projection = geoMercator().fitExtent(
      [
        [16, 16],
        [W - 16, H - 16],
      ],
      fc,
    )
    const p = geoPath(projection)
    return {
      path: p,
      project: (lon: number, lat: number) => projection([lon, lat]) as [number, number],
      outline: fc.features.map((f) => p(f) ?? '').join(' '),
      stateLines: (states as unknown as FeatureCollection).features.map((f) => p(f) ?? ''),
    }
  }, [])
  void path

  const pos = useMemo(() => new Map(stations.map((s) => [s.id, project(s.lon, s.lat)])), [stations, project])
  const compOf = useMemo(() => {
    const m = new Map<string, number>()
    components.forEach((c, i) => c.forEach((id) => m.set(id, i)))
    return m
  }, [components])
  const hotIds = new Set(components.flat())

  return (
    <div className={clsx('relative', className)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label="Map of India with monitored grid cells coloured by monitoring band">
        <defs>
          <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#14181b" floodOpacity="0.10" />
          </filter>
          <radialGradient id="land" cx="45%" cy="40%" r="75%">
            <stop offset="0%" stopColor="var(--surface-2)" />
            <stop offset="100%" stopColor="var(--sunken)" />
          </radialGradient>
        </defs>
        <path d={outline} fill="url(#land)" stroke="var(--line-strong)" strokeWidth={1.2} filter="url(#soft)" />
        <g fill="none" stroke="var(--line)" strokeWidth={0.7}>
          {stateLines.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>

        {/* proximity graph */}
        {showEdges && (
          <g>
            {edges.map((e) => {
              const a = pos.get(e.a)
              const b = pos.get(e.b)
              if (!a || !b) return null
              const hotEdge = hotIds.has(e.a) && hotIds.has(e.b) && compOf.get(e.a) === compOf.get(e.b)
              return (
                <line
                  key={e.a + e.b}
                  x1={a[0]}
                  y1={a[1]}
                  x2={b[0]}
                  y2={b[1]}
                  stroke={hotEdge ? 'var(--band-heat)' : 'var(--line-strong)'}
                  strokeWidth={hotEdge ? 3 : 1}
                  strokeDasharray={hotEdge ? undefined : '3 4'}
                  strokeLinecap="round"
                  opacity={hotEdge ? 0.75 : 0.8}
                />
              )
            })}
          </g>
        )}

        {/* markers */}
        {stations.map((s) => {
          const p = pos.get(s.id)!
          const band = s.latest?.band ?? 'normal'
          const m = BAND_META[band]
          const r = 6 + BAND_ORDER.indexOf(band) * 1.6
          const isSel = s.id === selected
          const isHover = s.id === hover
          const [lx, ly, anchor] = LABEL[s.id] ?? [r + 6, 4, 'start']
          return (
            <g
              key={s.id}
              transform={`translate(${p[0]},${p[1]})`}
              className="cursor-pointer outline-none"
              tabIndex={0}
              role="button"
              aria-label={`${s.name}: ${s.latest ? fmtTemp(s.latest.temperatureC) + ', ' + m.label : 'no reading yet'}`}
              aria-pressed={isSel}
              onClick={() => onSelect(s.id)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect(s.id))}
              onMouseEnter={() => onHover(s.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(s.id)}
              onBlur={() => onHover(null)}
            >
              {band === 'severe' && <circle r={r} fill={m.varName} className="pulse-ring" />}
              {(isSel || isHover) && <circle r={r + 7} fill="none" stroke="var(--primary)" strokeWidth={2.2} />}
              <circle r={r + 2.5} fill="var(--surface)" />
              <circle r={r} fill={s.latest ? m.varName : 'var(--line-strong)'} />
              {band !== 'normal' && (
                <text y={3.2} textAnchor="middle" fontSize={band === 'severe' ? 9 : 7} fontWeight={700} fill="#fff" aria-hidden>
                  {band === 'severe' ? '!' : band === 'heat' ? '▲' : '▴'}
                </text>
              )}
              <text
                x={lx}
                y={ly}
                textAnchor={anchor}
                fontSize={11.5}
                fontWeight={isSel ? 700 : 600}
                fill="var(--ink)"
                stroke="var(--surface)"
                strokeWidth={3.5}
                paintOrder="stroke"
              >
                {s.name}
                {s.latest && (
                  <tspan fill="var(--ink-3)" fontWeight={500}>
                    {' '}
                    {s.latest.temperatureC.toFixed(1)}°
                  </tspan>
                )}
              </text>
            </g>
          )
        })}
      </svg>

      {/* docked legend */}
      <div className="absolute bottom-2 left-2 rounded-xl border border-line bg-surface/90 p-2.5 text-[11.5px] backdrop-blur" aria-label="Legend">
        <div className="mb-1 font-semibold text-ink-2">Monitoring band (illustrative)</div>
        <ul className="space-y-0.5">
          {BAND_ORDER.slice()
            .reverse()
            .map((b) => (
              <li key={b} className="flex items-center gap-2 text-ink-2">
                <span className="grid size-3.5 place-items-center rounded-full text-[7px] text-white" style={{ background: BAND_META[b].varName }}>
                  {b === 'severe' ? '!' : ''}
                </span>
                {BAND_META[b].label}
              </li>
            ))}
        </ul>
        {showEdges && (
          <div className="mt-1.5 flex items-center gap-2 border-t border-line pt-1.5 text-ink-3">
            <svg width="22" height="6" aria-hidden>
              <line x1="1" y1="3" x2="21" y2="3" stroke="var(--band-heat)" strokeWidth="3" strokeLinecap="round" />
            </svg>
            Connected hot region (BFS)
          </div>
        )}
      </div>
    </div>
  )
}
