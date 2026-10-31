import { useEffect, useRef, useState } from 'react'

export function Button({ as: Element = 'button', children, variant = 'primary', size = 'default', className = '', ...props }) {
  const classes = ['button', variant === 'primary' ? 'button-primary' : 'button-ghost', size === 'small' ? 'button-small' : '', className]
    .filter(Boolean)
    .join(' ')

  return <Element className={classes} {...props}>{children}</Element>
}

export function Card({ as: Element = 'section', className = '', children, ...props }) {
  return <Element className={`surface-card ${className}`.trim()} {...props}>{children}</Element>
}

export function Badge({ children, tone = 'default', className = '' }) {
  return <span className={`badge ${tone === 'success' ? 'badge-success' : tone === 'warning' ? 'badge-warning' : tone === 'neutral' ? 'badge-neutral' : ''} ${className}`.trim()}>{children}</span>
}

export function ProgressBar({ value = 0, label, className = '' }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))

  return (
    <div className={`progress-track ${className}`.trim()} role="progressbar" aria-valuenow={safeValue} aria-valuemin="0" aria-valuemax="100" aria-label={label || 'Progress'}>
      <div className="progress-fill" style={{ width: `${safeValue}%` }} />
    </div>
  )
}

export function Skeleton({ className = '', style = {} }) {
  return <div aria-hidden="true" className={`skeleton ${className}`.trim()} style={style} />
}

export function Toast({ message, tone = 'default', onDismiss, duration = 3600 }) {
  useEffect(() => {
    if (!message || !duration) return undefined
    const timer = window.setTimeout(() => onDismiss?.(), duration)
    return () => window.clearTimeout(timer)
  }, [duration, message, onDismiss])

  if (!message) return null

  return (
    <div className={`toast-message ${tone === 'error' ? 'border-rose-400/40 bg-rose-950/70 text-rose-100' : ''}`} role={tone === 'error' ? 'alert' : 'status'} aria-live="polite">
      <div className="flex items-center justify-between gap-4">
        <span>{message}</span>
        <button type="button" className="shrink-0 rounded px-2 py-1 text-current/80 hover:text-current" onClick={onDismiss} aria-label="Dismiss notification">×</button>
      </div>
    </div>
  )
}

export function EmptyState({ icon = 'search', title, message, action }) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        {icon === 'car' ? <CarIcon /> : <SearchIcon />}
      </span>
      <h3 className="m-0 text-lg font-bold text-white">{title}</h3>
      <p className="m-0 max-w-md text-sm leading-6">{message}</p>
      {action}
    </div>
  )
}

export function Reveal({ children, className = '', delay = 0, as: Element = 'div', ...props }) {
  const elementRef = useRef(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!element || !('IntersectionObserver' in window)) {
      setVisible(true)
      return undefined
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true)
        observer.disconnect()
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    <Element ref={elementRef} className={`reveal ${visible ? 'is-visible' : ''} ${className}`.trim()} style={{ transitionDelay: `${delay}ms` }} {...props}>
      {children}
    </Element>
  )
}

export function AnimatedCounter({ value, suffix = '', prefix = '', duration = 1100, className = '' }) {
  const ref = useRef(null)
  const [count, setCount] = useState(0)
  const numericValue = Number(value) || 0
  const shouldAnimate = typeof window !== 'undefined'
    && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    && 'IntersectionObserver' in window

  useEffect(() => {
    const element = ref.current
    if (!shouldAnimate || !element) {
      return undefined
    }

    let frameId
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      const start = performance.now()
      const animate = (now) => {
        const progress = Math.min((now - start) / duration, 1)
        const eased = 1 - (1 - progress) ** 4
        setCount(numericValue * eased)
        if (progress < 1) frameId = requestAnimationFrame(animate)
      }
      frameId = requestAnimationFrame(animate)
    }, { threshold: 0.35 })

    observer.observe(element)
    return () => {
      observer.disconnect()
      if (frameId) cancelAnimationFrame(frameId)
    }
  }, [duration, numericValue, shouldAnimate])

  const visibleCount = shouldAnimate ? count : numericValue
  const formatted = Number.isInteger(numericValue) ? Math.round(visibleCount).toLocaleString() : visibleCount.toFixed(1)
  return <span ref={ref} className={className}>{prefix}{formatted}{suffix}</span>
}

export function Modal({ title, description, onClose, children, className = '' }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const previousFocus = document.activeElement
    const dialog = dialogRef.current
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    const focusFirst = () => dialog?.querySelector(focusableSelector)?.focus()
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose()
      } else if (event.key === 'Tab' && dialog) {
        const items = [...dialog.querySelectorAll(focusableSelector)]
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        const activeIndex = items.indexOf(document.activeElement)
        if (activeIndex === -1) {
          event.preventDefault()
          const target = event.shiftKey ? last : first
          target.focus()
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const frame = requestAnimationFrame(focusFirst)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      if (previousFocus instanceof HTMLElement) previousFocus.focus()
    }
  }, [onClose])

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section ref={dialogRef} className={`modal-panel ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby={description ? 'modal-description' : undefined}>
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="modal-title" className="m-0 text-2xl font-bold text-white">{title}</h2>
            {description && <p id="modal-description" className="mt-2 text-sm leading-6 text-slate-400">{description}</p>}
          </div>
          <button type="button" className="rounded-full border border-slate-700 px-3 py-1 text-slate-300 hover:text-white" onClick={onClose} aria-label="Close dialog">×</button>
        </div>
        {children}
      </section>
    </div>
  )
}

export function CarIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 11 1.5-4.2A2 2 0 0 1 8.4 5.5h7.2a2 2 0 0 1 1.9 1.3L19 11" />
      <path d="M3.5 11h17a1.5 1.5 0 0 1 1.5 1.5V18h-2v1.5h-2V18H6v1.5H4V18H2v-5.5A1.5 1.5 0 0 1 3.5 11Z" />
      <path d="M5 14.5h2m10 0h2" />
    </svg>
  )
}

export function SearchIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}

export function SparkleIcon({ className = 'h-6 w-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z" />
      <path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z" />
    </svg>
  )
}

export function CheckIcon({ className = 'h-5 w-5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}
