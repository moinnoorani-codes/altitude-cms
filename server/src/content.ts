import { json, type Db, type Q } from './db.ts'
import { HttpError, audit, can, isUuid, need, type Actor } from './core.ts'

export const STAGES = ['Draft', 'In review', 'Legal review', 'Approved', 'Published'] as const

export type FieldDef = {
  name: string
  type: string
  localization: 'shared' | 'translated' | 'market'
  required?: boolean
  options?: string[]
}

type Locale = { code: string; fallback: string | null; is_source: boolean }
type Fields = Record<string, unknown>

const FIELD_TYPES = ['text', 'long_text', 'rich_text', 'link', 'number', 'boolean', 'date', 'select', 'iata_airport', 'currency_amount']

export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 96)

const isEmpty = (v: unknown) => v === undefined || v === null || v === ''

function valueError(def: FieldDef, v: unknown): string | null {
  switch (def.type) {
    case 'text': case 'long_text': case 'rich_text': case 'link':
      return typeof v === 'string' ? null : 'must be text'
    case 'number':
      return typeof v === 'number' && Number.isFinite(v) ? null : 'must be a number'
    case 'currency_amount':
      return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? null : 'must be a non-negative amount'
    case 'boolean':
      return typeof v === 'boolean' ? null : 'must be true or false'
    case 'date':
      return typeof v === 'string' && !Number.isNaN(Date.parse(v)) ? null : 'must be an ISO date'
    case 'select':
      return typeof v === 'string' && (def.options ?? []).includes(v) ? null : `must be one of: ${(def.options ?? []).join(', ')}`
    case 'iata_airport':
      return typeof v === 'string' && /^[A-Z]{3}$/.test(v) ? null : 'must be a 3-letter IATA airport code'
    default:
      return `has unsupported type "${def.type}"`
  }
}

/** Checks values against the content type. Shared fields may only be set in the source locale. */
function validateFields(defs: FieldDef[], fields: Fields, isSource: boolean) {
  if (typeof fields !== 'object' || fields === null || Array.isArray(fields)) throw new HttpError(422, 'invalid_fields', 'fields must be an object.')
  const errors: Record<string, string> = {}
  for (const [name, v] of Object.entries(fields)) {
    const def = defs.find((d) => d.name === name)
    if (!def) errors[name] = 'is not a field of this content type'
    else if (!isSource && def.localization === 'shared') errors[name] = 'is shared across markets and can only be edited in the source locale'
    else if (!isEmpty(v)) { const e = valueError(def, v); if (e) errors[name] = e }
  }
  if (Object.keys(errors).length) throw new HttpError(422, 'invalid_fields', 'Some fields are invalid.', errors)
}

// ── Content types ──────────────────────────────────────────────────────────

export async function listTypes(q: Q) {
  const rows = await q.query(`select id, name, kind, requires_legal, fields, (select count(*)::int from entries e where e.type_id = t.id) as entries from content_types t order by name`)
  return rows.map((t) => ({ id: t.id, name: t.name, kind: t.kind, requiresLegal: t.requires_legal, fields: t.fields as FieldDef[], entries: t.entries }))
}

export async function upsertType(db: Db, actor: Actor, input: any) {
  need(actor, 'schema.write')
  const id = String(input?.id ?? '')
  if (!/^[a-z][a-z0-9_]{1,40}$/.test(id)) throw new HttpError(422, 'invalid_type', 'id must be lowercase letters, digits and underscores.')
  if (!input.name || typeof input.name !== 'string') throw new HttpError(422, 'invalid_type', 'name is required.')
  const fields: FieldDef[] = Array.isArray(input.fields) ? input.fields : []
  const seen = new Set<string>()
  for (const f of fields) {
    if (!/^[a-z][a-z0-9_]*$/.test(f?.name ?? '')) throw new HttpError(422, 'invalid_type', `Field name "${f?.name}" is invalid.`)
    if (seen.has(f.name)) throw new HttpError(422, 'invalid_type', `Field "${f.name}" is defined twice.`)
    seen.add(f.name)
    if (!FIELD_TYPES.includes(f.type)) throw new HttpError(422, 'invalid_type', `Field "${f.name}" has unknown type "${f.type}".`)
    if (!['shared', 'translated', 'market'].includes(f.localization)) throw new HttpError(422, 'invalid_type', `Field "${f.name}" needs localization: shared, translated or market.`)
    if (f.type === 'select' && !(Array.isArray(f.options) && f.options.length)) throw new HttpError(422, 'invalid_type', `Select field "${f.name}" needs options.`)
  }
  return db.tx(async (q) => {
    await q.query(
      `insert into content_types (id, name, kind, requires_legal, fields) values ($1, $2, $3, $4, $5::text::jsonb)
       on conflict (id) do update set name = excluded.name, kind = excluded.kind, requires_legal = excluded.requires_legal, fields = excluded.fields, updated_at = now()`,
      [id, input.name, input.kind ?? 'collection', !!input.requiresLegal, json(fields)],
    )
    await audit(q, actor, 'Saved content type', 'content_type', id, input.name, { fields: fields.length })
    return (await listTypes(q)).find((t) => t.id === id)!
  })
}

