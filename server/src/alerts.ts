import { json, type Db, type Q } from './db.ts'
import { HttpError, audit, isUuid, need, type Actor } from './core.ts'

export const CHANNELS = ['Web banner', 'App', 'Email', 'SMS', 'Kiosks', 'Help centre', 'Contact centre']
const MAX_HOURS = 24 * 7

/**
 * A channel dispatcher hands an alert to an outside system (email provider, push service, kiosk sync).
 * The default only records that the hand-off was queued; real connectors replace it per channel.
 */
export type Dispatcher = (channel: string, alert: { title: string; body: string; airports: string[] }) => Promise<{ status: string }>
export const queueOnly: Dispatcher = async () => ({ status: 'queued' })

const SELECT = `
  select a.id, a.severity, a.title, a.body, a.airports, a.channels, a.deliveries, a.template_id,
         a.published_at, a.expires_at, a.ended_at, u.id as by_id, u.name as by_name,
         (a.ended_at is null and a.expires_at > now()) as live
  from alerts a join users u on u.id = a.published_by`

const view = (a: any) => ({
  id: a.id, severity: a.severity, title: a.title, body: a.body, airports: a.airports, channels: a.channels,
  deliveries: a.deliveries, templateId: a.template_id, publishedBy: { id: a.by_id, name: a.by_name },
  publishedAt: a.published_at, expiresAt: a.expires_at, endedAt: a.ended_at, status: a.live ? 'Live' : 'Expired',
})

export const listTemplates = (q: Q) => q.query(`select id, name, severity, title, body from alert_templates order by severity, name`)

/** Status is computed from the clock, so an alert expires on time with no background job. */
export async function listAlerts(q: Q, filter: { status?: string; airport?: string } = {}) {
  const rows = (await q.query(`${SELECT} order by a.published_at desc`)).map(view)
  return rows.filter((a) => (!filter.status || a.status === filter.status) && (!filter.airport || a.airports.length === 0 || a.airports.includes(filter.airport.toUpperCase())))
}

export async function createAlert(db: Db, actor: Actor, input: any, dispatch: Dispatcher = queueOnly) {
  need(actor, 'alert.publish')
  const airports: string[] = Array.isArray(input?.airports) ? input.airports.map((a: unknown) => String(a).trim().toUpperCase()).filter(Boolean) : []
  const bad = airports.filter((a) => !/^[A-Z]{3}$/.test(a))
  if (bad.length) throw new HttpError(422, 'invalid_alert', `Not IATA airport codes: ${bad.join(', ')}.`)
  const channels: string[] = Array.isArray(input?.channels) ? [...new Set<string>(input.channels)] : []
  if (!channels.length) throw new HttpError(422, 'invalid_alert', 'Choose at least one channel.')
  const unknown = channels.filter((c) => !CHANNELS.includes(c))
  if (unknown.length) throw new HttpError(422, 'invalid_alert', `Unknown channels: ${unknown.join(', ')}.`)
  const hours = Number(input?.expiresInHours)
  if (!Number.isFinite(hours) || hours <= 0) throw new HttpError(422, 'expiry_required', 'Every alert needs an expiry: set expiresInHours.')
  if (hours > MAX_HOURS) throw new HttpError(422, 'expiry_too_long', `An alert can run for at most ${MAX_HOURS} hours.`)

  return db.tx(async (q) => {
    let { title, body, severity } = input
    if (input.templateId) {
      const [tpl] = await q.query(`select * from alert_templates where id = $1`, [input.templateId])
      if (!tpl) throw new HttpError(422, 'invalid_alert', `Unknown template "${input.templateId}".`)
      const fill = (s: string) => s.replaceAll('{airport}', airports.join(', ') || 'the airport')
      title ||= fill(tpl.title)
      body ||= fill(tpl.body)
      severity ??= tpl.severity
    }
    if (![1, 2, 3].includes(severity)) throw new HttpError(422, 'invalid_alert', 'severity must be 1, 2 or 3.')
    if (!title?.trim() || !body?.trim()) throw new HttpError(422, 'invalid_alert', 'title and body are required.')

    const deliveries = []
    for (const channel of channels) {
      const r = await dispatch(channel, { title, body, airports })
      deliveries.push({ channel, status: r.status, at: new Date().toISOString() })
    }
    const [row] = await q.query(
      `insert into alerts (severity, title, body, airports, channels, deliveries, template_id, published_by, expires_at)
       values ($1, $2, $3, $4::text::jsonb, $5::text::jsonb, $6::text::jsonb, $7, $8, now() + make_interval(mins => $9::int)) returning id`,
      [severity, title.trim(), body.trim(), json(airports), json(channels), json(deliveries), input.templateId ?? null, actor.id, Math.round(hours * 60)],
    )
    await audit(q, actor, 'Published alert', 'alert', row.id, title.trim(), { severity, airports, channels, expiresInHours: hours })
    return view((await q.query(`${SELECT} where a.id = $1`, [row.id]))[0])
  })
}

export async function endAlert(db: Db, actor: Actor, id: string) {
  need(actor, 'alert.publish')
  if (!isUuid(id)) throw new HttpError(404, 'not_found', 'Alert not found.')
  return db.tx(async (q) => {
    const [a] = await q.query(`${SELECT} where a.id = $1`, [id])
    if (!a) throw new HttpError(404, 'not_found', 'Alert not found.')
    if (!a.live) throw new HttpError(409, 'not_live', 'This alert has already ended.')
    await q.query(`update alerts set ended_at = now(), ended_by = $2 where id = $1`, [id, actor.id])
    await audit(q, actor, 'Ended alert', 'alert', id, a.title)
    return view((await q.query(`${SELECT} where a.id = $1`, [id]))[0])
  })
}
