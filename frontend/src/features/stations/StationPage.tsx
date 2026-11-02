import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { api } from '../../lib/api'
import { fmtDate, fmtDelta, fmtTemp } from '../../lib/format'
import { BandBadge, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../../components/ui'
import { TrendChart } from '../dashboard/TrendChart'
import { useUi } from '../../lib/store'

export default function StationPage() {
  const { id = 'DEL' } = useParams()
  const nav = useNavigate()
  const setStation = useUi((s) => s.setStation)
  const stations = useQuery({ queryKey: ['stations'], queryFn: api.stations, refetchInterval: 2000 })
  const obs = useQuery({ queryKey: ['obs', id], queryFn: () => api.observations(id), refetchInterval: 2000 })
  const pred = useQuery({ queryKey: ['pred', id], queryFn: () => api.prediction(id), refetchInterval: 3000 })
  const dash = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard })
  const s = stations.data?.find((x) => x.id === id)

  if (stations.error) return <ErrorState error={stations.error} onRetry={() => stations.refetch()} />
  if (!stations.data) return <Skeleton className="h-96" />
  if (!s) return <EmptyState title={`Unknown station “${id}”`} />
  const recent = (obs.data ?? []).slice(-8).reverse()

  return (
    <div className="space-y-6">
      <Link to="/" className="inline-flex items-center gap-1 text-[13px] text-ink-3 hover:text-primary">
        <ArrowLeft size={14} /> Dashboard
      </Link>
      <PageHeader
        eyebrow="Station"
        title={s.name}
        actions={
          <select
            aria-label="Choose station"
            value={id}
            onChange={(e) => (setStation(e.target.value), nav(`/stations/${e.target.value}`))}
            className="h-9 rounded-xl border border-line bg-surface px-3 text-[13.5px]"
          >
            {stations.data.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name} ({x.id})
              </option>
            ))}
          </select>
        }
      >
        {s.id} · IMD grid cell {s.gridLat}°N {s.gridLon}°E, nearest to the city at {s.lat.toFixed(2)}°N {s.lon.toFixed(2)}°E. Source: gridded analysis, not a physical sensor.
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Latest reading">
          {s.latest ? (
            <div className="space-y-3">
              <div className="font-display text-[44px] leading-none font-semibold tabular">{fmtTemp(s.latest.temperatureC)}</div>
              <div className="flex flex-wrap items-center gap-2">
                <BandBadge band={s.latest.band} />
                <span className="text-[13px] text-ink-3">{fmtDelta(s.latest.departureC)} vs normal</span>
              </div>
              <p className="text-[12.5px] text-ink-3">Daily max for {fmtDate(s.latest.observedAt)}. Humidity: not available in the IMD grid.</p>
            </div>
          ) : (
            <EmptyState title="No reading yet">Start the replay.</EmptyState>
          )}
        </Card>
        <Card title="Next-day prediction">
          {pred.data?.available ? (
            <div className="space-y-2">
              <div className="font-display text-[40px] leading-none font-semibold tabular">{fmtTemp(pred.data.predictedC)}</div>
              <p className="text-[13px] text-ink-2">
                For <b>{fmtDate(pred.data.targetDate)}</b>, using data up to {fmtDate(pred.data.basedOn)}.
              </p>
              <p className="text-[12.5px] text-ink-3">
                Persistence baseline {fmtTemp(pred.data.baselineC)} · model <code className="font-mono">{pred.data.modelVersion}</code>
              </p>
            </div>
          ) : (
            <EmptyState title="Prediction unavailable">{pred.data?.reason ?? 'Not enough history.'}</EmptyState>
          )}
        </Card>
        <Card title="Recent history (linked list)" subtitle="Newest first">
          {recent.length ? (
            <ol className="flex flex-wrap items-center gap-1.5">
              {recent.map((o, i) => (
                <li key={o.id} className="flex items-center gap-1.5">
                  <span className="rounded-lg border border-line bg-surface-2 px-2 py-1 text-[12px] tabular">
                    <b>{o.temperatureC.toFixed(1)}°</b> <span className="text-ink-3">{fmtDate(o.observedAt, false)}</span>
                  </span>
                  {i < recent.length - 1 && <span className="text-ink-3">←</span>}
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="Empty list" />
          )}
        </Card>
      </div>
      <Card title="Temperature history" subtitle="Daily maximum vs 2015–24 normal">
        <TrendChart stationId={id} threshold={dash.data?.thresholdC ?? 40} height={320} days={120} />
      </Card>
    </div>
  )
}
