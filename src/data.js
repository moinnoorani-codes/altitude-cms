// Mock data for the Altitude CMS prototype. The airline "Meridian Air" is fictional.

export const BRANDS = ['Meridian Air', 'Meridian Go', 'Meridian Miles', 'Meridian Cargo']
export const ENVS = ['Production', 'Staging', 'Development']

export const LOCALES = [
  { code: 'en-GB', market: 'United Kingdom', lang: 'English', currency: 'GBP', fallback: null, pack: 'UK261', rtl: false },
  { code: 'en-US', market: 'United States', lang: 'English', currency: 'USD', fallback: 'en-GB', pack: 'US DOT', rtl: false },
  { code: 'de-DE', market: 'Germany', lang: 'German', currency: 'EUR', fallback: 'en-GB', pack: 'EU261', rtl: false },
  { code: 'fr-FR', market: 'France', lang: 'French', currency: 'EUR', fallback: 'en-GB', pack: 'EU261', rtl: false },
  { code: 'ar-AE', market: 'United Arab Emirates', lang: 'Arabic', currency: 'AED', fallback: 'en-GB', pack: 'GCAA', rtl: true },
  { code: 'hi-IN', market: 'India', lang: 'Hindi', currency: 'INR', fallback: 'en-GB', pack: 'DGCA', rtl: false },
  { code: 'ja-JP', market: 'Japan', lang: 'Japanese', currency: 'JPY', fallback: 'en-GB', pack: 'JCAB', rtl: false },
  { code: 'pt-BR', market: 'Brazil', lang: 'Portuguese', currency: 'BRL', fallback: 'en-GB', pack: 'ANAC', rtl: false },
]

export const STAGES = ['Draft', 'In review', 'Legal review', 'Approved', 'Published']

export const USERS = [
  { id: 'u1', name: 'Priya Raman', initials: 'PR', role: 'Content lead', scope: 'All markets', team: 'Head office', last: '2 min ago', mfa: true },
  { id: 'u2', name: 'Tomas Keller', initials: 'TK', role: 'Market manager', scope: 'Germany, France', team: 'Europe', last: '14 min ago', mfa: true },
  { id: 'u3', name: 'Aisha Al Marri', initials: 'AA', role: 'Market manager', scope: 'United Arab Emirates', team: 'Gulf', last: '1 h ago', mfa: true },
  { id: 'u4', name: 'Daniel Okafor', initials: 'DO', role: 'Duty manager', scope: 'Disruption centre', team: 'Operations control', last: '5 min ago', mfa: true },
  { id: 'u5', name: 'Mei Tanaka', initials: 'MT', role: 'Legal reviewer', scope: 'Legal review stage', team: 'Legal', last: 'Yesterday', mfa: true },
  { id: 'u6', name: 'Lucas Ferreira', initials: 'LF', role: 'Developer', scope: 'Development, Staging', team: 'Digital', last: '3 h ago', mfa: false },
  { id: 'u7', name: 'Hannah Lindqvist', initials: 'HL', role: 'Revenue analyst', scope: 'Routes and fares', team: 'Revenue', last: '40 min ago', mfa: true },
]

const cov = (o = {}) => ({
  'en-GB': 'current', 'en-US': 'current', 'de-DE': 'current', 'fr-FR': 'current',
  'ar-AE': 'current', 'hi-IN': 'current', 'ja-JP': 'current', 'pt-BR': 'current', ...o,
})

