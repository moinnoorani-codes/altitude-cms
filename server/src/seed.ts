import { openDb, type Db } from './db.ts'
import { hashToken, type Actor } from './core.ts'
import { createEntry, saveLocale, transition, upsertType } from './content.ts'
import { createAlert } from './alerts.ts'

// Demo data for local development. The tokens below are public and for development only.
export const DEMO_USERS = [
  ['u-priya', 'Priya Raman', 'priya@meridianair.example', 'content_lead', 'dev-priya'],
  ['u-tomas', 'Tomas Keller', 'tomas@meridianair.example', 'market_manager', 'dev-tomas'],
  ['u-daniel', 'Daniel Okafor', 'daniel@meridianair.example', 'duty_manager', 'dev-daniel'],
  ['u-mei', 'Mei Tanaka', 'mei@meridianair.example', 'legal', 'dev-mei'],
  ['u-lucas', 'Lucas Ferreira', 'lucas@meridianair.example', 'developer', 'dev-lucas'],
  ['u-hannah', 'Hannah Lindqvist', 'hannah@meridianair.example', 'content_lead', 'dev-hannah'],
  ['u-admin', 'Admin', 'admin@meridianair.example', 'admin', 'dev-admin'],
  ['u-viewer', 'Read Only', 'viewer@meridianair.example', 'viewer', 'dev-viewer'],
] as const

const LOCALES = [
  ['en-GB', 'United Kingdom', 'English', 'GBP', null, 'UK261', false, true],
  ['en-US', 'United States', 'English', 'USD', 'en-GB', 'US DOT', false, false],
  ['de-DE', 'Germany', 'German', 'EUR', 'en-GB', 'EU261', false, false],
  ['fr-FR', 'France', 'French', 'EUR', 'en-GB', 'EU261', false, false],
  ['ar-AE', 'United Arab Emirates', 'Arabic', 'AED', 'en-GB', 'GCAA', true, false],
  ['hi-IN', 'India', 'Hindi', 'INR', 'en-GB', 'DGCA', false, false],
  ['ja-JP', 'Japan', 'Japanese', 'JPY', 'en-GB', 'JCAB', false, false],
  ['pt-BR', 'Brazil', 'Portuguese', 'BRL', 'en-GB', 'ANAC', false, false],
] as const

const TEMPLATES = [
  ['severe-weather', 'Severe weather', 1, 'Severe weather at {airport}', 'Severe weather is affecting flights to and from {airport}. Please check your flight status before travelling to the airport. If your flight is cancelled you can rebook or request a refund online at no charge.'],
  ['industrial-action', 'Industrial action', 2, 'Industrial action affecting {airport}', 'Planned industrial action may disrupt flights at {airport}. We will contact affected customers directly. You can change your travel dates free of charge.'],
  ['airspace-closure', 'Airspace closure', 1, 'Airspace closure: flights rerouted', 'Due to an airspace closure some flights are delayed or rerouted. We are contacting affected customers. Your rights under passenger regulations are unaffected.'],
  ['system-outage', 'System outage', 2, 'Check-in system disruption', 'We are experiencing a technical issue with check-in. Please arrive at the airport early. We apologise for the inconvenience.'],
  ['entry-rules', 'Entry rule change', 3, 'Updated entry requirements', 'Entry requirements for your destination have changed. Please check that your travel documents meet the new rules before you fly.'],
] as const

const PAGE_FIELDS = [
  { name: 'headline', type: 'text', localization: 'translated', required: true },
  { name: 'subtitle', type: 'long_text', localization: 'translated', required: true },
  { name: 'body', type: 'rich_text', localization: 'translated' },
  { name: 'cta_label', type: 'text', localization: 'translated' },
]

/** Loads reference data (locales, users, types, templates). Safe to run repeatedly. */
export async function seedBase(db: Db) {
  for (const l of LOCALES) {
    await db.query(`insert into locales (code, market, language, currency, fallback, pack, rtl, is_source) values ($1,$2,$3,$4,$5,$6,$7,$8) on conflict (code) do nothing`, [...l])
  }
  for (const [id, name, email, role, token] of DEMO_USERS) {
    await db.query(`insert into users (id, name, email, role, token_hash) values ($1,$2,$3,$4,$5) on conflict (id) do nothing`, [id, name, email, role, hashToken(token)])
  }
  for (const t of TEMPLATES) {
    await db.query(`insert into alert_templates (id, name, severity, title, body) values ($1,$2,$3,$4,$5) on conflict (id) do nothing`, [...t])
  }
  const dev: Actor = { id: 'u-lucas', name: 'Lucas Ferreira', role: 'developer' }
  const [{ n }] = await db.query(`select count(*)::int as n from content_types`)
  if (n > 0) return
  await upsertType(db, dev, { id: 'promotion', name: 'Promotion', requiresLegal: true, fields: [
    ...PAGE_FIELDS,
    { name: 'fare_from', type: 'currency_amount', localization: 'market', required: true },
    { name: 'origin', type: 'iata_airport', localization: 'shared' },
    { name: 'destination', type: 'iata_airport', localization: 'shared' },
    { name: 'book_by', type: 'date', localization: 'shared' },
  ] })
  await upsertType(db, dev, { id: 'policy', name: 'Policy', requiresLegal: true, fields: PAGE_FIELDS })
  await upsertType(db, dev, { id: 'travel_info', name: 'Travel info', fields: PAGE_FIELDS })
  await upsertType(db, dev, { id: 'destination_guide', name: 'Destination guide', fields: [...PAGE_FIELDS, { name: 'airport', type: 'iata_airport', localization: 'shared', required: true }] })
}

