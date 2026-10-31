import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import VehicleSelector from '../components/VehicleSelector'
import DealerPriceCard from '../components/DealerPriceCard'
import CohortList from '../components/CohortList'
import AiStrategyPanel from '../components/AiStrategyPanel'
import { apiUrl } from '../lib/api'
import { Button, Card, EmptyState, Modal, Reveal, Skeleton, Toast } from '../components/ui'

const defaultVehicle = {
  year: 2024,
  make: 'Toyota',
  model: 'RAV4 Hybrid',
  zipCode: '94105',
}

const sampleCohorts = [
  { id: 'cohort-1', target_make: 'Toyota', target_model: 'RAV4 Hybrid', zip_code: '94105', status: 'forming', max_members: 10, urgency: 'Ready now', member_count: 5, target_discount: '12.4%' },
  { id: 'cohort-2', target_make: 'Tesla', target_model: 'Model Y', zip_code: '94103', status: 'forming', max_members: 5, urgency: 'Next 30 days', member_count: 3, target_discount: '9.8%' },
  { id: 'cohort-3', target_make: 'Honda', target_model: 'CR-V Hybrid', zip_code: '94105', status: 'forming', max_members: 10, urgency: 'Ready now', member_count: 7, target_discount: '10.2%' },
  { id: 'cohort-4', target_make: 'Ford', target_model: 'Mustang', zip_code: '78701', status: 'forming', max_members: 8, urgency: 'Next 30 days', member_count: 4, target_discount: '8.6%' },
]

const sampleInventory = [
  { id: 'inv-1', year: 2024, make: 'Toyota', model: 'RAV4 Hybrid', trim: 'XLE AWD', listed_price: 38950, msrp: 41500, dealership: { name: 'North Bay Toyota', address: '2500 Van Ness Ave, San Francisco, CA', zip_code: '94109' } },
  { id: 'inv-2', year: 2024, make: 'Toyota', model: 'RAV4 Hybrid', trim: 'Limited AWD', listed_price: 41500, msrp: 43800, dealership: { name: 'Mission Motors', address: '915 Mission St, San Francisco, CA', zip_code: '94103' } },
]

const defaultCohortForm = {
  make: 'Toyota',
  model: 'RAV4 Hybrid',
  zipCode: '94105',
  maxMembers: '10',
  urgency: 'Ready now',
}

const cohortModels = {
  Toyota: ['RAV4 Hybrid', 'Camry', 'Corolla'],
  Honda: ['CR-V Hybrid', 'Accord', 'Civic'],
  Ford: ['F-150', 'Mustang', 'Explorer'],
  BMW: ['3 Series', 'X5', 'i4'],
  Tesla: ['Model 3', 'Model Y', 'Cybertruck'],
}

function readToken() {
  try {
    return window.localStorage.getItem('carcollective_token')
  } catch {
    return null
  }
}

function parseResponse(response) {
  return response.json().catch(() => ({})).then((payload) => {
    if (!response.ok) throw new Error(payload.message || 'The request could not be completed.')
    return payload
  })
}

