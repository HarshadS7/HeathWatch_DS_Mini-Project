import clsx from 'clsx'
import NumberFlow from '@number-flow/react'
import { AlertTriangle, CloudOff, Inbox, RotateCw } from 'lucide-react'
import type { ReactNode } from 'react'
import { BAND_META } from '../lib/bands'
import type { Band } from '../lib/types'

export function Card({
  title,
  subtitle,
  action,
  children,
  className,
  pad = true,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  pad?: boolean
}) {
  return (
    <section className={clsx('rounded-2xl border border-line bg-surface shadow-card', className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[12.5px] text-ink-3">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={clsx(pad && 'p-5', pad && (title || action) && 'pt-3')}>{children}</div>
    </section>
  )
}

export function KpiTile({
  label,
  value,
  decimals = 0,
  suffix,
  hint,
  chip,
  icon,
  accent,
}: {
  label: string
  value: number | null
  decimals?: number
  suffix?: string
  hint?: ReactNode
  chip?: ReactNode
  icon?: ReactNode
  accent?: string
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-4 shadow-clay">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] font-medium text-ink-3">{label}</span>
        {icon && (
          <span className="grid size-8 place-items-center rounded-xl bg-primary-wash text-primary" style={accent ? { color: accent } : undefined}>
            {icon}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-1 font-display text-[30px] leading-none font-semibold tracking-tight text-ink tabular">
        {value == null ? (
          <span className="text-ink-3">—</span>
        ) : (
          <NumberFlow value={value} format={{ minimumFractionDigits: decimals, maximumFractionDigits: decimals }} />
        )}
        {suffix && value != null && <span className="font-sans text-[15px] font-medium text-ink-3">{suffix}</span>}
      </div>
      <div className="mt-2 flex min-h-6 flex-wrap items-center gap-2 text-[12.5px] text-ink-3">
        {chip}
        {hint}
      </div>
    </div>
  )
}

export function BandBadge({ band, size = 'md' }: { band: Band; size?: 'sm' | 'md' }) {
  const m = BAND_META[band]
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-0.5 text-[12px]',
      )}
      style={{ color: m.varName, background: m.wash }}
    >
      <span aria-hidden className="text-[10px]">
        {m.icon}
      </span>
      {m.label}
    </span>
  )
}

export function Pill({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'primary' | 'warn' | 'ok' }) {
  const tones = {
    neutral: 'bg-sunken text-ink-2',
    primary: 'bg-primary-wash text-primary-ink',
    warn: 'bg-[var(--band-watch-wash)] text-[var(--band-severe)]',
    ok: 'bg-[color-mix(in_srgb,var(--ok)_14%,transparent)] text-ok',
  }
  return <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium', tones[tone])}>{children}</span>
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('skeleton', className)} aria-hidden />
}

export function PageSkeleton() {
  return (
    <div className="space-y-4 p-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  )
}

export function EmptyState({ title, children, icon }: { title: string; children?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong px-6 py-10 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-sunken text-ink-3">{icon ?? <Inbox size={18} />}</span>
      <p className="font-medium text-ink">{title}</p>
      {children && <p className="max-w-sm text-[13px] text-ink-3">{children}</p>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : String(error)
  const offline = /fetch|network|failed/i.test(msg)
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-2 rounded-xl border border-[var(--band-heat-wash)] bg-[var(--band-heat-wash)]/40 px-6 py-8 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-[var(--band-heat-wash)] text-danger">
        {offline ? <CloudOff size={18} /> : <AlertTriangle size={18} />}
      </span>
      <p className="font-medium text-ink">{offline ? 'Backend unreachable' : 'Request failed'}</p>
      <p className="max-w-sm text-[13px] text-ink-3">{msg}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-1 inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] font-medium hover:border-primary">
          <RotateCw size={14} /> Retry
        </button>
      )}
    </div>
  )
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  size = 'md',
  disabled,
  title,
  className,
  type = 'button',
  pressed,
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'icon'
  disabled?: boolean
  title?: string
  className?: string
  type?: 'button' | 'submit'
  pressed?: boolean
}) {
  return (
    <button
      type={type}
      title={title}
      aria-label={title}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'inline-flex items-center justify-center gap-1.5 rounded-xl font-medium transition-[background,border-color,transform,color] duration-150 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45',
        size === 'sm' && 'h-8 px-3 text-[12.5px]',
        size === 'md' && 'h-9 px-3.5 text-[13.5px]',
        size === 'icon' && 'size-9',
        variant === 'primary' && 'bg-primary text-white hover:bg-primary-hover dark:text-[#04231f]',
        variant === 'secondary' && 'border border-line bg-surface text-ink hover:border-primary/60',
        variant === 'ghost' && 'text-ink-2 hover:bg-sunken',
        pressed && 'border-primary bg-primary-wash text-primary-ink',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: ReactNode }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-xl border border-line bg-sunken p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'rounded-[10px] px-3 py-1 text-[12.5px] font-medium transition-colors',
            value === o.value ? 'bg-surface text-ink shadow-card' : 'text-ink-3 hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function PageHeader({ title, eyebrow, children, actions }: { title: ReactNode; eyebrow?: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1 text-[12px] font-semibold tracking-[0.12em] text-primary uppercase">{eyebrow}</div>}
        <h1 className="font-display text-[28px] leading-tight font-semibold tracking-tight text-ink md:text-[32px]">{title}</h1>
        {children && <p className="mt-1 max-w-2xl text-[14px] text-ink-2">{children}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
