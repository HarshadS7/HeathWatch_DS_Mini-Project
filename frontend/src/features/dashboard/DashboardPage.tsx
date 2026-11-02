import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { motion, AnimatePresence } from 'motion/react'
import { ArrowRight, Boxes, ChevronDown, Flame, Layers, MapPin, Thermometer } from 'lucide-react'
import { api } from '../../lib/api'
import { fmtDate, fmtDelta, fmtTemp, pct } from '../../lib/format'
import { useUi } from '../../lib/store'
import { BAND_META, BAND_ORDER } from '../../lib/bands'
import { BandBadge, Card, ErrorState, KpiTile, PageHeader, Skeleton } from '../../components/ui'
import { IndiaMap as IndiaMapSvg } from './IndiaMap'
import { lazy, Suspense } from 'react'
const IndiaMap3D = lazy(() => import('./IndiaMap3D'))
const WEBGL = (() => { try { return !!document.createElement('canvas').getContext('webgl2') } catch { return false } })()
function IndiaMap(p: React.ComponentProps<typeof IndiaMapSvg>) {
  return WEBGL ? (
    <Suspense fallback={<div className={p.className} />}>
      <IndiaMap3D {...p} />
    </Suspense>
  ) : (
    <IndiaMapSvg {...p} />
  )
}
import { TrendChart } from './TrendChart'
import { AlertsFeed } from './AlertsFeed'
import { QueueRing2D } from './QueueRing2D'

