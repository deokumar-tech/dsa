import { Link } from 'react-router-dom'
import { AnimatedCounter, Badge, Button, Card, CarIcon, ProgressBar, Reveal, SparkleIcon } from '../components/ui'

const cohortHighlights = [
  {
    id: 'cohort-1',
    name: 'Toyota RAV4 Hybrid',
    members: 5,
    target: 10,
    discount: '12.4%',
    location: 'San Francisco, CA',
    daysLeft: 6,
  },
  {
    id: 'cohort-2',
    name: 'Tesla Model Y',
    members: 3,
    target: 5,
    discount: '9.8%',
    location: 'Oakland, CA',
    daysLeft: 12,
  },
  {
    id: 'cohort-3',
    name: 'Honda CR-V Hybrid',
    members: 7,
    target: 10,
    discount: '10.2%',
    location: 'San Jose, CA',
    daysLeft: 9,
  },
]

const stats = [
  { value: 18, suffix: 'k+', label: 'buyers matched' },
  { value: 7.8, suffix: '%', label: 'average savings' },
  { value: 320, label: 'dealers onboard' },
]

const steps = [
  {
    title: 'Choose your car',
    description: 'Set your target vehicle and share your ZIP to find buyers nearby.',
    icon: <CarIcon />,
  },
  {
    title: 'Build your buying group',
    description: 'Join a local cohort and turn individual interest into group leverage.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="8" r="3" /><path d="M3.5 19v-1.2A4.8 4.8 0 0 1 8.3 13h1.4a4.8 4.8 0 0 1 4.8 4.8V19M16 5.2a3 3 0 0 1 0 5.7M17 13.2a4.7 4.7 0 0 1 3.5 4.6V19" />
      </svg>
    ),
  },
  {
    title: 'Negotiate as one',
    description: 'Compare real dealer offers and walk in with a shared strategy.',
    icon: <SparkleIcon />,
  },
]

function CohortHighlight({ cohort, index }) {
  const progress = (cohort.members / cohort.target) * 100

  return (
    <Reveal delay={index * 100}>
      <Link to={`/cohort/${cohort.id}`} className="cohort-card-link" aria-label={`Open ${cohort.name} cohort`}>
        <Card className="cohort-card" as="article">
          <div className="cohort-card-top">
            <Badge tone="success">Forming now</Badge>
            <Badge>{cohort.discount} off</Badge>
          </div>
          <h3>{cohort.name}</h3>
          <p className="cohort-location">{cohort.location}</p>
          <div className="cohort-detail-row">
            <span>Target: <strong>{cohort.target} buyers</strong></span>
            <span>{cohort.daysLeft} days left</span>
          </div>
          <ProgressBar value={progress} label={`${cohort.members} of ${cohort.target} buyers joined`} className="mt-4" />
          <div className="cohort-card-footer">
            <span>{cohort.members}/{cohort.target} joined</span>
            <span className="font-semibold text-cyan-200">View cohort ↗</span>
          </div>
        </Card>
      </Link>
    </Reveal>
  )
}

export default function LandingPage() {
  return (
    <main className="page-main page-enter">
      <section className="hero-section">
        <div className="hero-copy">
          <Badge className="px-3 py-2">Local buyer power</Badge>
          <h1 className="hero-title">
            Buy the same car, <span className="text-gradient">together.</span>
          </h1>
          <p className="hero-description">
            CarCollective brings nearby drivers together to compare dealer offers and negotiate with the leverage of a fleet buyer.
          </p>
          <div className="hero-actions">
            <Link to="/dashboard" className="button button-primary">Find your cohort <span aria-hidden="true">→</span></Link>
            <Link to="/dealers" className="button button-ghost">Explore dealer pricing</Link>
          </div>

          <div className="stats-grid" aria-label="CarCollective impact">
            {stats.map((stat) => (
              <div key={stat.label} className="stat-card">
                <p className="stat-value m-0">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix || ''} />
                </p>
                <p className="stat-label m-0">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="hero-art" role="img" aria-label="Illustration of a car with a shared group deal">
          <div className="floating-metric floating-metric-top">
            <div className="metric-label">Group target</div>
            <div className="metric-value">Save up to 12.4%</div>
          </div>
          <div className="hero-car"><CarIcon className="h-full w-full" /></div>
          <div className="floating-metric floating-metric-bottom">
            <div className="metric-label">Your local cohort</div>
            <div className="metric-value">5 buyers · 1 goal</div>
          </div>
        </div>
      </section>

      <section className="section-block" aria-labelledby="how-it-works">
        <Reveal className="section-topline">
          <div>
            <p className="eyebrow m-0">How it works</p>
            <h2 id="how-it-works" className="section-heading">A smarter way to buy, in three steps</h2>
          </div>
          <span className="hidden text-sm text-slate-400 md:block">Your next car, with a little more leverage.</span>
        </Reveal>
        <div className="steps-grid">
          {steps.map((step, index) => (
            <Reveal key={step.title} delay={index * 120}>
              <Card className="step-card" as="article">
                <span className="step-number">0{index + 1}</span>
                <span className="step-icon">{step.icon}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </Card>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="section-block" aria-labelledby="active-cohorts">
        <Reveal className="section-topline">
          <div>
            <p className="eyebrow m-0">Active cohorts</p>
            <h2 id="active-cohorts" className="section-heading">Find your local buyer group</h2>
          </div>
          <Button as={Link} to="/dashboard" variant="ghost" className="hidden md:inline-flex">View all cohorts <span aria-hidden="true">→</span></Button>
        </Reveal>
        <div className="results-grid">
          {cohortHighlights.map((cohort, index) => <CohortHighlight key={cohort.id} cohort={cohort} index={index} />)}
        </div>
        <Link to="/dashboard" className="button button-ghost mt-5 w-full md:hidden">View all cohorts</Link>
      </section>
    </main>
  )
}
