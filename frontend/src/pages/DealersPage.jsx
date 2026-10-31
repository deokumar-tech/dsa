import { useEffect, useState } from 'react'
import DealerPriceCard from '../components/DealerPriceCard'
import { apiUrl } from '../lib/api'

export default function DealersPage() {
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadInventory() {
      try {
        const response = await fetch(apiUrl('/api/inventory?make=Toyota&model=RAV4%20Hybrid&zip=94105'))
        const data = await response.json()
        setInventory(Array.isArray(data) ? data : [])
      } catch (error) {
        console.error('Failed to load dealers:', error)
        setInventory([])
      } finally {
        setLoading(false)
      }
    }

    loadInventory()
  }, [])

  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <p className="text-sm uppercase tracking-[0.26em] text-cyan-300">Dealers</p>
      <h1 className="mt-2 text-4xl font-black text-white">Nearby showroom pricing</h1>

      <div className="mt-8 rounded-3xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">Vehicles in market</p>
            <p className="mt-2 text-2xl font-black text-white">{inventory.length || 0}</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">Avg. listed price</p>
            <p className="mt-2 text-2xl font-black text-white">
              {inventory.length ? '$' + Math.round(inventory.reduce((sum, item) => sum + item.listed_price, 0) / inventory.length).toLocaleString() : '$0'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-950/60 p-4">
            <p className="text-sm text-slate-400">Coverage radius</p>
            <p className="mt-2 text-2xl font-black text-white">50 mi</p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <div className="rounded-3xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center text-slate-400">
            Loading dealer inventory…
          </div>
        ) : (
          <DealerPriceCard listings={inventory} />
        )}
      </div>
    </main>
  )
}
