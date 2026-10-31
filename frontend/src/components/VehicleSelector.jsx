import { useEffect, useMemo, useState } from 'react'
import { apiUrl, apiNetworkError, parseApiResponse } from '../lib/api'
import { BHUBANESWAR_LOCALITIES, DEFAULT_PINCODE, getCurrentLocation } from '../lib/bhubaneswar'
import { Badge, Button, Card } from './ui'

export default function VehicleSelector({ onSearch, loading = false }) {
  const [vehicles, setVehicles] = useState([])
  const [vehicleError, setVehicleError] = useState('')
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [year, setYear] = useState('')
  const [make, setMake] = useState('')
  const [model, setModel] = useState('')
  const [pincode, setPincode] = useState(DEFAULT_PINCODE)
  const [location, setLocation] = useState(null)
  const [zipError, setZipError] = useState('')
  const [locationMessage, setLocationMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    async function loadVehicles() {
      try {
        const response = await fetch(apiUrl('/api/vehicles'), { signal: controller.signal })
        const records = await parseApiResponse(response, 'Vehicle choices could not be loaded.')
        if (!Array.isArray(records)) throw new Error('The API returned an unexpected vehicle list.')
        setVehicles(records)
        const first = records[0]
        if (first) {
          setMake(first.make)
          setModel(first.model)
          setYear(first.model_year ? String(first.model_year) : '')
        }
        setVehicleError('')
      } catch (error) {
        if (error.name !== 'AbortError') setVehicleError(apiNetworkError(error).message)
      } finally {
        if (!controller.signal.aborted) setCatalogLoading(false)
      }
    }
    void loadVehicles()
    return () => controller.abort()
  }, [])

  const makeOptions = useMemo(() => [...new Set(vehicles.map((vehicle) => vehicle.make))], [vehicles])
  const modelOptions = useMemo(
    () => vehicles.filter((vehicle) => vehicle.make === make),
    [vehicles, make],
  )
  const yearOptions = useMemo(
    () => [...new Set(modelOptions.map((vehicle) => vehicle.model_year).filter(Boolean))].sort((a, b) => b - a),
    [modelOptions],
  )
  const selectedVehicle = modelOptions.find((vehicle) => vehicle.model === model)

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!/^[1-9]\d{5}$/.test(pincode)) {
      setZipError('Enter a valid 6-digit PIN code.')
      return
    }
    if (!make || !model || !selectedVehicle) {
      setVehicleError('Choose a make and model from the vehicle catalog.')
      return
    }
    setZipError('')
    onSearch?.({
      year: year ? Number(year) : undefined,
      make,
      model,
      vehicleId: selectedVehicle.id,
      pincode,
      location,
    })
  }

  const useMyLocation = async () => {
    setLocationMessage('')
    try {
      const currentLocation = await getCurrentLocation()
      setLocation(currentLocation)
      setLocationMessage('Using your current location for this search.')
    } catch (error) {
      setLocation(null)
      setLocationMessage(error.message)
    }
  }

  return (
    <Card className="filter-card">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow m-0">Vehicle target</p>
          <h2 className="section-heading">Find local deal flow</h2>
        </div>
        <Badge tone="success"><span className="ed-list-dot h-1.5 w-1.5 rounded-full" /> Bhubaneswar</Badge>
      </div>

      <form onSubmit={handleSubmit} className="filter-grid">
        <label className="field-label">
          Year
          <select value={year} onChange={(event) => setYear(event.target.value)} className="field-control" disabled={!yearOptions.length}>
            <option value="">{yearOptions.length ? 'Any listed year' : 'Not in vehicle catalog'}</option>
            {yearOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>

        <label className="field-label">
          Make
          <select
            value={make}
            onChange={(event) => {
              const nextMake = event.target.value
              const nextVehicle = vehicles.find((vehicle) => vehicle.make === nextMake)
              setMake(nextMake)
              setModel(nextVehicle?.model || '')
              setYear('')
            }}
            className="field-control"
            disabled={catalogLoading || !makeOptions.length}
          >
            {makeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>

        <label className="field-label">
          Model
          <select
            value={model}
            onChange={(event) => {
              const vehicle = modelOptions.find((item) => item.model === event.target.value)
              setModel(event.target.value)
              setYear(vehicle?.model_year ? String(vehicle.model_year) : '')
            }}
            className="field-control"
            disabled={catalogLoading || !modelOptions.length}
          >
            {modelOptions.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.model}>{vehicle.model}{vehicle.variant ? ` · ${vehicle.variant}` : ''}</option>
            ))}
          </select>
        </label>

        <label className="field-label">
          PIN code
          <input
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            value={pincode}
            onChange={(event) => {
              setPincode(event.target.value.replace(/\D/g, '').slice(0, 6))
              setLocation(null)
              if (zipError) setZipError('')
              setLocationMessage('')
            }}
            className="field-control"
            placeholder="751007"
            maxLength={6}
            aria-invalid={Boolean(zipError)}
            aria-describedby={zipError ? 'pincode-error' : undefined}
          />
          {zipError && <span id="pincode-error" className="field-error" role="alert">{zipError}</span>}
        </label>

        <div className="flex flex-wrap items-end gap-3">
          <label className="field-label min-w-48 flex-1">
            Locality
            <select
              value={BHUBANESWAR_LOCALITIES.find((item) => item.pincode === pincode)?.pincode || ''}
              onChange={(event) => {
                if (!event.target.value) return
                setPincode(event.target.value)
                setLocation(null)
                setLocationMessage('Locality coordinates are approximate.')
              }}
              className="field-control"
            >
              <option value="">Use entered PIN</option>
              {BHUBANESWAR_LOCALITIES.map((item) => <option key={item.pincode} value={item.pincode}>{item.name}</option>)}
            </select>
          </label>
          <Button type="button" variant="ghost" size="small" onClick={useMyLocation}>Use my location</Button>
        </div>

        <div className="flex items-end">
          <Button type="submit" disabled={loading || catalogLoading || !selectedVehicle} className="w-full">
            {loading ? 'Searching…' : 'Search nearby'}
          </Button>
        </div>
      </form>
      {vehicleError && <p className="field-error mt-4" role="alert">{vehicleError}</p>}
      {locationMessage && <p className="ed-muted mt-3" role="status">{locationMessage}</p>}
      <p className="ed-muted mt-2">PIN-code and locality coordinates are approximate; adjust the search radius to broaden results.</p>
    </Card>
  )
}
