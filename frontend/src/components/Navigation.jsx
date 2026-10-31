import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { CarIcon } from './ui'

const navigationItems = [
  { label: 'Home', to: '/' },
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Dealers', to: '/dealers' },
  { label: 'Cohort', to: '/cohort/cohort-1', section: '/cohort/' },
]

function NavigationLinks({ onNavigate }) {
  const location = useLocation()

  return navigationItems.map((item) => {
    const active = item.section
      ? location.pathname.startsWith(item.section)
      : location.pathname === item.to

    return (
      <NavLink
        key={item.label}
        to={item.to}
        end={!item.section}
        onClick={onNavigate}
        className={`nav-link ${active ? 'active' : ''}`}
        aria-current={active ? 'page' : undefined}
      >
        {item.label}
      </NavLink>
    )
  })
}

export default function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return undefined

    const previousOverflow = document.body.style.overflow
    const focusFrame = window.requestAnimationFrame(() => menuRef.current?.querySelector('a')?.focus())
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        menuButtonRef.current?.focus()
        return
      }

      if (event.key !== 'Tab' || !menuRef.current) return
      const focusable = [...menuRef.current.querySelectorAll('a[href], button:not([disabled])')]
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return
      const activeIndex = focusable.indexOf(document.activeElement)
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

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  return (
    <header className={`site-header ${menuOpen ? 'ed-menu-open' : ''}`}>
      <div className="nav-inner">
        <Link to="/" className="brand-lockup" aria-label="CarCollective home" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark"><CarIcon className="h-6 w-6" /></span>
          <span>
            <span className="brand-name block">CarCollective</span>
            <span className="brand-subtitle block">Group buying</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Main navigation">
          <NavigationLinks onNavigate={() => setMenuOpen(false)} />
        </nav>

        <div className="nav-actions">
          <Link to="/register" className="button button-ghost button-small">Join now</Link>
          <button
            ref={menuButtonRef}
            type="button"
            className="mobile-menu-button"
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav ref={menuRef} id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">
          <NavigationLinks onNavigate={() => setMenuOpen(false)} />
          <Link to="/register" className="button button-primary mt-2" onClick={() => setMenuOpen(false)}>Join now</Link>
        </nav>
      )}
    </header>
  )
}