export const ENTRIES = [
  { id: 'e1', title: 'Summer sale: Europe from £49', type: 'Promotion', stage: 'Legal review', author: 'u1', updated: '12 min ago', expires: '30 Nov 2026', l10n: cov({ 'ar-AE': 'progress', 'hi-IN': 'missing', 'ja-JP': 'missing', 'pt-BR': 'stale' }) },
  { id: 'e2', title: 'Baggage allowance', type: 'Policy', stage: 'Published', author: 'u5', updated: '2 days ago', expires: null, l10n: cov({ 'de-DE': 'stale', 'fr-FR': 'stale' }) },
  { id: 'e3', title: 'London to Dubai', type: 'Route page', stage: 'Published', author: 'u7', updated: '1 h ago', expires: null, l10n: cov() },
  { id: 'e4', title: 'Check-in and travel documents', type: 'Travel info', stage: 'In review', author: 'u2', updated: '3 h ago', expires: null, l10n: cov({ 'ja-JP': 'review', 'pt-BR': 'progress' }) },
  { id: 'e5', title: 'Business cabin: The Meridian Suite', type: 'Cabin', stage: 'Approved', author: 'u1', updated: 'Yesterday', expires: null, l10n: cov({ 'hi-IN': 'missing' }) },
  { id: 'e6', title: 'Meridian Miles Gold benefits', type: 'Loyalty tier', stage: 'Published', author: 'u1', updated: '5 days ago', expires: null, l10n: cov({ 'ar-AE': 'stale' }) },
  { id: 'e7', title: 'Travelling with assistance', type: 'Policy', stage: 'Published', author: 'u5', updated: '3 weeks ago', expires: null, l10n: cov() },
  { id: 'e8', title: 'Tokyo destination guide', type: 'Destination guide', stage: 'Draft', author: 'u2', updated: '25 min ago', expires: null, l10n: cov({ 'de-DE': 'missing', 'fr-FR': 'missing', 'ar-AE': 'missing', 'hi-IN': 'missing', 'pt-BR': 'missing', 'ja-JP': 'progress' }) },
  { id: 'e9', title: 'Conditions of carriage', type: 'Legal text', stage: 'Published', author: 'u5', updated: '2 months ago', expires: null, l10n: cov() },
  { id: 'e10', title: 'Extra legroom seats', type: 'Ancillary', stage: 'In review', author: 'u7', updated: '4 h ago', expires: null, l10n: cov({ 'pt-BR': 'missing', 'ja-JP': 'stale' }) },
  { id: 'e11', title: 'Homepage', type: 'Page', stage: 'Published', author: 'u1', updated: '1 h ago', expires: null, l10n: cov() },
  { id: 'e12', title: 'Delayed or cancelled flights: your rights', type: 'Policy', stage: 'Legal review', author: 'u5', updated: '6 h ago', expires: null, l10n: cov({ 'en-US': 'review', 'pt-BR': 'stale' }) },
  { id: 'e13', title: 'Black Friday: long haul from £329', type: 'Promotion', stage: 'Draft', author: 'u1', updated: '8 min ago', expires: '1 Dec 2026', l10n: cov({ 'de-DE': 'missing', 'fr-FR': 'missing', 'ar-AE': 'missing', 'hi-IN': 'missing', 'ja-JP': 'missing', 'pt-BR': 'missing', 'en-US': 'progress' }) },
  { id: 'e14', title: 'Lounge: London Heathrow T3', type: 'Lounge', stage: 'Approved', author: 'u2', updated: '2 days ago', expires: null, l10n: cov({ 'ja-JP': 'stale' }) },
]

export const TYPES = [
  { id: 'promotion', name: 'Promotion', kind: 'Collection', entries: 48, airline: false, fields: [
    ['title', 'Short text', 'Translated', true], ['slug', 'Slug', 'Shared', true], ['hero', 'Group', 'Translated', true],
    ['fare_from', 'Currency amount', 'Per market', true], ['routes', 'Route pair (multiple)', 'Shared', false],
    ['travel_dates', 'Date range with blackouts', 'Shared', true], ['terms', 'Reference: Legal text', 'Per market', true], ['blocks', 'Modular blocks', 'Translated', false]] },
  { id: 'route', name: 'Route page', kind: 'Generated', entries: 2140, airline: true, fields: [
    ['origin', 'IATA airport', 'Shared', true], ['destination', 'IATA airport', 'Shared', true], ['lowest_fare', 'Live fare', 'Per market', true],
    ['intro', 'Rich text', 'Translated', false], ['faqs', 'Reference: FAQ (multiple)', 'Translated', false], ['seo', 'SEO group', 'Translated', true]] },
  { id: 'airport', name: 'Airport', kind: 'Reference data', entries: 312, airline: true, fields: [
    ['iata', 'IATA airport', 'Shared', true], ['name', 'Short text', 'Translated', true], ['city', 'Reference: City', 'Shared', true],
    ['timezone', 'Timezone', 'Shared', true], ['lounges', 'Reference: Lounge (multiple)', 'Shared', false]] },
  { id: 'alert', name: 'Travel alert', kind: 'Collection', entries: 9, airline: true, fields: [
    ['headline', 'Short text', 'Translated', true], ['severity', 'Select', 'Shared', true], ['airports', 'IATA airport (multiple)', 'Shared', false],
    ['flights', 'Flight number range', 'Shared', false], ['body', 'Rich text', 'Translated', true], ['expires_at', 'Date and time', 'Shared', true]] },
  { id: 'fare', name: 'Fare family', kind: 'Collection', entries: 12, airline: true, fields: [
    ['name', 'Short text', 'Translated', true], ['cabin', 'Cabin class', 'Shared', true], ['inclusions', 'Repeatable group', 'Translated', true], ['change_fee', 'Currency amount', 'Per market', false]] },
  { id: 'policy', name: 'Policy', kind: 'Collection', entries: 64, airline: false, fields: [
    ['title', 'Short text', 'Translated', true], ['body', 'Rich text', 'Translated', true], ['jurisdiction', 'Select', 'Per market', true], ['effective_from', 'Date', 'Per market', true]] },
  { id: 'cabin', name: 'Cabin', kind: 'Collection', entries: 6, airline: true, fields: [
    ['name', 'Short text', 'Translated', true], ['aircraft', 'Aircraft type (multiple)', 'Shared', true], ['gallery', 'Asset (multiple)', 'Shared', false], ['features', 'Repeatable group', 'Translated', true]] },
  { id: 'page', name: 'Page', kind: 'Collection', entries: 180, airline: false, fields: [
    ['title', 'Short text', 'Translated', true], ['slug', 'Slug', 'Translated', true], ['blocks', 'Modular blocks', 'Translated', true], ['seo', 'SEO group', 'Translated', true]] },
  { id: 'settings', name: 'Site settings', kind: 'Singleton', entries: 1, airline: false, fields: [
    ['navigation', 'Repeatable group', 'Translated', true], ['footer', 'Rich text', 'Translated', true], ['booking_engine_url', 'Link', 'Per market', true]] },
]

