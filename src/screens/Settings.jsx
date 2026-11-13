import { useState } from 'react'
import { Badge, Btn, Card, Field, PageHead, Switch, Tabs, useApp } from '../ui.jsx'
import { BRANDS, ENVS } from '../data.js'

const TOKENS = [
  ['web-frontend-production', 'Delivery', 'Never', '2 min ago'],
  ['web-frontend-staging', 'Delivery, Preview', 'In 90 days', '1 h ago'],
  ['mobile-app', 'Delivery', 'In 240 days', '4 min ago'],
  ['fare-feed-push', 'Fare push API', 'In 30 days', '12 s ago'],
  ['kiosk-edge-sync', 'Edge sync', 'In 180 days', '6 min ago'],
]

export default function Settings() {
  const { toast, brand } = useApp()
  const [tab, setTab] = useState('Organisation')
  const [sec, setSec] = useState({ sso: true, scim: true, mfa: true, ip: false, byok: false, fourEyes: true })
  const [ai, setAi] = useState({ provider: 'Anthropic (customer key)', publish: false, log: true })
  const flip = (k) => setSec((s) => ({ ...s, [k]: !s[k] }))
  const SEC = [
    ['sso', 'Single sign-on (SAML, OIDC)', 'Included on every paid plan'],
    ['scim', 'SCIM provisioning', 'Users and teams synced from the identity provider'],
    ['mfa', 'Require multi-factor authentication', 'Applies to accounts outside SSO'],
    ['fourEyes', 'Four-eyes rule on flagged types', 'Authors cannot approve their own fare, policy or legal changes'],
    ['ip', 'IP allow-list for the admin', 'Restrict access to office and VPN ranges'],
    ['byok', 'Customer-managed encryption keys', 'Bring your own key from AWS KMS, Azure Key Vault or GCP KMS'],
  ]

  return (
    <div className="page">
      <PageHead title="Settings" sub={`Organisation: Meridian Aviation Group · current brand: ${brand}`} />
      <div className="banner">Sample data. This screen is not connected to the server yet.</div>
      <Tabs tabs={['Organisation', 'API tokens', 'Security', 'AI', 'Plan']} value={tab} onChange={setTab} />

      {tab === 'Organisation' && (
        <div className="grid g2">
          <Card title="Brands" flush><div className="list">{BRANDS.map((b) => <div key={b}><b className="grow">{b}</b><Badge tone="good">Active</Badge></div>)}</div></Card>
          <Card title="Environments" flush><div className="list">{ENVS.map((e, i) => <div key={e}><b className="grow">{e}</b><span className="faint">{['eu-west · London', 'eu-west · London', 'eu-west · London'][i]}</span>{i > 0 && <Btn size="sm" onClick={() => toast(`${e} promoted to ${ENVS[i - 1]}`)}>Promote</Btn>}</div>)}</div></Card>
          <Card title="Data residency"><div className="col"><Field label="Primary region" help="Content and assets never leave the selected region without consent."><select className="select" defaultValue="United Kingdom (London)">{['United Kingdom (London)', 'European Union (Frankfurt)', 'United States (Virginia)', 'United Arab Emirates (Dubai)', 'India (Mumbai)', 'Singapore', 'Australia (Sydney)'].map((r) => <option key={r}>{r}</option>)}</select></Field></div></Card>
          <Card title="Export and exit"><div className="col"><p className="muted">Download all content, assets, history and configuration in open formats at any time.</p><div><Btn onClick={() => toast('Full export queued. You will get a download link by email.')}>Request full export</Btn></div></div></Card>
        </div>
      )}

      {tab === 'API tokens' && (
        <Card flush title="API tokens" action={<Btn size="sm" icon="plus" onClick={() => toast('Token created. Copy it now, it will not be shown again.')}>New token</Btn>}>
          <div className="table-wrap"><table>
            <thead><tr><th>Name</th><th>Scope</th><th>Expires</th><th>Last used</th><th /></tr></thead>
            <tbody>{TOKENS.map((t) => <tr key={t[0]}><td className="mono" style={{ fontWeight: 600 }}>{t[0]}</td><td>{t[1]}</td><td className="muted">{t[2]}</td><td className="faint">{t[3]}</td><td className="r"><Btn size="sm" kind="ghost" onClick={() => toast(`${t[0]} rotated`)}>Rotate</Btn></td></tr>)}</tbody>
          </table></div>
        </Card>
      )}

      {tab === 'Security' && (
        <Card flush title="Security policies">
          <div className="list">{SEC.map(([k, label, help]) => (
            <div key={k}><div className="grow"><b>{label}</b><div className="faint" style={{ fontSize: 12.5 }}>{help}</div></div><Switch label={label} on={sec[k]} onChange={() => flip(k)} /></div>
          ))}</div>
        </Card>
      )}

      {tab === 'AI' && (
        <Card title="AI gateway">
          <div className="col" style={{ gap: 14, maxWidth: 560 }}>
            <Field label="Model provider" help="Your content is never used for training. Keys stay in your tenant.">
              <select className="select" value={ai.provider} onChange={(e) => setAi({ ...ai, provider: e.target.value })}>{['Anthropic (customer key)', 'Azure OpenAI (customer key)', 'Amazon Bedrock', 'Google Vertex AI', 'Self-hosted model'].map((p) => <option key={p}>{p}</option>)}</select>
            </Field>
            <div className="spread"><div><b>Allow AI to publish without human approval</b><div className="faint" style={{ fontSize: 12.5 }}>Off by default. Every AI output enters the normal workflow as a draft.</div></div><Switch label="Autonomous publish" on={ai.publish} onChange={(v) => setAi({ ...ai, publish: v })} /></div>
            <div className="spread"><div><b>Log every AI action to the audit log</b><div className="faint" style={{ fontSize: 12.5 }}>Model, prompt reference and approver are recorded.</div></div><Switch label="AI audit" on={ai.log} onChange={(v) => setAi({ ...ai, log: v })} /></div>
          </div>
        </Card>
      )}

      {tab === 'Plan' && (
        <div className="figs" style={{ flexWrap: 'wrap' }}>
          {[['Editor seats', 'Unlimited', '73 active'], ['Locales', 'Unlimited', '8 live'], ['Custom roles', 'Unlimited', '7 defined'], ['Cached delivery', 'Unmetered', '412 M requests this month'], ['Origin requests', 'Fair use', '3% of allowance'], ['AI assistance', 'Included', '18% of fair-use allowance']].map(([a, b, c]) => (
            <div key={a} className="card stat" style={{ cursor: 'default' }}><span className="label">{a}</span><span className="value" style={{ fontSize: 22 }}>{b}</span><span className="hint">{c}</span></div>
          ))}
        </div>
      )}
    </div>
  )
}
