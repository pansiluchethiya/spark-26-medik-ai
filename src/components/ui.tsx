import type { ReactNode } from 'react'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { cn } from '../lib/cn'

export const btnPrimary =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-white transition hover:bg-accent-hover hover:shadow-sm active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#257d6e] dark:text-white dark:hover:bg-[#2f9483]'

export const btnSecondary =
  'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-line bg-card px-4 text-sm font-semibold text-ink transition hover:border-accent-border hover:bg-accent-soft active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#2c4039] dark:bg-[#192622] dark:text-[#e8f0ee] dark:hover:border-[#296659] dark:hover:bg-[#21302b]'

export const btnGhost =
  'inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg px-3 text-[13px] font-semibold text-muted transition hover:bg-accent-soft hover:text-accent dark:text-[#9eb5ae] dark:hover:bg-[#21302b] dark:hover:text-accent-bright'

export const iconBtn =
  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted transition hover:bg-accent-soft hover:text-accent focus-visible:outline-2 dark:text-[#9eb5ae] dark:hover:bg-[#21302b] dark:hover:text-accent-bright'

export const fieldLabel = 'grid gap-1.5 text-[13px] font-bold text-ink dark:text-[#e8f0ee]'

export const inputCls =
  'min-h-[44px] w-full rounded-xl border border-line bg-card px-3.5 text-[15px] text-ink outline-none transition placeholder:text-faint focus:border-accent focus:shadow-[var(--focus-ring)] dark:border-[#2c4039] dark:bg-[#192622] dark:text-[#e8f0ee]'

export const kickerCls =
  'text-[11px] font-extrabold uppercase tracking-[0.12em] text-accent dark:text-accent-bright'

export function ModalShell({
  labelledBy,
  onBackdrop,
  children,
  maxWidth = 'max-w-[600px]',
  dark = false,
}: {
  labelledBy?: string
  onBackdrop: () => void
  children: ReactNode
  maxWidth?: string
  dark?: boolean
}) {
  const sectionRef = useRef<HTMLElement>(null)
  const previousFocus = useRef<Element | null>(null)

  useEffect(() => {
    previousFocus.current = document.activeElement
    // Move focus into the dialog without stealing it from an already-focused field.
    sectionRef.current?.focus({ preventScroll: true })
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const node = sectionRef.current
      if (!node) return
      const items = Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.getClientRects().length > 0)
      if (items.length === 0) { event.preventDefault(); return }
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (previousFocus.current instanceof HTMLElement) previousFocus.current.focus({ preventScroll: true })
    }
  }, [])
  return (
    <div
      className={cn(
        'fixed inset-0 z-[2000] flex items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-4',
        dark ? 'bg-[#020617]/90 backdrop-blur-md' : 'bg-[#101828]/55 backdrop-blur-sm',
        'animate-fade',
      )}
      role="presentation"
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onBackdrop()
      }}
    >
      <section
        ref={sectionRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          'flex max-h-[92dvh] w-full flex-col overflow-hidden border shadow-lg animate-rise focus:outline-none focus-visible:ring-2 focus-visible:ring-accent',
          'rounded-t-[20px] sm:rounded-[20px]',
          maxWidth,
          dark
            ? 'border-[#334155] bg-[#0f172a] text-white'
            : 'border-line bg-card text-ink dark:border-[#2c4039] dark:bg-[#192622] dark:text-[#e8f0ee]',
        )}
      >
        {children}
      </section>
    </div>
  )
}

export function ModalHeader({
  kicker,
  title,
  titleId,
  subtitle,
  onClose,
}: {
  kicker?: string
  title: string
  titleId?: string
  subtitle?: string
  onClose: () => void
}) {
  return (
    <div
      className="flex shrink-0 items-start justify-between gap-4 border-b border-line-soft px-5 pb-4 pt-5 sm:px-6 dark:border-[#22332c]"
    >
      <div className="min-w-0">
        {kicker && (
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-accent dark:text-accent-bright">
            {kicker}
          </p>
        )}
        <h2 id={titleId} className="mt-1 text-xl font-bold">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-[13px] leading-relaxed text-muted dark:text-[#9eb5ae]">{subtitle}</p>}
      </div>
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className={cn(
          'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-card-subtle text-muted transition hover:bg-accent-soft hover:text-accent dark:border-[#2c4039] dark:bg-[#21302b] dark:hover:text-accent-bright',
        )}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  )
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-card-subtle px-6 py-10 text-center dark:border-[#2c4039] dark:bg-[#21302b]/60">
      <p className="text-[15px] font-bold text-ink dark:text-[#e8f0ee]">{title}</p>
      {body && <p className="max-w-[420px] text-[13px] text-muted dark:text-[#9eb5ae]">{body}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  )
}
