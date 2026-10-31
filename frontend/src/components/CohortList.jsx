import { Link } from 'react-router-dom'
import { Badge, Button, Card, ProgressBar } from './ui'

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

export default function CohortList({ cohorts = [], onJoin }) {
  return (
    <div className="results-grid">
      {cohorts.map((cohort) => {
        const memberCount = Number(cohort.member_count ?? cohort.members?.length ?? 0)
        const maxMembers = Number(cohort.target_size ?? cohort.max_members)
        const percent = Math.min((memberCount / maxMembers) * 100, 100)

        return (
          <Card key={cohort.id} className="cohort-card" as="article">
            <div className="cohort-card-top">
              <Badge tone={cohort.status === 'forming' ? 'success' : 'neutral'}>{cohort.status || 'Status unavailable'}</Badge>
              {cohort.is_demo && <Badge tone="neutral">Demo data</Badge>}
            </div>
            <Link to={`/cohort/${encodeURIComponent(cohort.id)}`} className="block rounded-lg focus-visible:outline">
              <h3>{[cohort.target_make, cohort.target_model].filter(Boolean).join(' ') || 'Vehicle cohort'}</h3>
              <p className="cohort-location">{cohort.locality ? `${cohort.locality}, ` : ''}{cohort.city || 'Bhubaneswar'} · {cohort.distanceKm !== undefined ? `${Number(cohort.distanceKm).toFixed(1)} km away` : `PIN ${cohort.pincode || cohort.zip_code || 'unavailable'}`}</p>
            </Link>
            <div className="cohort-detail-row">
              <span>{Number.isFinite(maxMembers) && maxMembers > 0 ? <>Target: <strong>{maxMembers} buyers</strong></> : 'Buyer target unavailable'}</span>
              {cohort.urgency && <span>{cohort.urgency}</span>}
            </div>
            {cohort.estimated_group_price_inr != null && (
              <p className="ed-cohort-estimate">Estimated group price <strong>{inr.format(Number(cohort.estimated_group_price_inr))}</strong></p>
            )}
            {Number.isFinite(maxMembers) && maxMembers > 0 && <ProgressBar value={percent} label={`${memberCount} of ${maxMembers} buyers joined`} className="mt-4" />}
            <div className="cohort-card-footer">
              <span>{Number.isFinite(maxMembers) && maxMembers > 0 ? `${memberCount}/${maxMembers} joined` : `${memberCount} joined`}</span>
              <Button type="button" size="small" onClick={() => onJoin?.(cohort)}>Join cohort</Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
