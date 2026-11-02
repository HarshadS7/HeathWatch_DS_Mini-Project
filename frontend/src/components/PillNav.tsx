import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { gsap } from 'gsap'

export type PillNavItem = { label: string; to: string; ariaLabel?: string }

type Props = {
  logo: ReactNode
  logoTo?: string
  items: PillNavItem[]
  activeTo?: string
  className?: string
  ease?: string
  baseColor?: string
  pillColor?: string
  hoveredPillTextColor?: string
  pillTextColor?: string
  initialLoadAnimation?: boolean
  mobileOpen?: boolean
  onItemClick?: () => void
}

// Pill links with a GSAP "rising circle" hover fill (React Bits PillNav pattern), routed with react-router.
// The outer nav shell (.nav / .nav-in) is owned by the caller, so its theme, glass and position stay untouched.
export default function PillNav({
  logo,
  logoTo = '/',
  items,
  activeTo,
  className = '',
  ease = 'power2.easeOut',
  baseColor = 'var(--primary)',
  pillColor = 'transparent',
  hoveredPillTextColor = '#fff',
  pillTextColor = 'var(--ink-2)',
  initialLoadAnimation = false,
  mobileOpen = false,
  onItemClick,
}: Props) {
  const circleRefs = useRef<(HTMLSpanElement | null)[]>([])
  const tlRefs = useRef<gsap.core.Timeline[]>([])
  const tweenRefs = useRef<gsap.core.Tween[]>([])
  const logoRef = useRef<HTMLSpanElement>(null)
  const logoTween = useRef<gsap.core.Tween | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const layout = () => {
      circleRefs.current.forEach((circle, i) => {
        const pill = circle?.parentElement
        if (!circle || !pill) return
        const { width: w, height: h } = pill.getBoundingClientRect()
        if (!w || !h) return
        const R = ((w * w) / 4 + h * h) / (2 * h)
        const D = Math.ceil(2 * R) + 2
        const delta = Math.ceil(R - Math.sqrt(Math.max(0, R * R - (w * w) / 4))) + 1
        circle.style.width = circle.style.height = `${D}px`
        circle.style.bottom = `-${delta}px`
        gsap.set(circle, { xPercent: -50, scale: 0, transformOrigin: `50% ${D - delta}px` })

        const label = pill.querySelector('.pill-label')
        const hover = pill.querySelector('.pill-label-hover')
        if (label) gsap.set(label, { y: 0 })
        if (hover) gsap.set(hover, { y: h + 12, opacity: 0 })

        tlRefs.current[i]?.kill()
        const tl = gsap.timeline({ paused: true })
        tl.to(circle, { scale: 1.2, xPercent: -50, duration: 2, ease, overwrite: 'auto' }, 0)
        if (label) tl.to(label, { y: -(h + 8), duration: 2, ease, overwrite: 'auto' }, 0)
        if (hover) tl.to(hover, { y: 0, opacity: 1, duration: 2, ease, overwrite: 'auto' }, 0)
        tlRefs.current[i] = tl
      })
    }
    layout()
    window.addEventListener('resize', layout)
    document.fonts?.ready.then(layout).catch(() => {})
    if (initialLoadAnimation && listRef.current) gsap.fromTo(listRef.current, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.6, ease })
    return () => window.removeEventListener('resize', layout)
  }, [items, ease, initialLoadAnimation, mobileOpen])

  const enter = (i: number) => {
    const tl = tlRefs.current[i]
    if (!tl) return
    tweenRefs.current[i]?.kill()
    tweenRefs.current[i] = tl.tweenTo(tl.duration(), { duration: 0.3, ease, overwrite: 'auto' })
  }
  const leave = (i: number) => {
    const tl = tlRefs.current[i]
    if (!tl) return
    tweenRefs.current[i]?.kill()
    tweenRefs.current[i] = tl.tweenTo(0, { duration: 0.2, ease, overwrite: 'auto' })
  }
  const spinLogo = () => {
    if (!logoRef.current) return
    logoTween.current?.kill()
    gsap.set(logoRef.current, { rotate: 0 })
    logoTween.current = gsap.to(logoRef.current, { rotate: 360, duration: 0.25, ease, overwrite: 'auto' })
  }

  const vars = {
    '--pill-base': baseColor,
    '--pill-bg': pillColor,
    '--pill-hover-text': hoveredPillTextColor,
    '--pill-text': pillTextColor,
  } as CSSProperties

  return (
    <>
      <Link to={logoTo} className="brand" onMouseEnter={spinLogo}>
        <span ref={logoRef} className="logo">
          {logo}
        </span>
        <span>
          <b>HeatWatch</b>
          <small>Heatwave monitor</small>
        </span>
      </Link>
      <nav className={`pill-nav ${mobileOpen ? 'open' : ''} ${className}`} style={vars} aria-label="Primary">
        <div ref={listRef} className="pill-list" role="menubar">
          {items.map((it, i) => (
            <Link
              key={it.to}
              role="menuitem"
              to={it.to}
              aria-label={it.ariaLabel || it.label}
              aria-current={activeTo === it.to ? 'page' : undefined}
              className={`pill${activeTo === it.to ? ' is-active' : ''}`}
              onMouseEnter={() => enter(i)}
              onMouseLeave={() => leave(i)}
              onClick={onItemClick}
            >
              <span className="hover-circle" aria-hidden="true" ref={(el) => void (circleRefs.current[i] = el)} />
              <span className="label-stack">
                <span className="pill-label">{it.label}</span>
                <span className="pill-label-hover" aria-hidden="true">
                  {it.label}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
