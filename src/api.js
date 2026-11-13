// Client for the Altitude API (see /server).
// Sign-in is not built yet: the UI uses the server's public development tokens, and the
// "Acting as" switcher in the top bar changes which demo user the requests are made as.
export const DEV_USERS = [
  { token: 'dev-priya', name: 'Priya Raman', role: 'Content lead' },
  { token: 'dev-hannah', name: 'Hannah Lindqvist', role: 'Content lead' },
  { token: 'dev-tomas', name: 'Tomas Keller', role: 'Market manager' },
  { token: 'dev-mei', name: 'Mei Tanaka', role: 'Legal reviewer' },
  { token: 'dev-daniel', name: 'Daniel Okafor', role: 'Duty manager' },
  { token: 'dev-admin', name: 'Admin', role: 'Admin' },
]

const KEY = 'altitude.devToken'
let token = 'dev-priya'
try { token = localStorage.getItem(KEY) || token } catch { /* storage unavailable */ }
export const getToken = () => token
export function setToken(t) {
  token = t
  try { localStorage.setItem(KEY, t) } catch { /* storage unavailable */ }
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/v1${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const err = new Error(data?.error?.message || `Request failed (${res.status})`)
    err.details = data?.error?.details
    throw err
  }
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

export const time = (iso) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function ago(iso) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return time(iso)
}

export const initials = (name) => name.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()

export const toUiEntry = (e) => ({
  id: e.id, title: e.title, slug: e.slug, type: e.type.name, typeId: e.type.id, requiresLegal: e.type.requiresLegal,
  stage: e.stage, author: e.author.name, authorId: e.author.id, updated: ago(e.updatedAt), updatedAt: e.updatedAt,
  expires: e.expiresAt ? time(e.expiresAt) : null, l10n: e.l10n, published: e.published,
})

export const toUiAlert = (a) => ({
  id: a.id,
  sev: a.severity,
  title: a.title,
  scope: `${a.airports.length ? a.airports.join(', ') : 'All airports'} · all flights`,
  channels: a.channels,
  by: a.publishedBy.name,
  published: time(a.publishedAt),
  expires: a.endedAt ? 'ended manually' : time(a.expiresAt),
  status: a.status,
  reach: `${a.deliveries.length} channel hand-offs queued`,
})

export const toUiTemplate = (t) => ({ id: t.id, name: t.name, sev: t.severity, title: t.title, body: t.body })

export const toUiAudit = (e) => [
  time(e.at), e.actor, e.action, e.target,
  Object.entries(e.detail || {}).filter(([, v]) => v != null).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join(' · '),
]

/** Which workflow actions the UI offers at each stage. The server decides whether the current user may take them. */
export const STAGE_ACTIONS = {
  Draft: [['submit', 'Send to review']],
  'In review': [['approve', 'Approve'], ['reject', 'Send back']],
  'Legal review': [['legal_approve', 'Approve as legal'], ['reject', 'Send back']],
  Approved: [['publish', 'Publish'], ['reject', 'Send back']],
  Published: [['unpublish', 'Unpublish']],
}