// ── Locales ────────────────────────────────────────────────────────────────

export const listLocales = (q: Q) =>
  q.query(`select code, market, language, currency, fallback, pack, rtl, is_source as "isSource" from locales order by is_source desc, market`)

async function localeMap(q: Q) {
  const rows = await q.query<Locale>(`select code, fallback, is_source from locales`)
  const source = rows.find((l) => l.is_source)
  if (!source) throw new HttpError(500, 'no_source_locale', 'No source locale is configured.')
  return { rows, source: source.code }
}

/** A locale version is missing, in progress, in review, stale (source changed since) or current. */
function l10nStatus(entrySourceRev: number, row: { status: string; source_rev: number; has_fields: boolean } | undefined, isSource: boolean) {
  if (isSource) return 'current'
  if (!row) return 'missing'
  if (row.status === 'progress' || row.status === 'review') return row.status
  if (!row.has_fields) return 'missing'
  return row.source_rev < entrySourceRev ? 'stale' : 'current'
}

// ── Entries ────────────────────────────────────────────────────────────────

const ENTRY_SELECT = `
  select e.id, e.title, e.slug, e.stage, e.source_rev, e.version, e.expires_at, e.updated_at, e.created_at,
         t.id as type_id, t.name as type_name, t.requires_legal, t.fields as type_fields,
         u.id as author_id, u.name as author_name,
         (p.entry_id is not null) as published
  from entries e
  join content_types t on t.id = e.type_id
  join users u on u.id = e.author_id
  left join published_entries p on p.entry_id = e.id`

async function withL10n(q: Q, rows: any[]) {
  if (!rows.length) return []
  const { rows: locales, source } = await localeMap(q)
  const locRows = await q.query(`select entry_id, locale, status, source_rev, (fields <> '{}'::jsonb) as has_fields from entry_locales`)
  const byEntry = new Map<string, any[]>()
  for (const r of locRows) byEntry.set(r.entry_id, [...(byEntry.get(r.entry_id) ?? []), r])
  return rows.map((e) => ({
    id: e.id, title: e.title, slug: e.slug, stage: e.stage, version: e.version, published: e.published,
    type: { id: e.type_id, name: e.type_name, requiresLegal: e.requires_legal },
    author: { id: e.author_id, name: e.author_name },
    expiresAt: e.expires_at, updatedAt: e.updated_at, createdAt: e.created_at,
    l10n: Object.fromEntries(locales.map((l) => [l.code, l10nStatus(e.source_rev, (byEntry.get(e.id) ?? []).find((r) => r.locale === l.code), l.code === source)])),
  }))
}

export async function listEntries(q: Q, filter: { type?: string; stage?: string; search?: string } = {}) {
  const where: string[] = []
  const params: unknown[] = []
  if (filter.type) { params.push(filter.type); where.push(`e.type_id = $${params.length}`) }
  if (filter.stage) { params.push(filter.stage); where.push(`e.stage = $${params.length}`) }
  if (filter.search) { params.push(`%${filter.search}%`); where.push(`e.title ilike $${params.length}`) }
  const rows = await q.query(`${ENTRY_SELECT} ${where.length ? 'where ' + where.join(' and ') : ''} order by e.updated_at desc`, params)
  return withL10n(q, rows)
}

