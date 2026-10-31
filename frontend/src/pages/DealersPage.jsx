import { useEffect, useMemo, useRef, useState } from 'react'
import DealerPriceCard from '../components/DealerPriceCard'
import { apiUrl } from '../lib/api'
import { AnimatedCounter, Card, EmptyState, Reveal, Skeleton, Toast } from '../components/ui'

const demoListings = [
  { id: 'dealer-offer-1', year: 2024, make: 'Toyota', model: 'RAV4 Hybrid', trim: 'XLE AWD', listed_price: 38950, group_price: 37800, distance_miles: 14, dealership: { name: 'North Bay Toyota', address: '2500 Van Ness Ave, San Francisco, CA', zip_code: '94109' } },
  { id: 'dealer-offer-2', year: 2024, make: 'Toyota', model: 'RAV4 Hybrid', trim: 'Limited AWD', listed_price: 41500, group_price: 40250, distance_miles: 17, dealership: { name: 'Mission Motors', address: '915 Mission St, San Francisco, CA', zip_code: '94103' } },
  { id: 'dealer-offer-3', year: 2025, make: 'Honda', model: 'CR-V Hybrid', trim: 'Sport-L', listed_price: 39400, group_price: 38150, distance_miles: 26, dealership: { name: 'Bay Area Honda', address: '6100 Auto Mall Dr, San Jose, CA', zip_code: '95134' } },
  { id: 'dealer-offer-4', year: 2024, make: 'Tesla', model: 'Model Y', trim: 'Long Range AWD', listed_price: 49800, group_price: 47800, distance_miles: 39, dealership: { name: 'East Bay Electric', address: '2020 Broadway, Oakland, CA', zip_code: '94612' } },
  { id: 'dealer-offer-5', year: 2025, make: 'Ford', model: 'Mustang Mach-E', trim: 'Premium AWD', listed_price: 47900, group_price: 45950, distance_miles: 63, dealership: { name: 'Peninsula Ford', address: '900 El Camino Real, Redwood City, CA', zip_code: '94063' } },
]

function DealerSkeletons() {
  return (
    <div className="dealer-grid" role="status" aria-label="Loading dealer inventory" aria-live="polite">
      {[1, 2, 3].map((item) => (
        <Card key={item} className="dealer-card">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="mt-4 h-6 w-3/4" />
          <Skeleton className="mt-7 h-16 w-full" />
          <Skeleton className="mt-3 h-12 w-full" />
        </Card>
      ))}
    </div>
  )
}

