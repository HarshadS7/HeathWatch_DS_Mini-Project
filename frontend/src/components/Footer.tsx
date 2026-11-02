import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
import { ArrowUp, ExternalLink, Heart } from 'lucide-react'
import MicroSlats from './MicroSlats'
import { useIsDark } from '../lib/useIsDark'
import { NAV } from '../app/nav'

// Fill these in for your team / repository; empty values are not rendered.
const TEAM = ''
const REPO_URL = ''

const SOURCES = [
  { label: 'IMD Pune gridded data', href: 'https://www.imdpune.gov.in/' },
  { label: 'IMD heatwave criteria', href: 'https://mausam.imd.gov.in/pdfs/heatcolduser/Definition.pdf' },
  { label: 'DataMeet India maps', href: 'https://github.com/datameet/maps' },
]

const SLATS_LIGHT = { color: '#9fd8cf', glintColor: '#ffffff', backgroundColor: '#f4f3ef', slatWidth: 24, slatHeight: 60, gap: 4 }
const SLATS_DARK = { color: '#1f5f58', glintColor: '#7fe3d4', backgroundColor: '#0e1113', slatWidth: 24, slatHeight: 60, gap: 4 }

// Wraps the page content. Over the last 500px of scroll the content shrinks, lifts and rounds,
// revealing the sticky footer that sits underneath it.
export default function Footer({ children }: { children: React.ReactNode }) {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [contentHeight, setContentHeight] = useState(0)
  const contentRef = useRef<HTMLDivElement>(null)
  const dark = useIsDark()

  useEffect(() => {
    const handleScroll = () => {
      const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight
      const triggerDistance = 500
      const triggerPoint = Math.max(0, scrollableHeight - triggerDistance)
      const y = window.scrollY
      setScrollProgress(y > triggerPoint ? Math.min((y - triggerPoint) / triggerDistance, 1) : 0)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
    }
  }, [])

  useEffect(() => {
    const element = contentRef.current
    if (!element) return
    const measure = () => setContentHeight(element.getBoundingClientRect().height)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const MAX_SCALE_SHRINK = 0.08
  const MAX_NET_LIFT_PX = 80

  const scale = 1 - scrollProgress * MAX_SCALE_SHRINK
  // Scaling around the centre moves the bottom edge by an amount that depends on page height;
  // compensate with the measured height so the visible lift stays consistent.
  const scaleLiftPx = ((1 - scale) * contentHeight) / 2
  const translateY = Math.max(-160, Math.min(scaleLiftPx - scrollProgress * MAX_NET_LIFT_PX, 320))
  const borderRadius = Math.min(scrollProgress * 32, 32)

  return (
    <>
      <div
        ref={contentRef}
        className="shrink-wrap relative z-10 overflow-clip transition-transform duration-75 will-change-transform"
        style={{
          transform: `translateY(${translateY}px) scale(${scale})`,
          borderRadius: `${borderRadius}px`,
          transformOrigin: 'center center',
          boxShadow: scrollProgress > 0 ? `0 30px 80px -30px rgba(15, 50, 46, ${0.35 * scrollProgress})` : undefined,
        }}
      >
        <div className="bg-fx" aria-hidden="true">
          <MicroSlats {...(dark ? SLATS_DARK : SLATS_LIGHT)} interactive />
        </div>
        {children}
      </div>
      <footer className="sticky bottom-0 z-[5] border-t border-line bg-surface/60 backdrop-blur-xl">
        <div className="mx-auto max-w-[1440px] px-5 pt-14 pb-10 md:px-8">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 md:grid-cols-[1fr_auto_auto] md:gap-x-20">
            <div>
              <Link to="/" className="flex items-center gap-3 no-underline">
                <span className="logo">
                  <ThermoMark />
                </span>
                <span className="font-display text-lg font-semibold text-ink">HeatWatch</span>
              </Link>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-3">
                Heatwave monitoring for 16 Indian grid cells, powered by hand-written C++ data structures running in your browser.
              </p>
              <p className="mt-3 text-xs text-ink-3">Data Structures mini project · KJS-CES-01 Climate Intelligence · K. J. Somaiya College of Engineering</p>
              {REPO_URL && (
                <a href={REPO_URL} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm text-ink-2 no-underline hover:text-ink">
                  <FontAwesomeIcon icon={faGithub} /> Source code
                </a>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">Quick links</h4>
              <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {NAV.map((n) => (
                  <li key={n.to}>
                    <Link to={n.to} className="text-ink-3 no-underline transition-colors hover:text-ink">
                      {n.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">Data sources</h4>
              <ul className="mt-4 space-y-2 text-sm">
                {SOURCES.map((s) => (
                  <li key={s.href}>
                    <a href={s.href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-ink-3 no-underline transition-colors hover:text-ink">
                      {s.label} <ExternalLink size={12} />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="w-full overflow-hidden py-8">
            <h2
              aria-hidden="true"
              className="m-0 block font-display text-[15vw] leading-none font-bold tracking-tight text-transparent select-none md:text-[11vw] lg:text-[150px]"
              style={{ background: 'linear-gradient(180deg, var(--primary), #9fd8cf)', WebkitBackgroundClip: 'text', backgroundClip: 'text', textAlign: 'center' }}
            >
              HEATWATCH
            </h2>
          </div>

          <div className="flex flex-col items-center justify-between gap-3 border-t border-line pt-5 text-xs text-ink-3 sm:flex-row">
            <span className="inline-flex items-center gap-1.5">
              Made with <Heart size={13} strokeWidth={1.75} className="text-[var(--band-heat)]" aria-label="love" />
              {TEAM ? ` by ${TEAM}` : ''} · bands are illustrative, not official IMD declarations
            </span>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-1.5 text-ink-3 hover:text-ink"
            >
              Back to top <ArrowUp size={13} strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </footer>
    </>
  )
}

export function ThermoMark() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
      <path d="M12 3a2.6 2.6 0 0 0-2.6 2.6v8.1a4.6 4.6 0 1 0 5.2 0V5.6A2.6 2.6 0 0 0 12 3z" fill="currentColor" />
      <circle cx="12" cy="17.4" r="2.4" fill="#f08a4b" />
    </svg>
  )
}
