import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { apiUrl, apiNetworkError, parseApiResponse } from '../lib/api'
import { Button, Card } from './ui'

const defaultForm = {
  email: '',
  password: '',
  zipCode: '751007',
}

export default function AuthForm() {
  const location = useLocation()
  const [mode, setMode] = useState(location.pathname === '/login' ? 'login' : 'register')
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
    if (mode === 'register' && !/^[1-9]\d{5}$/.test(form.zipCode)) {
      setZipError('Enter a valid 6-digit PIN code.')
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
      const payload = await parseApiResponse(response, 'Unable to complete your request.')

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
      setStatus(apiNetworkError(error, 'Unable to complete your request.').message)
      setStatusTone('error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="p-6 md:p-7">
      <div className="ed-auth-tabs mb-6">
        {['register', 'login'].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setMode(option)
              setStatus('')
              setZipError('')
            }}
            className="ed-auth-tab"
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
            PIN code
            <input
              type="text"
              inputMode="numeric"
              autoComplete="postal-code"
              name="zipCode"
              value={form.zipCode}
              onChange={(event) => {
                setForm((current) => ({ ...current, zipCode: event.target.value.replace(/\D/g, '').slice(0, 6) }))
                if (zipError) setZipError('')
              }}
              maxLength={6}
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
        <p className={`ed-status mt-4 ${statusTone === 'error' ? 'ed-status-error' : 'ed-status-success'}`} role={statusTone === 'error' ? 'alert' : 'status'} aria-live="polite">
          {status}
        </p>
      )}
    </Card>
  )
}
