import { openDb } from './db.ts'
import { buildApp } from './app.ts'
import { seedBase, seedDemo } from './seed.ts'

const port = Number(process.env.PORT ?? 8787)
const db = await openDb()

// Without DATABASE_URL the server runs on an embedded database and loads demo data,
// so `npm run dev` works with no setup. Against a real database, seed explicitly with SEED_DEMO=1.
if (!process.env.DATABASE_URL || process.env.SEED_DEMO === '1') {
  await seedBase(db)
  await seedDemo(db)
}

const app = buildApp(db, { logger: true })
await app.listen({ port, host: process.env.HOST ?? '127.0.0.1' })
