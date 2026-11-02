import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, CheckCheck } from 'lucide-react'
import clsx from 'clsx'
import { api } from '../../lib/api'
import { fmtDate, fmtTemp } from '../../lib/format'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui'

export function AlertsFeed({ limit = 6, onSelect, filter = 'all' }: { limit?: number; onSelect?: (id: string) => void; filter?: 'all' | 'active' | 'resolved' }) {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['alerts'], queryFn: api.alerts, refetchInterval: 2000 })
  const ack = useMutation({ mutationFn: (id: number) => api.acknowledge(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }) })

  if (q.isLoading)
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    )
  if (q.error) return <ErrorState error={q.error} onRetry={() => q.refetch()} />
  const rows = (q.data ?? [])
    .filter((a) => (filter === 'all' ? true : filter === 'active' ? !a.resolvedAt : !!a.resolvedAt))
    .slice(0, limit)
  if (!rows.length) return <EmptyState title="No monitoring alerts">No station has crossed the threshold in this replay yet.</EmptyState>

  return (
    <ul className="divide-y divide-line">
      {rows.map((a) => {
        const active = !a.resolvedAt
        return (
          <li key={a.id} className="flex items-center gap-3 py-2.5">
            <span
              className={clsx('grid size-8 shrink-0 place-items-center rounded-xl text-[12px] font-bold', active ? 'text-white' : 'bg-sunken text-ink-3')}
              style={active ? { background: 'var(--band-heat)' } : undefined}
              aria-hidden
            >
              {active ? '▲' : '✓'}
            </span>
            <button className="min-w-0 flex-1 text-left" onClick={() => onSelect?.(a.stationId)}>
              <div className="flex items-center gap-2">
                <span className="truncate font-semibold text-ink">{a.stationName}</span>
                <span
                  className={clsx(
                    'rounded-md px-1.5 text-[10.5px] font-semibold',
                    active ? 'bg-[var(--band-heat-wash)] text-[var(--band-heat)]' : 'bg-sunken text-ink-3',
                  )}
                >
                  {active ? 'Active' : 'Resolved'}
                </span>
              </div>
              <div className="text-[12px] text-ink-3 tabular">
                Peak {fmtTemp(a.peakC)} · threshold {a.thresholdC} °C · {fmtDate(a.openedAt, false)}
                {a.resolvedAt ? ` → ${fmtDate(a.resolvedAt, false)}` : ' → ongoing'}
              </div>
            </button>
            {a.acknowledgedAt ? (
              <span className="flex items-center gap-1 text-[11.5px] text-ok" title="Acknowledged">
                <CheckCheck size={14} /> Ack
              </span>
            ) : (
              <button
                onClick={() => ack.mutate(a.id)}
                className="flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-[11.5px] font-medium text-ink-2 hover:border-primary hover:text-primary"
              >
                <Check size={13} /> Acknowledge
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