export default function DealersPage() {
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [radius, setRadius] = useState(50)
  const [individualPrice, setIndividualPrice] = useState('41500')
  const [toast, setToast] = useState('')
  const controllerRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current = controller
    const minLoading = new Promise((resolve) => {
      timerRef.current = window.setTimeout(resolve, 600)
    })

    const loadInventory = async () => {
      try {
        const response = await fetch(apiUrl('/api/inventory?make=Toyota&model=RAV4%20Hybrid&zip=94105'), { signal: controller.signal })
        const payload = await response.json().catch(() => [])
        if (!response.ok) throw new Error(payload.message || 'Dealer listings could not be loaded.')

        const apiListings = Array.isArray(payload)
          ? payload.map((listing, index) => ({
              ...listing,
              distance_miles: listing.distance_miles ?? [14, 17, 26, 39, 63][index % 5],
              group_price: listing.group_price ?? Math.round(Number(listing.listed_price) * 0.965),
            }))
          : []
        setInventory(apiListings.length ? apiListings : demoListings)
      } catch (error) {
        if (error.name !== 'AbortError') {
          setInventory(demoListings)
          setToast('Showing illustrative sample pricing while the API is unavailable.')
        }
      } finally {
        await minLoading
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    loadInventory()
    return () => {
      controller.abort()
      window.clearTimeout(timerRef.current)
    }
  }, [])

  const filteredInventory = useMemo(
    () => inventory.filter((listing) => Number(listing.distance_miles || 0) <= radius),
    [inventory, radius],
  )
  const averagePrice = filteredInventory.length
    ? Math.round(filteredInventory.reduce((sum, listing) => sum + Number(listing.listed_price || 0), 0) / filteredInventory.length)
    : 0
  const numericPrice = Number(individualPrice)
  const estimatedGroupPrice = Number.isFinite(numericPrice) && numericPrice > 0 ? Math.round(numericPrice * 0.922) : 0
  const estimatedSavings = Math.max(0, numericPrice - estimatedGroupPrice)

  return (
    <main className="page-main page-enter">
      <section>
        <p className="eyebrow m-0">Local showroom network</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white md:text-5xl">Nearby showroom pricing</h1>
        <p className="mt-3 max-w-2xl text-slate-400">Compare individual listings with an illustrative group-buy target. Actual dealer offers may vary.</p>
      </section>

      <Reveal as="section" className="section-block">
        <Card className="p-5 md:p-6">
          <div className="radius-control">
            <label htmlFor="dealer-radius" className="field-label">
              <span>Coverage radius</span>
              <input
                id="dealer-radius"
                type="range"
                min="10"
                max="100"
                step="5"
                value={radius}
                onChange={(event) => setRadius(Number(event.target.value))}
                className="range-input"
              />
            </label>
            <output className="range-output" htmlFor="dealer-radius">{radius} mi</output>
          </div>
        </Card>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Card className="p-5">
            <p className="m-0 text-sm text-slate-400">Vehicles in market</p>
            <p className="mt-2 text-3xl font-black text-white"><AnimatedCounter value={filteredInventory.length} /></p>
          </Card>
          <Card className="p-5">
            <p className="m-0 text-sm text-slate-400">Average listed price</p>
            <p className="mt-2 text-3xl font-black text-white"><AnimatedCounter value={averagePrice} prefix="$" /></p>
          </Card>
          <Card className="p-5">
            <p className="m-0 text-sm text-slate-400">Coverage radius</p>
            <p className="mt-2 text-3xl font-black text-white"><AnimatedCounter value={radius} suffix=" mi" /></p>
          </Card>
        </div>
      </Reveal>

      <Reveal as="section" className="section-block">
        <div className="mb-5">
          <p className="eyebrow m-0">Savings calculator</p>
          <h2 className="section-heading">See what group pricing could mean for you</h2>
        </div>
        <Card className="grid gap-5 p-5 md:grid-cols-[1fr_1.2fr] md:items-center md:p-6">
          <label className="field-label">
            Individual listed price
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              <input
                type="number"
                min="1"
                step="100"
                value={individualPrice}
                onChange={(event) => setIndividualPrice(event.target.value)}
                className="field-control pl-8"
                aria-label="Individual listed price in US dollars"
              />
            </div>
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="price-cell"><span>Individual</span><strong>${(Number(individualPrice) || 0).toLocaleString()}</strong></div>
            <div className="price-cell"><span>Estimated group</span><strong>${estimatedGroupPrice.toLocaleString()}</strong></div>
            <div className="price-cell border-emerald-400/20"><span>Potential savings</span><strong className="text-emerald-200">${estimatedSavings.toLocaleString()}</strong></div>
          </div>
          <p className="m-0 text-xs leading-5 text-slate-500 md:col-span-2">Planning estimate uses an illustrative 7.8% group-buy savings rate. It is not a guaranteed offer.</p>
        </Card>
      </Reveal>

      <Reveal as="section" className="section-block">
        <div className="results-toolbar">
          <div>
            <p className="eyebrow m-0">Dealer offers</p>
            <h2 className="section-heading">Compare local listings</h2>
          </div>
          <p className="m-0 text-sm text-slate-400">{filteredInventory.length} {filteredInventory.length === 1 ? 'vehicle' : 'vehicles'} within {radius} miles</p>
        </div>
        {loading ? (
          <DealerSkeletons />
        ) : filteredInventory.length ? (
          <>
            <DealerPriceCard listings={filteredInventory} />
            <p className="mt-4 text-xs text-slate-500">Sample market data for demonstration. Group prices are estimates, not dealer quotes.</p>
          </>
        ) : (
          <EmptyState
            icon="search"
            title="No listings in this radius"
            message="Expand the coverage radius to see more nearby showroom options."
          />
        )}
      </Reveal>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(90vw,28rem)]">
          <Toast message={toast} onDismiss={() => setToast('')} />
        </div>
      )}
    </main>
  )
}
