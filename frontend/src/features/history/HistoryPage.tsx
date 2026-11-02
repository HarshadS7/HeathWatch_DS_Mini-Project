import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, ArrowUpDown } from 'lucide-react'
import { api } from '../../lib/api'
import { fmtDate, fmtTemp } from '../../lib/format'
import { useUi } from '../../lib/store'
import type { Observation } from '../../lib/types'
import { Button, Card, EmptyState, ErrorState, PageHeader, Pill, Skeleton } from '../../components/ui'

const PAGE = 15

export default function HistoryPage() {
  const { stationId, setStation } = useUi()
  const [from, setFrom] = useState('2024-05-01')
  const [to, setTo] = useState('2024-05-31')
  const [page, setPage] = useState(0)
  const [sorted, setSorted] = useState<{ rows: Observation[]; comparisons: number; engineTimeMs: number } | null>(null)
  const stations = useQuery({ queryKey: ['stations'], queryFn: api.stations })
  const valid = !!from && !!to && from <= to
  const q = useQuery({ queryKey: ['range', stationId, from, to], queryFn: () => api.historyRange(stationId, from, to), enabled: valid })
  useEffect(() => { setSorted(null); setPage(0) }, [stationId, from, to])

  const base: Observation[] = (q.data?.rows ?? []).map((r) => ({ id: Number(r.id.slice(1)) || 0, stationId, observedAt: r.date, temperatureC: r.temperatureC, source: 'IMD gridded Tmax 1.0°' }))
  const rows = sorted?.rows ?? base
  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const view = rows.slice(page * PAGE, page * PAGE + PAGE)
  const input = 'h-9 rounded-xl border border-line bg-surface px-3 text-[13.5px]'
  const d = q.data

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Historical explorer" title="Search a station's history">
        The date range is answered by the station&apos;s binary search tree inside the C++ engine; sorting uses the engine&apos;s merge sort. Counters below are the engine&apos;s own.
      </PageHeader>
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-[12px] text-ink-3">
            Station
            <select className={input} value={stationId} onChange={(e) => setStation(e.target.value)}>
              {stations.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[12px] text-ink-3">
            From
            <input type="date" className={input} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="grid gap-1 text-[12px] text-ink-3">
            To
            <input type="date" className={input} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          {!valid && <p className="text-[12.5px] text-danger">Choose a “From” date on or before “To”.</p>}
          <Button
            disabled={!base.length}
            pressed={!!sorted}
            onClick={async () => (sorted ? setSorted(null) : setSorted(await api.sortReadings(base)), setPage(0))}
          >
            <ArrowUpDown size={14} /> {sorted ? 'Back to date order' : 'Sort by temperature (merge sort)'}
          </Button>
        </div>
        {d && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[12.5px]">
            {d.source === 'engine' ? (
              <>
                <Pill tone="primary">BST range · {d.visited} nodes visited</Pill>
                <Pill>{d.comparisons} key comparisons</Pill>
                <Pill>
                  tree height {d.height} for {d.size} readings
                </Pill>
                <Pill>{d.engineTimeMs.toFixed(3)} ms in engine</Pill>
              </>
            ) : (
              <Pill tone="warn">Mock backend: filtered in JavaScript (build the WASM engine for BST counters)</Pill>
            )}
            {sorted && <Pill tone="primary">merge sort · {sorted.comparisons} comparisons</Pill>}
            <Link to="/lab/bst" className="ml-auto inline-flex items-center gap-1 font-medium text-primary hover:underline">
              Step through in the Lab <ArrowRight size={13} />
            </Link>
          </div>
        )}
        {d?.source === 'engine' && d.height > 2 * Math.ceil(Math.log2(d.size + 1)) && (
          <p className="mt-2 text-[12.5px] text-ink-3">
            The tree is skewed because the replay inserts readings in date order, so this query costs closer to O(n) than O(log n). Reloading the page rebuilds a balanced tree from storage.
          </p>
        )}
      </Card>

      <Card title={`${rows.length.toLocaleString()} readings`} pad={false}>
        {q.error ? (
          <div className="p-5">
            <ErrorState error={q.error} onRetry={() => q.refetch()} />
          </div>
        ) : q.isLoading ? (
          <Skeleton className="m-5 h-64" />
        ) : !rows.length ? (
          <div className="p-5">
            <EmptyState title="No matching readings">Widen the range, or let the replay process more days.</EmptyState>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-[13.5px]">
                <thead>
                  <tr className="border-y border-line bg-sunken text-left text-[11.5px] tracking-wide text-ink-3 uppercase">
                    <th className="px-5 py-2.5 font-semibold">Date</th>
                    <th className="px-5 py-2.5 font-semibold">Max temperature</th>
                    <th className="px-5 py-2.5 font-semibold">Humidity</th>
                    <th className="px-5 py-2.5 font-semibold">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {view.map((o) => (
                    <tr key={o.id + o.observedAt} className="border-b border-line last:border-0 hover:bg-surface-2">
                      <td className="px-5 py-2.5 tabular">{fmtDate(o.observedAt)}</td>
                      <td className="px-5 py-2.5 font-semibold tabular">{fmtTemp(o.temperatureC)}</td>
                      <td className="px-5 py-2.5 text-ink-3">n/a</td>
                      <td className="px-5 py-2.5 text-ink-3">{o.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-line px-5 py-3 text-[13px]">
              <span className="text-ink-3">
                Page {page + 1} of {pages}
              </span>
              <div className="flex gap-2">
                <Button size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  Previous
                </Button>
                <Button size="sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
