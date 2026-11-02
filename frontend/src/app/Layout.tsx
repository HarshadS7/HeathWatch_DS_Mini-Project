import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  Boxes,
  BrainCircuit,
  ChevronsLeft,
  History,
  Info,
  LayoutDashboard,
  MapPin,
  Menu,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Sun,
  X,
} from 'lucide-react'
import { api, USE_MOCK } from '../lib/api'
import { fmtDate } from '../lib/format'
import { Button } from '../components/ui'

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/stations/DEL', label: 'Stations', icon: MapPin, match: '/stations' },
  { to: '/history', label: 'History', icon: History },
  { to: '/alerts', label: 'Alerts & regions', icon: Bell },
  { to: '/lab', label: 'Structure Lab', icon: Boxes, badge: '3D' },
  { to: '/model', label: 'Prediction model', icon: BrainCircuit },
  { to: '/about', label: 'About', icon: Info },
]

function Logo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-clay dark:text-[#04231f]">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path d="M12 3a2.6 2.6 0 0 0-2.6 2.6v8.1a4.6 4.6 0 1 0 5.2 0V5.6A2.6 2.6 0 0 0 12 3z" fill="currentColor" />
          <circle cx="12" cy="17.4" r="2.4" fill="#f08a4b" />
        </svg>
      </span>
      {!compact && (
        <span className="leading-tight">
          <b className="block font-display text-[17px] tracking-tight">HeatWatch</b>
          <small className="block text-[10.5px] font-medium tracking-[0.14em] text-ink-3 uppercase">Heatwave monitor</small>
        </span>
      )}
    </div>
  )
}

function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark')
  useEffect(() => {
    if (dark) document.documentElement.dataset.theme = 'dark'
    else delete document.documentElement.dataset.theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0e1113' : '#f4f3ef')
    try {
      localStorage.setItem('hw-theme', dark ? 'dark' : 'light')
    } catch {
      /* storage blocked */
    }
  }, [dark])
  return { dark, toggle: () => setDark((d) => !d) }
}

function NavItems({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const loc = useLocation()
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {NAV.map((n) => {
        const Icon = n.icon
        const forceActive = n.match ? loc.pathname.startsWith(n.match) : false
        return (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={onNavigate}
            title={collapsed ? n.label : undefined}
            className={({ isActive }) =>
              clsx(
                'group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[13.5px] font-medium transition-colors',
                isActive || forceActive ? 'bg-primary-wash text-primary-ink' : 'text-ink-2 hover:bg-sunken hover:text-ink',
                collapsed && 'justify-center px-0',
              )
            }
          >
            <Icon size={18} strokeWidth={1.9} className="shrink-0" />
            {!collapsed && <span className="truncate">{n.label}</span>}
            {!collapsed && n.badge && (
              <span className="ml-auto rounded-md bg-[var(--band-heat-wash)] px-1.5 py-px text-[10px] font-bold text-[var(--band-heat)]">{n.badge}</span>
            )}
          </NavLink>
        )
      })}
    </nav>
  )
}

function ReplayControls() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard, refetchInterval: 1500 })
  const running = data?.replay.running ?? false
  const act = async (a: 'start' | 'pause' | 'reset') => {
    await api.replay(a)
    qc.invalidateQueries()
  }
  const pct = data ? Math.round((data.replay.position / data.replay.total) * 100) : 0
  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-[12.5px] md:flex">
        <span className={clsx('size-2 rounded-full', running ? 'bg-ok' : 'bg-ink-3')} aria-hidden />
        <span className="text-ink-3">{running ? 'Replaying' : 'Paused'}</span>
        <span className="font-medium text-ink tabular">{fmtDate(data?.asOf)}</span>
        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-sunken" aria-label={`Replay ${pct}% complete`}>
          <span className="block h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </span>
      </div>
      <Button size="icon" variant={running ? 'secondary' : 'primary'} title={running ? 'Pause replay' : 'Start replay'} onClick={() => act(running ? 'pause' : 'start')}>
        {running ? <Pause size={16} /> : <Play size={16} />}
      </Button>
      <Button size="icon" title="Reset replay session" onClick={() => act('reset')}>
        <RotateCcw size={15} />
      </Button>
    </div>
  )
}

export function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { dark, toggle } = useTheme()
  const loc = useLocation()
  const fullBleed = loc.pathname.startsWith('/lab')

  useEffect(() => setMobileOpen(false), [loc.pathname])

  return (
    <div className="flex min-h-screen">
      {/* desktop sidebar */}
      <aside
        className={clsx(
          'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface/70 px-3 py-4 backdrop-blur lg:flex',
          collapsed ? 'w-[72px]' : 'w-[232px]',
        )}
      >
        <div className={clsx('mb-6 flex items-center', collapsed ? 'justify-center' : 'justify-between px-1')}>
          <Logo compact={collapsed} />
        </div>
        <NavItems collapsed={collapsed} />
        <div className="mt-auto space-y-2">
          {!collapsed && (
            <div className="rounded-xl bg-sunken p-3 text-[11.5px] leading-snug text-ink-3">
              Data: IMD Pune daily gridded max temperature, 1°×1°. Stations are grid cells near cities, not sensors.
              {USE_MOCK && <span className="mt-1 block font-semibold text-[var(--band-heat)]">Mock backend (dev)</span>}
            </div>
          )}
          <div className={clsx('flex gap-1', collapsed ? 'flex-col items-center' : 'items-center justify-between')}>
            <Button variant="ghost" size="icon" title={dark ? 'Light mode' : 'Dark mode'} onClick={toggle}>
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </Button>
            <Button variant="ghost" size="icon" title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed((c) => !c)}>
              <ChevronsLeft size={17} className={clsx('transition-transform', collapsed && 'rotate-180')} />
            </Button>
          </div>
        </div>
      </aside>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button className="absolute inset-0 bg-black/30 backdrop-blur-sm" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-surface p-4 shadow-lift">
            <div className="mb-6 flex items-center justify-between">
              <Logo />
              <Button variant="ghost" size="icon" title="Close menu" onClick={() => setMobileOpen(false)}>
                <X size={18} />
              </Button>
            </div>
            <NavItems onNavigate={() => setMobileOpen(false)} />
            <div className="mt-auto">
              <Button variant="secondary" onClick={toggle} className="w-full">
                {dark ? <Sun size={16} /> : <Moon size={16} />} {dark ? 'Light mode' : 'Dark mode'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-page/80 px-4 backdrop-blur-md md:px-6">
          <Button variant="ghost" size="icon" title="Open menu" onClick={() => setMobileOpen(true)} className="lg:hidden">
            <Menu size={19} />
          </Button>
          <div className="lg:hidden">
            <Logo compact />
          </div>
          <div className="hidden min-w-0 items-center gap-2 text-[13px] text-ink-3 sm:flex">
            <span className="font-medium text-ink">India · 16 monitored grid cells</span>
            <span aria-hidden>·</span>
            <span className="rounded-md bg-primary-wash px-2 py-0.5 text-[11.5px] font-semibold text-primary-ink">Offline replay · IMD grid</span>
          </div>
          <div className="ml-auto">
            <ReplayControls />
          </div>
        </header>
        <main className={clsx('flex-1', fullBleed ? '' : 'mx-auto w-full max-w-[1440px] px-4 py-6 md:px-6 md:py-8')}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
