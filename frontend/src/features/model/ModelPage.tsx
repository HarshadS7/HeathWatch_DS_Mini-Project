import { useQuery } from '@tanstack/react-query'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, EmptyState, KpiTile, PageHeader, Skeleton } from '../../components/ui'

interface Report {
  version: string
  features: string[]
  coef: number[]
  evaluation: {
    split: Record<string, string>
    samples: Record<string, number>
    validation: { model: number; persistence: number }
    test: { model: number; persistence: number }
    perStation: Record<string, { n: number; model: number; persistence: number }>
  }
}

export default function ModelPage() {
  const q = useQuery({ queryKey: ['model'], queryFn: async () => (await fetch('/model.json')).json() as Promise<Report>, staleTime: Infinity })
  const e = q.data?.evaluation
  const gain = e ? ((e.test.persistence - e.test.model) / e.test.persistence) * 100 : 0

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Prediction model" title="Next-day maximum temperature">
        Linear regression on today&apos;s and the previous three days&apos; maxima, a 7-day mean and the season. Trained offline in Python (scikit-learn) on 2015–2022, validated on 2023 and tested on
        2024–2025, always against the persistence baseline: “tomorrow = today”.
      </PageHeader>
      {q.isLoading ? (
        <Skeleton className="h-64" />
      ) : !e ? (
        <EmptyState title="model.json not found">Run python ml/train.py.</EmptyState>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiTile label="Test MAE · model" value={e.test.model} decimals={3} suffix="°C" />
            <KpiTile label="Test MAE · persistence" value={e.test.persistence} decimals={3} suffix="°C" />
            <KpiTile label="Improvement over baseline" value={gain} decimals={1} suffix="%" />
            <KpiTile label="Test samples" value={e.samples.test} hint={<span>{e.split.test}</span>} />
          </div>
          <Card title="Honest reading of the result">
            <p className="text-[14px] text-ink-2">
              The model beats persistence by only {(e.test.persistence - e.test.model).toFixed(3)} °C on held-out years. Daily maximum temperature is strongly autocorrelated, so “tomorrow =
              today” is already a hard baseline; the regression mainly adds a small seasonal correction. No accuracy percentages or confidence values are claimed beyond these measured errors.
            </p>
          </Card>
          <Card title="Mean absolute error per station (test 2024–2025)" subtitle="Lower is better">
            <div className="h-[340px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={Object.entries(e.perStation).map(([id, v]) => ({ id, ...v }))} margin={{ left: -16 }} accessibilityLayer>
                  <CartesianGrid vertical={false} stroke="var(--line)" />
                  <XAxis dataKey="id" tick={{ fontSize: 11, fill: 'var(--ink-3)' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--ink-3)' }} tickLine={false} axisLine={false} unit="°" />
                  <Tooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, fontSize: 12.5 }} formatter={(v) => `${Number(v).toFixed(3)} °C`} />
                  <Legend wrapperStyle={{ fontSize: 12.5 }} />
                  <Bar dataKey="persistence" name="Persistence" fill="var(--line-strong)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="model" name="Linear regression" fill="var(--primary)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