function DemoSkeleton({ label = 'Loading results' }) {
  return (
    <div className="results-grid" role="status" aria-label={label} aria-live="polite">
      {[1, 2, 3].map((item) => (
        <Card key={item} className="p-5">
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
  const [inventory, setInventory] = useState([])
  const [cohorts, setCohorts] = useState([])
  const [strategy, setStrategy] = useState(null)
  const [strategyError, setStrategyError] = useState('')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [sortBy, setSortBy] = useState('discount')
  const [toast, setToast] = useState('')
  const [toastTone, setToastTone] = useState('default')
  const [createOpen, setCreateOpen] = useState(false)
  const [joinCohort, setJoinCohort] = useState(null)
  const [cohortForm, setCohortForm] = useState(defaultCohortForm)
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const controllerRef = useRef(null)
  const timerRef = useRef(null)

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
    const params = new URLSearchParams({
      make: selectedVehicle.make,
      model: selectedVehicle.model,
      zip: selectedVehicle.zipCode,
    })

    try {
      const [inventoryResponse, cohortResponse] = await Promise.all([
        fetch(apiUrl(`/api/inventory?${params.toString()}`), { signal: controller.signal }),
        fetch(apiUrl(`/api/cohorts?${params.toString()}`), { signal: controller.signal }),
      ])
      const [inventoryData, cohortData] = await Promise.all([
        parseResponse(inventoryResponse),
        parseResponse(cohortResponse),
      ])

      const matchingSamples = sampleCohorts.filter((cohort) => (
        cohort.target_make.toLowerCase() === selectedVehicle.make.toLowerCase()
        && cohort.target_model.toLowerCase() === selectedVehicle.model.toLowerCase()
        && cohort.zip_code.slice(0, 3) === selectedVehicle.zipCode.slice(0, 3)
      ))
      const nextCohorts = Array.isArray(cohortData) && cohortData.length ? cohortData : matchingSamples
      const nextInventory = Array.isArray(inventoryData) && inventoryData.length
        ? inventoryData
        : selectedVehicle.make === 'Toyota' && selectedVehicle.model === 'RAV4 Hybrid' && selectedVehicle.zipCode.startsWith('941')
          ? sampleInventory
          : []

      setInventory(nextInventory)
      setCohorts(nextCohorts)
    } catch (error) {
      if (error.name === 'AbortError') return
      const matchingSamples = sampleCohorts.filter((cohort) => (
        cohort.target_make.toLowerCase() === selectedVehicle.make.toLowerCase()
        && cohort.target_model.toLowerCase() === selectedVehicle.model.toLowerCase()
        && cohort.zip_code.slice(0, 3) === selectedVehicle.zipCode.slice(0, 3)
      ))
      const useInventorySamples = selectedVehicle.make === 'Toyota'
        && selectedVehicle.model === 'RAV4 Hybrid'
        && selectedVehicle.zipCode.startsWith('941')

      setInventory(useInventorySamples ? sampleInventory : [])
      setCohorts(matchingSamples)
      showToast('Showing local sample listings while the API is unavailable.', 'error')
    }
  }, [showToast])

  useEffect(() => {
    async function loadInitialData() {
      await loadInventoryAndCohorts(defaultVehicle)
    }

    void loadInitialData()
    return () => {
      controllerRef.current?.abort()
      window.clearTimeout(timerRef.current)
    }
  }, [loadInventoryAndCohorts])

  const handleVehicleSearch = async (nextVehicle) => {
    setVehicle(nextVehicle)
    setSearching(true)
    await Promise.all([
      loadInventoryAndCohorts(nextVehicle),
      new Promise((resolve) => {
        timerRef.current = window.setTimeout(resolve, 600)
      }),
    ])
    setSearching(false)
  }

  const sortedCohorts = useMemo(() => [...cohorts].sort((a, b) => {
    if (sortBy === 'members') return Number(b.member_count || 0) - Number(a.member_count || 0)
    if (sortBy === 'closest') {
      const zipA = String(a.zip_code || '')
      const zipB = String(b.zip_code || '')
      const exactA = zipA === vehicle.zipCode ? 0 : 1
      const exactB = zipB === vehicle.zipCode ? 0 : 1
      return exactA - exactB || zipA.localeCompare(zipB)
    }
    return Number.parseFloat(b.target_discount || '0') - Number.parseFloat(a.target_discount || '0')
  }), [cohorts, sortBy, vehicle.zipCode])

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
      await parseResponse(response)
      closeJoin()
      showToast('You joined the cohort successfully.')
      await loadInventoryAndCohorts(vehicle)
    } catch (error) {
      showToast(error.message || 'Unable to join the cohort.', 'error')
    } finally {
      setJoining(false)
    }
  }

  const handleCreateCohort = async (event) => {
    event.preventDefault()
    if (!/^\d{5}$/.test(cohortForm.zipCode)) {
      showToast('Enter a valid 5-digit ZIP code.', 'error')
      return
    }
    const token = readToken()
    if (!token) {
      showToast('Sign in before creating a cohort.', 'error')
      return
    }

    setCreating(true)
    try {
      const response = await fetch(apiUrl('/api/cohorts'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          target_make: cohortForm.make,
          target_model: cohortForm.model,
          zip_code: cohortForm.zipCode,
          max_members: Number(cohortForm.maxMembers),
          urgency: cohortForm.urgency,
        }),
      })
      await parseResponse(response)
      closeCreate()
      setVehicle({ ...vehicle, make: cohortForm.make, model: cohortForm.model, zipCode: cohortForm.zipCode })
      showToast('Your cohort is live. Invite nearby buyers to join.')
      await loadInventoryAndCohorts({
        ...vehicle,
        make: cohortForm.make,
        model: cohortForm.model,
        zipCode: cohortForm.zipCode,
      })
    } catch (error) {
      showToast(error.message || 'Unable to create the cohort.', 'error')
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
          zip_code: vehicle.zipCode,
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          listed_price: inventory[0]?.listed_price || 38950,
          msrp: inventory[0]?.msrp || 41500,
        }),
      })
      const payload = await parseResponse(response)
      setStrategy(payload)
    } catch (error) {
      setStrategyError(error.message || 'Strategy generation failed.')
      showToast(error.message || 'Strategy generation failed.', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-main page-enter">
      <section className="mb-9">
        <p className="eyebrow m-0">Your buying workspace</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white md:text-5xl">Dashboard</h1>
        <p className="mt-3 max-w-2xl text-slate-400">Find a local group, compare showroom offers, and turn your next car search into shared leverage.</p>
      </section>

      <Reveal>
        <VehicleSelector onSearch={handleVehicleSearch} loading={searching} />
      </Reveal>

      <Reveal as="section" className="section-block">
        <div className="results-toolbar">
          <div>
            <p className="eyebrow m-0">Buyers near {vehicle.zipCode}</p>
            <h2 className="section-heading">Local cohorts</h2>
            <p className="mt-2 text-sm text-slate-400">{cohorts.length} {cohorts.length === 1 ? 'group' : 'groups'} for {vehicle.year} {vehicle.make} {vehicle.model}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="field-label flex-row items-center gap-2">
              <span className="whitespace-nowrap">Sort by</span>
              <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="field-control min-w-40">
                <option value="discount">Best discount</option>
                <option value="closest">Closest ZIP</option>
                <option value="members">Most members</option>
              </select>
            </label>
            <Button type="button" variant="ghost" onClick={() => setCreateOpen(true)}>＋ Start a cohort</Button>
          </div>
        </div>

        {searching ? (
          <DemoSkeleton />
        ) : sortedCohorts.length ? (
          <CohortList cohorts={sortedCohorts} onJoin={setJoinCohort} />
        ) : (
          <EmptyState
            icon="car"
            title="No cohorts match this search yet"
            message="Start a group for your vehicle and invite nearby buyers to build negotiating power together."
            action={<Button type="button" onClick={() => setCreateOpen(true)}>Start a cohort</Button>}
          />
        )}
      </Reveal>

      <Reveal as="section" className="section-block">
        <div className="mb-6">
          <p className="eyebrow m-0">Inventory</p>
          <h2 className="section-heading">Nearby dealership pricing</h2>
        </div>
        {searching ? <DemoSkeleton label="Loading inventory" /> : <DealerPriceCard listings={inventory} />}
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
                onChange={(event) => setCohortForm((current) => ({ ...current, make: event.target.value, model: cohortModels[event.target.value][0] }))}
              >
                {Object.keys(cohortModels).map((make) => <option key={make} value={make}>{make}</option>)}
              </select>
            </label>
            <label className="field-label">
              Model
              <select className="field-control" value={cohortForm.model} onChange={(event) => setCohortForm((current) => ({ ...current, model: event.target.value }))}>
                {(cohortModels[cohortForm.make] || []).map((model) => <option key={model} value={model}>{model}</option>)}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="field-label">
                ZIP code
                <input className="field-control" value={cohortForm.zipCode} inputMode="numeric" maxLength={5} onChange={(event) => setCohortForm((current) => ({ ...current, zipCode: event.target.value.replace(/\D/g, '').slice(0, 5) }))} required />
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
            {!readToken() && <p className="m-0 text-sm text-slate-400">You’ll need to <Link className="text-cyan-200 underline" to="/login" onClick={closeCreate}>sign in</Link> before creating a cohort.</p>}
            <Button type="submit" disabled={creating}>{creating ? 'Creating cohort…' : 'Create cohort'}</Button>
          </form>
        </Modal>
      )}

      {joinCohort && (
        <Modal title={`Join ${joinCohort.target_make} ${joinCohort.target_model}`} description="Confirm to join this local buyer group and be counted toward its target." onClose={closeJoin}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="m-0 text-sm text-slate-300">{joinCohort.member_count || 0} of {joinCohort.max_members || 10} buyers are in this cohort.</p>
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
