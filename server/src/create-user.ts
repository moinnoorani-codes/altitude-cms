// Creates a user from the command line, for the first administrator or for service accounts.
//   npm run create-user -- "Jane Doe" jane@airline.example admin
import { openDb } from './db.ts'
import { createUser } from './users.ts'

const [name, email, role = 'admin'] = process.argv.slice(2)
if (!name || !email) {
  console.error('Usage: npm run create-user -- "<name>" <email> [role]')
  process.exit(1)
}
const db = await openDb()
const user = await createUser(db, { id: 'system', name: 'System', role: 'admin' }, { name, email, role })
console.log(`Created ${user.role} ${user.id}. API token (shown once, expires ${new Date(user.tokenExpiresAt).toISOString().slice(0, 10)}):\n${user.token}`)
await db.close()
