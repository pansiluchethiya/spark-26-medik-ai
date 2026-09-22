import { LiquidGlass } from '@creativoma/liquid-glass'
import { useEffect, useState, type ReactNode } from 'react'
import { cn } from '../lib/cn'

function useDarkTheme(): boolean {
  const [dark, setDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark')
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.getAttribute('data-theme') === 'dark')
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])
  return dark
}

// Real liquid-glass chat bubble (SVG displacement + backdrop blur).
// Theme-aware tint; `disabled` renders plain children (used for older
// messages in long chats to keep scrolling smooth).
export function GlassBubble({ kind, disabled = false, className, children }: {
  kind: 'user' | 'assistant'
  disabled?: boolean
  className?: string
  children: ReactNode
}) {
  const dark = useDarkTheme()
  const tintColor = dark
    ? kind === 'user' ? 'rgba(33,48,43,0.55)' : 'rgba(25,38,34,0.55)'
    : kind === 'user' ? 'rgba(234,243,241,0.6)' : 'rgba(255,255,255,0.6)'
  return (
    <LiquidGlass
      disabled={disabled}
      backdropBlur={8}
      displacementScale={kind === 'user' ? 55 : 75}
      turbulenceSeed={kind === 'user' ? 3 : 7}
      tintColor={tintColor}
// NOTE: the lib sets overflow:hidden on the wrapper, which zeroes the flex
// automatic minimum size — without shrink-0 every bubble would shrink-fit
// the visible scroll area instead of overflowing it (clipped messages).
// min-h-fit is a second guard for non-flex contexts.
      className={cn('min-w-0 max-w-full rounded-2xl border shadow-sm shrink-0 min-h-fit', className)}
      contentClassName="min-w-0 p-4 text-ink sm:p-[18px_22px] dark:text-[#e8f0ee]"
    >
      {children}
    </LiquidGlass>
  )
}
