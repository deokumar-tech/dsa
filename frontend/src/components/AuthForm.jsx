import { useState } from 'react';
import { apiUrl } from '../lib/api';

const defaultForm = {
  email: '',
  password: '',
  zipCode: '94105',
};

export default function AuthForm() {
  const [mode, setMode] = useState('register');
  const [form, setForm] = useState(defaultForm);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setBusy(true);
    setStatus('');

    const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
    const requestBody = mode === 'register' ? form : { email: form.email, password: form.password };

    try {
      const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || 'Request failed');
      }

      if (payload.token) {
        localStorage.setItem('carcollective_token', payload.token);
      }

      setStatus(
        payload.confirmation_required
          ? 'Account created. Check your email to confirm it before signing in.'
          : `${mode === 'register' ? 'Account created' : 'Welcome back'} successfully.`,
      );
    } catch (error) {
      setStatus(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/75 p-6 shadow-2xl shadow-slate-950/30">
      <div className="mb-6 flex gap-2 rounded-full border border-slate-700 bg-slate-950 p-1">
        {['register', 'login'].map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setMode(option)}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
              mode === option
                ? 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            {option === 'register' ? 'Register' : 'Login'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Email</span>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-cyan-400"
          />
        </label>

        <label className="block space-y-2">
          <span className="text-sm text-slate-300">Password</span>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-cyan-400"
          />
        </label>

        {mode === 'register' && (
          <label className="block space-y-2">
            <span className="text-sm text-slate-300">Zip code</span>
            <input
              type="text"
              name="zipCode"
              value={form.zipCode}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-cyan-400"
            />
          </label>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-3 font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {busy ? 'Working...' : mode === 'register' ? 'Create account' : 'Sign in'}
        </button>
      </form>

      {status && (
        <p className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200">
          {status}
        </p>
      )}
    </div>
  );
}
