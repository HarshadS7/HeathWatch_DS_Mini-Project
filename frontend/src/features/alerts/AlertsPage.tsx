import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { useUi } from '../../lib/store'
import { Card, PageHeader, Segmented, Skeleton } from '../../components/ui'
import { AlertsFeed } from '../dashboard/AlertsFeed'
import { IndiaMap as IndiaMapSvg } from '../dashboard/IndiaMap'
import { lazy, Suspense } from 'react'
const IndiaMap3D = lazy(() => import('../dashboard/IndiaMap3D'))
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

export default function AlertsPage() {
  const qc = useQueryClient()
  const { stationId, setStation, hoverStation, setHover } = useUi()
  const [algo, setAlgo] = useState<'bfs' | 'dfs'>('bfs')
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('active')
  const [draft, setDraft] = useState<number | null>(null)
  const dash = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard, refetchInterval: 2000 })
  const stations = useQuery({ queryKey: ['stations'], queryFn: api.stations, refetchInterval: 2000 })
  const comps = useQuery({ queryKey: ['components', algo], queryFn: () => api.components(algo), refetchInterval: 2000 })
  const threshold = draft ?? dash.data?.thresholdC ?? 40
  const names = new Map((stations.data ?? []).map((s) => [s.id, s.name]))
  const commit = async () => {
    await api.setThreshold(threshold)
    setDraft(null)
    qc.invalidateQueries()
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Alerts & hot regions" title="Which hot cells are connected?">
        Alerts open when a cell reaches the threshold and resolve when it drops below. Hot regions are connected components of the proximity graph restricted to hot cells: connectivity, not
        heat propagation or a forecast.
      </PageHeader>
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <label htmlFor="thr" className="text-[13.5px] font-medium">
            Monitoring threshold
          </label>
          <input id="thr" type="range" min={34} max={47} step={0.5} value={threshold} onChange={(e) => setDraft(+e.target.value)} onPointerUp={commit} onKeyUp={commit} className="w-64 max-w-full" />
          <span className="font-display text-[22px] font-semibold tabular">{threshold.toFixed(1)} °C</span>
          <span className="text-[12.5px] text-ink-3">Illustrative; IMD uses ≥ 40 °C plus departure rules for plains.</span>
        </div>
      </Card>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card
          title="Hot-region graph"
          subtitle="Edges join cells within 450 km."
          pad={false}
          action={<Segmented label="Traversal" value={algo} onChange={setAlgo} options={[{ value: 'bfs', label: 'BFS' }, { value: 'dfs', label: 'DFS' }]} />}
        >
          {stations.data ? (
            <IndiaMap
              className="aspect-[56/52] w-full"
              stations={stations.data}
              selected={stationId}
              hover={hoverStation}
              onSelect={setStation}
              onHover={setHover}
              edges={comps.data?.edges}
              components={(comps.data?.components ?? []).filter((c) => c.length > 1)}
            />
          ) : (
            <Skeleton className="m-5 h-[520px]" />
          )}
        </Card>
        <div className="flex flex-col gap-4">
          <Card title={`Traversal order (${algo.toUpperCase()})`}>
            {comps.data?.order.length ? (
              <ol className="flex flex-wrap gap-1.5">
                {comps.data.order.map((id, i) => (
                  <li key={id} className="rounded-lg bg-sunken px-2 py-1 text-[12.5px]">
                    <span className="font-mono text-ink-3">{i + 1}</span> {names.get(id)}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[13px] text-ink-3">No cell at or above {threshold} °C.</p>
            )}
            <ul className="mt-4 space-y-1.5">
              {(comps.data?.components ?? []).map((c, i) => (
                <li key={i} className="flex gap-2 text-[13px]">
                  <span className="rounded-md bg-[var(--band-heat-wash)] px-1.5 text-[11px] font-bold text-[var(--band-heat)]">{c.length}</span>
                  {c.map((id) => names.get(id)).join(' · ')}
                </li>
              ))}
            </ul>
          </Card>
          <Card
            title="Alerts"
            action={<Segmented label="Filter" value={filter} onChange={setFilter} options={[{ value: 'active', label: 'Active' }, { value: 'resolved', label: 'Resolved' }, { value: 'all', label: 'All' }]} />}
          >
            <AlertsFeed limit={20} filter={filter} onSelect={setStation} />
          </Card>
        </div>
      </div>
    </div>
  )
}