export const FIELD_TYPES = {
  Standard: ['Short text', 'Long text', 'Rich text', 'Number', 'Boolean', 'Date and time', 'Select', 'Link', 'Asset', 'Reference', 'Group', 'Modular blocks', 'JSON'],
  Airline: ['IATA airport', 'IATA airline', 'Route pair', 'Flight number range', 'Currency amount', 'Live fare', 'Aircraft type', 'Cabin class', 'Date range with blackouts'],
}

export const ASSETS = [
  { id: 'a1', name: 'dubai-skyline-dusk.jpg', dims: '4800 × 3200', size: '6.2 MB', tags: ['destination', 'DXB'], rights: 'Getty, to 12 Mar 2027', state: 'ok', g: ['#e0843a', '#7a2f5c'] },
  { id: 'a2', name: 'suite-cabin-wide.jpg', dims: '6000 × 4000', size: '9.8 MB', tags: ['cabin', 'business'], rights: 'Owned', state: 'ok', g: ['#14306b', '#4b74d9'] },
  { id: 'a3', name: 'tokyo-shibuya-night.jpg', dims: '5200 × 3467', size: '7.1 MB', tags: ['destination', 'HND'], rights: 'Shutterstock, to 2 Dec 2026', state: 'soon', g: ['#2a1a4a', '#d94b8a'] },
  { id: 'a4', name: 'family-boarding.jpg', dims: '4200 × 2800', size: '4.4 MB', tags: ['campaign', 'summer'], rights: 'Expired 31 Oct 2026', state: 'expired', g: ['#3b8f7a', '#e9d27a'] },
  { id: 'a5', name: 'a350-takeoff.jpg', dims: '5600 × 3733', size: '8.0 MB', tags: ['fleet', 'A350'], rights: 'Owned', state: 'ok', g: ['#5f7fa8', '#dfe8f2'] },
  { id: 'a6', name: 'lounge-lhr-t3.jpg', dims: '4000 × 2667', size: '3.9 MB', tags: ['lounge', 'LHR'], rights: 'Owned', state: 'ok', g: ['#6b4a2f', '#d9b98a'] },
  { id: 'a7', name: 'rio-beach-aerial.jpg', dims: '5000 × 3333', size: '6.6 MB', tags: ['destination', 'GIG'], rights: 'Getty, to 1 Jun 2027, Brazil only', state: 'ok', g: ['#1b7a8a', '#f0d9a0'] },
  { id: 'a8', name: 'safety-video-2026.mp4', dims: '3840 × 2160', size: '412 MB', tags: ['video', 'safety'], rights: 'Owned', state: 'ok', g: ['#22262e', '#58606e'] },
]

export const ALERTS = [
  { id: 'al1', sev: 1, title: 'Heavy snow at London Heathrow', scope: 'LHR · all flights · 13–14 Nov', channels: ['Web banner', 'App', 'Email', 'SMS', 'Kiosks'], by: 'Daniel Okafor', published: '09:42', expires: 'Today 23:59', status: 'Live', reach: '18,400 passengers' },
  { id: 'al2', sev: 2, title: 'French air traffic control strike', scope: 'CDG, ORY, NCE · 15 Nov', channels: ['Web banner', 'App', 'Email'], by: 'Daniel Okafor', published: 'Yesterday 16:10', expires: '16 Nov 06:00', status: 'Live', reach: '6,250 passengers' },
  { id: 'al3', sev: 3, title: 'New entry requirements for Japan', scope: 'HND, NRT, KIX · from 1 Dec', channels: ['Web banner', 'Help centre'], by: 'Mei Tanaka', published: '10 Nov', expires: '1 Jan 2027', status: 'Live', reach: 'Japan routes' },
  { id: 'al4', sev: 2, title: 'Baggage system fault at Dubai T1', scope: 'DXB · 9 Nov', channels: ['Web banner', 'App', 'Kiosks'], by: 'Daniel Okafor', published: '9 Nov 05:20', expires: '9 Nov 14:00', status: 'Expired', reach: '3,900 passengers' },
]

