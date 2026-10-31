import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import VehicleSelector from '../components/VehicleSelector'
import DealerPriceCard from '../components/DealerPriceCard'
import CohortList from '../components/CohortList'
import AiStrategyPanel from '../components/AiStrategyPanel'
import { apiNetworkError, apiUrl, parseApiResponse } from '../lib/api'
import { Button, Card, EmptyState, Modal, Reveal, Skeleton, Toast } from '../components/ui'
import { DEFAULT_PINCODE } from '../lib/bhubaneswar'

const defaultVehicle = {
  year: undefined,
  make: '',
  model: '',
  vehicleId: '',
  pincode: DEFAULT_PINCODE,
  location: null,
}

const defaultCohortForm = {
  make: '',
  model: '',
  pincode: DEFAULT_PINCODE,
  maxMembers: '10',
  urgency: 'Ready now',
}

function readToken() {
  try {
    return window.localStorage.getItem('carcollective_token')
  } catch {
    return null
  }
}

function ResultsSkeleton({ label = 'Loading results' }) {
  return (
    <div className="results-grid" role="status" aria-label={label} aria-live="polite">
      {[1, 2, 3].map((item) => (
        <Card key={item} className="p-5 ed-skeleton-card">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="mt-5 h-7 w-3/4" />
          <Skeleton className="mt-3 h-4 w-1/2" />
          <Skeleton className="mt-6 h-2 w-full" />
          <Skeleton className="mt-5 h-10 w-full" />
        </Card>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [vehicle, setVehicle] = useState(defaultVehicle)
  const [vehicles, setVehicles] = useState([])
  const [inventory, setInventory] = useState([])
  const [cohorts, setCohorts] = useState([])
  const [strategy, setStrategy] = useState(null)
  const [strategyError, setStrategyError] = useState('')
  const [dataError, setDataError] = useState('')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(true)
  const [sortBy, setSortBy] = useState('nearest')
  const [toast, setToast] = useState('')
  const [toastTone, setToastTone] = useState('default')
  const [createOpen, setCreateOpen] = useState(false)
  const [joinCohort, setJoinCohort] = useState(null)
  const [cohortForm, setCohortForm] = useState(defaultCohortForm)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const controllerRef = useRef(null)
  const timerRef = useRef(null)
  const requestIdRef = useRef(0)

  const showToast = useCallback((message, tone = 'default') => {
    setToast(message)
    setToastTone(tone)
  }, [])

  const closeCreate = useCallback(() => setCreateOpen(false), [])
  const closeJoin = useCallback(() => setJoinCohort(null), [])

  const loadInventoryAndCohorts = useCallback(async (selectedVehicle = defaultVehicle) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller
    const requestId = ++requestIdRef.current
    const params = new URLSearchParams({ pincode: selectedVehicle.pincode || DEFAULT_PINCODE, radiusKm: '25' })
    if (selectedVehicle.make) params.set('make', selectedVehicle.make)
    if (selectedVehicle.model) params.set('model', selectedVehicle.model)
    if (selectedVehicle.location) {
      params.set('lat', String(selectedVehicle.location.lat))
      params.set('lng', String(selectedVehicle.location.lng))
    }
    setDataError('')

    try {
      const [inventoryResponse, cohortResponse] = await Promise.all([
        fetch(apiUrl(`/api/offers?${params.toString()}`), { signal: controller.signal }),
        fetch(apiUrl(`/api/cohorts?${params.toString()}`), { signal: controller.signal }),
      ])
      const [inventoryData, cohortData] = await Promise.all([
        parseApiResponse(inventoryResponse, 'Nearby offers could not be loaded.'),
        parseApiResponse(cohortResponse, 'Nearby cohorts could not be loaded.'),
      ])
      if (!Array.isArray(inventoryData) || !Array.isArray(cohortData)) {
        throw new Error('The API returned an unexpected response. Please retry.')
      }

      setInventory(inventoryData)
      setCohorts(cohortData)
    } catch (error) {
      if (error.name === 'AbortError') return undefined
      setInventory([])
      setCohorts([])
      setDataError(apiNetworkError(error).message)
    }
    return requestId
  }, [])

  useEffect(() => {
    let active = true
    async function loadInitialData() {
      try {
        const response = await fetch(apiUrl('/api/vehicles'))
        const records = await parseApiResponse(response, 'Vehicle choices could not be loaded.')
        if (!Array.isArray(records)) throw new Error('The API returned an unexpected vehicle list.')
        if (!active) return
        setVehicles(records)
        const firstVehicle = records[0]
        const initial = firstVehicle
          ? { ...defaultVehicle, make: firstVehicle.make, model: firstVehicle.model, vehicleId: firstVehicle.id }
          : defaultVehicle
        setVehicle(initial)
        setCohortForm((current) => ({ ...current, make: firstVehicle?.make || '', model: firstVehicle?.model || '' }))
        const requestId = await loadInventoryAndCohorts(initial)
        if (active && requestId === requestIdRef.current) setSearching(false)
      } catch (error) {
        if (active) {
          setDataError(apiNetworkError(error).message)
          setSearching(false)
        }
      }
    }

    void loadInitialData()
    return () => {
      active = false
      controllerRef.current?.abort()
      window.clearTimeout(timerRef.current)
    }
  }, [loadInventoryAndCohorts])

  const handleVehicleSearch = async (nextVehicle) => {
    setVehicle(nextVehicle)
    setCohortForm((current) => ({ ...current, make: nextVehicle.make, model: nextVehicle.model, pincode: nextVehicle.pincode }))
    setSearching(true)
    const [requestId] = await Promise.all([
      loadInventoryAndCohorts(nextVehicle),
      new Promise((resolve) => {
        timerRef.current = window.setTimeout(resolve, 600)
      }),
    ])
    if (requestId === requestIdRef.current) setSearching(false)
  }

  const sortedCohorts = useMemo(() => [...cohorts].sort((a, b) => {
    if (sortBy === 'members') return Number(b.member_count || 0) - Number(a.member_count || 0)
    if (sortBy === 'discount') {
      const savingsA = Number(a.best_nearby_offer_price_inr || 0) - Number(a.estimated_group_price_inr || 0)
      const savingsB = Number(b.best_nearby_offer_price_inr || 0) - Number(b.estimated_group_price_inr || 0)
      return savingsB - savingsA
    }
    return Number(a.distanceKm || 0) - Number(b.distanceKm || 0)
  }), [cohorts, sortBy])

  const handleJoinCohort = async () => {
    const token = readToken()
    if (!token || !joinCohort) {
      showToast('Sign in to join this local buyer cohort.', 'error')
      return
    }

    setJoining(true)
    try {
      const response = await fetch(apiUrl(`/api/cohorts/${encodeURIComponent(joinCohort.id)}/join`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      await parseApiResponse(response)
      closeJoin()
      showToast('You joined the cohort successfully.')
      await loadInventoryAndCohorts(vehicle)
    } catch (error) {
      showToast(apiNetworkError(error).message, 'error')
    } finally {
      setJoining(false)
    }
  }

  const handleCreateCohort = async (event) => {
    event.preventDefault()
    if (!/^[1-9]\d{5}$/.test(cohortForm.pincode)) {
      showToast('Enter a valid 6-digit PIN code.', 'error')
      return
    }
    const token = readToken()
    if (!token) {
      showToast('Sign in before creating a cohort.', 'error')
      return
    }

    setCreating(true)
    try {
      const selectedVehicle = vehicles.find((item) => item.make === cohortForm.make && item.model === cohortForm.model)
      const response = await fetch(apiUrl('/api/cohorts'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          target_make: cohortForm.make,
          target_model: cohortForm.model,
          zip_code: cohortForm.pincode,
          pincode: cohortForm.pincode,
          city: 'Bhubaneswar',
          locality: '',
          lat: vehicle.location?.lat,
          lng: vehicle.location?.lng,
          vehicle_id: selectedVehicle?.id,
          target_size: Number(cohortForm.maxMembers),
          max_members: Number(cohortForm.maxMembers),
          urgency: cohortForm.urgency,
        }),
      })
      await parseApiResponse(response)
      closeCreate()
      const nextVehicle = {
        ...vehicle,
        make: cohortForm.make,
        model: cohortForm.model,
        vehicleId: selectedVehicle?.id || '',
        pincode: cohortForm.pincode,
      }
      setVehicle(nextVehicle)
      showToast('Your cohort is live. Group price estimates are not guaranteed dealer quotes.')
      await loadInventoryAndCohorts({
        ...nextVehicle,
      })
    } catch (error) {
      showToast(apiNetworkError(error).message, 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleGenerateStrategy = async () => {
    const token = readToken()
    if (!token) {
      showToast('Log in before generating a negotiation strategy.', 'error')
      return
    }
    if (!inventory.length) {
      const message = 'A nearby showroom offer is needed to generate a strategy based on real prices.'
      setStrategyError(message)
      showToast(message, 'error')
      return
    }

    setLoading(true)
    setStrategyError('')
    try {
      const response = await fetch(apiUrl('/api/ai/negotiation-strategy'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          group_size: 4,
          zip_code: vehicle.pincode,
          pincode: vehicle.pincode,
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          listed_price: Number(inventory[0].final_price_inr),
          msrp: Number(inventory[0].ex_showroom_price_inr),
          dealer_discount_inr: Number(inventory[0].dealer_discount_inr),
          showroom_name: inventory[0].showroom?.name,
          currency: 'INR',
        }),
      })
      const payload = await parseApiResponse(response)
      setStrategy(payload)
    } catch (error) {
      setStrategyError(apiNetworkError(error).message)
      showToast(apiNetworkError(error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-main page-enter">
      <section className="mb-9">
        <p className="eyebrow m-0">Your buying workspace</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white md:text-5xl">Dashboard</h1>
        <p className="mt-3 max-w-2xl text-slate-400">Find nearby Bhubaneswar buyers, compare submitted showroom offers, and work toward a better-informed group purchase.</p>
      </section>

      <Reveal>
        <VehicleSelector onSearch={handleVehicleSearch} loading={searching} />
      </Reveal>

      <Reveal as="section" className="section-block">
        <div className="results-toolbar">
          <div>
            <p className="eyebrow m-0">Buyers near PIN {vehicle.pincode}</p>
            <h2 className="section-heading">Local cohorts</h2>
            <p className="mt-2 text-sm text-slate-400">
              {dataError ? 'Cohort data unavailable' : `${cohorts.length} ${cohorts.length === 1 ? 'group' : 'groups'} within 25 km for ${vehicle.make} ${vehicle.model}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {cohorts.length > 0 && (
              <label className="field-label flex-row items-center gap-2">
                <span className="whitespace-nowrap">Sort by</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="field-control min-w-40">
                  <option value="discount">Best estimated saving</option>
                  <option value="nearest">Nearest first</option>
                  <option value="members">Most members</option>
                </select>
              </label>
            )}
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(true)}>＋ Start a cohort</Button>
          </div>
        </div>

        {searching ? (
          <ResultsSkeleton />
        ) : dataError ? (
          <div className="ed-error-state" role="alert">
            <h3>We couldn’t load your cohorts</h3>
            <p>{dataError}</p>
            <Button type="button" variant="ghost" onClick={() => handleVehicleSearch(vehicle)}>Retry</Button>
          </div>
        ) : sortedCohorts.length ? (
          <CohortList cohorts={sortedCohorts} onJoin={setJoinCohort} />
        ) : (
          <EmptyState
            icon="car"
            title="No cohorts match yet"
            message={`No nearby cohorts were found for PIN ${vehicle.pincode}. Search results use approximate coordinates and the selected distance radius. Start a cohort to invite local buyers.`}
            action={<Button type="button" onClick={() => setCreateOpen(true)}>Start a cohort</Button>}
          />
        )}
      </Reveal>

      <Reveal as="section" className="section-block">
        <div className="mb-6">
          <p className="eyebrow m-0">Inventory</p>
          <h2 className="section-heading">Nearby showroom offers</h2>
        </div>
        {searching ? <ResultsSkeleton label="Loading offers" /> : dataError ? <p className="ed-muted" role="alert">{dataError}</p> : (
          <>
            <p className="ed-onroad-note">Prices are ex-showroom. On-road price varies by RTO, insurance and taxes.</p>
            <DealerPriceCard listings={inventory} />
          </>
        )}
      </Reveal>

      <Reveal as="section" className="section-block">
        <AiStrategyPanel strategy={strategy} loading={loading} error={strategyError} onGenerate={handleGenerateStrategy} />
      </Reveal>

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(90vw,28rem)]">
          <Toast message={toast} tone={toastTone} onDismiss={() => setToast('')} />
        </div>
      )}

      {createOpen && (
        <Modal title="Start a buyer cohort" description="Set a vehicle and a local ZIP. Your group starts forming as soon as you create it." onClose={closeCreate}>
          <form onSubmit={handleCreateCohort} className="form-grid">
            <label className="field-label">
              Make
              <select
                className="field-control"
                value={cohortForm.make}
                onChange={(event) => {
                  const nextMake = event.target.value
                  const nextModel = vehicles.find((item) => item.make === nextMake)?.model || ''
                  setCohortForm((current) => ({ ...current, make: nextMake, model: nextModel }))
                }}
              >
                {[...new Set(vehicles.map((item) => item.make))].map((make) => <option key={make} value={make}>{make}</option>)}
              </select>
            </label>
            <label className="field-label">
              Model
              <select className="field-control" value={cohortForm.model} onChange={(event) => setCohortForm((current) => ({ ...current, model: event.target.value }))}>
                {[...new Set(vehicles.filter((item) => item.make === cohortForm.make).map((item) => item.model))].map((model) => <option key={model} value={model}>{model}</option>)}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field-label">
                PIN code
                <input className="field-control" value={cohortForm.pincode} inputMode="numeric" maxLength={6} pattern="[1-9][0-9]{5}" onChange={(event) => setCohortForm((current) => ({ ...current, pincode: event.target.value.replace(/\D/g, '').slice(0, 6) }))} required />
              </label>
              <label className="field-label">
                Buyer goal
                <select className="field-control" value={cohortForm.maxMembers} onChange={(event) => setCohortForm((current) => ({ ...current, maxMembers: event.target.value }))}>
                  {[5, 8, 10, 15, 20].map((size) => <option key={size} value={size}>{size} buyers</option>)}
                </select>
              </label>
            </div>
            <label className="field-label">
              Timing
              <select className="field-control" value={cohortForm.urgency} onChange={(event) => setCohortForm((current) => ({ ...current, urgency: event.target.value }))}>
                {['Ready now', 'Next 30 days', 'Exploring'].map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            {!readToken() && <p className="m-0 text-sm text-slate-400">You’ll need to <Link className="underline" to="/login" onClick={closeCreate}>sign in</Link> before creating a cohort.</p>}
            <Button type="submit" disabled={creating}>{creating ? 'Creating cohort…' : 'Create cohort'}</Button>
          </form>
        </Modal>
      )}

      {joinCohort && (
        <Modal title={`Join ${joinCohort.target_make} ${joinCohort.target_model}`} description="Confirm to join this local buyer group and be counted toward its target." onClose={closeJoin}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="m-0 text-sm text-slate-300">{joinCohort.member_count || 0} of {joinCohort.target_size || joinCohort.max_members || 10} buyers are in this cohort.</p>
            {readToken() ? (
              <Button type="button" disabled={joining} onClick={handleJoinCohort}>{joining ? 'Joining…' : 'Confirm and join'}</Button>
            ) : (
              <Link className="button button-primary" to="/login" onClick={closeJoin}>Sign in to join</Link>
            )}
          </div>
        </Modal>
      )}
    </main>
  )
}
