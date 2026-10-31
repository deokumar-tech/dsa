import { useEffect, useState } from 'react'
import VehicleSelector from '../components/VehicleSelector'
import DealerPriceCard from '../components/DealerPriceCard'
import CohortList from '../components/CohortList'
import AiStrategyPanel from '../components/AiStrategyPanel'
import { apiUrl } from '../lib/api'

const defaultVehicle = {
  year: 2024,
  make: 'Toyota',
  model: 'RAV4 Hybrid',
  zipCode: '94105',
}

export default function DashboardPage() {
  const [vehicle, setVehicle] = useState(defaultVehicle)
  const [inventory, setInventory] = useState([])
  const [cohorts, setCohorts] = useState([])
  const [strategy, setStrategy] = useState(null)
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  const loadInventoryAndCohorts = async (selectedVehicle = vehicle) => {
    try {
      const params = new URLSearchParams({
        make: selectedVehicle.make,
        model: selectedVehicle.model,
        zip: selectedVehicle.zipCode,
      })

      const [inventoryResponse, cohortResponse] = await Promise.all([
        fetch(apiUrl(`/api/inventory?${params.toString()}`)),
        fetch(apiUrl(`/api/cohorts?${params.toString()}`)),
      ])

      const inventoryData = await inventoryResponse.json()
      const cohortData = await cohortResponse.json()

      setInventory(Array.isArray(inventoryData) ? inventoryData : [])
      setCohorts(Array.isArray(cohortData) ? cohortData : [])
    } catch (error) {
      console.error('Error loading dashboard data:', error)
      setInventory([])
      setCohorts([])
    }
  }

  useEffect(() => {
    loadInventoryAndCohorts(defaultVehicle)
  }, [])

  const handleVehicleSearch = async (nextVehicle) => {
    setVehicle(nextVehicle)
    await loadInventoryAndCohorts(nextVehicle)
  }

  const handleJoinCohort = async (cohortId) => {
    const token = localStorage.getItem('carcollective_token')
    if (!token) {
      setStatusMessage('Register or log in to join a local buyer cohort.')
      return
    }

    try {
      const response = await fetch(apiUrl(`/api/cohorts/${cohortId}/join`), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.message || 'Unable to join cohort.')
      }

      setStatusMessage('You joined the cohort successfully.')
      await loadInventoryAndCohorts(vehicle)
    } catch (error) {
      setStatusMessage(error.message)
    }
  }

  const handleGenerateStrategy = async () => {
    const token = localStorage.getItem('carcollective_token')
    if (!token) {
      setStatusMessage('Log in before generating a negotiation strategy.')
      return
    }

    setLoading(true)
    setStatusMessage('')

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

      const payload = await response.json()
      if (!response.ok) {
        throw new Error(payload.message || 'Strategy generation failed.')
      }

      setStrategy(payload)
    } catch (error) {
      setStatusMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <section className="mb-10">
        <p className="text-sm uppercase tracking-[0.28em] text-cyan-300">User hub</p>
        <h1 className="mt-2 text-4xl font-black text-white">Dashboard</h1>
      </section>

      <VehicleSelector onSearch={handleVehicleSearch} />

      <section className="mt-12">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.26em] text-cyan-300">Buyers near you</p>
          <h2 className="mt-2 text-3xl font-bold text-white">Local cohorts</h2>
        </div>
        <CohortList cohorts={cohorts} onJoin={handleJoinCohort} />
      </section>

      <section className="mt-12">
        <div className="mb-6">
          <p className="text-sm uppercase tracking-[0.26em] text-cyan-300">Inventory</p>
          <h2 className="mt-2 text-3xl font-bold text-white">Nearby dealership pricing</h2>
        </div>
        <DealerPriceCard listings={inventory} />
      </section>

      <section className="mt-12">
        <AiStrategyPanel strategy={strategy} loading={loading} onGenerate={handleGenerateStrategy} />
        {statusMessage && (
          <p className="mt-4 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
            {statusMessage}
          </p>
        )}
      </section>
    </main>
  )
}
