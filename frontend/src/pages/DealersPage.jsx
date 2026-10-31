import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import DealerPriceCard from '../components/DealerPriceCard'
import { AnimatedCounter, Button, Card, EmptyState, Modal, Reveal, Skeleton, Toast } from '../components/ui'
import { apiNetworkError, apiUrl, parseApiResponse } from '../lib/api'
import { BHUBANESWAR_LOCALITIES, DEFAULT_PINCODE, getCurrentLocation } from '../lib/bhubaneswar'

const initialSearch = { pincode: DEFAULT_PINCODE, make: '', model: '', location: null }

function readToken() {
  try {
    return window.localStorage.getItem('carcollective_token')
  } catch {
    return null
  }
}

function DealerSkeletons() {
  return (
    <div className="dealer-grid" role="status" aria-label="Loading nearby showrooms">
      {[1, 2, 3].map((item) => (
        <Card key={item} className="dealer-card ed-skeleton-card">
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
  const [vehicles, setVehicles] = useState([])
  const [showrooms, setShowrooms] = useState([])
  const [offers, setOffers] = useState([])
  const [loadedSearchKey, setLoadedSearchKey] = useState('')
  const [error, setError] = useState('')
  const [search, setSearch] = useState(initialSearch)
  const [pincode, setPincode] = useState(DEFAULT_PINCODE)
  const [radiusKm, setRadiusKm] = useState(25)
  const [sort, setSort] = useState('best_discount')
  const [reload, setReload] = useState(0)
  const [vehicleError, setVehicleError] = useState('')
  const [userId, setUserId] = useState('')
  const [myShowrooms, setMyShowrooms] = useState([])
  const [showroomOpen, setShowroomOpen] = useState(false)
  const [offerOpen, setOfferOpen] = useState(false)
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  const [pendingPhotoShowroomId, setPendingPhotoShowroomId] = useState('')
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [toastTone, setToastTone] = useState('default')
  const [formError, setFormError] = useState('')
  const [locationMessage, setLocationMessage] = useState('')
  const [showroomForm, setShowroomForm] = useState({
    name: '', brand: '', address: '', locality: 'Saheed Nagar', city: 'Bhubaneswar', state: 'Odisha',
    pincode: DEFAULT_PINCODE, lat: '', lng: '', phone: '', hours: '',
  })
  const [offerForm, setOfferForm] = useState({
    showroomId: '', vehicleId: '', price: '', discount: '0', stock: '', note: '', validUntil: '',
  })

  const makeOptions = useMemo(() => [...new Set(vehicles.map((vehicle) => vehicle.make))], [vehicles])
  const searchKey = JSON.stringify([search, sort, reload])

  useEffect(() => {
    const controller = new AbortController()
    async function loadVehicles() {
      try {
        const response = await fetch(apiUrl('/api/vehicles'), { signal: controller.signal })
        const records = await parseApiResponse(response, 'Vehicle choices could not be loaded.')
        if (!Array.isArray(records)) throw new Error('The API returned an unexpected vehicle list.')
        setVehicles(records)
        setVehicleError('')
        setOfferForm((current) => ({ ...current, vehicleId: current.vehicleId || records[0]?.id || '' }))
      } catch (loadError) {
        if (loadError.name !== 'AbortError') setVehicleError(apiNetworkError(loadError).message)
      }
    }
    void loadVehicles()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const token = readToken()
    if (!token) return undefined
    const controller = new AbortController()
    async function loadOwnedShowrooms() {
      try {
        const userResponse = await fetch(apiUrl('/api/auth/me'), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        const user = await parseApiResponse(userResponse, 'Your sign-in session could not be checked.')
        setUserId(user.id || '')
        const response = await fetch(apiUrl('/api/showrooms/mine'), {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        const records = await parseApiResponse(response, 'Your showrooms could not be loaded.')
        if (Array.isArray(records)) setMyShowrooms(records)
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setUserId('')
          setMyShowrooms([])
        }
      }
    }
    void loadOwnedShowrooms()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let timer
    const minimumLoading = new Promise((resolve) => {
      timer = window.setTimeout(resolve, 450)
    })
    async function loadShowroomsAndOffers() {
      const params = new URLSearchParams({
        pincode: search.pincode,
        radiusKm: '100',
        sort,
      })
      if (search.location) {
        params.set('lat', String(search.location.lat))
        params.set('lng', String(search.location.lng))
      }
      if (search.make) params.set('make', search.make)
      if (search.model) params.set('model', search.model)
      try {
        const [showroomResponse, offerResponse] = await Promise.all([
          fetch(apiUrl(`/api/showrooms?${params.toString()}`), { signal: controller.signal }),
          fetch(apiUrl(`/api/offers?${params.toString()}`), { signal: controller.signal }),
        ])
        const [showroomData, offerData] = await Promise.all([
          parseApiResponse(showroomResponse, 'Showrooms could not be loaded.'),
          parseApiResponse(offerResponse, 'Showroom offers could not be loaded.'),
        ])
        if (!Array.isArray(showroomData) || !Array.isArray(offerData)) throw new Error('The API returned an unexpected showroom response.')
        setShowrooms(showroomData)
        setOffers(offerData)
        setError('')
      } catch (loadError) {
        if (loadError.name !== 'AbortError') {
          setShowrooms([])
          setOffers([])
          setError(apiNetworkError(loadError, 'Nearby showroom data could not be loaded.').message)
        }
      } finally {
        await minimumLoading
        if (!controller.signal.aborted) setLoadedSearchKey(searchKey)
      }
    }
    void loadShowroomsAndOffers()
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [search, sort, reload, searchKey])

  useEffect(() => {
    if (!photoPreview) return undefined
    return () => URL.revokeObjectURL(photoPreview)
  }, [photoPreview])

  const visibleShowrooms = useMemo(
    () => showrooms.filter((showroom) => Number(showroom.distanceKm) <= radiusKm),
    [radiusKm, showrooms],
  )
  const loading = loadedSearchKey !== searchKey
  const visibleIds = useMemo(() => new Set(visibleShowrooms.map((showroom) => showroom.id)), [visibleShowrooms])
  const visibleOffers = useMemo(() => {
    const filtered = offers.filter((offer) => visibleIds.has(offer.showroom_id))
    if (sort === 'lowest_price') return [...filtered].sort((a, b) => a.final_price_inr - b.final_price_inr)
    if (sort === 'nearest') return [...filtered].sort((a, b) => a.distanceKm - b.distanceKm)
    return [...filtered].sort((a, b) => Number(b.bestDeal) - Number(a.bestDeal) || b.dealer_discount_inr - a.dealer_discount_inr)
  }, [offers, sort, visibleIds])

  const uniqueVehicles = new Set(visibleOffers.map((offer) => offer.vehicle_id)).size
  const prices = visibleOffers.map((offer) => Number(offer.ex_showroom_price_inr)).filter((price) => Number.isFinite(price) && price > 0)
  const averagePrice = prices.length ? Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : null
  const coverageRadius = visibleShowrooms.reduce((maximum, showroom) => Math.max(maximum, Number(showroom.distanceKm) || 0), 0)

  const retry = () => {
    setError('')
    setReload((count) => count + 1)
  }

  const applySearch = (event) => {
    event.preventDefault()
    if (!/^[1-9]\d{5}$/.test(pincode)) {
      setError('Enter a valid 6-digit PIN code.')
      return
    }
    setError('')
    setSearch({ ...search, pincode })
  }

  const useMyLocation = async () => {
    try {
      const location = await getCurrentLocation()
      setSearch((current) => ({ ...current, location }))
      setLocationMessage('Using your current location for showroom distances.')
    } catch (locationError) {
      setLocationMessage(locationError.message)
    }
  }

  const choosePhoto = (event) => {
    const file = event.target.files?.[0] || null
    if (!file) {
      setPhoto(null)
      setPhotoPreview('')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFormError('Choose a JPEG, PNG, or WebP photo.')
      event.target.value = ''
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setFormError('Photo must be 2 MB or smaller.')
      event.target.value = ''
      return
    }
    setFormError('')
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const closeShowroomForm = () => {
    setShowroomOpen(false)
    setPendingPhotoShowroomId('')
    setPhoto(null)
    setPhotoPreview('')
  }

  const submitShowroom = async (event) => {
    event.preventDefault()
    const token = readToken()
    if (!token) return setFormError('Sign in before adding a showroom.')
    setBusy(true)
    setFormError('')
    try {
      if (pendingPhotoShowroomId) {
        if (!photo) throw new Error('Choose a photo to retry the upload.')
        const data = new FormData()
        data.append('photo', photo)
        const photoResponse = await fetch(apiUrl(`/api/showrooms/${encodeURIComponent(pendingPhotoShowroomId)}/photo`), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: data,
        })
        await parseApiResponse(photoResponse, 'The showroom was saved, but its photo could not be uploaded.')
        setPendingPhotoShowroomId('')
        setShowroomOpen(false)
        setPhoto(null)
        setPhotoPreview('')
        setToastTone('default')
        setToast('Showroom details and photo saved.')
        setReload((count) => count + 1)
        return
      }

      const response = await fetch(apiUrl('/api/showrooms'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...showroomForm,
          lat: Number(showroomForm.lat),
          lng: Number(showroomForm.lng),
        }),
      })
      const showroom = await parseApiResponse(response, 'The showroom could not be saved.')
      setMyShowrooms((current) => [showroom, ...current])
      if (photo) {
        const data = new FormData()
        data.append('photo', photo)
        const photoResponse = await fetch(apiUrl(`/api/showrooms/${encodeURIComponent(showroom.id)}/photo`), {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: data,
        })
        try {
          await parseApiResponse(photoResponse, 'The showroom was saved, but its photo could not be uploaded.')
        } catch (uploadError) {
          setPendingPhotoShowroomId(showroom.id)
          throw new Error(`${apiNetworkError(uploadError).message} The showroom was saved; submit again to retry its photo without creating a duplicate.`)
        }
      }
      setShowroomOpen(false)
      setPhoto(null)
      setPhotoPreview('')
      setPendingPhotoShowroomId('')
      setToastTone('default')
      setToast('Showroom details saved. They will be marked unverified until reviewed.')
      setReload((count) => count + 1)
    } catch (submitError) {
      setFormError(apiNetworkError(submitError).message)
    } finally {
      setBusy(false)
    }
  }

  const submitOffer = async (event) => {
    event.preventDefault()
    const token = readToken()
    if (!token) return setFormError('Sign in before adding a car price.')
    if (!offerForm.showroomId) return setFormError('Choose one of your showrooms.')
    setBusy(true)
    setFormError('')
    try {
      const response = await fetch(apiUrl(`/api/showrooms/${encodeURIComponent(offerForm.showroomId)}/offers`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          vehicle_id: offerForm.vehicleId,
          ex_showroom_price_inr: Number(offerForm.price),
          dealer_discount_inr: Number(offerForm.discount),
          stock: offerForm.stock === '' ? undefined : Number(offerForm.stock),
          offer_note: offerForm.note || undefined,
          valid_until: offerForm.validUntil || undefined,
        }),
      })
      await parseApiResponse(response, 'The car price could not be saved.')
      setOfferOpen(false)
      setToastTone('default')
      setToast('Car price saved.')
      setReload((count) => count + 1)
    } catch (submitError) {
      setFormError(apiNetworkError(submitError).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page-main page-enter">
      <section className="ed-page-intro">
        <p className="eyebrow">Local showroom network · Odisha</p>
        <h1>Nearby showroom <span className="ed-serif">offers</span></h1>
        <p>Compare submitted ex-showroom prices across Bhubaneswar. Demo records are illustrative; confirm every offer with the showroom.</p>
      </section>

      <Reveal as="section" className="section-block ed-stat-grid" aria-label="Inventory summary">
        <Card className="ed-stat-panel">
          <p>Vehicles in market</p>
          <strong>{loading ? '—' : uniqueVehicles ? <AnimatedCounter value={uniqueVehicles} /> : 'No data yet'}</strong>
        </Card>
        <Card className="ed-stat-panel">
          <p>Average listed price</p>
          <strong>{loading ? '—' : averagePrice !== null ? <AnimatedCounter value={averagePrice} prefix="₹" locale="en-IN" /> : 'No data yet'}</strong>
        </Card>
        <Card className="ed-stat-panel">
          <p>Coverage radius</p>
          <strong>{loading ? '—' : visibleShowrooms.length ? <AnimatedCounter value={coverageRadius} suffix=" km" /> : 'No data yet'}</strong>
        </Card>
      </Reveal>

      <Reveal as="section" className="section-block">
        <Card className="filter-card">
          <form onSubmit={applySearch} className="ed-market-filters">
            <label className="field-label">PIN code
              <input className="field-control" value={pincode} maxLength={6} inputMode="numeric" autoComplete="postal-code"
                onChange={(event) => setPincode(event.target.value.replace(/\D/g, '').slice(0, 6))} />
            </label>
            <label className="field-label">Locality
              <select className="field-control" value={BHUBANESWAR_LOCALITIES.find((item) => item.pincode === pincode)?.pincode || ''}
                onChange={(event) => event.target.value && setPincode(event.target.value)}>
                <option value="">Entered PIN</option>
                {BHUBANESWAR_LOCALITIES.map((item) => <option key={item.pincode} value={item.pincode}>{item.name}</option>)}
              </select>
            </label>
            <label className="field-label">Make
              <select className="field-control" value={search.make} onChange={(event) => setSearch((current) => ({ ...current, make: event.target.value, model: '' }))}>
                <option value="">All makes</option>
                {makeOptions.map((make) => <option key={make} value={make}>{make}</option>)}
              </select>
            </label>
            <label className="field-label">Model
              <select className="field-control" value={search.model} onChange={(event) => setSearch((current) => ({ ...current, model: event.target.value }))}>
                <option value="">All models</option>
                {vehicles.filter((vehicle) => !search.make || vehicle.make === search.make)
                  .map((vehicle) => <option key={vehicle.id} value={vehicle.model}>{vehicle.model}</option>)}
              </select>
            </label>
            <Button type="submit">Search area</Button>
            <Button type="button" variant="ghost" onClick={useMyLocation}>Use my location</Button>
          </form>
          <div className="ed-market-controls">
            <label className="field-label ed-radius-control">Radius: <strong>{radiusKm} km</strong>
              <input type="range" min="10" max="100" step="5" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} aria-label="Showroom search radius in kilometres" />
            </label>
            <label className="field-label">Sort offers
              <select className="field-control" value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="best_discount">Best discount</option>
                <option value="lowest_price">Lowest final price</option>
                <option value="nearest">Nearest first</option>
              </select>
            </label>
          </div>
          {vehicleError && <p className="field-error" role="alert">{vehicleError}</p>}
          {locationMessage && <p className="ed-muted" role="status">{locationMessage}</p>}
        </Card>
      </Reveal>

      <Reveal as="section" className="section-block ed-section">
        <div className="ed-section-heading">
          <div><p className="eyebrow">Inventory</p><h2>Showrooms in the <span className="ed-serif">market</span></h2></div>
          {!loading && !error && <p>{visibleShowrooms.length} {visibleShowrooms.length === 1 ? 'showroom' : 'showrooms'} · {visibleOffers.length} offers</p>}
        </div>
        <div className="ed-form-actions">
          {userId ? (
            <>
              <Button type="button" variant="ghost" onClick={() => { setFormError(''); setShowroomOpen(true) }}>Add showroom</Button>
              <Button type="button" variant="ghost" onClick={() => { setFormError(''); setOfferOpen(true) }} disabled={!myShowrooms.length}>Add car price</Button>
            </>
          ) : (
            <p className="ed-muted">Want to contribute a showroom or price? <Link to="/login" className="ed-inline-link">Sign in</Link> first.</p>
          )}
        </div>
        {loading ? (
          <DealerSkeletons />
        ) : error ? (
          <div className="ed-error-state" role="alert">
            <h3>Showroom information isn’t available right now</h3>
            <p>{error}</p>
            <Button type="button" variant="ghost" onClick={retry}>Retry</Button>
          </div>
        ) : visibleShowrooms.length ? (
          <DealerPriceCard listings={visibleOffers} showrooms={visibleShowrooms} />
        ) : (
          <EmptyState icon="car" title="No showrooms in this radius yet" message="Try a wider radius, search another Bhubaneswar PIN code, or add a showroom you know." />
        )}
      </Reveal>

      {showroomOpen && (
        <Modal title="Add a showroom" description="Provide showroom business details. New entries remain unverified until reviewed." onClose={closeShowroomForm} className="ed-large-modal">
          <form className="form-grid" onSubmit={submitShowroom}>
            {pendingPhotoShowroomId && <p className="ed-inline-note" role="status">Showroom saved. Retry the photo upload; details are locked to avoid creating a duplicate.</p>}
            <fieldset className="ed-form-grid" disabled={busy || Boolean(pendingPhotoShowroomId)}>
              <label className="field-label">Showroom name<input className="field-control" required minLength={2} maxLength={160} value={showroomForm.name} onChange={(event) => setShowroomForm({ ...showroomForm, name: event.target.value })} /></label>
              <label className="field-label">Brand<input className="field-control" maxLength={100} value={showroomForm.brand} onChange={(event) => setShowroomForm({ ...showroomForm, brand: event.target.value })} /></label>
              <label className="field-label">Locality<select className="field-control" value={showroomForm.pincode} onChange={(event) => { const selected = BHUBANESWAR_LOCALITIES.find((item) => item.pincode === event.target.value); setShowroomForm({ ...showroomForm, pincode: event.target.value, locality: selected?.name || '' }) }}>{BHUBANESWAR_LOCALITIES.map((item) => <option key={item.pincode} value={item.pincode}>{item.name} · {item.pincode}</option>)}</select></label>
              <label className="field-label">Street address<input className="field-control" required minLength={5} maxLength={300} value={showroomForm.address} onChange={(event) => setShowroomForm({ ...showroomForm, address: event.target.value })} /></label>
              <label className="field-label">PIN code<input className="field-control" required pattern="[1-9][0-9]{5}" maxLength={6} inputMode="numeric" value={showroomForm.pincode} onChange={(event) => setShowroomForm({ ...showroomForm, pincode: event.target.value.replace(/\D/g, '').slice(0, 6) })} /></label>
              <label className="field-label">Business phone<input className="field-control" type="tel" maxLength={20} value={showroomForm.phone} onChange={(event) => setShowroomForm({ ...showroomForm, phone: event.target.value })} /></label>
              <label className="field-label">Opening hours<input className="field-control" maxLength={300} value={showroomForm.hours} onChange={(event) => setShowroomForm({ ...showroomForm, hours: event.target.value })} /></label>
              <label className="field-label">Latitude<input className="field-control" type="number" step="any" min="-90" max="90" required value={showroomForm.lat} onChange={(event) => setShowroomForm({ ...showroomForm, lat: event.target.value })} /></label>
              <label className="field-label">Longitude<input className="field-control" type="number" step="any" min="-180" max="180" required value={showroomForm.lng} onChange={(event) => setShowroomForm({ ...showroomForm, lng: event.target.value })} /></label>
            </fieldset>
            {!pendingPhotoShowroomId && <Button type="button" variant="ghost" size="small" onClick={async () => { try { const coordinates = await getCurrentLocation(); setShowroomForm((current) => ({ ...current, lat: String(coordinates.lat), lng: String(coordinates.lng) })); setFormError('') } catch (error) { setFormError(error.message) } }}>Use my location for coordinates</Button>}
            <label className="field-label">Showroom photo (JPEG, PNG, or WebP · max 2 MB)
              <input className="field-control" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePhoto} />
            </label>
            {photoPreview && <img className="ed-photo-preview" src={photoPreview} alt="Selected showroom preview" />}
            {formError && <p className="field-error" role="alert">{formError}</p>}
            <Button type="submit" disabled={busy || (Boolean(pendingPhotoShowroomId) && !photo)}>{busy ? 'Saving showroom…' : pendingPhotoShowroomId ? 'Retry photo upload' : 'Save showroom'}</Button>
          </form>
        </Modal>
      )}

      {offerOpen && (
        <Modal title="Add or update a car price" description="Prices are stored in whole Indian rupees and displayed as ex-showroom offers." onClose={() => setOfferOpen(false)}>
          <form className="form-grid" onSubmit={submitOffer}>
            <label className="field-label">Showroom<select className="field-control" required value={offerForm.showroomId} onChange={(event) => setOfferForm({ ...offerForm, showroomId: event.target.value })}><option value="">Choose your showroom</option>{myShowrooms.map((showroom) => <option key={showroom.id} value={showroom.id}>{showroom.name} · {showroom.locality}</option>)}</select></label>
            <label className="field-label">Vehicle<select className="field-control" required value={offerForm.vehicleId} onChange={(event) => setOfferForm({ ...offerForm, vehicleId: event.target.value })}>{vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{vehicle.make} {vehicle.model} · {vehicle.variant}</option>)}</select></label>
            <div className="ed-form-grid">
              <label className="field-label">Ex-showroom price (₹)<input className="field-control" type="number" min="1" step="1" required value={offerForm.price} onChange={(event) => setOfferForm({ ...offerForm, price: event.target.value })} /></label>
              <label className="field-label">Dealer discount (₹)<input className="field-control" type="number" min="0" step="1" required value={offerForm.discount} onChange={(event) => setOfferForm({ ...offerForm, discount: event.target.value })} /></label>
              <label className="field-label">Stock count<input className="field-control" type="number" min="0" step="1" value={offerForm.stock} onChange={(event) => setOfferForm({ ...offerForm, stock: event.target.value })} /></label>
              <label className="field-label">Valid until<input className="field-control" type="date" onChange={(event) => setOfferForm({ ...offerForm, validUntil: event.target.value })} /></label>
            </div>
            <label className="field-label">Offer note<textarea className="field-control ed-textarea" maxLength={1000} value={offerForm.note} onChange={(event) => setOfferForm({ ...offerForm, note: event.target.value })} /></label>
            {formError && <p className="field-error" role="alert">{formError}</p>}
            <Button type="submit" disabled={busy}>{busy ? 'Saving price…' : 'Save car price'}</Button>
          </form>
        </Modal>
      )}

      {toast && <div className="fixed bottom-5 right-5 z-50 w-[min(90vw,28rem)]"><Toast message={toast} tone={toastTone} onDismiss={() => setToast('')} /></div>}
    </main>
  )
}
