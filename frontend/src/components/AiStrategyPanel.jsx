import { Button, Card, Skeleton } from './ui'

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function StrategyLoading() {
  return (
    <Card className="p-6" aria-live="polite">
      <p className="eyebrow m-0">AI deal advisor</p>
      <h3 className="mt-3 text-2xl font-bold text-white">Building your group playbook…</h3>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="mt-5 h-32" />
    </Card>
  )
}

export default function AiStrategyPanel({ strategy, loading, error, onGenerate }) {
  if (loading) return <StrategyLoading />

  if (!strategy) {
    return (
      <Card className="p-6 md:p-7">
        <p className="eyebrow m-0">AI deal advisor</p>
        <h3 className="mt-3 text-2xl font-bold text-white">Generate your next negotiation playbook</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Get a group target, dealer talking points, and an email draft based on your selected vehicle and local listings.</p>
        {error && <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-950/40 px-4 py-3 text-sm text-rose-100" role="alert">{error}</p>}
        <Button type="button" onClick={onGenerate} className="mt-6">Generate group strategy</Button>
      </Card>
    )
  }

  const leveragePoints = Array.isArray(strategy.leverage_points) ? strategy.leverage_points : []
  const targetPrice = Number(strategy.realistic_target_price_per_car)

  return (
    <Card className="p-6 md:p-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow m-0">AI deal advisor</p>
          <h3 className="mt-2 text-2xl font-bold text-white">Your negotiation strategy</h3>
        </div>
        <Button type="button" variant="ghost" size="small" onClick={onGenerate}>Refresh strategy</Button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <article className="price-cell">
          <p className="m-0 text-xs uppercase tracking-[0.16em] text-slate-400">Target group discount</p>
          <p className="mt-2 text-3xl font-black text-white">{Number(strategy.target_group_discount_percentage) || 0}%</p>
        </article>
        <article className="price-cell">
          <p className="m-0 text-xs uppercase tracking-[0.16em] text-slate-400">Target price</p>
          <p className="mt-2 text-3xl font-black text-white">{Number.isFinite(targetPrice) ? inr.format(targetPrice) : 'Unavailable'}</p>
        </article>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <article className="price-cell">
          <h4 className="m-0 text-sm font-bold uppercase tracking-[0.15em] text-slate-300">Leverage points</h4>
          {leveragePoints.length ? (
            <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
              {leveragePoints.map((point, index) => <li key={`${point}-${index}`} className="flex gap-3"><span className="ed-list-dot mt-2 h-2 w-2 shrink-0 rounded-full" /><span>{point}</span></li>)}
            </ul>
          ) : <p className="mt-3 text-sm text-slate-400">No leverage points were returned.</p>}
        </article>
        <article className="price-cell">
          <h4 className="m-0 text-sm font-bold uppercase tracking-[0.15em] text-slate-300">Dealer email script</h4>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-200">{strategy.email_script_to_dealer || 'No email script was returned.'}</p>
        </article>
      </div>

      <article className="price-cell mt-4">
        <h4 className="m-0 text-sm font-bold uppercase tracking-[0.15em] text-slate-300">In-person tactic</h4>
        <p className="mt-3 text-sm leading-6 text-slate-200">{strategy.in_person_negotiation_tactic || 'No in-person tactic was returned.'}</p>
      </article>
    </Card>
  )
}
