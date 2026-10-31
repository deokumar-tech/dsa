import { Badge, Card, EmptyState } from './ui'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function price(value) {
  const amount = Number(value)
  return Number.isFinite(amount) ? currency.format(amount) : 'Price unavailable'
}

export default function DealerPriceCard({ listings = [] }) {
  if (!listings.length) {
    return (
      <EmptyState
        icon="car"
        title="No showroom listings in this radius"
        message="Try widening your search area or check back as new vehicles are added."
      />
    )
  }

  return (
    <div className="dealer-grid">
      {listings.map((listing, index) => {
        const dealer = listing.dealership || {}
        const listedPrice = Number(listing.listed_price) || 0
        const groupPrice = Number(listing.group_price) || Math.round(listedPrice * 0.965)
        const savings = Math.max(0, listedPrice - groupPrice)
        const dealerName = dealer.name || listing.dealer_name || 'Local dealer'
        const key = listing.id || `${dealerName}-${listing.trim || index}`

        return (
          <Card key={key} className="dealer-card" as="article">
            <div className="dealer-card-heading">
              <div>
                <p className="eyebrow m-0">Showroom offer</p>
                <h3 className="dealer-name">{dealerName}</h3>
              </div>
              {listing.distance_miles != null && <Badge tone="neutral">{listing.distance_miles} mi</Badge>}
            </div>

            <p className="mt-3 text-sm text-slate-400">
              {listing.year || ''} {listing.make || ''} {listing.model || ''} {listing.trim ? `· ${listing.trim}` : ''}
            </p>

            <div className="price-compare">
              <div className="price-cell">
                <span>Listed price</span>
                <strong>{price(listedPrice)}</strong>
              </div>
              <div className="price-cell">
                <span>Estimated group price</span>
                <strong>{price(groupPrice)}</strong>
              </div>
            </div>

            <div className="savings-callout">
              <span>Potential group savings</span>
              <strong>{price(savings)}</strong>
            </div>

            <div className="mt-4 text-xs leading-5 text-slate-400">
              <p>{dealer.address || 'Address unavailable'}</p>
              <p>{dealer.zip_code || 'ZIP unavailable'} · Planning estimate, not a dealer quote</p>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