export const ALERT_TEMPLATES = [
  { id: 't1', name: 'Severe weather', sev: 1, title: 'Severe weather at {airport}', body: 'Severe weather is affecting flights to and from {airport}. Please check your flight status before travelling to the airport. If your flight is cancelled you can rebook or request a refund online at no charge.' },
  { id: 't2', name: 'Industrial action', sev: 2, title: 'Industrial action affecting {airport}', body: 'Planned industrial action may disrupt flights at {airport}. We will contact affected customers directly. You can change your travel dates free of charge.' },
  { id: 't3', name: 'Airspace closure', sev: 1, title: 'Airspace closure: flights rerouted', body: 'Due to an airspace closure some flights are delayed or rerouted. We are contacting affected customers. Your rights under passenger regulations are unaffected.' },
  { id: 't4', name: 'System outage', sev: 2, title: 'Check-in system disruption', body: 'We are experiencing a technical issue with check-in. Please arrive at the airport early. We apologise for the inconvenience.' },
  { id: 't5', name: 'Entry rule change', sev: 3, title: 'Updated entry requirements', body: 'Entry requirements for your destination have changed. Please check that your travel documents meet the new rules before you fly.' },
]

export const CHANNELS = ['Web banner', 'App', 'Email', 'SMS', 'Kiosks', 'Help centre', 'Contact centre']

export const ROUTES = [
  { id: 'r1', o: 'LHR', d: 'DXB', od: 'London to Dubai', fare: 389, age: 0.4, status: 'Live', index: true, visits: 48200 },
  { id: 'r2', o: 'LHR', d: 'JFK', od: 'London to New York', fare: 412, age: 0.2, status: 'Live', index: true, visits: 61900 },
  { id: 'r3', o: 'LHR', d: 'HND', od: 'London to Tokyo', fare: 689, age: 1.1, status: 'Live', index: true, visits: 22400 },
  { id: 'r4', o: 'MAN', d: 'DXB', od: 'Manchester to Dubai', fare: 421, age: 7.5, status: 'Live', index: true, visits: 12800 },
  { id: 'r5', o: 'LHR', d: 'GIG', od: 'London to Rio de Janeiro', fare: 598, age: 2.3, status: 'Live', index: true, visits: 9100 },
  { id: 'r6', o: 'LHR', d: 'DEL', od: 'London to Delhi', fare: 455, age: 0.9, status: 'Live', index: true, visits: 31700 },
  { id: 'r7', o: 'EDI', d: 'CDG', od: 'Edinburgh to Paris', fare: 49, age: 0.3, status: 'Live', index: true, visits: 15400 },
  { id: 'r8', o: 'LHR', d: 'FRA', od: 'London to Frankfurt', fare: 62, age: 13.2, status: 'Live', index: true, visits: 18900 },
  { id: 'r9', o: 'LGW', d: 'BCN', od: 'London Gatwick to Barcelona', fare: 55, age: 0.6, status: 'Live', index: true, visits: 27300 },
  { id: 'r10', o: 'LHR', d: 'SYD', od: 'London to Sydney', fare: 899, age: 26.0, status: 'Live', index: true, visits: 14200 },
  { id: 'r11', o: 'MAN', d: 'JFK', od: 'Manchester to New York', fare: 438, age: 1.8, status: 'Paused', index: false, visits: 0 },
  { id: 'r12', o: 'LHR', d: 'KIX', od: 'London to Osaka', fare: 712, age: 0.5, status: 'Scheduled', index: false, visits: 0 },
]

export const RELEASES = [
  { id: 'rel1', name: 'Black Friday 2026', when: '27 Nov, 00:01 local per market', items: 34, markets: 8, status: 'Scheduled', ready: 71 },
  { id: 'rel2', name: 'Winter schedule changes', when: '1 Dec, 06:00 UTC', items: 212, markets: 8, status: 'In progress', ready: 88 },
  { id: 'rel3', name: 'Osaka route launch', when: '12 Jan 2027, 09:00 JST', items: 19, markets: 3, status: 'In progress', ready: 42 },
  { id: 'rel4', name: 'Baggage policy update', when: '4 Nov, 08:00 UTC', items: 9, markets: 8, status: 'Published', ready: 100 },
]

