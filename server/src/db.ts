import { SCHEMA } from './schema.ts'

/** Anything that can run a query: the database itself or an open transaction. */
export interface Q {
  query<T = any>(sql: string, params?: unknown[]): Promise<T[]>
}

export interface Db extends Q {
  tx<T>(fn: (q: Q) => Promise<T>): Promise<T>
  exec(sql: string): Promise<void>
  close(): Promise<void>
}

/**
 * Opens the database and applies the schema.
 * With DATABASE_URL set it connects to PostgreSQL; otherwise it runs an embedded
 * Postgres (PGlite), in memory or persisted to PGLITE_DIR. Both speak the same SQL.
 */
export async function openDb(opts: { url?: string; dir?: string } = {}): Promise<Db> {
  const url = opts.url ?? process.env.DATABASE_URL
  const db = url ? await openPg(url) : await openPglite(opts.dir ?? process.env.PGLITE_DIR)
  await db.exec(SCHEMA)
  return db
}

async function openPg(url: string): Promise<Db> {
  const { default: pg } = await import('pg')
  const pool = new pg.Pool({ connectionString: url })
  return {
    query: async (sql, params) => (await pool.query(sql, params as any[])).rows,
    exec: async (sql) => void (await pool.query(sql)),
    close: () => pool.end(),
    async tx(fn) {
      const client = await pool.connect()
      try {
        await client.query('begin')
        const out = await fn({ query: async (sql, params) => (await client.query(sql, params as any[])).rows })
        await client.query('commit')
        return out
      } catch (err) {
        await client.query('rollback')
        throw err
      } finally {
        client.release()
      }
    },
  }
}

async function openPglite(dir?: string): Promise<Db> {
  const { PGlite } = await import('@electric-sql/pglite')
  const lite = new PGlite(dir)
  await lite.waitReady
  return {
    query: async (sql, params) => (await lite.query(sql, params as any[])).rows as any[],
    exec: async (sql) => void (await lite.exec(sql)),
    close: () => lite.close(),
    tx: (fn) =>
      lite.transaction((t) => fn({ query: async (sql, params) => (await t.query(sql, params as any[])).rows as any[] })) as Promise<any>,
  }
}

/** JSON parameters are always passed as text and cast in SQL ($n::text::jsonb) so both drivers agree. */
export const json = (v: unknown) => JSON.stringify(v)
