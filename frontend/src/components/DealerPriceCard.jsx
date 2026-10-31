const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export default function DealerPriceCard({ listings = [] }) {
  if (!listings.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center text-slate-400">
        No nearby inventory matches your current search.
      </div>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {listings.map((listing) => {
        const dealer = listing.dealership || {};
        const delta = listing.listed_price - listing.msrp;

        return (
          <article key={listing.id} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-300">Dealer</p>
                <h3 className="mt-2 text-xl font-bold text-white">{dealer.name || 'Local dealer'}</h3>
              </div>
              <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-300">
                {listing.trim}
              </span>
            </div>

            <div className="mt-5 space-y-2 text-sm text-slate-300">
              <p>
                <span className="text-slate-400">Vehicle:</span> {listing.year} {listing.make} {listing.model}
              </p>
              <p>
                <span className="text-slate-400">MSRP:</span> {currency.format(listing.msrp)}
              </p>
              <p>
                <span className="text-slate-400">Listed:</span> {currency.format(listing.listed_price)}
              </p>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-700 bg-slate-950/70 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Offer delta</span>
                <span className={`font-semibold ${delta <= 0 ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {delta >= 0 ? '+' : '-'}{currency.format(Math.abs(delta))}
                </span>
              </div>
            </div>

            <div className="mt-5 text-xs leading-5 text-slate-400">
              <p>{dealer.address || 'Address unavailable'}</p>
              <p>{dealer.zip_code || 'Unknown ZIP'}</p>
            </div>
          </article>
        );
      })}
    </div>
  );
}