async function loadRow(q: Q, id: string, lock = false) {
  if (!isUuid(id)) throw new HttpError(404, 'not_found', 'Entry not found.')
  if (lock) await q.query(`select id from entries where id = $1 for update`, [id])
  const [row] = await q.query(`${ENTRY_SELECT} where e.id = $1`, [id])
  if (!row) throw new HttpError(404, 'not_found', 'Entry not found.')
  return row
}

export async function getEntry(q: Q, id: string) {
  const row = await loadRow(q, id)
  const [view] = await withL10n(q, [row])
  const locs = await q.query(`select locale, fields, updated_at as "updatedAt" from entry_locales where entry_id = $1`, [id])
  return { ...view, fieldDefs: row.type_fields as FieldDef[], locales: Object.fromEntries(locs.map((l) => [l.locale, l.fields])) }
}

async function snapshot(q: Q, entryId: string, actor: Actor, note: string) {
  const [e] = await q.query(`update entries set version = version + 1, updated_at = now() where id = $1 returning version, title, stage`, [entryId])
  const locs = await q.query(`select locale, fields, status from entry_locales where entry_id = $1`, [entryId])
  await q.query(`insert into entry_versions (entry_id, version, snapshot, note, created_by) values ($1, $2, $3::text::jsonb, $4, $5)`, [
    entryId, e.version, json({ title: e.title, stage: e.stage, locales: Object.fromEntries(locs.map((l) => [l.locale, l.fields])) }), note, actor.id,
  ])
}

export async function createEntry(db: Db, actor: Actor, input: any) {
  need(actor, 'entry.write')
  const title = typeof input?.title === 'string' ? input.title.trim() : ''
  if (!title) throw new HttpError(422, 'invalid_entry', 'title is required.')
  return db.tx(async (q) => {
    const [type] = await q.query(`select id, fields from content_types where id = $1`, [input.typeId])
    if (!type) throw new HttpError(422, 'invalid_entry', `Unknown content type "${input.typeId}".`)
    const fields: Fields = input.fields ?? {}
    validateFields(type.fields, fields, true)
    const { source } = await localeMap(q)
    const slug = slugify(input.slug || title)
    if (!slug) throw new HttpError(422, 'invalid_entry', 'A slug could not be derived from the title.')
    const [clash] = await q.query(`select 1 from entries where slug = $1`, [slug])
    if (clash) throw new HttpError(409, 'slug_taken', `The slug "${slug}" is already in use.`)
    const [e] = await q.query(`insert into entries (type_id, title, slug, author_id, expires_at, version) values ($1, $2, $3, $4, $5, 0) returning id`, [
      type.id, title, slug, actor.id, input.expiresAt ?? null,
    ])
    await q.query(`insert into entry_locales (entry_id, locale, fields, source_rev, updated_by) values ($1, $2, $3::text::jsonb, 1, $4)`, [e.id, source, json(fields), actor.id])
    await snapshot(q, e.id, actor, 'Created')
    await audit(q, actor, 'Created entry', 'entry', e.id, title, { type: type.id })
    return getEntry(q, e.id)
  })
}

/** Replaces the field values of one locale. Editing the source bumps source_rev, which marks translations stale. */
export async function saveLocale(db: Db, actor: Actor, id: string, locale: string, input: any) {
  return db.tx(async (q) => {
    const row = await loadRow(q, id, true)
    const { rows: locales, source } = await localeMap(q)
    if (!locales.some((l) => l.code === locale)) throw new HttpError(404, 'not_found', `Unknown locale "${locale}".`)
    const isSource = locale === source
    need(actor, isSource ? 'entry.write' : 'entry.translate')
    const fields: Fields = input?.fields ?? {}
    validateFields(row.type_fields, fields, isSource)

    if (isSource) {
      const [prev] = await q.query(`select fields from entry_locales where entry_id = $1 and locale = $2`, [id, locale])
      const changed = json(prev?.fields ?? {}) !== json(fields) || (input.title && input.title !== row.title)
      if (changed) {
        // Any source change invalidates approvals: the entry returns to Draft. A published snapshot stays live until republished.
        await q.query(`update entries set source_rev = source_rev + 1, stage = 'Draft', title = coalesce($2, title) where id = $1`, [id, input.title ?? null])
      }
      await q.query(
        `insert into entry_locales (entry_id, locale, fields, source_rev, updated_by) values ($1, $2, $3::text::jsonb, 0, $4)
         on conflict (entry_id, locale) do update set fields = excluded.fields, updated_by = excluded.updated_by, updated_at = now()`,
        [id, locale, json(fields), actor.id],
      )
    } else {
      const status = input?.status ?? 'current'
      if (!['current', 'review', 'progress'].includes(status)) throw new HttpError(422, 'invalid_status', 'status must be current, review or progress.')
      await q.query(
        `insert into entry_locales (entry_id, locale, fields, status, source_rev, updated_by) values ($1, $2, $3::text::jsonb, $4, $5, $6)
         on conflict (entry_id, locale) do update set fields = excluded.fields, status = excluded.status, source_rev = excluded.source_rev, updated_by = excluded.updated_by, updated_at = now()`,
        [id, locale, json(fields), status, row.source_rev, actor.id],
      )
    }
    await snapshot(q, id, actor, `Edited ${locale}`)
    await audit(q, actor, isSource ? 'Edited source content' : 'Saved translation', 'entry', id, `${row.title} · ${locale}`, { locale, status: input?.status })
    return getEntry(q, id)
  })
}

