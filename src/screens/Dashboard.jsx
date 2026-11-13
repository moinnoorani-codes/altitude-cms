import { useEffect, useState } from 'react'
import { Badge, Btn, Card, PageHead, StageBadge, useApp } from '../ui.jsx'
import { LOCALES } from '../data.js'
import { api, toUiAudit } from '../api.js'

export default function Dashboard() {
  const { nav, entries, alerts, routes, maxAge } = useApp()
  const [audit, setAudit] = useState(null)
  useEffect(() => { api('/audit?limit=8').then((r) => setAudit(r.items.map(toUiAudit))).catch(() => setAudit(false)) }, [])

  const review = entries.filter((e) => ['In review', 'Legal review', 'Approved'].includes(e.stage))
  const live = alerts.filter((a) => a.status === 'Live')
  const targets = LOCALES.filter((l) => l.code !== 'en-GB')
  const gaps = targets.map((l) => ({
    ...l,
    missing: entries.filter((e) => e.l10n[l.code] === 'missing').length,
    stale: entries.filter((e) => e.l10n[l.code] === 'stale').length,
    open: entries.filter((e) => ['progress', 'review'].includes(e.l10n[l.code])).length,
  }))
  const totalGaps = gaps.reduce((n, g) => n + g.missing + g.stale, 0)
  const staleFares = routes.filter((r) => r.status === 'Live' && r.age > maxAge).length

  return (
    <div className="page">
      <PageHead title="Overview">
        <Btn onClick={() => nav('disruption', { compose: true })}>New alert</Btn>
        <Btn kind="primary" onClick={() => nav('content', { create: true })}>New entry</Btn>
      </PageHead>

      <div className="figs">
        <button className="stat" onClick={() => nav('releases')}><span className="label">In review</span><span className="value">{review.length}</span><span className="hint">{review.filter((e) => e.stage === 'Legal review').length} with legal</span></button>
        <button className="stat" onClick={() => nav('disruption')}><span className="label">Live alerts</span><span className="value" style={{ color: live.some((a) => a.sev === 1) ? 'var(--red)' : undefined }}>{live.length}</span><span className="hint">{live.filter((a) => a.sev === 1).length} severity 1</span></button>
        <button className="stat" onClick={() => nav('translations')}><span className="label">Translation gaps</span><span className="value">{totalGaps}</span><span className="hint">across {targets.length} markets</span></button>
        <button className="stat" onClick={() => nav('fares')}><span className="label">Stale fares</span><span className="value">{staleFares}</span><span className="hint">older than {maxAge} h · sample data</span></button>
      </div>

      <div className="grid g21">
        <Card title="Waiting on review" flush action={<Btn size="sm" kind="ghost" onClick={() => nav('releases')}>Workflow</Btn>}>
          {review.length === 0 ? <div className="empty">Nothing is waiting on review.</div> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Entry</th><th>Type</th><th>Stage</th><th>Owner</th><th>Updated</th></tr></thead>
              <tbody>{review.map((e) => (
                <tr key={e.id} className="click" onClick={() => nav('editor', { id: e.id })}>
                  <td style={{ fontWeight: 500 }}>{e.title}</td><td className="muted">{e.type}</td><td><StageBadge stage={e.stage} /></td><td className="muted">{e.author}</td><td className="faint">{e.updated}</td>
                </tr>))}</tbody>
            </table></div>
          )}
        </Card>

        <Card title="Gaps by market" flush action={<Btn size="sm" kind="ghost" onClick={() => nav('translations')}>Translations</Btn>}>
          <div className="table-wrap"><table>
            <thead><tr><th>Market</th><th className="r">Missing</th><th className="r">Stale</th><th className="r">In progress</th></tr></thead>
            <tbody>{gaps.map((g) => (
              <tr key={g.code}>
                <td>{g.market} <span className="mono faint">{g.code}</span></td>
                <td className="r num" style={{ color: g.missing ? 'var(--red)' : 'var(--ink-3)' }}>{g.missing}</td>
                <td className="r num" style={{ color: g.stale ? 'var(--amber)' : 'var(--ink-3)' }}>{g.stale}</td>
                <td className="r num faint">{g.open}</td>
              </tr>))}</tbody>
          </table></div>
        </Card>
      </div>

      <div className="grid g2">
        <Card title="Live alerts" flush action={<Btn size="sm" kind="ghost" onClick={() => nav('disruption')}>Disruption centre</Btn>}>
          {live.length === 0 ? <div className="empty">No live alerts.</div> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Alert</th><th>Scope</th><th>Expires</th></tr></thead>
              <tbody>{live.map((a) => (
                <tr key={a.id} className="click" onClick={() => nav('disruption')}>
                  <td><Badge tone={a.sev === 1 ? 'crit' : a.sev === 2 ? 'warn' : 'info'}>{a.title}</Badge></td><td className="muted">{a.scope.split(' · ')[0]}</td><td className="faint">{a.expires}</td>
                </tr>))}</tbody>
            </table></div>
          )}
        </Card>
        <Card title="Recent activity" flush action={audit && <Btn size="sm" kind="ghost" onClick={() => nav('access', { tab: 'Audit log' })}>Audit log</Btn>}>
          {audit === false ? <div className="empty">Your role cannot read the audit log.</div> : (
            <div className="table-wrap"><table>
              <tbody>{(audit || []).map((a, i) => (
                <tr key={i}><td className="mono faint" style={{ whiteSpace: 'nowrap' }}>{a[0]}</td><td>{a[1]}</td><td className="muted">{a[2]}</td><td className="truncate" style={{ maxWidth: 200 }}>{a[3]}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
      </div>
    </div>
  )
}
