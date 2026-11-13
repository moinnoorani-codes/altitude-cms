# Altitude CMS — server

The first backend slice: content core (types, entries, locales, workflow, publishing, delivery),
the disruption centre (travel alerts) and an append-only audit log.

## Run

```bash
npm install
npm run dev
```

The server listens on http://127.0.0.1:8787. With no configuration it runs an embedded
Postgres (PGlite, in memory) and loads demo data, so nothing else needs installing.

| Variable | Effect |
| --- | --- |
| `DATABASE_URL` | Use a real PostgreSQL database instead of the embedded one |
| `PGLITE_DIR` | Persist the embedded database to this folder |
| `SEED_DEMO=1` | Load demo data into a `DATABASE_URL` database |
| `PORT`, `HOST` | Listen address (default `127.0.0.1:8787`) |

Requires Node 22.18 or newer (it runs TypeScript directly).

## Test

```bash
npm test
```

```bash
npm run typecheck
```

Set `DATABASE_URL` to run the same suite against real PostgreSQL.

## Authentication

Management endpoints need `Authorization: Bearer <token>`. The seed creates development
users with public tokens: `dev-priya` and `dev-hannah` (content lead), `dev-tomas` (market manager),
`dev-mei` (legal), `dev-daniel` (duty manager), `dev-lucas` (developer), `dev-admin`, `dev-viewer`.
**These are for local development only.** Never seed them into a production database.

## API

| Method and path | Purpose |
| --- | --- |
| `GET /v1/health` | Liveness |
| `GET /v1/me` | Current user and permissions |
| `GET /v1/locales` | Markets, languages and fallback chains |
| `GET /v1/types`, `PUT /v1/types/:id` | Content types and their fields |
| `GET /v1/entries`, `POST /v1/entries` | List (filters: `type`, `stage`, `search`) and create |
| `GET /v1/entries/:id` | Entry with every locale and translation status |
| `PUT /v1/entries/:id/locales/:locale` | Save one locale's field values |
| `POST /v1/entries/:id/locales/:locale/status` | Mark a translation `progress`, `review` or `current` |
| `POST /v1/entries/:id/transition` | `submit`, `approve`, `legal_approve`, `reject`, `publish`, `unpublish` |
| `GET /v1/entries/:id/versions` | Version history |
| `GET /v1/alert-templates`, `GET /v1/alerts` | Templates and alerts |
| `POST /v1/alerts`, `POST /v1/alerts/:id/end` | Publish and end a travel alert |
| `GET /v1/audit` | Audit log, newest first |
| `GET /v1/delivery/entries`, `/v1/delivery/entries/:slug` | Public: published content for `?locale=` with fallback |
| `GET /v1/delivery/alerts` | Public: live alerts, optionally for `?airport=` |

## Rules the server enforces

- Field values are checked against the content type; shared fields can only change in the source locale.
- Editing the source marks translations stale and returns the entry to Draft. The published version stays live until republished.
- Types flagged `requiresLegal` must pass legal review, and the author cannot approve their own change.
- Publishing needs every required field; only current translations go live, other locales fall back.
- Every alert needs an expiry (at most 7 days). Expiry is computed from the clock, with no background job.
- Every change writes to the audit log in the same transaction. The log rejects updates and deletes.

## Not built yet

SSO and real user management, per-market permission scoping, assets, releases and branches,
real channel connectors for alerts (hand-offs are recorded as queued), routes and fares, search,
webhooks, CDN caching, rate limiting.
