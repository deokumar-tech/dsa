import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiNetworkError, apiUrl, parseApiResponse } from '../lib/api'
import { AnimatedCounter, Badge, Button, Card, EmptyState, ProgressBar, Reveal, Skeleton } from '../components/ui'
import { DEFAULT_PINCODE } from '../lib/bhubaneswar'

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

const methods = [
  {
    number: '01',
    title: 'Pool',
    copy: 'Bring nearby buyers with the same goal into one conversation.',
    points: ['Choose a vehicle', 'Match by nearby PIN', 'Build a shared target'],
    icon: <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="12" cy="11" r="4" /><circle cx="23" cy="13" r="3" /><path d="M4 27v-2a8 8 0 0 1 16 0v2m1-8a6 6 0 0 1 7 6v2" /></svg>,
  },
  {
    number: '02',
    title: 'Compare',
    copy: 'Look at local inventory together before anyone walks into a showroom.',
    points: ['Review listed prices', 'Spot nearby options', 'Share the research'],
    icon: <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 26V9m11 17V5m11 21V13" /><path d="M2 26h28M3 9h4m7-4h4m7 8h4" /></svg>,
  },
  {
    number: '03',
    title: 'Negotiate',
    copy: 'Use a coordinated ask and clear next steps to make your interest count.',
    points: ['Align on timing', 'Set a group target', 'Approach dealers together'],
    icon: <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m6 22 5-5 5 3 10-11" /><path d="M19 9h7v7M5 28h22" /></svg>,
  },
]

function CohortCard({ cohort }) {
  const memberCount = Number(cohort.member_count ?? cohort.members?.length ?? 0)
  const target = Number(cohort.target_size ?? cohort.max_members) || 0
  const name = [cohort.target_make, cohort.target_model].filter(Boolean).join(' ')
  const area = [cohort.locality, cohort.city || 'Bhubaneswar'].filter(Boolean).join(', ')
  const estimate = Number(cohort.estimated_group_price_inr)

  return (
    <Link to={`/cohort/${encodeURIComponent(cohort.id)}`} className="ed-work-card" aria-label={`Open ${name || 'vehicle'} cohort`}>
      <Card className="ed-work-card-inner" as="article">
        <div className="ed-card-topline">
          <span className="ed-tag">{cohort.status || 'Cohort'}</span>
          {cohort.is_demo && <Badge tone="neutral">Demo data</Badge>}
        </div>
        <p className="ed-card-index">{area}</p>
        <h3>{name || 'Vehicle cohort'}</h3>
        <div className="ed-chip-row">
          {[cohort.target_make, cohort.target_model, cohort.urgency].filter(Boolean).map((tag) => <span className="ed-chip" key={tag}>{tag}</span>)}
        </div>
        {Number.isFinite(estimate) && estimate > 0 && <p className="ed-cohort-estimate">Estimated group price <strong>{inr.format(estimate)}</strong></p>}
        {target > 0 && (
          <>
            <ProgressBar value={(memberCount / target) * 100} label={`${memberCount} of ${target} buyers joined`} className="ed-work-progress" />
            <div className="ed-card-meta"><span>{memberCount}/{target} joined</span><strong>Open cohort <span aria-hidden="true">↗</span></strong></div>
          </>
        )}
        {!target && <div className="ed-card-meta"><span>{memberCount} {memberCount === 1 ? 'buyer' : 'buyers'}</span><strong>Open cohort <span aria-hidden="true">↗</span></strong></div>}
      </Card>
    </Link>
  )
}

