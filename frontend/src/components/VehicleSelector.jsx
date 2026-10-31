import { useMemo, useState } from 'react'
import { Badge, Button, Card } from './ui'

const yearOptions = [2022, 2023, 2024, 2025, 2026]
const makes = ['Toyota', 'Honda', 'Ford', 'BMW', 'Tesla']
const models = {
  Toyota: ['RAV4 Hybrid', 'Camry', 'Corolla'],
  Honda: ['CR-V Hybrid', 'Accord', 'Civic'],
  Ford: ['F-150', 'Mustang', 'Explorer'],
  BMW: ['3 Series', 'X5', 'i4'],
  Tesla: ['Model 3', 'Model Y', 'Cybertruck'],
}

export default function VehicleSelector({ onSearch, loading = false }) {
  const [year, setYear] = useState(2024)
  const [make, setMake] = useState(makes[0])
  const [model, setModel] = useState(models[makes[0]][0])
  const [zipCode, setZipCode] = useState('94105')
  const [zipError, setZipError] = useState('')

  const availableModels = useMemo(() => models[make] || [], [make])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!/^\d{5}$/.test(zipCode)) {
      setZipError('Enter a valid 5-digit ZIP code.')
      return
    }

    setZipError('')
    onSearch?.({ year, make, model, zipCode })
  }

  return (
    <Card className="filter-card">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow m-0">Vehicle target</p>
          <h2 className="section-heading">Find local deal flow</h2>
        </div>
        <Badge tone="success"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Local pricing</Badge>
      </div>

      <form onSubmit={handleSubmit} className="filter-grid">
        <label className="field-label">
          Year
          <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="field-control">
            {yearOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>

        <label className="field-label">
          Make
          <select
            value={make}
            onChange={(event) => {
              const nextMake = event.target.value
              setMake(nextMake)
              setModel(models[nextMake]?.[0] || '')
            }}
            className="field-control"
          >
            {makes.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>

        <label className="field-label">
          Model
          <select value={model} onChange={(event) => setModel(event.target.value)} className="field-control">
            {availableModels.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>

        <label className="field-label">
          ZIP code
          <input
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            value={zipCode}
            onChange={(event) => {
              setZipCode(event.target.value.replace(/\D/g, '').slice(0, 5))
              if (zipError) setZipError('')
            }}
            className="field-control"
            placeholder="94105"
            maxLength={5}
            aria-invalid={Boolean(zipError)}
            aria-describedby={zipError ? 'zip-error' : undefined}
          />
          {zipError && <span id="zip-error" className="field-error" role="alert">{zipError}</span>}
        </label>

        <div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Searching…' : 'Search deals'}
          </Button>
        </div>
      </form>
    </Card>
  )
}
