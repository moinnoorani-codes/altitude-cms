import { openDb } from './db.ts'
import { buildApp } from './app.ts'
import { seedBase, seedDemo, seedReference } from './seed.ts'

const production = process.env.NODE_ENV === 'production'
if (production && !process.env.DATABASE_URL) throw new Error('Production needs DATABASE_URL (a real PostgreSQL database).')

const port = Number(process.env.PORT ?? 8787)
const db = await openDb()

if (production) {
  // Production gets reference data only. Demo users have public tokens and are refused here;
  // create the first administrator with `npm run create-user`.
  await seedReference(db)
} else {
  await seedBase(db)
  await seedDemo(db)
}

const app = buildApp(db, { logger: true })
await app.listen({ port, host: process.env.HOST ?? '127.0.0.1' })
