import type { Band } from './types'

/** Illustrative monitoring bands inspired by IMD heatwave criteria (not official declarations). */
export const BAND_META: Record<Band, { label: string; short: string; icon: string; varName: string; wash: string }> = {
  normal: { label: 'Normal', short: 'Normal', icon: '●', varName: 'var(--band-normal)', wash: 'var(--band-normal-wash)' },
  watch: { label: 'Watch', short: 'Watch', icon: '▲', varName: 'var(--band-watch)', wash: 'var(--band-watch-wash)' },
  heat: { label: 'Heatwave-like', short: 'Heat', icon: '▲▲', varName: 'var(--band-heat)', wash: 'var(--band-heat-wash)' },
  severe: { label: 'Severe-like', short: 'Severe', icon: '⚠', varName: 'var(--band-severe)', wash: 'var(--band-severe-wash)' },
}

export const BAND_ORDER: Band[] = ['normal', 'watch', 'heat', 'severe']

/**
 * Band rule (simplified IMD plains criteria):
 *   severe : max >= 47, or (max >= 40 and departure > 6.4)
 *   heat   : max >= 45, or (max >= 40 and departure >= 4.5)
 *   watch  : max >= 37
 */
export function bandFor(t: number, departure: number | null): Band {
  const d = departure ?? 0
  if (t >= 47 || (t >= 40 && d > 6.4)) return 'severe'
  if (t >= 45 || (t >= 40 && d >= 4.5)) return 'heat'
  if (t >= 37) return 'watch'
  return 'normal'
}

/** Continuous temperature ramp (YlOrRd-like) for fills: 20 C pale -> 48 C deep red. */
const RAMP = ['#fff3c4', '#fed976', '#feb24c', '#fd8d3c', '#f03b20', '#bd0026', '#800026']
export function tempColor(t: number): string {
  const lo = 22
  const hi = 48
  const x = Math.min(1, Math.max(0, (t - lo) / (hi - lo))) * (RAMP.length - 1)
  const i = Math.floor(x)
  if (i >= RAMP.length - 1) return RAMP[RAMP.length - 1]
  return mix(RAMP[i], RAMP[i + 1], x - i)
}

export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (s: number) => [(s >> 16) & 255, (s >> 8) & 255, s & 255]
  const A = ch(pa)
  const B = ch(pb)
  const c = A.map((v, k) => Math.round(v + (B[k] - v) * t))
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('')
}
