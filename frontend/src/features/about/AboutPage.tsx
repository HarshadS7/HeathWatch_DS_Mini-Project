import { Card, PageHeader } from '../../components/ui'

const MAP = [
  ['1', 'Arrays, structures, pointers', 'Station records and working batches'],
  ['2', 'Linked list', 'Bounded recent history per station'],
  ['3', 'Stack', 'Formula evaluation: infix → postfix'],
  ['4', 'Circular queue', 'Buffer between replay and processing'],
  ['5', 'Binary search tree', 'Per-station date index and range queries'],
  ['6', 'Graph, BFS/DFS', 'Connected hot regions'],
  ['7', 'Sorting and searching', 'Merge sort + binary search on history'],
  ['8', 'Hashing', 'Station-ID lookup with separate chaining'],
]

export default function AboutPage() {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="About" title="HeatWatch">
        A heatwave monitoring site whose data processing runs on hand-written C++ data structures, compiled to WebAssembly and executed in a Web Worker in your browser.
      </PageHeader>
      <Card title="Where each experiment lives" pad={false}>
        <table className="w-full text-[13.5px]">
          <tbody>
            {MAP.map(([n, c, u]) => (
              <tr key={n} className="border-b border-line last:border-0">
                <td className="w-12 px-5 py-2.5 font-mono text-ink-3">{n}</td>
                <td className="px-5 py-2.5 font-medium">{c}</td>
                <td className="px-5 py-2.5 text-ink-2">{u}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Card title="Data source">
        <p className="text-[13.5px] text-ink-2">
          India Meteorological Department, Pune — Daily Maximum Temperature, 1.0° × 1.0° gridded binary, 2015–2025. Stations are the grid cells nearest 16 cities, not physical
          sensors. India boundary: DataMeet (CC BY 2.5 IN). Monitoring bands are illustrative and are not official heatwave declarations.
        </p>
      </Card>
    </div>
  )
}