export default function LandingPage() {
  const [cohorts, setCohorts] = useState([])
  const [showrooms, setShowrooms] = useState([])
  const [offers, setOffers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    async function loadCohorts() {
      try {
        const params = new URLSearchParams({ pincode: DEFAULT_PINCODE, radiusKm: '25' })
        const [cohortResponse, showroomResponse, offerResponse] = await Promise.all([
          fetch(apiUrl(`/api/cohorts?${params}`), { signal: controller.signal }),
          fetch(apiUrl(`/api/showrooms?${params}`), { signal: controller.signal }),
          fetch(apiUrl(`/api/offers?${params}`), { signal: controller.signal }),
        ])
        const [records, showroomRecords, offerRecords] = await Promise.all([
          parseApiResponse(cohortResponse, 'Cohorts could not be loaded.'),
          parseApiResponse(showroomResponse, 'Showrooms could not be loaded.'),
          parseApiResponse(offerResponse, 'Offers could not be loaded.'),
        ])
        if (!Array.isArray(records) || !Array.isArray(showroomRecords) || !Array.isArray(offerRecords)) {
          throw new Error('The API returned unexpected local-market data.')
        }
        setCohorts(records)
        setShowrooms(showroomRecords)
        setOffers(offerRecords)
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setCohorts([])
          setShowrooms([])
          setOffers([])
          setError(apiNetworkError(loadError).message)
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    void loadCohorts()
    return () => controller.abort()
  }, [reload])

  const retryCohorts = () => {
    setLoading(true)
    setError('')
    setReload((count) => count + 1)
  }

  const joinedBuyerCount = cohorts.reduce((sum, cohort) => sum + Number(cohort.member_count || 0), 0)
  const discounts = offers
    .map((offer) => Number(offer.dealer_discount_inr) / Number(offer.ex_showroom_price_inr) * 100)
    .filter(Number.isFinite)
  const averageDiscount = discounts.length ? discounts.reduce((sum, discount) => sum + discount, 0) / discounts.length : null
  const stats = [
    { value: joinedBuyerCount, label: 'buyers joined' },
    { value: averageDiscount, suffix: '%', label: 'average listed discount' },
    { value: showrooms.length, label: 'nearby showrooms' },
  ]

  return (
    <main className="page-main page-enter">
      <section className="ed-hero">
        <p className="eyebrow">Bhubaneswar, Odisha / Group buying</p>
        <h1 className="hero-title">Buy the same car,<br /><span className="ed-serif">together.</span></h1>
        <p className="hero-description">Find nearby buyers, compare submitted showroom offers, and go to the dealer with a clear plan.</p>
        <div className="ed-hero-tiles">
          <a className="ed-hero-tile" href="#how-we-negotiate">
            <span className="ed-tile-kicker">01 / The approach</span>
            <span className="ed-tile-title">How it works</span>
            <span className="ed-tile-bottom"><span>Three steps. One shared goal.</span><span className="ed-arrow" aria-hidden="true">↗</span></span>
          </a>
          <Link className="ed-hero-tile ed-hero-tile-accent" to="/dashboard">
            <span className="ed-tile-kicker">02 / Find your group</span>
            <span className="ed-tile-title">Explore deals</span>
            <span className="ed-tile-bottom"><span>See what buyers are looking for.</span><span className="ed-arrow" aria-hidden="true">↗</span></span>
          </Link>
        </div>
        <Link to="/dashboard" className="ed-inline-cta">Start a cohort <span aria-hidden="true">↗</span></Link>
      </section>

      <Reveal as="section" className="ed-stats section-block" aria-label="CarCollective impact">
        {stats.map((stat, index) => (
          <div className="ed-stat" key={stat.label}>
            <p className="ed-stat-value">{loading || stat.value === null ? '—' : <AnimatedCounter value={stat.value} suffix={stat.suffix || ''} />}</p>
            <p className="ed-stat-label">{stat.label}</p>
            {index < stats.length - 1 && <span className="ed-stat-divider" aria-hidden="true" />}
          </div>
        ))}
      </Reveal>

      <section className="section-block ed-section" aria-labelledby="active-cohorts">
        <Reveal className="ed-section-heading">
          <div><p className="eyebrow">A shared goal</p><h2 id="active-cohorts">Select <span className="ed-serif">cohorts</span></h2></div>
          <Button as={Link} to="/dashboard" variant="ghost" className="ed-pill-link">View all <span aria-hidden="true">↗</span></Button>
        </Reveal>
        {loading ? (
          <div className="results-grid" role="status" aria-label="Loading cohorts">
            {[1, 2, 3].map((item) => <Card className="ed-skeleton-card" key={item}><Skeleton className="h-5 w-28" /><Skeleton className="mt-8 h-10 w-3/4" /><Skeleton className="mt-5 h-2 w-full" /></Card>)}
          </div>
        ) : error ? (
          <div className="ed-error-state" role="alert"><h3>Cohorts aren’t available right now</h3><p>{error}</p><Button variant="ghost" type="button" onClick={retryCohorts}>Retry</Button></div>
        ) : cohorts.length ? (
          <div className="results-grid">{cohorts.map((cohort) => <Reveal key={cohort.id}><CohortCard cohort={cohort} /></Reveal>)}</div>
        ) : (
          <EmptyState icon="car" title="No active cohorts yet" message="Start a cohort for the car you’re considering and invite nearby buyers to join." action={<Button as={Link} to="/dashboard">Start a cohort</Button>} />
        )}
      </section>

      <section id="how-we-negotiate" className="section-block ed-section" aria-labelledby="method-heading">
        <Reveal className="ed-section-heading">
          <div><p className="eyebrow">A considered process</p><h2 id="method-heading">How we <span className="ed-serif">negotiate</span></h2></div>
          <p>More context, shared early. Better prepared buyers, together.</p>
        </Reveal>
        <div className="ed-method-grid">
          {methods.map((method) => (
            <Reveal key={method.number}>
              <Card className="ed-method-card">
                <div className="ed-method-top"><span>{method.number}</span><span className="ed-method-icon">{method.icon}</span></div>
                <h3>{method.title}</h3><p>{method.copy}</p>
                <ul>{method.points.map((point) => <li key={point}>{point}</li>)}</ul>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <Reveal as="section" className="section-block ed-closing">
        <p className="eyebrow">Better, together</p>
        <h2>One car. Many voices.<br /><span className="ed-serif">More leverage.</span></h2>
        <div className="ed-closing-actions">
          <Link to="/dashboard" className="button button-primary">Start a cohort <span aria-hidden="true">↗</span></Link>
          <Link to="/register" className="button button-ghost">Join the collective</Link>
        </div>
      </Reveal>
    </main>
  )
}
