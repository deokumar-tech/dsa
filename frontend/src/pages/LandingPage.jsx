import { Link } from 'react-router-dom'

const cohortHighlights = [
  {
    name: 'Toyota RAV4 Hybrid',
    members: 5,
    goal: '12.4% discount',
    location: 'San Francisco, CA',
  },
  {
    name: 'Ford Mustang GT',
    members: 3,
    goal: '9.8% discount',
    location: 'Austin, TX',
  },
  {
    name: 'Tesla Model Y',
    members: 7,
    goal: '14.1% discount',
    location: 'Seattle, WA',
  },
]

const stats = [
  { value: '18k+', label: 'buyers matched' },
  { value: '7.8%', label: 'avg. savings' },
  { value: '320', label: 'dealers onboard' },
]

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <span className="inline-flex rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
            Local buyer power
          </span>

          <h1 className="mt-6 max-w-xl text-4xl font-black tracking-tight text-white md:text-6xl">
            Buy the same car, together.
          </h1>

          <p className="mt-5 max-w-xl text-lg text-slate-300">
            CarCollective helps nearby drivers pool their buying power, compare dealer offers,
            and negotiate like a fleet buyer.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link to="/register" className="rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-6 py-3 font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:opacity-95">
              Start a cohort
            </Link>
            <Link to="/dealers" className="rounded-full border border-slate-700 bg-slate-900 px-6 py-3 font-semibold text-slate-200 transition hover:border-slate-500">
              Explore deals
            </Link>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-2xl font-black text-white">{stat.value}</p>
                <p className="mt-1 text-sm text-slate-400">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/20">
          <p className="text-sm uppercase tracking-[0.26em] text-cyan-300">How it works</p>
          <ol className="mt-6 space-y-5 text-slate-300">
            <li className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <span className="mr-2 font-bold text-cyan-300">1.</span>Set your target vehicle and ZIP code.
            </li>
            <li className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <span className="mr-2 font-bold text-cyan-300">2.</span>Find nearby dealer pricing and active cohorts.
            </li>
            <li className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <span className="mr-2 font-bold text-cyan-300">3.</span>Generate a fleet-negotiation strategy with AI.
            </li>
          </ol>
        </div>
      </section>

      <section className="mt-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-cyan-300">Active cohorts</p>
            <h2 className="mt-2 text-3xl font-bold text-white">Find your local buyer group</h2>
          </div>
          <Link to="/dashboard" className="hidden rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-200 md:inline-flex">
            View all
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {cohortHighlights.map((cohort) => (
            <article key={cohort.name} className="rounded-3xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.22em] text-emerald-300">Forming</span>
                <span className="text-sm font-medium text-cyan-200">{cohort.members}/10</span>
              </div>
              <h3 className="mt-4 text-xl font-bold text-white">{cohort.name}</h3>
              <p className="mt-2 text-sm text-slate-400">{cohort.location}</p>

              <div className="mt-5 h-2 rounded-full bg-slate-800">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
                  style={{ width: `${Math.min((cohort.members / 10) * 100, 100)}%` }}
                />
              </div>

              <div className="mt-5 flex items-center justify-between text-sm">
                <span className="text-slate-400">Target</span>
                <span className="font-semibold text-white">{cohort.goal}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
