import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { openDb, type Db } from '../src/db.ts'
import { buildApp } from '../src/app.ts'
import { seedBase, seedDemo } from '../src/seed.ts'

let db: Db
let app: ReturnType<typeof buildApp>
const sent: string[] = []

before(async () => {
  // DATABASE_URL, when set, runs the same suite against real PostgreSQL.
  db = await openDb()
  await seedBase(db)
  app = buildApp(db, { dispatch: async (channel) => { sent.push(channel); return { status: 'queued' } } })
})
after(async () => { await app.close(); await db.close() })

async function call(method: string, url: string, token?: string, body?: unknown) {
  const res = await app.inject({ method: method as any, url, headers: token ? { authorization: `Bearer ${token}` } : {}, payload: body as any })
  return { status: res.statusCode, body: res.body ? res.json() : null }
}
const promo = (title: string, extra = {}) => ({
  typeId: 'promotion', title,
  fields: { headline: title, subtitle: 'Includes taxes and one cabin bag.', fare_from: 49, origin: 'LHR', ...extra },
})
let n = 0
const unique = (s: string) => `${s} ${++n} ${Date.now()}`

test('management API rejects missing and invalid tokens', async () => {
  assert.equal((await call('GET', '/v1/entries')).status, 401)
  assert.equal((await call('GET', '/v1/entries', 'nope')).status, 401)
  const me = await call('GET', '/v1/me', 'dev-priya')
  assert.equal(me.body.role, 'content_lead')
})

test('field values are validated against the content type', async () => {
  const unknown = await call('POST', '/v1/entries', 'dev-priya', promo(unique('Bad'), { nonsense: 1 }))
  assert.equal(unknown.status, 422)
  assert.ok(unknown.body.error.details.nonsense)
  const iata = await call('POST', '/v1/entries', 'dev-priya', promo(unique('Bad'), { origin: 'London' }))
  assert.equal(iata.status, 422)
  assert.match(iata.body.error.details.origin, /IATA/)
  const viewer = await call('POST', '/v1/entries', 'dev-viewer', promo(unique('Nope')))
  assert.equal(viewer.status, 403)
})

test('translations go missing → current → stale as the source changes', async () => {
  const e = (await call('POST', '/v1/entries', 'dev-priya', promo(unique('Sale')))).body
  assert.equal(e.l10n['en-GB'], 'current')
  assert.equal(e.l10n['de-DE'], 'missing')

  const de = await call('PUT', `/v1/entries/${e.id}/locales/de-DE`, 'dev-tomas', { fields: { headline: 'Angebot', subtitle: 'Inklusive Steuern.' } })
  assert.equal(de.body.l10n['de-DE'], 'current')

  // Shared fields cannot be changed from a market locale.
  const shared = await call('PUT', `/v1/entries/${e.id}/locales/de-DE`, 'dev-tomas', { fields: { origin: 'FRA' } })
  assert.equal(shared.status, 422)

  const src = await call('PUT', `/v1/entries/${e.id}/locales/en-GB`, 'dev-priya', { fields: { ...promo('x').fields, headline: 'Changed headline' } })
  assert.equal(src.body.l10n['de-DE'], 'stale')

  const sentOut = await call('POST', `/v1/entries/${e.id}/locales/fr-FR/status`, 'dev-tomas', { status: 'progress' })
  assert.equal(sentOut.body.l10n['fr-FR'], 'progress')
  const approve = await call('POST', `/v1/entries/${e.id}/locales/de-DE/status`, 'dev-tomas', { status: 'current' })
  assert.equal(approve.body.l10n['de-DE'], 'current')
  const empty = await call('POST', `/v1/entries/${e.id}/locales/ja-JP/status`, 'dev-tomas', { status: 'current' })
  assert.equal(empty.status, 422)
})

test('workflow enforces legal review and the four-eyes rule, then delivery resolves fallbacks', async () => {
  const title = unique('Winter sale')
  const e = (await call('POST', '/v1/entries', 'dev-priya', promo(title))).body
  await call('PUT', `/v1/entries/${e.id}/locales/de-DE`, 'dev-tomas', { fields: { headline: 'Winter-Sale', fare_from: 57 } })
  const t = (who: string, action: string) => call('POST', `/v1/entries/${e.id}/transition`, who, { action })

  assert.equal((await t('dev-priya', 'publish')).status, 409) // not approved yet
  assert.equal((await t('dev-priya', 'submit')).body.stage, 'In review')
  const own = await t('dev-priya', 'approve')
  assert.equal(own.status, 403)
  assert.equal(own.body.error.code, 'four_eyes')
  assert.equal((await t('dev-hannah', 'approve')).body.stage, 'Legal review')
  assert.equal((await t('dev-hannah', 'legal_approve')).status, 403) // not a legal reviewer
  assert.equal((await t('dev-mei', 'legal_approve')).body.stage, 'Approved')
  assert.equal((await call('GET', `/v1/delivery/entries/${e.slug}`)).status, 404) // nothing public before publish
  assert.equal((await t('dev-priya', 'publish')).body.stage, 'Published')

  const de = (await call('GET', `/v1/delivery/entries/${e.slug}?locale=de-DE`)).body
  assert.equal(de.fields.headline, 'Winter-Sale')
  assert.equal(de.fields.fare_from, 57)
  assert.equal(de.fields.subtitle, 'Includes taxes and one cabin bag.') // falls back to source
  assert.equal(de.resolvedFrom.subtitle, 'en-GB')
  assert.equal(de.fields.origin, 'LHR') // shared field
  const fr = (await call('GET', `/v1/delivery/entries/${e.slug}?locale=fr-FR`)).body
  assert.equal(fr.fields.headline, title)

  // Editing a published entry returns it to Draft; the published version stays live.
  const edit = await call('PUT', `/v1/entries/${e.id}/locales/en-GB`, 'dev-priya', { fields: { ...promo(title).fields, headline: 'Draft change' } })
  assert.equal(edit.body.stage, 'Draft')
  assert.equal(edit.body.published, true)
  assert.equal((await call('GET', `/v1/delivery/entries/${e.slug}`)).body.fields.headline, title)

  const versions = (await call('GET', `/v1/entries/${e.id}/versions`, 'dev-priya')).body.items
  assert.ok(versions.length >= 7)
  assert.equal(versions.at(-1).note, 'Created')
})