/** Sets a translation's status without changing its text: send to translation, queue for review, or approve as current. */
export async function setLocaleStatus(db: Db, actor: Actor, id: string, locale: string, status: string) {
  need(actor, 'entry.translate')
  if (!['current', 'review', 'progress'].includes(status)) throw new HttpError(422, 'invalid_status', 'status must be current, review or progress.')
  return db.tx(async (q) => {
    const row = await loadRow(q, id, true)
    const { rows: locales, source } = await localeMap(q)
    if (locale === source || !locales.some((l) => l.code === locale)) throw new HttpError(422, 'invalid_locale', 'Choose a non-source locale.')
    const [cur] = await q.query(`select (fields <> '{}'::jsonb) as has_fields from entry_locales where entry_id = $1 and locale = $2`, [id, locale])
    if (status === 'current' && !cur?.has_fields) throw new HttpError(422, 'nothing_to_approve', 'There is no translation to approve yet.')
    await q.query(
      `insert into entry_locales (entry_id, locale, status, source_rev, updated_by) values ($1, $2, $3, $4, $5)
       on conflict (entry_id, locale) do update set status = excluded.status, updated_by = excluded.updated_by, updated_at = now(),
         source_rev = case when excluded.status = 'current' then excluded.source_rev else entry_locales.source_rev end`,
      [id, locale, status, row.source_rev, actor.id],
    )
    await audit(q, actor, `Translation marked ${status}`, 'entry', id, `${row.title} · ${locale}`, { locale })
    return getEntry(q, id)
  })
}

type Rule = { from: string[]; to: (requiresLegal: boolean) => string; perm: Parameters<typeof need>[1] | null; fourEyes?: boolean; label: string }
const RULES: Record<string, Rule> = {
  submit: { from: ['Draft'], to: () => 'In review', perm: 'entry.submit', label: 'Sent to review' },
  approve: { from: ['In review'], to: (legal) => (legal ? 'Legal review' : 'Approved'), perm: 'entry.approve', fourEyes: true, label: 'Approved' },
  legal_approve: { from: ['Legal review'], to: () => 'Approved', perm: 'entry.legal_approve', fourEyes: true, label: 'Approved by legal' },
  reject: { from: ['In review', 'Legal review', 'Approved'], to: () => 'Draft', perm: null, label: 'Returned to draft' },
  publish: { from: ['Approved'], to: () => 'Published', perm: 'entry.publish', label: 'Published' },
  unpublish: { from: ['Published'], to: () => 'Draft', perm: 'entry.publish', label: 'Unpublished' },
}

