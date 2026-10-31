import { Badge, Card, EmptyState } from './ui'

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

function price(value) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount >= 0 ? currency.format(amount) : 'Price unavailable'
}

function updatedLabel(value) {
  if (!value) return 'Update date unavailable'
  const updatedAt = new Date(value)
  if (Number.isNaN(updatedAt.getTime())) return 'Update date unavailable'
  const days = Math.max(0, Math.floor((Date.now() - updatedAt.getTime()) / 86400000))
  return `Updated ${days} ${days === 1 ? 'day' : 'days'} ago`
}

function showroomFor(offer) {
  return offer.showroom || offer.dealership || {
    name: offer.showroom_name || offer.dealer_name || 'Showroom',
    address: offer.showroom_address || offer.address || '',
    pincode: offer.pincode || offer.zip_code || '',
  }
}

function normalizeOffer(offer) {
  const exPrice = Number(offer.ex_showroom_price_inr ?? offer.listed_price ?? offer.msrp)
  const dealerDiscount = Number(offer.dealer_discount_inr ?? 0)
  return {
    ...offer,
    ex_showroom_price_inr: exPrice,
    dealer_discount_inr: dealerDiscount,
    final_price_inr: Number(offer.final_price_inr ?? exPrice - dealerDiscount),
  }
}

export default function DealerPriceCard({ listings = [], showrooms = [] }) {
  if (!listings.length && !showrooms.length) {
    return (
      <EmptyState
        icon="car"
        title="No showroom offers yet"
        message="There are no price records for this search. Add verified showroom details when you have them."
      />
    )
  }

  const grouped = new Map(showrooms.map((showroom, index) => [
    showroom.id || showroom.name || `showroom-${index}`,
    { showroom, offers: [] },
  ]))
  listings.forEach((source, index) => {
    const offer = normalizeOffer(source)
    const showroom = showroomFor(offer)
    const showroomId = showroom.id || offer.showroom_id || showroom.name || `showroom-${index}`
    if (!grouped.has(showroomId)) grouped.set(showroomId, { showroom, offers: [] })
    grouped.get(showroomId).offers.push(offer)
  })

  return (
    <div className="dealer-grid">
      {[...grouped.entries()].map(([showroomId, { showroom, offers }]) => {
        const demo = offers.some((offer) => offer.is_demo || showroom.is_demo)
        const photoUrl = showroom.photoUrl || showroom.photo_url
        const phone = showroom.phone || showroom.contact_phone
        const distance = showroom.distanceKm ?? offers[0]?.distanceKm
        return (
          <Card key={showroomId} className="dealer-card ed-showroom-card" as="article">
            {photoUrl ? (
              <img className="ed-showroom-photo" src={photoUrl} alt={`${showroom.name || 'Showroom'} exterior`} loading="lazy" />
            ) : (
              <div className="ed-showroom-photo ed-showroom-placeholder" role="img" aria-label="Showroom photo not available">
                <span aria-hidden="true">⌂</span>
              </div>
            )}
            <div className="dealer-card-heading">
              <div>
                <p className="eyebrow m-0">{showroom.brand || 'Local showroom'}</p>
                <h3 className="dealer-name">{showroom.name || 'Showroom'}</h3>
                <p className="mt-1 text-sm text-slate-400">{showroom.locality || 'Locality unavailable'}, {showroom.city || 'Bhubaneswar'}</p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {showroom.verified
                  ? <Badge tone="success">Verified</Badge>
                  : <Badge tone="warning">Unverified</Badge>}
                {demo && <Badge tone="neutral">Demo data</Badge>}
                {distance !== undefined && distance !== null && <Badge tone="neutral">{Number(distance).toFixed(1)} km</Badge>}
              </div>
            </div>
            <div className="mt-3 text-sm text-slate-400">
              <p>{showroom.address || 'Address unavailable'}{showroom.pincode ? ` · ${showroom.pincode}` : ''}</p>
              {showroom.hours && <p>{showroom.hours}</p>}
              {phone
                ? <a className="ed-phone-link" href={`tel:${String(phone).replace(/[^\d+]/g, '')}`}>{phone}</a>
                : <p>Business phone not provided</p>}
            </div>
            <div className="ed-offer-list" aria-label={`Offers at ${showroom.name || 'showroom'}`}>
              {offers.map((offer) => (
                <article className={`ed-offer-row ${offer.bestDeal ? 'is-best-deal' : ''}`} key={offer.id || `${offer.make}-${offer.model}-${offer.variant}`}>
                  <div className="ed-offer-title">
                    <div>
                      <h4>{[offer.make, offer.model].filter(Boolean).join(' ') || 'Vehicle'}{offer.variant ? ` · ${offer.variant}` : ''}</h4>
                      <p>{updatedLabel(offer.price_updated_at)}</p>
                    </div>
                    {offer.bestDeal && <Badge tone="success">Best deal</Badge>}
                  </div>
                  <dl className="ed-price-table">
                    <div><dt>Ex-showroom</dt><dd>{price(offer.ex_showroom_price_inr)}</dd></div>
                    <div><dt>Dealer discount</dt><dd>{offer.dealer_discount_inr ? `−${price(offer.dealer_discount_inr)}` : price(0)}</dd></div>
                    <div><dt>Final offer</dt><dd>{price(offer.final_price_inr)}</dd></div>
                  </dl>
                </article>
              ))}
              {!offers.length && <p className="ed-muted">No current car prices have been added to this showroom.</p>}
            </div>
            <p className="ed-onroad-note">Ex-showroom price only. On-road price varies by RTO, insurance and taxes.</p>
            {demo && <p className="ed-demo-note">Demo data, replace with real prices. These illustrative figures are not dealer quotes.</p>}
          </Card>
        )
      })}
    </div>
  )
}
