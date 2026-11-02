import { useQuery } from '@tanstack/react-query'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api } from '../../lib/api'
import { fmtDate, fmtShortDate, fmtTemp } from '../../lib/format'
import { EmptyState, ErrorState, Skeleton } from '../../components/ui'

export function TrendChart({ stationId, threshold, height = 260, days = 90 }: { stationId: string; threshold: number; height?: number; days?: number }) {
  const obs = useQuery({ queryKey: ['obs', stationId], queryFn: () => api.observations(stationId), refetchInterval: 2000 })
  const normals = useQuery({ queryKey: ['normals', stationId], queryFn: () => api.normals(stationId), staleTime: Infinity })

  if (obs.isLoading) return <Skeleton className="w-full" />
  if (obs.error) return <ErrorState error={obs.error} onRetry={() => obs.refetch()} />
  const rows = obs.data ?? []
  if (rows.length === 0) return <EmptyState title="No readings processed yet">Start the replay to stream readings for this station.</EmptyState>

  const nmap = new Map((normals.data ?? []).map((n) => [n.date, n.normalC]))
  const data = rows.slice(-days).map((o) => ({ date: o.observedAt, t: o.temperatureC, normal: nmap.get(o.observedAt) ?? null }))

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }} accessibilityLayer>
          <defs>
            <linearGradient id="tfill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--band-heat)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--band-heat)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--line)" />
          <XAxis dataKey="date" tickFormatter={fmtShortDate} tick={{ fontSize: 11, fill: 'var(--ink-3)' }} tickLine={false} axisLine={false} minTickGap={36} />
          <YAxis
            domain={['dataMin - 2', 'dataMax + 1']}
            tickFormatter={(v) => `${Math.round(v)}°`}
            tick={{ fontSize: 11, fill: 'var(--ink-3)' }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <ReferenceLine
            y={threshold}
            stroke="var(--band-severe)"
            strokeDasharray="4 4"
            label={{ value: `Threshold ${threshold} °C`, position: 'insideTopRight', fontSize: 11, fill: 'var(--band-severe)' }}
          />
          <Tooltip
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, fontSize: 12.5, boxShadow: 'var(--shadow-lift)' }}
            labelFormatter={(l) => fmtDate(String(l))}
            formatter={(v, n) => [fmtTemp(Number(v)), n === 't' ? 'Max temperature' : 'Normal (2015–24)']}
          />
          <Line dataKey="normal" stroke="var(--ink-3)" strokeDasharray="2 3" dot={false} strokeWidth={1.4} isAnimationActive={false} />
          <Area dataKey="t" stroke="var(--band-heat)" strokeWidth={2.2} fill="url(#tfill)" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
