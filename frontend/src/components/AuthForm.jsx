import { useState } from 'react'
import { apiUrl } from '../lib/api'
import { Button, Card } from './ui'

const defaultForm = {
  email: '',
  password: '',
  zipCode: '94105',
}

export default function AuthForm() {
  const [mode, setMode] = useState('register')
  const [form, setForm] = useState(defaultForm)
  const [status, setStatus] = useState('')
  const [statusTone, setStatusTone] = useState('default')
  const [zipError, setZipError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
    if (name === 'zipCode' && zipError) setZipError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (mode === 'register' && !/^\d{5}$/.test(form.zipCode)) {
      setZipError('Enter a valid 5-digit ZIP code.')
      return
    }

    setBusy(true)
    setStatus('')
    setStatusTone('default')

    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login'
    const requestBody = mode === 'register' ? form : { email: form.email, password: form.password }

    try {
      const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.message || 'Unable to complete your request.')

      if (payload.token) {
        try {
          window.localStorage.setItem('carcollective_token', payload.token)
        } catch {
          throw new Error('Your account is ready, but this browser could not save the sign-in session. Enable browser storage and sign in again.')
        }
      }

      setStatus(
        payload.confirmation_required
          ? 'Account created. Check your email to confirm it before signing in.'
          : `${mode === 'register' ? 'Account created' : 'Welcome back'} successfully.`,
      )
    } catch (error) {
      setStatus(error.message || 'Unable to complete your request.')
      setStatusTone('error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-6 md:p-7">
      <div className="mb-6 grid grid-cols-2 gap-1 rounded-full border border-slate-700/70 bg-slate-950/75 p-1">
        {['register', 'login'].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setMode(option)
              setStatus('')
              setZipError('')
            }}
            className={`rounded-full px-4 py-2.5 text-sm font-bold transition ${
              mode === option
                ? 'bg-gradient-to-r from-cyan-500 to-violet-500 text-slate-950 shadow-lg shadow-cyan-500/10'
                : 'text-slate-300 hover:text-white'
            }`}
            aria-pressed={mode === option}
          >
            {option === 'register' ? 'Create account' : 'Sign in'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="form-grid">
        <label className="field-label">
          Email
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            className="field-control"
            required
          />
        </label>

        <label className="field-label">
          Password
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            minLength={8}
            className="field-control"
            required
          />
          <span className="text-xs text-slate-500">Use at least 8 characters.</span>
        </label>

        {mode === 'register' && (
          <label className="field-label">
            ZIP code
            <input
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              name="zipCode"
              value={form.zipCode}
              onChange={(event) => {
                setForm((current) => ({ ...current, zipCode: event.target.value.replace(/\D/g, '').slice(0, 5) }))
                if (zipError) setZipError('')
              }}
              maxLength={5}
              className="field-control"
              aria-invalid={Boolean(zipError)}
              aria-describedby={zipError ? 'auth-zip-error' : undefined}
              required
            />
            {zipError && <span id="auth-zip-error" className="field-error" role="alert">{zipError}</span>}
          </label>
        )}

        <Button type="submit" disabled={busy} className="mt-1 w-full">
          {busy ? 'Please wait…' : mode === 'register' ? 'Create your account' : 'Sign in'}
        </Button>
      </form>

      {status && (
        <p className={`mt-4 rounded-xl border px-3 py-3 text-sm ${statusTone === 'error' ? 'border-rose-400/30 bg-rose-950/40 text-rose-100' : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100'}`} role={statusTone === 'error' ? 'alert' : 'status'} aria-live="polite">
          {status}
        </p>
      )}
    </Card>
  )
}
