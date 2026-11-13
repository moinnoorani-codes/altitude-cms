// Client for the Altitude API (see /server). When no API answers, the UI stays on mock data.
// The development token is public demo data; real sign-in (SSO) replaces it later.
const TOKEN = import.meta.env.VITE_API_TOKEN || 'dev-priya'

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/v1${path}`, {
    method,
    headers: { authorization: `Bearer ${TOKEN}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error?.message || `Request failed (${res.status})`)
  return data
}

export async function detectApi() {
  try {
    const res = await fetch('/v1/health')
    return (await res.json()).ok === true
  } catch {
    return false
  }
}

const time = (iso) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Maps an API alert to the shape the disruption screens render. */
export const toUiAlert = (a) => ({
  id: a.id,
  sev: a.severity,
  title: a.title,
  scope: `${a.airports.length ? a.airports.join(', ') : 'All airports'} · all flights`,
  channels: a.channels,
  by: a.publishedBy.name,
  published: time(a.publishedAt),
  expires: a.endedAt ? 'Ended manually' : time(a.expiresAt),
  status: a.status,
  reach: `${a.deliveries.length} channel hand-offs ${a.deliveries.every((d) => d.status === 'queued') ? 'queued' : 'recorded'}`,
})

export const toUiTemplate = (t) => ({ id: t.id, name: t.name, sev: t.severity, title: t.title, body: t.body })

export const toUiAudit = (e) => [
  time(e.at), e.actor, e.action, e.target,
  Object.entries(e.detail || {}).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' · '),
]