/** Adds sample entries and alerts so the admin UI has something to show. */
export async function seedDemo(db: Db) {
  const [{ n }] = await db.query(`select count(*)::int as n from entries where slug = 'baggage-allowance'`)
  if (n > 0) return
  const priya: Actor = { id: 'u-priya', name: 'Priya Raman', role: 'content_lead' }
  const hannah: Actor = { id: 'u-hannah', name: 'Hannah Lindqvist', role: 'content_lead' }
  const tomas: Actor = { id: 'u-tomas', name: 'Tomas Keller', role: 'market_manager' }
  const mei: Actor = { id: 'u-mei', name: 'Mei Tanaka', role: 'legal' }
  const daniel: Actor = { id: 'u-daniel', name: 'Daniel Okafor', role: 'duty_manager' }

  const sale = await createEntry(db, priya, { typeId: 'promotion', title: 'Summer sale: Europe from £49', fields: {
    headline: 'Summer sale: Europe from £49', subtitle: 'Book by 30 November for travel between January and March. Price includes taxes and one cabin bag.',
    cta_label: 'Search flights', fare_from: 49, origin: 'LHR', destination: 'CDG', book_by: '2026-11-30' } })
  await saveLocale(db, tomas, sale.id, 'de-DE', { fields: { headline: 'Sommer-Sale: Europa ab 49 £', subtitle: 'Bis 30. November buchen, zwischen Januar und März reisen. Preis inklusive Steuern und Handgepäck.', cta_label: 'Flüge suchen', fare_from: 57 } })
  await saveLocale(db, tomas, sale.id, 'fr-FR', { fields: { headline: 'Soldes d’été : l’Europe dès 49 £', subtitle: 'Réservez avant le 30 novembre pour voyager entre janvier et mars. Taxes et bagage cabine inclus.', cta_label: 'Rechercher des vols', fare_from: 57 } })
  await transition(db, priya, sale.id, 'submit')
  await transition(db, hannah, sale.id, 'approve')

  const bags = await createEntry(db, priya, { typeId: 'policy', title: 'Baggage allowance', fields: { headline: 'Baggage allowance', subtitle: 'What you can bring on board and in the hold.', body: 'Every fare includes one cabin bag up to 10 kg.' } })
  await saveLocale(db, tomas, bags.id, 'de-DE', { fields: { headline: 'Freigepäck', subtitle: 'Was Sie an Bord und im Frachtraum mitnehmen können.' } })
  for (const [who, action] of [[priya, 'submit'], [hannah, 'approve'], [mei, 'legal_approve'], [priya, 'publish']] as const) await transition(db, who, bags.id, action)
  // A later source edit makes the German version stale while the published page stays live.
  await saveLocale(db, priya, bags.id, 'en-GB', { fields: { headline: 'Baggage allowance', subtitle: 'What you can bring on board and in the hold.', body: 'Every fare includes one cabin bag up to 10 kg and one personal item.' } })

  const checkin = await createEntry(db, hannah, { typeId: 'travel_info', title: 'Check-in and travel documents', fields: { headline: 'Check-in and travel documents', subtitle: 'Online check-in opens 48 hours before departure.' } })
  await transition(db, hannah, checkin.id, 'submit')
  await createEntry(db, priya, { typeId: 'destination_guide', title: 'Tokyo destination guide', fields: { headline: 'Tokyo', subtitle: 'Where to stay, eat and explore.', airport: 'HND' } })

  await createAlert(db, daniel, { templateId: 'severe-weather', airports: ['LHR'], channels: ['Web banner', 'App', 'Email', 'SMS', 'Kiosks'], expiresInHours: 14 })
  await createAlert(db, daniel, { templateId: 'industrial-action', airports: ['CDG', 'ORY'], channels: ['Web banner', 'App', 'Email'], expiresInHours: 48 })
}

if (import.meta.main) {
  const db = await openDb()
  await seedBase(db)
  await seedDemo(db)
  console.log('Seeded. Development tokens:', DEMO_USERS.map((u) => `${u[4]} (${u[3]})`).join(', '))
  await db.close()
}
