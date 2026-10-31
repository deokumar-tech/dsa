import AuthForm from '../components/AuthForm'

export default function AuthPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <div className="grid gap-10 lg:grid-cols-[1fr_0.95fr] lg:items-center">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-cyan-300">Join the buyer network</p>
          <h1 className="mt-4 text-4xl font-black text-white md:text-5xl">Access your local buying power.</h1>
          <p className="mt-4 max-w-xl text-lg text-slate-300">
            Create an account to search nearby inventory, join cohorts, and generate dealership-ready negotiation strategies.
          </p>
        </div>

        <AuthForm />
      </div>
    </main>
  )
}
