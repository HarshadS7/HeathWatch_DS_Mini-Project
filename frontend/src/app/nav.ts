/** Primary navigation (pill navbar + footer quick links). `match` marks a pill active for nested routes. */
export const NAV: { to: string; label: string; match?: string }[] = [
  { to: '/', label: 'Dashboard' },
  { to: '/stations/DEL', label: 'Stations', match: '/stations' },
  { to: '/history', label: 'History' },
  { to: '/alerts', label: 'Alerts' },
  { to: '/lab', label: 'Structure Lab', match: '/lab' },
  { to: '/model', label: 'Model' },
  { to: '/about', label: 'About' },
]

export function activeNav(pathname: string) {
  return (NAV.find((n) => (n.match ? pathname.startsWith(n.match) : pathname === n.to)) ?? NAV[0]).to
}
