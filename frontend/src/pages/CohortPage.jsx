import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiUrl } from '../lib/api'
import { Badge, Button, Card, EmptyState, Modal, ProgressBar, Reveal, Toast } from '../components/ui'

const sampleCohorts = {
  'cohort-1': {
    id: 'cohort-1',
    target_make: 'Toyota',
    target_model: 'RAV4 Hybrid',
    zip_code: '94105',
    max_members: 10,
    member_count: 5,
    target_discount: '12.4%',
    urgency: 'Ready now',
    members: [
      { name: 'Alicia Morgan', status: 'Ready' },
      { name: 'Marcus Chen', status: 'Ready' },
      { name: 'Priya Shah', status: 'Ready' },
      { name: 'Derek Johnson', status: 'Pending' },
      { name: 'Sam Rivera', status: 'Invited' },
    ],
  },
  'cohort-2': {
    id: 'cohort-2',
    target_make: 'Tesla',
    target_model: 'Model Y',
    zip_code: '94103',
    max_members: 5,
    member_count: 3,
    target_discount: '9.8%',
    urgency: 'Next 30 days',
    members: [
      { name: 'Jamie Park', status: 'Ready' },
      { name: 'Taylor Reed', status: 'Ready' },
      { name: 'Morgan Lee', status: 'Pending' },
    ],
  },
  'cohort-3': {
    id: 'cohort-3',
    target_make: 'Honda',
    target_model: 'CR-V Hybrid',
    zip_code: '94105',
    max_members: 10,
    member_count: 7,
    target_discount: '10.2%',
    urgency: 'Ready now',
    members: [
      { name: 'Noah Kim', status: 'Ready' },
      { name: 'Sofia Martinez', status: 'Ready' },
      { name: 'Ethan Brooks', status: 'Ready' },
      { name: 'Mia Patel', status: 'Ready' },
      { name: 'Liam Foster', status: 'Ready' },
      { name: 'Ava Chen', status: 'Pending' },
      { name: 'Lucas Brown', status: 'Invited' },
    ],
  },
  'cohort-4': {
    id: 'cohort-4',
    target_make: 'Ford',
    target_model: 'Mustang',
    zip_code: '78701',
    max_members: 8,
    member_count: 4,
    target_discount: '8.6%',
    urgency: 'Next 30 days',
    members: [
      { name: 'Alex Taylor', status: 'Ready' },
      { name: 'Jordan Ellis', status: 'Ready' },
      { name: 'Casey White', status: 'Pending' },
      { name: 'Riley Green', status: 'Invited' },
    ],
  },
}

function getSampleCohort(id) {
  return Object.prototype.hasOwnProperty.call(sampleCohorts, id) ? sampleCohorts[id] : null
}

const updateTemplates = [
  { icon: '✦', title: 'Buyer group opened', message: 'Your local buying group is ready to welcome more drivers.', minutesAgo: 2880 },
  { icon: '✓', title: 'Members confirmed interest', message: 'Buyers are sharing timelines and getting ready to compare dealer offers.', minutesAgo: 840 },
  { icon: '↗', title: 'Negotiation target set', message: 'The group is aligning on a shared target before contacting showrooms.', minutesAgo: 95 },
]

function readToken() {
  try {
    return window.localStorage.getItem('carcollective_token')
  } catch {
    return null
  }
}

function parseResponse(response) {
  return response.json().catch(() => ({})).then((payload) => {
    if (!response.ok) throw new Error(payload.message || 'The cohort could not be loaded.')
    return payload
  })
}

