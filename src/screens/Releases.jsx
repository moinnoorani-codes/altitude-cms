import { useState } from 'react'
import { Avatar, Badge, Btn, Card, PageHead, Tabs, useApp } from '../ui.jsx'
import { RELEASES, STAGES, USERS } from '../data.js'

export default function Releases() {
  const { nav, toast, entries, setEntries } = useApp()
  const [tab, setTab] = useState('Board')
  const [releases, setReleases] = useState(RELEASES)

  const move = (e, dir) => {
    const next = STAGES[STAGES.indexOf(e.stage) + dir]
    setEntries((es) => es.map((x) => (x.id === e.id ? { ...x, stage: next, updated: 'just now' } : x)))
    toast(`“${e.title}” moved to ${next}`)
  }
  const publish = (id) => { setReleases((rs) => rs.map((r) => (r.id === id ? { ...r, status: 'Published', ready: 100, when: 'Published just now' } : r))); toast('Release published atomically to all markets. Rollback available for 30 days.') }

  return (
    <div className="page">
      <PageHead title="Workflow and releases" sub="Move entries through review, and bundle changes into releases that publish and roll back as one unit.">
        <Btn kind="primary" icon="plus" onClick={() => toast('New release created: “Untitled release”')}>New release</Btn>
      </PageHead>
      <Tabs tabs={['Board', 'Releases']} value={tab} onChange={setTab} />

      {tab === 'Board' && (
        <div className="kanban">
          {STAGES.map((s) => {
            const list = entries.filter((e) => e.stage === s)
            return (
              <div key={s} className="lane">
                <div className="spread"><h3>{s}</h3><span className="faint num">{list.length}</span></div>
                {list.slice(0, 6).map((e) => {
                  const u = USERS.find((x) => x.id === e.author), i = STAGES.indexOf(s)
                  return (
                    <div key={e.id} className="ticket">
                      <a href="#" onClick={(ev) => { ev.preventDefault(); nav('editor', { id: e.id }) }} style={{ color: 'var(--ink)', fontWeight: 600 }}>{e.title}</a>
                      <div className="spread"><span className="faint" style={{ fontSize: 12 }}>{e.type}</span><Avatar sm initials={u.initials} /></div>
                      <div className="row">
                        <Btn size="sm" kind="ghost" icon="left" aria-label="Move back" disabled={i === 0} onClick={() => move(e, -1)} />
                        <Btn size="sm" kind="ghost" icon="right" aria-label="Move forward" disabled={i === STAGES.length - 1} onClick={() => move(e, 1)} />
                        {s === 'Legal review' && <Badge tone="violet" plain>4-eyes</Badge>}
                      </div>
                    </div>
                  )
                })}
                {list.length > 6 && <span className="faint" style={{ fontSize: 12.5 }}>+{list.length - 6} more</span>}
                {list.length === 0 && <span className="faint" style={{ fontSize: 12.5 }}>Nothing here.</span>}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'Releases' && (
        <Card flush>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Release</th><th>Goes live</th><th className="r">Items</th><th className="r">Markets</th><th>Readiness</th><th>Status</th><th /></tr></thead>
              <tbody>
                {releases.map((r) => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.name}</td>
                    <td className="muted">{r.when}</td>
                    <td className="r num">{r.items}</td>
                    <td className="r num">{r.markets}</td>
                    <td><div className="row"><div className={`bar ${r.ready === 100 ? 'good' : ''}`} style={{ width: 90 }}><i style={{ width: `${r.ready}%` }} /></div><span className="num faint">{r.ready}%</span></div></td>
                    <td><Badge tone={r.status === 'Published' ? 'good' : r.status === 'Scheduled' ? 'info' : 'warn'}>{r.status}</Badge></td>
                    <td className="r">
                      {r.status === 'Published'
                        ? <Btn size="sm" onClick={() => toast(`“${r.name}” rolled back`)}>Roll back</Btn>
                        : <div className="row" style={{ justifyContent: 'flex-end' }}><Btn size="sm" kind="ghost" onClick={() => toast('Release preview opened as it will look at go-live time')}>Preview</Btn><Btn size="sm" onClick={() => publish(r.id)}>Publish now</Btn></div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
