# Compliance status

What an airline will require of this product, what the code does about it today, and what is still open.
Checked on 13 Nov 2026. This is an engineering status, not legal advice: have counsel confirm which rules
apply to each customer and market before relying on it.

Two kinds of requirement are mixed together under "compliance":

- **Legal**: laws that apply to us as a supplier or to the airline using the product.
- **Contractual**: certifications airline procurement asks for. No law requires them, but deals stall without them.

Most of the second kind cannot be achieved by writing code. They need written policies, months of
operating evidence and an external auditor. The code can only provide the controls those audits look for.

## Legal requirements

| Requirement | Why it applies | In the product today | Still open |
| --- | --- | --- | --- |
| GDPR and UK GDPR (also CCPA, LGPD, PDPA) | We process personal data of the airline's staff as a processor | Only name, email and role are held. API tokens are stored hashed and expire (90 days by default). A person's data can be exported (`GET /v1/users/:id/export`) and erased (`POST /v1/users/:id/erase`). The audit log stores account ids, not names, so erasure leaves no personal data behind. | Data processing agreement, sub-processor list, record of processing, breach procedure (72-hour notification), retention period for the audit log, choice of hosting region per customer, encryption at rest (hosting) |
| Accessibility: European Accessibility Act (from 28 June 2025), US DOT 14 CFR 382.43 | Airline websites and apps must meet WCAG AA. Buyers also expect the tool their staff use to be accessible | Every admin screen passes automated WCAG 2.2 AA checks (axe-core) in light and dark themes: contrast, labels, names, roles | Manual audit with keyboard and screen reader (automated checks find only part of the issues), an accessibility conformance report, checks on the content editors produce (alt text, heading order) once assets exist |
| Fare advertising: US DOT full-fare rule (14 CFR 399.84), EU Regulation 1008/2008 Art. 23 | Advertised prices must be the total price. The airline is liable, and expects the tool to prevent mistakes | Promotions require legal review and a second person's approval before publishing. Every approval and publish is recorded | Automatic check for the price disclosure, per-market rule packs, live fare freshness (routes and fares is sample data) |
| Passenger rights information: EU261, UK261, Canada APPR | Airlines must publish this information accurately | Policy content requires legal review; published versions and who approved them are recorded | Rule packs, point-in-time view of what a page showed on a past date |
| ePrivacy and cookies | Applies to anything stored in the browser | The admin stores one item (the development user choice). No tracking, no analytics, no third-party requests; fonts are served from the app itself | Cookie and storage notice once real sign-in exists |

## Contractual requirements

| Requirement | Status | What the product provides | What it takes |
| --- | --- | --- | --- |
| SOC 2 Type II | Not started | Append-only audit log, role-based permissions, expiring hashed tokens, rate limiting, security headers, automated tests | Security policies, a compliance platform, 3 to 12 months of evidence, an audit firm |
| ISO 27001 | Not started | Same controls as above | An information security management system, risk register, internal audit, certification body |
| Penetration test | Not done | — | Independent test before the first production customer, then yearly |
| PCI DSS | Out of scope by design | The product never stores, processes or transmits card data | Keep it that way; state it in contracts |

## Security controls in the server

- Authentication on every management endpoint; the delivery API exposes only published content and live alerts.
- Tokens are random, shown once, stored as SHA-256 hashes, and expire.
- Demo users with public tokens are refused when `NODE_ENV=production`, and production requires a real database.
- Rate limiting per client address, with a tighter limit on repeated bad tokens.
- Security headers on every response; management responses are never cached.
- Request bodies are capped at 256 KB; all field values are validated against the content type.
- Every change is written to the audit log in the same transaction; the database rejects edits and deletes to the log.
- Four-eyes rule and mandatory legal review on flagged content types.

## Must be fixed before any production use

1. **Real sign-in.** SSO (SAML or OIDC) with MFA. The "Acting as" switcher in the admin and the demo tokens are for development only.
2. **Per-market permissions.** A market manager can currently edit any market.
3. **Deployment security.** TLS termination, `trustProxy` so rate limiting sees real client addresses, a shared rate limiter when running more than one instance, secrets management, encrypted database storage, backups with tested restore.
4. **Supply chain.** Dependency and secret scanning in CI.
5. **Monitoring.** Centralised logs, alerting, and an incident process.
6. **Manual accessibility audit** and a published conformance report.

## How to re-check

```bash
cd server && npm test
```

covers authentication, permissions, workflow rules, rate limiting, security headers, token expiry,
data export, erasure and the production guard. The accessibility check is run with axe-core against
every screen of the running admin in both themes.
