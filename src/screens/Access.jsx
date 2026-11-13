import { useEffect, useState } from 'react'
import { Avatar, Badge, Btn, Card, PageHead, Tabs, useApp } from '../ui.jsx'
import { AUDIT as MOCK_AUDIT, ROLES, USERS } from '../data.js'
import { api, toUiAudit } from '../api.js'

export default function Access({ params }) {
  const { toast, apiLive } = useApp()
  const [AUDIT, setAudit] = useState(MOCK_AUDIT)
  useEffect(() => {
    if (apiLive) api('/audit?limit=200').then((r) => setAudit(r.items.map(toUiAudit))).catch(() => {})
  }, [apiLive])
  const [tab, setTab] = useState(params.tab || 'Users')
  const [q, setQ] = useState('')
  const audit = AUDIT.filter((a) => a.join(' ').toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="page">
      <PageHead title="Users, roles and audit" sub="Unlimited seats and custom roles. Permissions scope by type, field, market, environment and workflow stage.">
        <Btn onClick={() => toast('Audit log exported to SIEM (CSV, 7-year retention)')}>Export audit log</Btn>
        <Btn kind="primary" icon="plus" onClick={() => toast('Invite sent. Users are provisioned from your identity provider via SCIM.')}>Invite user</Btn>
      </PageHead>
      <Tabs tabs={['Users', 'Roles', 'Audit log']} value={tab} onChange={setTab} />

      {tab === 'Users' && (
        <Card flush>
          <div className="table-wrap"><table>
            <thead><tr><th>User</th><th>Role</th><th>Scope</th><th>Team</th><th>MFA</th><th>Last active</th></tr></thead>
            <tbody>{USERS.map((u) => (
              <tr key={u.id}>
                <td><div className="row"><Avatar sm initials={u.initials} /><b>{u.name}</b></div></td>
                <td>{u.role}</td><td className="muted">{u.scope}</td><td className="muted">{u.team}</td>
                <td><Badge tone={u.mfa ? 'good' : 'warn'}>{u.mfa ? 'On' : 'Pending'}</Badge></td>
                <td className="faint">{u.last}</td>
              </tr>))}</tbody>
          </table></div>
        </Card>
      )}

      {tab === 'Roles' && (
        <Card flush>
          <div className="table-wrap"><table>
            <thead><tr><th>Role</th><th className="r">Users</th><th>Permissions</th><th>Scope</th></tr></thead>
            <tbody>{ROLES.map((r) => (
              <tr key={r.name}>
                <td style={{ fontWeight: 600 }}>{r.name}</td><td className="r num">{r.users}</td>
                <td><div className="row wrap">{r.perms.map((p) => <Badge key={p} plain tone={p === 'Publish' || p === 'Approve' ? 'info' : ''}>{p}</Badge>)}</div></td>
                <td className="muted">{r.scope}</td>
              </tr>))}</tbody>
          </table></div>
        </Card>
      )}

      {tab === 'Audit log' && (
        <>
          <div className="toolbar"><input className="input" placeholder="Search actor, action or entry" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search audit log" /><span className="faint">Immutable · {audit.length} of {AUDIT.length} events shown</span></div>
          <Card flush>
            <div className="table-wrap"><table>
              <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Detail</th></tr></thead>
              <tbody>{audit.map((a, i) => (
                <tr key={i}>
                  <td className="mono faint">{a[0]}</td>
                  <td><b>{a[1]}</b>{a[1] === 'Altitude AI' && <> <Badge tone="violet" plain>AI</Badge></>}</td>
                  <td>{a[2]}</td><td>{a[3]}</td><td className="muted">{a[4]}</td>
                </tr>))}</tbody>
            </table></div>
            {audit.length === 0 && <div className="empty">No events match.</div>}
          </Card>
        </>
      )}
    </div>
  )
}
