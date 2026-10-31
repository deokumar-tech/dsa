import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiNetworkError, apiUrl, parseApiResponse } from '../lib/api'
import { Badge, Button, Card, EmptyState, Modal, ProgressBar, Reveal, Skeleton, Toast } from '../components/ui'

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })

function readToken() {
  try {
    return window.localStorage.getItem('carcollective_token')
  } catch {
    return null
  }
}

function initials(name) {
  return String(name || '')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase()
}

function statusTone(status) {
  if (status === 'Ready') return 'success'
  if (status === 'Invited') return 'neutral'
  if (status === 'Pending') return 'warning'
  return 'neutral'
}

function relativeTime(value) {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 'Time unavailable'
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr ago`
  const days = Math.floor(hours / 24)
  return days < 30 ? `${days} days ago` : new Date(value).toLocaleDateString('en-IN')
}

function deadlineLabel(value) {
  if (!value) return null
  const deadline = new Date(`${String(value).slice(0, 10)}T23:59:59`)
  if (Number.isNaN(deadline.getTime())) return null
  const remaining = Math.ceil((deadline.getTime() - Date.now()) / 86400000)
  if (remaining < 0) return 'Deadline passed'
  return remaining === 0 ? 'Deadline today' : `${remaining} days left`
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const input = document.createElement('textarea')
  input.value = text
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.append(input)
  input.select()
  const copied = document.execCommand('copy')
  input.remove()
  if (!copied) throw new Error('Your browser could not copy the invite link.')
}

export default function CohortPage() {
  const { id } = useParams()
  const [cohort, setCohort] = useState(null)
  const [loadedId, setLoadedId] = useState('')
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [joinOpen, setJoinOpen] = useState(false)
  const [joining, setJoining] = useState(false)
  const [toast, setToast] = useState('')
  const [toastTone, setToastTone] = useState('default')

  const closeJoin = useCallback(() => setJoinOpen(false), [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadCohort() {
      try {
        const response = await fetch(apiUrl(`/api/cohorts/${encodeURIComponent(id)}`), { signal: controller.signal })
        const record = await parseApiResponse(response, 'The cohort could not be loaded.')
        if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error('The API returned an unexpected cohort response.')
        setCohort(record)
        setLoadError('')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setCohort(null)
          setLoadError(error.status === 404 ? '' : apiNetworkError(error, 'Unable to load this cohort.').message)
        }
      } finally {
        if (!controller.signal.aborted) setLoadedId(id)
      }
    }

    void loadCohort()
    return () => controller.abort()
  }, [id, reload])

  const members = Array.isArray(cohort?.members) ? cohort.members : []
  const memberProfiles = members.filter((member) => member && typeof member === 'object' && typeof member.name === 'string')
  const memberCount = Number(cohort?.member_count ?? members.length)
  const target = Number(cohort?.target_size ?? cohort?.max_members) || 0
  const progress = target ? (memberCount / target) * 100 : 0
  const loading = loadedId !== id

  const handleInvite = async () => {
    try {
      await copyText(window.location.href)
      setToastTone('default')
      setToast('Invite link copied. Share it with a nearby buyer.')
    } catch (error) {
      setToastTone('error')
      setToast(error.message || 'Unable to copy the invite link.')
    }
  }

  const handleJoin = async () => {
    const token = readToken()
    if (!token || !cohort) {
      setToastTone('error')
      setToast('Sign in before joining this buyer group.')
      return
    }

    setJoining(true)
    try {
      const response = await fetch(apiUrl(`/api/cohorts/${encodeURIComponent(cohort.id)}/join`), {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = await parseApiResponse(response)
      const joinedCount = Number(payload.member_count ?? memberCount + 1)
      const detailsResponse = await fetch(apiUrl(`/api/cohorts/${encodeURIComponent(cohort.id)}`))
      const details = await parseApiResponse(detailsResponse)
      setCohort((current) => current ? { ...current, ...details, ...payload, member_count: joinedCount } : current)
      closeJoin()
      setToastTone('default')
      setToast('You joined the cohort successfully.')
    } catch (error) {
      setToastTone('error')
      setToast(apiNetworkError(error).message)
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <main className="page-main page-enter" aria-live="polite">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-4 h-12 w-2/3" />
        <div className="mt-8 grid gap-5 lg:grid-cols-2"><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
      </main>
    )
  }

  if (!cohort) {
    return (
      <main className="page-main page-enter">
        <EmptyState
          icon="car"
          title={loadError ? 'Couldn’t load cohort' : 'Cohort not found'}
          message={loadError || 'This cohort link may be incorrect or the group may no longer be active.'}
          action={loadError
            ? <Button type="button" onClick={() => setReload((count) => count + 1)}>Retry</Button>
            : <Link className="button button-ghost mt-2" to="/dashboard">Back to dashboard</Link>}
        />
      </main>
    )
  }

  const vehicleName = [cohort.target_make, cohort.target_model].filter(Boolean).join(' ')
  const locationName = [cohort.locality, cohort.city || 'Bhubaneswar'].filter(Boolean).join(', ')
  const estimatedPrice = Number(cohort.estimated_group_price_inr)
  const deadline = deadlineLabel(cohort.deadline)
  const updates = Array.isArray(cohort.updates) ? cohort.updates : []

  return (
    <main className="page-main page-enter">
      <Reveal as="section" className="ed-cohort-hero">
        <p className="eyebrow">Buyer workspace · {locationName}{cohort.pincode ? ` · PIN ${cohort.pincode}` : ''}</p>
        <div className="ed-cohort-heading">
          <div>
            <h1>{vehicleName || 'Vehicle'} <span className="ed-serif">cohort</span></h1>
            <p>A local group comparing showroom offers and building a shared buying target.</p>
          </div>
          <div className="cohort-actions mt-0">
            <Button type="button" variant="ghost" onClick={handleInvite}>↗ Invite a buyer</Button>
            <Button type="button" onClick={() => setJoinOpen(true)}>Join this cohort</Button>
          </div>
        </div>
        {deadline && <Badge tone={deadline === 'Deadline passed' ? 'warning' : 'neutral'}>{deadline}</Badge>}

        <Card className="ed-cohort-target">
          <div className="ed-target-copy">
            <p className="eyebrow">Group target</p>
            <p>{cohort.target_discount ? `${cohort.target_discount} target discount` : 'Shared buying goal'}{cohort.urgency ? ` · ${cohort.urgency}` : ''}</p>
          </div>
          <p className="ed-target-count">{target ? `${memberCount} of ${target} buyers joined` : `${memberCount} buyers joined`}</p>
          {target > 0 && <ProgressBar value={progress} label={`${memberCount} of ${target} buyers joined`} className="ed-work-progress" />}
          {Number.isFinite(estimatedPrice) && estimatedPrice > 0 && (
            <div className="ed-estimate-panel">
              <p>Estimated group ex-showroom price</p>
              <strong>{inr.format(estimatedPrice)}</strong>
              <span>{Number(cohort.group_discount_pct) || 0}% group tier discount{cohort.group_discount_min_members ? ` at ${cohort.group_discount_min_members}+ buyers` : ' not reached yet'}. Estimated only; not a guaranteed dealer quote.</span>
            </div>
          )}
          {cohort.best_nearby_showroom_name && (
            <p className="ed-muted">Nearest available offer: {cohort.best_nearby_showroom_name}{cohort.best_nearby_showroom_locality ? `, ${cohort.best_nearby_showroom_locality}` : ''}{cohort.best_nearby_showroom_distanceKm != null ? ` · ${Number(cohort.best_nearby_showroom_distanceKm).toFixed(1)} km` : ''}.</p>
          )}
          {cohort.is_demo && <Badge tone="neutral">Demo data · illustrative estimates</Badge>}
        </Card>
      </Reveal>

      <div className="cohort-workspace-grid section-block">
        <Reveal>
          <Card className="ed-content-card">
            <p className="eyebrow">Latest activity</p>
            <h2 className="section-heading">Member updates</h2>
            {updates.length ? (
              <ol className="ed-activity-timeline">
                {updates.map((update) => (
                  <li key={update.id}>
                    <span className="ed-timeline-dot" aria-hidden="true" />
                    <div><p>{update.label}</p><time dateTime={update.created_at}>{relativeTime(update.created_at)}</time></div>
                  </li>
                ))}
              </ol>
            ) : <div className="ed-activity-empty"><span aria-hidden="true" /><p>No recorded activity is available yet.</p></div>}
          </Card>
        </Reveal>

        <Reveal>
          <Card className="ed-content-card">
            <div className="ed-members-heading">
              <div><p className="eyebrow">The buying group</p><h2 className="section-heading">Members</h2></div>
              <Badge tone="success">{memberCount} joined</Badge>
            </div>
            {memberProfiles.length ? (
              <div className="ed-member-list">
                {memberProfiles.map((member, index) => (
                  <div key={member.id || `${member.name}-${index}`} className="member-row">
                    <span className="avatar" aria-hidden="true">{initials(member.name)}</span>
                    <span className="ed-member-name">{member.name}</span>
                    <Badge tone={statusTone(member.status)}>{member.status || 'Status unavailable'}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ed-muted">{memberCount > 0 ? `${memberCount} buyers have joined. Names are not collected by this service.` : 'No members have joined this cohort yet.'}</p>
            )}
          </Card>
        </Reveal>
      </div>

      {joinOpen && (
        <Modal title={`Join ${vehicleName || 'this cohort'}`} description="Confirm to join the group and help move the shared buying target forward." onClose={closeJoin}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="m-0 text-sm text-slate-300">{target ? `${memberCount} of ${target} buyers are currently in the group.` : `${memberCount} buyers are currently in the group.`}</p>
            {readToken() ? (
              <Button type="button" disabled={joining} onClick={handleJoin}>{joining ? 'Joining…' : 'Confirm and join'}</Button>
            ) : (
              <Link to="/login" className="button button-primary" onClick={closeJoin}>Sign in to join</Link>
            )}
          </div>
        </Modal>
      )}

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 w-[min(90vw,28rem)]">
          <Toast message={toast} tone={toastTone} onDismiss={() => setToast('')} />
        </div>
      )}
    </main>
  )
}
