import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { cn } from '../lib/cn'

export function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) { setVisible(true); observer.disconnect() }
      },
      { threshold },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])
  return { ref, visible }
}

export function Reveal({ children, className, delay = 0, as: Tag = 'div' }: {
  children: ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'section' | 'span'
}) {
  const { ref, visible } = useInView<HTMLDivElement>()
  const style: CSSProperties | undefined = delay ? { transitionDelay: `${delay}ms` } : undefined
  return (
    <Tag ref={ref as never} style={style} className={cn('reveal', visible && 'is-visible', className)}>
      {children}
    </Tag>
  )
}