export async function transition(db: Db, actor: Actor, id: string, action: string) {
  const rule = RULES[action]
  if (!rule) throw new HttpError(422, 'invalid_action', `Unknown action "${action}". Use: ${Object.keys(RULES).join(', ')}.`)
  // Anyone who can approve, at either review step, can send an entry back.
  if (rule.perm) need(actor, rule.perm)
  else if (!can(actor, 'entry.approve') && !can(actor, 'entry.legal_approve')) need(actor, 'entry.approve')
  return db.tx(async (q) => {
    const row = await loadRow(q, id, true)
    if (!rule.from.includes(row.stage)) throw new HttpError(409, 'invalid_transition', `Cannot ${action} an entry that is in "${row.stage}".`)
    // Four-eyes: on types that need legal review, the author may not approve their own change.
    if (rule.fourEyes && row.requires_legal && row.author_id === actor.id) {
      throw new HttpError(403, 'four_eyes', 'The author cannot approve their own change on this content type.')
    }
    const next = rule.to(row.requires_legal)
    const { source } = await localeMap(q)

    if (action === 'publish') {
      const locs = await q.query(`select locale, fields, status, source_rev from entry_locales where entry_id = $1`, [id])
      const src = (locs.find((l) => l.locale === source)?.fields ?? {}) as Fields
      const missing = (row.type_fields as FieldDef[]).filter((d) => d.required && isEmpty(src[d.name])).map((d) => d.name)
      if (missing.length) throw new HttpError(422, 'missing_required', `Required fields are empty: ${missing.join(', ')}.`, { missing })
      // Only current translations go live; stale, in-review and missing locales fall back at delivery time.
      const live = locs.filter((l) => l.locale === source || (l.status === 'current' && l.source_rev >= row.source_rev))
      await q.query(
        `insert into published_entries (entry_id, snapshot, published_by) values ($1, $2::text::jsonb, $3)
         on conflict (entry_id) do update set snapshot = excluded.snapshot, published_by = excluded.published_by, published_at = now()`,
        [id, json({ title: row.title, slug: row.slug, typeId: row.type_id, fieldDefs: row.type_fields, locales: Object.fromEntries(live.map((l) => [l.locale, l.fields])) }), actor.id],
      )
    }
    if (action === 'unpublish') await q.query(`delete from published_entries where entry_id = $1`, [id])

    await q.query(`update entries set stage = $2 where id = $1`, [id, next])
    await snapshot(q, id, actor, rule.label)
    await audit(q, actor, rule.label, 'entry', id, row.title, { from: row.stage, to: next })
    return getEntry(q, id)
  })
}

export async function listVersions(q: Q, id: string) {
  await loadRow(q, id)
  return q.query(
    `select v.version, v.note, v.created_at as "createdAt", u.name as "createdBy" from entry_versions v left join users u on u.id = v.created_by where v.entry_id = $1 order by v.version desc`,
    [id],
  )
}

// ── Delivery ───────────────────────────────────────────────────────────────

/** Resolves a published snapshot for one locale: shared fields from the source, others through the fallback chain. */
function resolve(snap: any, locale: string, locales: Locale[], source: string) {
  const chain: string[] = []
  for (let c: string | null | undefined = locale; c && !chain.includes(c); c = locales.find((l) => l.code === c)?.fallback) chain.push(c)
  if (!chain.includes(source)) chain.push(source)
  const fields: Fields = {}
  const resolvedFrom: Record<string, string> = {}
  for (const def of snap.fieldDefs as FieldDef[]) {
    const from = def.localization === 'shared' ? source : chain.find((c) => !isEmpty(snap.locales[c]?.[def.name]))
    if (from && !isEmpty(snap.locales[from]?.[def.name])) { fields[def.name] = snap.locales[from][def.name]; resolvedFrom[def.name] = from }
  }
  return { fields, resolvedFrom }
}

export async function deliver(q: Q, opts: { locale?: string; type?: string; slug?: string }) {
  const { rows: locales, source } = await localeMap(q)
  const locale = opts.locale ?? source
  if (!locales.some((l) => l.code === locale)) throw new HttpError(422, 'invalid_locale', `Unknown locale "${locale}".`)
  const rows = await q.query(
    `select p.entry_id, p.snapshot, p.published_at from published_entries p join entries e on e.id = p.entry_id
     where (e.expires_at is null or e.expires_at > now()) order by p.published_at desc`,
  )
  return rows
    .filter((r) => (!opts.type || r.snapshot.typeId === opts.type) && (!opts.slug || r.snapshot.slug === opts.slug))
    .map((r) => ({ id: r.entry_id, slug: r.snapshot.slug, type: r.snapshot.typeId, title: r.snapshot.title, locale, publishedAt: r.published_at, ...resolve(r.snapshot, locale, locales, source) }))
}
