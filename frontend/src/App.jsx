import { lazy, Suspense } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import Navigation from './components/Navigation'

const currentYear = new Date().getFullYear()
const LandingPage = lazy(() => import('./pages/LandingPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const DealersPage = lazy(() => import('./pages/DealersPage'))
const CohortPage = lazy(() => import('./pages/CohortPage'))

function PageLoading() {
  return (
    <main className="page-main page-enter" aria-live="polite">
      <div className="skeleton h-8 w-40" />
      <div className="skeleton mt-4 h-14 w-3/4" />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => <div key={item} className="skeleton h-48" />)}
      </div>
    </main>
  )
}

function NotFoundPage() {
  return (
    <main className="page-main page-enter">
      <div className="empty-state">
        <span className="empty-state-icon" aria-hidden="true">404</span>
        <h1 className="m-0 text-2xl font-bold text-white">Page not found</h1>
        <p className="m-0 max-w-md text-sm leading-6">That page may have moved. Head back to the CarCollective home page.</p>
        <Link className="button button-primary mt-2" to="/">Back home</Link>
      </div>
    </main>
  )
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <Link to="/" className="brand-lockup" aria-label="CarCollective home">
          <span className="brand-mark" aria-hidden="true">C</span>
          <span>
            <span className="brand-name block">CarCollective</span>
            <span className="brand-subtitle block">Better together</span>
          </span>
        </Link>
        <nav className="footer-links" aria-label="Footer navigation">
          <Link to="/dashboard">Find a cohort</Link>
          <Link to="/dealers">Dealer pricing</Link>
          <Link to="/register">Join the network</Link>
        </nav>
        <span>© {currentYear} CarCollective</span>
      </div>
    </footer>
  )
}

function AppShell() {
  return (
    <div className="app-shell">
      <Navigation />
      <div>
        <Suspense fallback={<PageLoading />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/register" element={<AuthPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dealers" element={<DealersPage />} />
            <Route path="/cohort/:id" element={<CohortPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>
      <Footer />
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

export default App
