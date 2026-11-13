import { createHash } from 'node:crypto'
import { json, type Q } from './db.ts'

export class HttpError extends Error {
  status: number
  code: string
  details: unknown
  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}

export type Actor = { id: string; name: string; role: string }

export type Permission =
  | 'schema.write'
  | 'entry.write'
  | 'entry.translate'
  | 'entry.submit'
  | 'entry.approve'
  | 'entry.legal_approve'
  | 'entry.publish'
  | 'alert.publish'
  | 'audit.read'

/** Role → permissions. Custom roles and per-market scoping come later (PRD SEC-01, SEC-02). */
export const ROLES: Record<string, Permission[]> = {
  admin: ['schema.write', 'entry.write', 'entry.translate', 'entry.submit', 'entry.approve', 'entry.legal_approve', 'entry.publish', 'alert.publish', 'audit.read'],
  content_lead: ['entry.write', 'entry.translate', 'entry.submit', 'entry.approve', 'entry.publish', 'alert.publish', 'audit.read'],
  market_manager: ['entry.translate', 'entry.submit'],
  legal: ['entry.legal_approve', 'audit.read'],
  duty_manager: ['alert.publish'],
  developer: ['schema.write'],
  viewer: [],
}

export const can = (actor: Actor, perm: Permission) => ROLES[actor.role]?.includes(perm) ?? false

export function need(actor: Actor, perm: Permission) {
  if (!can(actor, perm)) throw new HttpError(403, 'forbidden', `Role "${actor.role}" does not have the "${perm}" permission.`)
}

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

/** Appends to the audit log. Call inside the same transaction as the change it records. */
export async function audit(q: Q, actor: Actor, action: string, targetType: string, targetId: string, label: string, detail: Record<string, unknown> = {}) {
  await q.query(
    `insert into audit_log (actor_id, actor_name, action, target_type, target_id, target_label, detail)
     values ($1, $2, $3, $4, $5, $6, $7::text::jsonb)`,
    [actor.id, actor.name, action, targetType, targetId, label, json(detail)],
  )
}

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
