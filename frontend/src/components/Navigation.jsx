import { useState } from 'react'
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

  return (
    <header className="site-header">
      <div className="nav-inner">
        <Link to="/" className="brand-lockup" aria-label="CarCollective home" onClick={() => setMenuOpen(false)}>
          <span className="brand-mark"><CarIcon className="h-6 w-6" /></span>
          <span>
            <span className="brand-name block">CarCollective</span>
            <span className="brand-subtitle block">Group buying</span>
          </span>
        </Link>

        <nav className="site-nav" aria-label="Main navigation">
          <NavigationLinks />
        </nav>

        <div className="nav-actions">
          <Link to="/register" className="button button-ghost button-small">Join now</Link>
          <button
            type="button"
            className="mobile-menu-button"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="m6 6 12 12M18 6 6 18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-navigation" className="mobile-nav" aria-label="Mobile navigation">
          <NavigationLinks onNavigate={() => setMenuOpen(false)} />
          <Link to="/register" className="button button-primary mt-2" onClick={() => setMenuOpen(false)}>Join now</Link>
        </nav>
      )}
    </header>
  )
}
