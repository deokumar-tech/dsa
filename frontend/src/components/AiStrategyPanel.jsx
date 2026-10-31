export default function AiStrategyPanel({ strategy, loading, onGenerate }) {
  if (!strategy) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
        <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">AI deal advisor</p>
        <h3 className="mt-3 text-2xl font-bold text-white">Generate your next negotiation playbook</h3>
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading}
          className="mt-6 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'Generating...' : 'Generate Group Negotiation Strategy'}
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/75 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-cyan-300">AI deal advisor</p>
          <h3 className="mt-3 text-2xl font-bold text-white">Negotiation strategy</h3>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200"
        >
          Refresh
        </button>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Target discount</p>
          <p className="mt-2 text-3xl font-black text-white">{strategy.target_group_discount_percentage}%</p>
        </article>

        <article className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Target price</p>
          <p className="mt-2 text-3xl font-black text-white">${Number(strategy.realistic_target_price_per_car).toLocaleString()}</p>
        </article>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Leverage points</p>
          <ul className="mt-4 space-y-3 text-sm text-slate-300">
            {strategy.leverage_points.map((point) => (
              <li key={point} className="flex gap-3">
                <span className="mt-1 h-2 w-2 rounded-full bg-cyan-400" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Dealer email script</p>
          <pre className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-200">
            {strategy.email_script_to_dealer}
          </pre>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">In-person tactic</p>
        <p className="mt-4 text-sm leading-7 text-slate-200">{strategy.in_person_negotiation_tactic}</p>
      </div>
    </div>
  );
}