function relativeTime(minutesAgo) {
  if (minutesAgo < 60) return `${minutesAgo} min ago`
  const hours = Math.floor(minutesAgo / 60)
  if (hours < 24) return `${hours} hr${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function statusTone(status) {
  if (status === 'Ready') return 'success'
  if (status === 'Invited') return 'neutral'
  return 'warning'
}

function initials(name) {
  return String(name || 'Buyer')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] || '')
    .join('')
    .toUpperCase()
}

function membersFromCount(count) {
  return Array.from({ length: Math.max(0, count) }, (_, index) => ({
    name: `Buyer ${index + 1}`,
    status: index < Math.ceil(count * 0.6) ? 'Ready' : 'Pending',
  }))
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
  const [joinOpen, setJoinOpen] = useState(false)
  const [joining, setJoining] = useState(false)
  const [toast, setToast] = useState('')
  const [toastTone, setToastTone] = useState('default')

  const closeJoin = useCallback(() => setJoinOpen(false), [])

  useEffect(() => {
    const controller = new AbortController()

    async function loadCohort() {
      try {
        const response = await fetch(apiUrl('/api/cohorts'), { signal: controller.signal })
        const records = await parseResponse(response)
        const match = Array.isArray(records) ? records.find((item) => String(item.id) === id) : null
        const sample = getSampleCohort(id)

        if (match || sample) {
          const record = match || sample
          const count = Number(record.member_count ?? record.members?.length ?? sample?.member_count ?? 0)
          const sampleMembers = sample?.members ? sample.members.slice(0, count) : null
          const recordMembers = Array.isArray(record.members)
            && record.members.every((member) => member && typeof member === 'object' && typeof member.name === 'string')
            ? record.members
            : null
          const members = recordMembers || sampleMembers || membersFromCount(count)
          setCohort({ ...sample, ...record, members, member_count: count })
        } else {
          setCohort(null)
        }
        setLoadError('')
      } catch (error) {
        if (error.name !== 'AbortError') {
          setLoadError(error.message || 'Unable to load this cohort.')
          const sample = getSampleCohort(id)
          if (sample) setCohort(sample)
          else setCohort(null)
        }
      } finally {
        if (!controller.signal.aborted) setLoadedId(id)
      }
    }

    loadCohort()
    return () => controller.abort()
  }, [id])

  const members = cohort?.members || []
  const readyCount = members.filter((member) => member.status === 'Ready').length
  const progress = cohort?.max_members ? (Number(cohort.member_count || members.length) / cohort.max_members) * 100 : 0
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
      const payload = await parseResponse(response)
      const joinedCount = Number(payload.member_count ?? Number(cohort.member_count || 0) + 1)
      const alreadyJoined = joinedCount <= Number(cohort.member_count || 0)
      const updatedMembers = alreadyJoined || cohort.members.some((member) => member.name === 'You')
        ? cohort.members
        : [...cohort.members, { name: 'You', status: 'Ready' }]
      setCohort((current) => ({ ...current, ...payload, member_count: joinedCount, members: updatedMembers }))
      closeJoin()
      setToastTone('default')
      setToast('You joined the cohort successfully.')
    } catch (error) {
      setToastTone('error')
      setToast(error.message || 'Unable to join this cohort.')
    } finally {
      setJoining(false)
    }
  }

  if (loading) {
    return (
      <main className="page-main page-enter" aria-live="polite">
        <div className="skeleton h-4 w-36" />
        <div className="skeleton mt-4 h-12 w-2/3" />
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <div className="skeleton h-72" />
          <div className="skeleton h-72" />
        </div>
      </main>
    )
  }

  if (!cohort) {
    return (
      <main className="page-main page-enter">
        <EmptyState
          icon="car"
          title="Cohort not found"
          message={loadError ? `We couldn't load this cohort. ${loadError}` : 'This cohort link may be incorrect or the group may no longer be active.'}
          action={<Link className="button button-ghost mt-2" to="/dashboard">Back to dashboard</Link>}
        />
      </main>
    )
  }

  return (
    <main className="page-main page-enter">
      <Reveal as="section">
        <p className="eyebrow m-0">Buyer workspace · {cohort.zip_code || 'Local area'}</p>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-5">
          <div>
            <h1 className="m-0 text-4xl font-black tracking-tight text-white md:text-5xl">
              {cohort.target_make} {cohort.target_model} Cohort
            </h1>
            <p className="mt-3 text-slate-400">A local group working toward a stronger offer together.</p>
          </div>
          <div className="cohort-actions mt-0">
            <Button type="button" variant="ghost" onClick={handleInvite}>↗ Invite a buyer</Button>
            <Button type="button" onClick={() => setJoinOpen(true)}>Join this cohort</Button>
          </div>
        </div>

        <Card className="mt-7 p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="eyebrow m-0">Group target</p>
              <p className="mt-2 text-lg font-bold text-white">{cohort.target_discount || '12.5%'} target discount · {cohort.urgency || 'Ready now'}</p>
            </div>
            <p className="m-0 text-sm text-slate-300">{cohort.member_count || members.length} of {cohort.max_members || 10} buyers joined</p>
          </div>
          <ProgressBar value={progress} label={`${cohort.member_count || members.length} of ${cohort.max_members || 10} buyers joined`} className="mt-4" />
          <p className="mt-3 text-xs text-slate-400">{readyCount} {readyCount === 1 ? 'buyer is' : 'buyers are'} ready to move forward</p>
        </Card>
      </Reveal>

      <Reveal as="div" className="cohort-workspace-grid section-block">
        <Card className="p-5 md:p-6">
          <p className="eyebrow m-0">Latest activity</p>
          <h2 className="section-heading">Member updates</h2>
          <ol className="timeline">
            {updateTemplates.map((update) => (
              <li key={update.title} className="timeline-item">
                <span className="timeline-marker" aria-hidden="true">{update.icon}</span>
                <div className="min-w-0 pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="m-0 text-sm font-bold text-white">{update.title}</h3>
                    <time className="text-xs text-slate-500">{relativeTime(update.minutesAgo)}</time>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{update.message}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <Card className="p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="eyebrow m-0">The buying group</p>
              <h2 className="section-heading">Members</h2>
            </div>
            <Badge tone="success">{readyCount} ready</Badge>
          </div>
          <div className="mt-4">
            {members.length ? members.map((member, index) => (
              <div key={`${member.name}-${index}`} className="member-row">
                <span className="avatar" aria-hidden="true">{initials(member.name)}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-200">{member.name}</span>
                <Badge tone={statusTone(member.status)}>{member.status}</Badge>
              </div>
            )) : (
              <p className="text-sm text-slate-400">You can be the first buyer to join this cohort.</p>
            )}
          </div>
        </Card>
      </Reveal>

      {joinOpen && (
        <Modal title={`Join ${cohort.target_make} ${cohort.target_model}`} description="Confirm to join the group and help move the shared buying target forward." onClose={closeJoin}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="m-0 text-sm text-slate-300">{cohort.member_count || members.length} of {cohort.max_members || 10} buyers are currently in the group.</p>
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
