const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export const fmtTemp = (t: number | null | undefined, digits = 1) =>
  t == null || Number.isNaN(t) ? '—' : `${t.toFixed(digits)} °C`

export const fmtDelta = (d: number | null | undefined) =>
  d == null ? '—' : `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(1)} °C`

export function fmtDate(iso: string | null | undefined, withYear = true) {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}${withYear ? ' ' + y : ''}`
}

export function fmtShortDate(iso: string) {
  const [, m, d] = iso.slice(0, 10).split('-').map(Number)
  return `${d} ${MONTHS[m - 1]}`
}

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0)

export function addDays(iso: string, n: number) {
  const dt = new Date(iso + 'T00:00:00Z')
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}

export function haversineKm(aLat: number, aLon: number, bLat: number, bLon: number) {
  const R = 6371
  const r = Math.PI / 180
  const dLat = (bLat - aLat) * r
  const dLon = (bLon - aLon) * r
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}
