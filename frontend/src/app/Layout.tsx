import clsx from 'clsx'
import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Menu, Moon, Pause, Play, RotateCcw, Sun, X } from 'lucide-react'
import { api, USE_MOCK } from '../lib/api'
import { fmtDate } from '../lib/format'
import PillNav from '../components/PillNav'
import Footer, { ThermoMark } from '../components/Footer'
import { activeNav, NAV } from './nav'

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

function ReplayControls() {
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['dashboard'], queryFn: api.dashboard, refetchInterval: 1500 })
  const running = data?.replay.running ?? false
  const act = async (a: 'start' | 'pause' | 'reset') => {
    await api.replay(a)
    qc.invalidateQueries()
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="hidden items-center gap-1.5 px-1 text-[12px] whitespace-nowrap text-ink-3 2xl:inline-flex" title={running ? 'Replaying' : 'Paused'}>
        <span className={clsx('size-2 rounded-full', running ? 'bg-ok' : 'bg-ink-3')} aria-hidden />
        <span className="font-medium text-ink tabular">{fmtDate(data?.asOf)}</span>
        {USE_MOCK && <span className="font-semibold text-[var(--band-heat)]">· mock</span>}
      </span>
      <button className="ib" title={running ? 'Pause replay' : 'Start replay'} aria-label={running ? 'Pause replay' : 'Start replay'} onClick={() => act(running ? 'pause' : 'start')}>
        {running ? <Pause size={15} /> : <Play size={15} />}
      </button>
      <button className="ib" title="Reset replay session" aria-label="Reset replay session" onClick={() => act('reset')}>
        <RotateCcw size={14} />
      </button>
    </div>
  )
}

function Nav() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const { dark, toggle } = useTheme()
  useEffect(() => { setOpen(false) }, [pathname])
  return (
    <header className="nav">
      <div className="nav-in">
        <PillNav
          logo={<ThermoMark />}
          items={NAV.map((n) => ({ label: n.label, to: n.to }))}
          activeTo={activeNav(pathname)}
          ease="power2.easeOut"
          baseColor="var(--primary)"
          pillColor="transparent"
          hoveredPillTextColor="#fff"
          pillTextColor="var(--ink-2)"
          mobileOpen={open}
          onItemClick={() => setOpen(false)}
        />
        <ReplayControls />
        <button className="ib" title={dark ? 'Light mode' : 'Dark mode'} aria-label={dark ? 'Light mode' : 'Dark mode'} onClick={toggle}>
          {dark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
        <button className="ib burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X size={17} /> : <Menu size={17} />}
        </button>
      </div>
    </header>
  )
}

export function Layout() {
  const { pathname } = useLocation()
  const fullBleed = pathname.startsWith('/lab')
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return (
    <>
      <Nav />
      <Footer>
        <main className={clsx('relative z-[1] min-h-screen pt-24', fullBleed ? '' : 'mx-auto w-full max-w-[1440px] px-4 pb-16 md:px-6')}>
          <Outlet />
        </main>
      </Footer>
    </>
  )
}
