import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Navigation from './components/Navigation'
import LandingPage from './pages/LandingPage'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import DealersPage from './pages/DealersPage'
import CohortPage from './pages/CohortPage'

function AppShell() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navigation />

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/dealers" element={<DealersPage />} />
        <Route path="/cohort/:id" element={<CohortPage />} />
      </Routes>
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
