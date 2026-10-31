import { NavLink } from 'react-router-dom'

const navigationItems = [
  { label: 'Home', to: '/' },
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Dealers', to: '/dealers' },
  { label: 'Cohort', to: '/cohort/cohort-1' },
]

export default function Navigation() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <NavLink to="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 font-black text-lg text-white">
            C
          </div>
          <div>
            <p className="text-xl font-bold tracking-tight text-white">CarCollective</p>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Group buying</p>
          </div>
        </NavLink>

        <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          {navigationItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) => `transition hover:text-cyan-300 ${isActive ? 'text-cyan-300' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <NavLink to="/register" className="rounded-full border border-cyan-400/60 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20">
          Join now
        </NavLink>
      </div>
    </header>
  )
}