test('types without legal review skip that stage; publish needs required fields', async () => {
  const e = (await call('POST', '/v1/entries', 'dev-priya', { typeId: 'travel_info', title: unique('Info'), fields: { headline: 'Info' } })).body
  const t = (who: string, action: string) => call('POST', `/v1/entries/${e.id}/transition`, who, { action })
  await t('dev-priya', 'submit')
  assert.equal((await t('dev-priya', 'approve')).body.stage, 'Approved') // no four-eyes on this type
  const pub = await t('dev-priya', 'publish')
  assert.equal(pub.status, 422)
  assert.deepEqual(pub.body.error.details.missing, ['subtitle'])
  assert.equal((await t('dev-mei', 'reject')).body.stage, 'Draft')
})

test('alerts need an expiry and permission, reach delivery, and can be ended', async () => {
  const base = { templateId: 'severe-weather', airports: ['dxb'], channels: ['Web banner', 'App'] }
  assert.equal((await call('POST', '/v1/alerts', 'dev-daniel', base)).body.error.code, 'expiry_required')
  assert.equal((await call('POST', '/v1/alerts', 'dev-daniel', { ...base, expiresInHours: 999 })).status, 422)
  assert.equal((await call('POST', '/v1/alerts', 'dev-daniel', { ...base, expiresInHours: 6, channels: ['Fax'] })).status, 422)
  assert.equal((await call('POST', '/v1/alerts', 'dev-mei', { ...base, expiresInHours: 6 })).status, 403)

  sent.length = 0
  const a = await call('POST', '/v1/alerts', 'dev-daniel', { ...base, expiresInHours: 6 })
  assert.equal(a.status, 201)
  assert.equal(a.body.title, 'Severe weather at DXB')
  assert.equal(a.body.severity, 1)
  assert.equal(a.body.status, 'Live')
  assert.deepEqual(sent, ['Web banner', 'App'])

  const live = (await call('GET', '/v1/delivery/alerts?airport=DXB')).body.items
  assert.ok(live.some((x: any) => x.id === a.body.id))
  assert.ok(!(await call('GET', '/v1/delivery/alerts?airport=JFK')).body.items.some((x: any) => x.id === a.body.id))

  // Expiry is enforced by the clock, with no background job.
  await db.query(`update alerts set expires_at = now() - interval '1 minute' where id = $1`, [a.body.id])
  assert.ok(!(await call('GET', '/v1/delivery/alerts?airport=DXB')).body.items.some((x: any) => x.id === a.body.id))
  assert.equal((await call('POST', `/v1/alerts/${a.body.id}/end`, 'dev-daniel')).status, 409)

  const b = (await call('POST', '/v1/alerts', 'dev-daniel', { ...base, expiresInHours: 6 })).body
  assert.equal((await call('POST', `/v1/alerts/${b.id}/end`, 'dev-daniel')).body.status, 'Expired')
})

test('every change is in the audit log, which cannot be altered', async () => {
  const log = await call('GET', '/v1/audit?limit=500', 'dev-priya')
  const actions = log.body.items.map((i: any) => i.action)
  const ids = log.body.items.map((i: any) => Number(i.id))
  assert.deepEqual(ids, [...ids].sort((a, b) => b - a), 'newest first')
  for (const a of ['Created entry', 'Published', 'Approved by legal', 'Published alert', 'Ended alert', 'Saved translation']) assert.ok(actions.includes(a), `missing audit action: ${a}`)
  assert.equal((await call('GET', '/v1/audit', 'dev-tomas')).status, 403)
  await assert.rejects(db.query(`update audit_log set action = 'tampered'`), /append-only/)
  await assert.rejects(db.query(`delete from audit_log`), /append-only/)
})

test('schema changes need the schema permission and are validated', async () => {
  const type = { name: 'Lounge', fields: [{ name: 'airport', type: 'iata_airport', localization: 'shared', required: true }] }
  assert.equal((await call('PUT', '/v1/types/lounge', 'dev-priya', type)).status, 403)
  assert.equal((await call('PUT', '/v1/types/lounge', 'dev-lucas', type)).body.fields.length, 1)
  assert.equal((await call('PUT', '/v1/types/lounge', 'dev-lucas', { name: 'Lounge', fields: [{ name: 'x', type: 'hologram', localization: 'shared' }] })).status, 422)
})

test('demo seed loads cleanly and is idempotent', async () => {
  await seedDemo(db)
  await seedDemo(db)
  const items = (await call('GET', '/v1/entries?search=Baggage', 'dev-priya')).body.items
  assert.equal(items.length, 1)
  assert.equal(items[0].l10n['de-DE'], 'stale')
  assert.equal(items[0].published, true)
})
