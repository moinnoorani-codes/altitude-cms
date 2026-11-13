import Fastify, { type FastifyRequest } from 'fastify'
import type { Db } from './db.ts'
import { HttpError, ROLES, hashToken, need, type Actor } from './core.ts'
import * as content from './content.ts'
import * as alerts from './alerts.ts'
import * as users from './users.ts'

type Limits = { perMinute: number; authFailuresPerMinute: number }

export function buildApp(db: Db, opts: { logger?: boolean; dispatch?: alerts.Dispatcher; limits?: Partial<Limits> } = {}) {
  const app = Fastify({ logger: opts.logger ?? false, bodyLimit: 256 * 1024 })
  const limits: Limits = { perMinute: 600, authFailuresPerMinute: 20, ...opts.limits }

  // Fixed-window rate limiting per client address. In-memory: with several server instances, put a shared limiter in front.
  const windows = new Map<string, { n: number; reset: number }>()
  function hit(key: string, max: number) {
    const now = Date.now()
    const w = windows.get(key)
    if (!w || w.reset <= now) { windows.set(key, { n: 1, reset: now + 60_000 }); return }
    if (++w.n > max) throw new HttpError(429, 'rate_limited', 'Too many requests. Try again in a minute.', { retryAfterSeconds: Math.ceil((w.reset - now) / 1000) })
  }
  app.addHook('onRequest', async (req) => { if (req.url !== '/v1/health') hit(`req:${req.ip}`, limits.perMinute) })

  // Security headers on every response. The API returns JSON only, so nothing may be framed, sniffed or cached by intermediaries.
  app.addHook('onSend', async (req, reply) => {
    reply.header('x-content-type-options', 'nosniff')
    reply.header('x-frame-options', 'DENY')
    reply.header('referrer-policy', 'no-referrer')
    reply.header('content-security-policy', "default-src 'none'; frame-ancestors 'none'")
    reply.header('strict-transport-security', 'max-age=31536000; includeSubDomains')
    if (!req.url.startsWith('/v1/delivery/')) reply.header('cache-control', 'no-store')
  })

  app.setErrorHandler((err: any, req, reply) => {
    if (err instanceof HttpError && err.status === 429) reply.header('retry-after', String((err.details as any)?.retryAfterSeconds ?? 60))
    if (err instanceof HttpError) return reply.status(err.status).send({ error: { code: err.code, message: err.message, details: err.details } })
    if (err.statusCode && err.statusCode < 500) return reply.status(err.statusCode).send({ error: { code: 'bad_request', message: err.message } })
    req.log.error(err)
    return reply.status(500).send({ error: { code: 'internal', message: 'Something went wrong.' } })
  })

  async function actorOf(req: FastifyRequest): Promise<Actor> {
    const header = req.headers.authorization ?? ''
    const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
    if (!token) throw new HttpError(401, 'unauthenticated', 'Send an API token: Authorization: Bearer <token>.')
    const [user] = await db.query(
      `select id, name, role from users where token_hash = $1 and deleted_at is null and (token_expires_at is null or token_expires_at > now())`,
      [hashToken(token)],
    )
    if (!user) {
      // Repeated bad tokens from one address are cut off, which slows token guessing.
      hit(`auth:${req.ip}`, limits.authFailuresPerMinute)
      req.log.warn({ ip: req.ip }, 'rejected API token')
      throw new HttpError(401, 'unauthenticated', 'This API token is not valid or has expired.')
    }
    return user
  }
  type P = { id: string; locale: string; slug: string }
  type Req = FastifyRequest<{ Params: P; Body: any; Querystring: Record<string, string> }>

  app.get('/v1/health', async () => ({ ok: true, service: 'altitude-cms', version: '0.1.0' }))

  // ── Management API (token required) ──
  app.get('/v1/me', async (req) => { const a = await actorOf(req); return { ...a, permissions: ROLES[a.role] ?? [] } })
  app.get('/v1/locales', async (req) => { await actorOf(req); return { items: await content.listLocales(db) } })

  app.get('/v1/types', async (req) => { await actorOf(req); return { items: await content.listTypes(db) } })
  app.put('/v1/types/:id', async (req: Req) => content.upsertType(db, await actorOf(req), { ...(req.body as any), id: req.params.id }))

  app.get('/v1/entries', async (req: Req) => { await actorOf(req); return { items: await content.listEntries(db, req.query) } })
  app.post('/v1/entries', async (req: Req, reply) => reply.status(201).send(await content.createEntry(db, await actorOf(req), req.body)))
  app.get('/v1/entries/:id', async (req: Req) => { await actorOf(req); return content.getEntry(db, req.params.id) })
  app.put('/v1/entries/:id/locales/:locale', async (req: Req) => content.saveLocale(db, await actorOf(req), req.params.id, req.params.locale, req.body))
  app.post('/v1/entries/:id/locales/:locale/status', async (req: Req) => content.setLocaleStatus(db, await actorOf(req), req.params.id, req.params.locale, (req.body as any)?.status))
  app.post('/v1/entries/:id/transition', async (req: Req) => content.transition(db, await actorOf(req), req.params.id, (req.body as any)?.action))
  app.get('/v1/entries/:id/versions', async (req: Req) => { await actorOf(req); return { items: await content.listVersions(db, req.params.id) } })

  app.get('/v1/alert-templates', async (req) => { await actorOf(req); return { items: await alerts.listTemplates(db), channels: alerts.CHANNELS } })
  app.get('/v1/alerts', async (req: Req) => { await actorOf(req); return { items: await alerts.listAlerts(db, req.query) } })
  app.post('/v1/alerts', async (req: Req, reply) => reply.status(201).send(await alerts.createAlert(db, await actorOf(req), req.body, opts.dispatch)))
  app.post('/v1/alerts/:id/end', async (req: Req) => alerts.endAlert(db, await actorOf(req), req.params.id))

  app.get('/v1/audit', async (req: Req) => {
    need(await actorOf(req), 'audit.read')
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500)
    const items = await db.query(
      `select a.id::text as id, a.at, coalesce(u.name, a.actor_id) as "actor", a.action, a.target_type as "targetType", a.target_id as "targetId", a.target_label as "target", a.detail
       from audit_log a left join users u on u.id = a.actor_id order by a.id desc limit $1`,
      [limit],
    )
    return { items }
  })

  // ── Users and personal data (GDPR access and erasure) ──
  app.get('/v1/users', async (req) => ({ items: await users.listUsers(db, await actorOf(req)) }))
  app.post('/v1/users', async (req: Req, reply) => reply.status(201).send(await users.createUser(db, await actorOf(req), req.body)))
  app.get('/v1/users/:id/export', async (req: Req) => users.exportUser(db, await actorOf(req), req.params.id))
  app.post('/v1/users/:id/erase', async (req: Req) => users.eraseUser(db, await actorOf(req), req.params.id))

  // ── Delivery API (public: serves only published content and live alerts) ──
  app.get('/v1/delivery/entries', async (req: Req) => ({ items: await content.deliver(db, req.query) }))
  app.get('/v1/delivery/entries/:slug', async (req: Req) => {
    const [item] = await content.deliver(db, { ...req.query, slug: req.params.slug })
    if (!item) throw new HttpError(404, 'not_found', 'No published entry has this slug.')
    return item
  })
  app.get('/v1/delivery/alerts', async (req: Req) => ({
    items: (await alerts.listAlerts(db, { status: 'Live', airport: req.query.airport })).map(({ id, severity, title, body, airports, expiresAt }) => ({ id, severity, title, body, airports, expiresAt })),
  }))

  return app
}
