import { Avatar, Badge, Btn, Card, Icon, PageHead, StageBadge, useApp } from '../ui.jsx'
import { AUDIT, LOCALES, RELEASES, USERS } from '../data.js'

export default function Dashboard() {
  const { nav, entries, alerts, routes, maxAge, brand } = useApp()
  const tasks = entries.filter((e) => e.stage === 'In review' || e.stage === 'Legal review')
  const live = alerts.filter((a) => a.status === 'Live')
  const cells = entries.flatMap((e) => Object.values(e.l10n))
  const coverage = Math.round((cells.filter((c) => c === 'current').length / cells.length) * 100)
  const stale = routes.filter((r) => r.status === 'Live' && r.age > maxAge).length
  const perLocale = LOCALES.map((l) => {
    const vals = entries.map((e) => e.l10n[l.code])
    return { ...l, pct: Math.round((vals.filter((v) => v === 'current').length / vals.length) * 100) }
  })

  return (
    <div className="page">
      <PageHead title="Good morning, Priya" sub={`${brand} · here is what needs attention across your markets today.`}>
        <Btn icon="alert" onClick={() => nav('disruption', { compose: true })}>New alert</Btn>
        <Btn kind="primary" icon="plus" onClick={() => nav('content')}>New entry</Btn>
      </PageHead>

      <div className="grid g4">
        <button className="card stat" onClick={() => nav('releases')}>
          <span className="label"><Icon name="check" /> Awaiting review</span>
          <span className="value">{tasks.length}</span>
          <span className="hint">{tasks.filter((t) => t.stage === 'Legal review').length} in legal review</span>
        </button>
        <button className="card stat" onClick={() => nav('disruption')}>
          <span className="label"><Icon name="alert" /> Live travel alerts</span>
          <span className="value" style={{ color: live.some((a) => a.sev === 1) ? 'var(--crit)' : undefined }}>{live.length}</span>
          <span className="hint">{live.filter((a) => a.sev === 1).length} severity 1</span>
        </button>
        <button className="card stat" onClick={() => nav('translations')}>
          <span className="label"><Icon name="globe" /> Translation coverage</span>
          <span className="value">{coverage}%</span>
          <span className="hint">{cells.filter((c) => c === 'stale').length} stale · {cells.filter((c) => c === 'missing').length} missing</span>
        </button>
        <button className="card stat" onClick={() => nav('fares')}>
          <span className="label"><Icon name="plane" /> Stale fare pages</span>
          <span className="value" style={{ color: stale ? 'var(--warn)' : undefined }}>{stale}</span>
          <span className="hint">older than {maxAge} h · of {routes.length} routes</span>
        </button>
      </div>

      {live.filter((a) => a.sev === 1).map((a) => (
        <div key={a.id} className="banner crit">
          <Icon name="alert" />
          <div className="grow"><b>{a.title}</b> · {a.scope} · live on {a.channels.length} channels since {a.published}, expires {a.expires}</div>
          <Btn size="sm" onClick={() => nav('disruption')}>Manage</Btn>
        </div>
      ))}

      <div className="grid g21">
        <Card title="My tasks" flush action={<Btn size="sm" kind="ghost" onClick={() => nav('releases')}>Open board</Btn>}>
          <div className="list">
            {tasks.map((e) => (
              <button key={e.id} className="item" onClick={() => nav('editor', { id: e.id })}>
                <Avatar sm initials={USERS.find((u) => u.id === e.author).initials} />
                <div className="grow">
                  <div className="truncate" style={{ fontWeight: 600 }}>{e.title}</div>
                  <div className="faint" style={{ fontSize: 12.5 }}>{e.type} · updated {e.updated}</div>
                </div>
                <StageBadge stage={e.stage} />
                <Icon name="right" />
              </button>
            ))}
          </div>
        </Card>

        <Card title="Coverage by market" action={<Btn size="sm" kind="ghost" onClick={() => nav('translations')}>Control tower</Btn>}>
          <div className="col" style={{ gap: 11 }}>
            {perLocale.map((l) => (
              <div key={l.code}>
                <div className="spread" style={{ fontSize: 12.5, marginBottom: 4 }}>
                  <span>{l.market} <span className="faint mono">{l.code}</span></span>
                  <span className="num">{l.pct}%</span>
                </div>
                <div className={`bar ${l.pct >= 90 ? 'good' : l.pct >= 75 ? 'warn' : 'crit'}`}><i style={{ width: `${l.pct}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid g2">
        <Card title="Upcoming releases" flush action={<Btn size="sm" kind="ghost" onClick={() => nav('releases')}>All releases</Btn>}>
          <div className="list">
            {RELEASES.filter((r) => r.status !== 'Published').map((r) => (
              <div key={r.id}>
                <Icon name="clock" />
                <div className="grow">
                  <div style={{ fontWeight: 600 }}>{r.name}</div>
                  <div className="faint" style={{ fontSize: 12.5 }}>{r.when} · {r.items} items · {r.markets} markets</div>
                </div>
                <div style={{ width: 90 }}>
                  <div className="bar"><i style={{ width: `${r.ready}%` }} /></div>
                  <div className="faint num" style={{ fontSize: 11.5, marginTop: 3 }}>{r.ready}% ready</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Recent activity" flush action={<Btn size="sm" kind="ghost" onClick={() => nav('access', { tab: 'Audit log' })}>Audit log</Btn>}>
          <div className="list">
            {AUDIT.slice(0, 5).map((a, i) => (
              <div key={i}>
                <span className="faint mono" style={{ width: 62 }}>{a[0].slice(0, 5)}</span>
                <div className="grow">
                  <div className="truncate"><b>{a[1]}</b> {a[2].toLowerCase()}</div>
                  <div className="faint truncate" style={{ fontSize: 12.5 }}>{a[3]}</div>
                </div>
                {a[1] === 'Altitude AI' && <Badge tone="violet" plain>AI</Badge>}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
