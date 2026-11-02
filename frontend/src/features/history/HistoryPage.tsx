import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'
import { fmtDate, fmtTemp } from '../../lib/format'
import { useUi } from '../../lib/store'
import { Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../../components/ui'

const PAGE = 15

export default function HistoryPage() {
  const { stationId, setStation } = useUi()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const stations = useQuery({ queryKey: ['stations'], queryFn: api.stations })
  const obs = useQuery({ queryKey: ['obs', stationId], queryFn: () => api.observations(stationId) })

  const rows = useMemo(() => (obs.data ?? []).filter((o) => (!from || o.observedAt >= from) && (!to || o.observedAt <= to)), [obs.data, from, to])
  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const view = rows.slice(page * PAGE, page * PAGE + PAGE)
  const input = 'h-9 rounded-xl border border-line bg-surface px-3 text-[13.5px]'

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Historical explorer" title="Search a station's history">
        Range queries run on the station&apos;s BST index; sorting uses merge sort and lookups use binary search. Step through each in the Structure Lab.
      </PageHeader>
      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-[12px] text-ink-3">
            Station
            <select className={input} value={stationId} onChange={(e) => (setStation(e.target.value), setPage(0))}>
              {stations.data?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-[12px] text-ink-3">
            From
            <input type="date" className={input} value={from} onChange={(e) => (setFrom(e.target.value), setPage(0))} />
          </label>
          <label className="grid gap-1 text-[12px] text-ink-3">
            To
            <input type="date" className={input} value={to} onChange={(e) => (setTo(e.target.value), setPage(0))} />
          </label>
          {from && to && from > to && <p className="text-[12.5px] text-danger">“From” must be on or before “To”.</p>}
        </div>
      </Card>
      <Card title={`${rows.length.toLocaleString()} readings`} pad={false}>
        {obs.error ? (
          <div className="p-5">
            <ErrorState error={obs.error} onRetry={() => obs.refetch()} />
          </div>
        ) : obs.isLoading ? (
          <Skeleton className="m-5 h-64" />
        ) : !rows.length ? (
          <div className="p-5">
            <EmptyState title="No matching readings">Widen the date range or let the replay process more days.</EmptyState>
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
                    <tr key={o.id} className="border-b border-line last:border-0 hover:bg-surface-2">
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
                <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg border border-line px-3 py-1 disabled:opacity-40">
                  Previous
                </button>
                <button disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className="rounded-lg border border-line px-3 py-1 disabled:opacity-40">
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
