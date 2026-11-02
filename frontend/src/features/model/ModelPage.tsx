import { Card, EmptyState, PageHeader } from '../../components/ui'

export default function ModelPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Prediction model" title="Next-day maximum temperature">
        Linear regression on lagged daily maxima and seasonal features, trained offline on 2015–2022, validated on 2023 and tested on 2024–2025. It is always compared with the
        persistence baseline (tomorrow = today).
      </PageHeader>
      <Card title="Held-out evaluation">
        <EmptyState title="Evaluation report not generated yet">Run ml/train.py to produce model.json with MAE for the model and the baseline.</EmptyState>
      </Card>
    </div>
  )
}
