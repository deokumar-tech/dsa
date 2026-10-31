import { useParams } from 'react-router-dom'

export default function CohortPage() {
  const { id } = useParams()

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <p className="text-sm uppercase tracking-[0.26em] text-cyan-300">Buyer workspace</p>
      <h1 className="mt-2 text-4xl font-black text-white">Cohort {id}</h1>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-2xl font-bold text-white">Member updates</h2>
          <ul className="mt-6 space-y-4 text-slate-300">
            <li className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">Group target: Toyota RAV4 Hybrid · 12.4% discount</li>
            <li className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">Next visit: North Bay Toyota · Friday, 4:00 PM</li>
            <li className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">Budget signal: 4 buyers ready to sign today</li>
          </ul>
        </div>

        <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="text-2xl font-bold text-white">Members</h2>
          <ul className="mt-6 space-y-3 text-slate-300">
            {['Alicia', 'Marcus', 'Priya', 'Derek'].map((member) => (
              <li key={member} className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-950/60 p-3">
                <span>{member}</span>
                <span className="text-cyan-300">Ready</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  )
}
