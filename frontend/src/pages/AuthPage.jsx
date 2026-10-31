import AuthForm from '../components/AuthForm'
import { Badge, Card, Reveal, SparkleIcon } from '../components/ui'
import { useLocation } from 'react-router-dom'

export default function AuthPage() {
  const location = useLocation()

  return (
    <main className="page-main page-enter">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <Reveal>
          <Badge><SparkleIcon className="h-4 w-4" /> Join the buyer network</Badge>
          <h1 className="mt-5 max-w-xl text-4xl font-black tracking-tight text-white md:text-6xl">Access your <span className="ed-serif">local buying power.</span></h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">
            Create an account to search nearby inventory, join a buyer cohort, and prepare a dealership-ready negotiation strategy.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <Card className="p-4">
              <p className="m-0 text-lg font-bold text-white">One shared goal</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">Connect with nearby drivers who want the same vehicle.</p>
            </Card>
            <Card className="p-4">
              <p className="m-0 text-lg font-bold text-white">More informed offers</p>
              <p className="mt-1 text-sm leading-6 text-slate-400">Compare showroom listings and prepare before you negotiate.</p>
            </Card>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <AuthForm key={location.pathname} />
        </Reveal>
      </div>
    </main>
  )
}