export function DashboardPage() {
  const nav = useNavigate()
  const { stationId, setStation, hoverStation, setHover, dsPanelOpen, toggleDsPanel } = useUi()
  const dash = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard, refetchInterval: 1500 })
  const stations = useQuery({ queryKey: ['stations'], queryFn: api.stations, refetchInterval: 1500 })
  const comps = useQuery({ queryKey: ['components', 'bfs'], queryFn: () => api.components('bfs'), refetchInterval: 2000 })
  const queue = useQuery({ queryKey: ['queue-state'], queryFn: api.queueState, refetchInterval: 1000, enabled: dsPanelOpen })

  const d = dash.data
  const list = stations.data ?? []
  const sel = list.find((s) => s.id === stationId)
  const ranked = [...list].sort((a, b) => (b.latest?.temperatureC ?? -99) - (a.latest?.temperatureC ?? -99))
  const multiHot = (comps.data?.components ?? []).filter((c) => c.length > 1)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title={
          d?.hottest ? (
            <>
              {d.aboveThreshold} of {d.stationCount} grid cells at or above {d.thresholdC} °C
            </>
          ) : (
            'Heatwave monitoring dashboard'
          )
        }
        actions={
          <Link to="/lab" className="inline-flex h-9 items-center gap-2 rounded-xl bg-ink px-3.5 text-[13px] font-medium text-page transition-transform hover:-translate-y-0.5">
            <Boxes size={15} /> Open Structure Lab <ArrowRight size={14} />
          </Link>
        }
      >
        Daily maximum temperature, {d?.asOf ? fmtDate(d.asOf) : '—'} · {d?.source ?? 'loading source…'}. Bands are illustrative and based on IMD criteria; they are not
        official heatwave declarations.
      </PageHeader>

      {/* KPI strip */}
      {dash.error ? (
        <ErrorState error={dash.error} onRetry={() => dash.refetch()} />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-4">
          {!d ? (
            [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[132px]" />)
          ) : (
            <>
              <KpiTile label="Monitored grid cells" value={d.stationCount} icon={<MapPin size={16} />} hint={<span>16 cities · 1°×1° IMD cells</span>} />
              <KpiTile
                label="Hottest reading"
                value={d.hottest?.temperatureC ?? null}
                decimals={1}
                suffix="°C"
                icon={<Thermometer size={16} />}
                accent="var(--band-heat)"
                hint={d.hottest ? <span>{d.hottest.name}</span> : undefined}
                chip={sel && d.hottest && list.find((s) => s.id === d.hottest!.stationId)?.latest ? <BandBadge band={list.find((s) => s.id === d.hottest!.stationId)!.latest!.band} size="sm" /> : null}
              />
              <KpiTile
                label={`At or above ${d.thresholdC} °C`}
                value={d.aboveThreshold}
                suffix={`/ ${d.stationCount}`}
                icon={<Flame size={16} />}
                accent="var(--band-severe)"
                hint={<span>{multiHot.length ? `${multiHot.length} connected hot region${multiHot.length > 1 ? 's' : ''}` : 'no connected hot region'}</span>}
              />
              <KpiTile
                label="Ingestion queue"
                value={pct(d.queue.count, d.queue.capacity)}
                suffix="% full"
                icon={<Layers size={16} />}
                hint={
                  <span className="tabular">
                    {d.queue.count}/{d.queue.capacity} · {d.queue.processed.toLocaleString()} processed · {d.queue.rejected} rejected
                  </span>
                }
              />
            </>
          )}
        </div>
      )}

      {/* map + station list */}
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <Card
          title="Monitored locations"
          subtitle="Click a marker to inspect it. Lines join cells within 450 km; thick lines are connected hot regions found by BFS."
          pad={false}
        >
          {stations.error ? (
            <div className="p-5">
              <ErrorState error={stations.error} onRetry={() => stations.refetch()} />
            </div>
          ) : !list.length ? (
            <Skeleton className="m-5 h-[520px]" />
          ) : (
            <IndiaMap
              className="aspect-[56/52] w-full"
              stations={list}
              selected={stationId}
              hover={hoverStation}
              onSelect={setStation}
              onHover={setHover}
              edges={comps.data?.edges}
              components={multiHot}
            />
          )}
        </Card>

        <div className="flex min-w-0 flex-col gap-4">
          <Card
            title={sel ? sel.name : 'Station'}
            subtitle={sel ? `Grid cell ${sel.gridLat}°N ${sel.gridLon}°E · nearest to ${sel.lat.toFixed(2)}°N ${sel.lon.toFixed(2)}°E` : undefined}
            action={
              sel && (
                <button onClick={() => nav(`/stations/${sel.id}`)} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-primary hover:underline">
                  Details <ArrowRight size={13} />
                </button>
              )
            }
          >
            {sel?.latest ? (
              <div className="mb-3 flex flex-wrap items-end gap-x-5 gap-y-2">
                <div>
                  <div className="font-display text-[34px] leading-none font-semibold tabular">{fmtTemp(sel.latest.temperatureC)}</div>
                  <div className="mt-1 text-[12px] text-ink-3">max on {fmtDate(sel.latest.observedAt)}</div>
                </div>
                <div className="text-[13px]">
                  <div className="text-ink-3">vs 2015–24 normal</div>
                  <div className="font-semibold tabular">{fmtDelta(sel.latest.departureC)}</div>
                </div>
                <BandBadge band={sel.latest.band} />
              </div>
            ) : (
              <p className="mb-3 text-[13px] text-ink-3">No reading processed yet for this station.</p>
            )}
            <TrendChart stationId={stationId} threshold={d?.thresholdC ?? 40} height={210} />
          </Card>

          <Card title="Ranked by latest maximum" pad={false}>
            <ol className="max-h-[288px] overflow-y-auto px-2 pb-2">
              {ranked.map((s, i) => {
                const t = s.latest?.temperatureC
                const w = t == null ? 0 : Math.max(4, Math.min(100, ((t - 20) / 30) * 100))
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setStation(s.id)}
                      onMouseEnter={() => setHover(s.id)}
                      onMouseLeave={() => setHover(null)}
                      className={clsx(
                        'grid w-full grid-cols-[22px_1fr_auto] items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors',
                        s.id === stationId ? 'bg-primary-wash' : 'hover:bg-sunken',
                      )}
                    >
                      <span className="text-[12px] text-ink-3 tabular">{i + 1}</span>
                      <span className="min-w-0">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13.5px] font-medium">{s.name}</span>
                          <span className="text-[13px] font-semibold tabular">{fmtTemp(t)}</span>
                        </span>
                        <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-sunken">
                          <span
                            className="block h-full rounded-full transition-[width] duration-500"
                            style={{ width: `${w}%`, background: BAND_META[s.latest?.band ?? 'normal'].varName }}
                          />
                        </span>
                      </span>
                      <span className="w-[92px] text-right">{s.latest && <BandBadge band={s.latest.band} size="sm" />}</span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card title="Recent monitoring alerts" subtitle="Opened when a cell crosses the threshold, updated while it stays above, resolved when it drops below.">
          <AlertsFeed limit={6} onSelect={setStation} />
        </Card>
        <Card title="Band distribution" subtitle="How many cells sit in each monitoring band right now.">
          <div className="space-y-3">
            {BAND_ORDER.slice()
              .reverse()
              .map((b) => {
                const n = list.filter((s) => s.latest?.band === b).length
                return (
                  <div key={b} className="grid grid-cols-[120px_1fr_28px] items-center gap-3">
                    <BandBadge band={b} size="sm" />
                    <div className="h-3 overflow-hidden rounded-full bg-sunken">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: BAND_META[b].varName }}
                        animate={{ width: `${(n / Math.max(1, list.length)) * 100}%` }}
                        transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                      />
                    </div>
                    <span className="text-right text-[13px] font-semibold tabular">{n}</span>
                  </div>
                )
              })}
          </div>
        </Card>
      </div>

      {/* collapsible DS panel */}
      <section className="rounded-2xl border border-line bg-surface shadow-card">
        <button onClick={toggleDsPanel} aria-expanded={dsPanelOpen} className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
          <span>
            <span className="block text-[15px] font-semibold">Data structures behind this screen</span>
            <span className="block text-[12.5px] text-ink-3">Live circular queue between replay and processing. Full 3D walkthroughs are in the Structure Lab.</span>
          </span>
          <ChevronDown size={18} className={clsx('shrink-0 text-ink-3 transition-transform', dsPanelOpen && 'rotate-180')} />
        </button>
        <AnimatePresence initial={false}>
          {dsPanelOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="grid gap-6 border-t border-line p-5 md:grid-cols-[260px_1fr]">
                <div className="mx-auto w-full max-w-[260px]">{queue.data ? <QueueRing2D q={queue.data} /> : <Skeleton className="aspect-square" />}</div>
                <div className="space-y-3 text-[13.5px]">
                  <h3 className="font-semibold">Circular queue · counter method</h3>
                  <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {[
                      ['front', queue.data?.front],
                      ['rear (next slot)', queue.data?.rear],
                      ['count', queue.data?.count],
                      ['capacity', queue.data?.capacity],
                    ].map(([k, v]) => (
                      <div key={String(k)} className="rounded-xl bg-sunken px-3 py-2">
                        <dt className="text-[11.5px] text-ink-3">{k}</dt>
                        <dd className="font-mono text-[16px] font-semibold">{v ?? '—'}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-ink-2">
                    The replay producer enqueues each day&apos;s readings at <code className="font-mono">rear</code>; the consumer dequeues from{' '}
                    <code className="font-mono">front</code>, updates the station&apos;s linked history and BST index, then evaluates alerts. When{' '}
                    <code className="font-mono">count == capacity</code> the producer pauses and retries — readings are never overwritten.
                  </p>
                  <Link to="/lab/queue" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                    Step through it in 3D <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  )
}
