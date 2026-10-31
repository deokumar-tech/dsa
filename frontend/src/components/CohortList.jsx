export default function CohortList({ cohorts = [], onJoin }) {
  if (!cohorts.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center text-slate-400">
        No buyer cohorts match this filter yet.
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {cohorts.map((cohort) => (
        <article key={cohort.id} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs uppercase tracking-[0.22em] text-emerald-300">{cohort.status}</span>
            <span className="text-sm font-medium text-cyan-200">{cohort.member_count || cohort.members?.length || 0}/{cohort.max_members || 10}</span>
          </div>

          <h3 className="mt-4 text-xl font-bold text-white">
            {cohort.target_make} {cohort.target_model}
          </h3>
          <p className="mt-2 text-sm text-slate-400">{cohort.zip_code} · {cohort.urgency || 'Ready now'}</p>

          <div className="mt-5 h-2 rounded-full bg-slate-800">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500"
              style={{ width: `${Math.min(((cohort.member_count || cohort.members?.length || 0) / (cohort.max_members || 10)) * 100, 100)}%` }}
            />
          </div>

          <div className="mt-5 flex items-center justify-between text-sm">
            <span className="text-slate-400">Target</span>
            <span className="font-semibold text-white">{cohort.target_discount || '12.5%'}</span>
          </div>

          <button
            type="button"
            onClick={() => onJoin?.(cohort.id)}
            className="mt-5 w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:opacity-95"
          >
            Join cohort
          </button>
        </article>
      ))}
    </div>
  );
}
