import { randomBytes } from 'node:crypto'
import type { Db, Q } from './db.ts'
import { HttpError, ROLES, audit, can, hashToken, need, type Actor } from './core.ts'

const DEFAULT_TOKEN_DAYS = 90
const view = (u: any) => ({ id: u.id, name: u.name, email: u.email, role: u.role, createdAt: u.created_at, tokenExpiresAt: u.token_expires_at, deletedAt: u.deleted_at })

export async function listUsers(q: Q, actor: Actor) {
  need(actor, 'users.manage')
  return (await q.query(`select * from users order by created_at`)).map(view)
}

/**
 * Creates a user with a random API token. The token is returned once and only its hash is stored.
 * Tokens expire (90 days unless stated), so a leaked token does not stay valid forever.
 */
export async function createUser(db: Db, actor: Actor, input: any) {
  need(actor, 'users.manage')
  const name = String(input?.name ?? '').trim()
  const email = String(input?.email ?? '').trim().toLowerCase()
  if (!name) throw new HttpError(422, 'invalid_user', 'name is required.')
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new HttpError(422, 'invalid_user', 'A valid email is required.')
  if (!ROLES[input?.role]) throw new HttpError(422, 'invalid_user', `role must be one of: ${Object.keys(ROLES).join(', ')}.`)
  const days = Number(input?.tokenDays ?? DEFAULT_TOKEN_DAYS)
  if (!Number.isFinite(days) || days <= 0 || days > 365) throw new HttpError(422, 'invalid_user', 'tokenDays must be between 1 and 365.')
  const id = `u-${randomBytes(6).toString('hex')}`
  const token = `alt_${randomBytes(24).toString('base64url')}`
  return db.tx(async (q) => {
    const [clash] = await q.query(`select 1 from users where email = $1`, [email])
    if (clash) throw new HttpError(409, 'email_taken', 'A user with this email already exists.')
    const [u] = await q.query(
      `insert into users (id, name, email, role, token_hash, token_expires_at) values ($1, $2, $3, $4, $5, now() + make_interval(days => $6::int)) returning *`,
      [id, name, email, input.role, hashToken(token), Math.round(days)],
    )
    // The audit entry names the user by id only, so erasing the user later leaves no personal data behind.
    await audit(q, actor, 'Created user', 'user', id, id, { role: input.role })
    return { ...view(u), token }
  })
}

/** Data-subject access: everything the system holds about one person. A user may export their own data. */
export async function exportUser(q: Q, actor: Actor, id: string) {
  if (actor.id !== id) need(actor, 'users.manage')
  const [u] = await q.query(`select * from users where id = $1`, [id])
  if (!u) throw new HttpError(404, 'not_found', 'User not found.')
  return {
    exportedAt: new Date().toISOString(),
    user: view(u),
    entriesAuthored: await q.query(`select id, title, slug, created_at as "createdAt" from entries where author_id = $1 order by created_at`, [id]),
    alertsPublished: await q.query(`select id, title, published_at as "publishedAt" from alerts where published_by = $1 order by published_at`, [id]),
    activity: await q.query(`select at, action, target_type as "targetType", target_label as "target" from audit_log where actor_id = $1 order by id`, [id]),
  }
}

/**
 * Data-subject erasure. The person's name, email and token are removed; the account id stays so that
 * authorship and the audit trail remain intact without identifying anyone.
 */
export async function eraseUser(db: Db, actor: Actor, id: string) {
  need(actor, 'users.manage')
  if (actor.id === id) throw new HttpError(409, 'cannot_erase_self', 'Ask another administrator to erase your account.')
  return db.tx(async (q) => {
    const [u] = await q.query(`select id, deleted_at from users where id = $1`, [id])
    if (!u) throw new HttpError(404, 'not_found', 'User not found.')
    if (u.deleted_at) throw new HttpError(409, 'already_erased', 'This user has already been erased.')
    const [out] = await q.query(
      `update users set name = 'Deleted user', email = $2, role = 'viewer', token_hash = null, token_expires_at = null, deleted_at = now() where id = $1 returning *`,
      [id, `erased-${id}@invalid.example`],
    )
    await audit(q, actor, 'Erased user', 'user', id, id)
    return view(out)
  })
}

export const canManageUsers = (actor: Actor) => can(actor, 'users.manage')
