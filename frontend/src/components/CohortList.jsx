import { Link } from 'react-router-dom'
import { Badge, Button, Card, ProgressBar } from './ui'

function locationForZip(zip) {
  const prefix = String(zip || '').slice(0, 3)
  if (prefix === '941') return 'San Francisco Bay Area'
  if (prefix === '951') return 'South Bay'
  if (prefix === '787') return 'Austin, TX'
  if (prefix === '981') return 'Seattle, WA'
  return zip ? `ZIP ${zip}` : 'Your local area'
}

export default function CohortList({ cohorts = [], onJoin }) {
  return (
    <div className="results-grid">
      {cohorts.map((cohort) => {
        const memberCount = Number(cohort.member_count ?? cohort.members?.length ?? 0)
        const maxMembers = Number(cohort.max_members) || 10
        const percent = Math.min((memberCount / maxMembers) * 100, 100)

        return (
          <Card key={cohort.id} className="cohort-card" as="article">
            <div className="cohort-card-top">
              <Badge tone={cohort.status === 'forming' ? 'success' : 'neutral'}>{cohort.status || 'Forming'}</Badge>
              <Badge>{cohort.target_discount || '12.5%'} target</Badge>
            </div>
            <Link to={`/cohort/${encodeURIComponent(cohort.id)}`} className="block rounded-lg focus-visible:outline">
              <h3>{cohort.target_make} {cohort.target_model}</h3>
              <p className="cohort-location">{locationForZip(cohort.zip_code)}</p>
            </Link>
            <div className="cohort-detail-row">
              <span>Target: <strong>{maxMembers} buyers</strong></span>
              <span>{cohort.urgency || 'Ready now'}</span>
            </div>
            <ProgressBar value={percent} label={`${memberCount} of ${maxMembers} buyers joined`} className="mt-4" />
            <div className="cohort-card-footer">
              <span>{memberCount}/{maxMembers} joined</span>
              <Button type="button" size="small" onClick={() => onJoin?.(cohort)}>Join cohort</Button>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