export const AUDIT = [
  ['09:42:07', 'Daniel Okafor', 'Published alert', 'Heavy snow at London Heathrow', 'Fast-path, severity 1 · 5 channels'],
  ['09:38:51', 'Altitude AI', 'Drafted translation', 'Summer sale: Europe from £49 · ar-AE', 'Model: customer key · awaiting human review'],
  ['09:31:20', 'Priya Raman', 'Moved to Legal review', 'Summer sale: Europe from £49', 'Fare claim detected · legal step mandatory'],
  ['09:12:44', 'Hannah Lindqvist', 'Changed freshness rule', 'Routes and fares · United Kingdom', 'Max fare age 12 h → 6 h'],
  ['08:55:02', 'Mei Tanaka', 'Approved', 'Delayed or cancelled flights: your rights · en-GB', 'Four-eyes satisfied'],
  ['08:40:19', 'Lucas Ferreira', 'Created API token', 'web-frontend-staging', 'Scope: delivery, preview · expires in 90 days'],
  ['08:02:33', 'System', 'Blocked publish', 'Homepage · hero image', 'Asset rights expired: family-boarding.jpg'],
  ['Yesterday 17:20', 'Tomas Keller', 'Sent to translation', '12 entries · de-DE, fr-FR', 'Agency connector · est. €418'],
]

export const ROLES = [
  { name: 'Content lead', users: 4, perms: ['Create', 'Edit', 'Approve', 'Publish'], scope: 'All types · all markets' },
  { name: 'Market manager', users: 21, perms: ['Create', 'Edit', 'Translate'], scope: 'Own market · market overrides only' },
  { name: 'Duty manager', users: 12, perms: ['Create', 'Publish'], scope: 'Travel alerts only · fast-path' },
  { name: 'Legal reviewer', users: 5, perms: ['Comment', 'Approve'], scope: 'Legal review stage · all markets' },
  { name: 'Revenue analyst', users: 6, perms: ['Edit', 'Bulk rules'], scope: 'Routes and fares' },
  { name: 'Developer', users: 9, perms: ['Schema', 'Tokens', 'Webhooks'], scope: 'Development and Staging' },
  { name: 'Agency contributor', users: 14, perms: ['Create', 'Edit'], scope: 'Assigned campaigns · no publish' },
]

export const blankContent = (e) => ({
  heroTitle: e.title,
  heroSubtitle: e.type === 'Promotion'
    ? 'Book by 30 November for travel between January and March. Limited seats, price includes taxes and one cabin bag.'
    : 'Everything you need to know before you fly with Meridian Air.',
  cta: e.type === 'Promotion' ? 'Search flights' : 'Find out more',
  body: 'Fly direct from London and Manchester to more than 60 destinations. Change your dates free of charge up to 7 days before departure.',
  fareFrom: e.type === 'Promotion' ? '49' : '',
  slug: e.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
})

export const SAMPLE_TRANSLATIONS = {
  'de-DE': { heroTitle: 'Sommer-Sale: Europa ab 49 £', heroSubtitle: 'Bis 30. November buchen, zwischen Januar und März reisen. Begrenzte Plätze, Preis inklusive Steuern und Handgepäck.', cta: 'Flüge suchen', body: 'Fliegen Sie direkt ab London und Manchester zu mehr als 60 Zielen. Kostenlose Umbuchung bis 7 Tage vor Abflug.' },
  'fr-FR': { heroTitle: 'Soldes d’été : l’Europe dès 49 £', heroSubtitle: 'Réservez avant le 30 novembre pour voyager entre janvier et mars. Places limitées, taxes et bagage cabine inclus.', cta: 'Rechercher des vols', body: 'Volez sans escale depuis Londres et Manchester vers plus de 60 destinations. Modification gratuite jusqu’à 7 jours avant le départ.' },
  'ar-AE': { heroTitle: 'عروض الصيف: أوروبا ابتداءً من 49 جنيهاً', heroSubtitle: 'احجز قبل 30 نوفمبر للسفر بين يناير ومارس. المقاعد محدودة والسعر يشمل الضرائب وحقيبة مقصورة واحدة.', cta: 'ابحث عن رحلات', body: 'سافر مباشرة من لندن ومانشستر إلى أكثر من 60 وجهة. غيّر تواريخ سفرك مجاناً حتى 7 أيام قبل المغادرة.' },
}
