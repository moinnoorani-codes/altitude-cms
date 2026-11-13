import { useState } from 'react'
import { Badge, Btn, Card, PageHead, Tabs, useApp } from '../ui.jsx'
import { RELEASES, STAGES } from '../data.js'
import { STAGE_ACTIONS, api } from '../api.js'

export default function Releases() {
  const { nav, run, toast, entries, reloadEntries } = useApp()
  const [tab, setTab] = useState('Board')

  const act = async (e, action, label) => {
    if (await run(() => api(`/entries/${e.id}/transition`, { method: 'POST', body: { action } }), `“${e.title}”: ${label.toLowerCase()}`)) await reloadEntries()
  }

  return (
    <div className="page">
      <PageHead title="Workflow" />
      <Tabs tabs={['Board', 'Releases']} value={tab} onChange={setTab} />

      {tab === 'Board' && (
        <div className="kanban">
          {STAGES.map((s) => {
            const list = entries.filter((e) => e.stage === s)
            return (
              <div key={s} className="lane">
                <div className="spread"><h3>{s}</h3><span className="faint num">{list.length}</span></div>
                {list.map((e) => (
                  <div key={e.id} className="ticket">
                    <a href="#" onClick={(ev) => { ev.preventDefault(); nav('editor', { id: e.id }) }} style={{ fontWeight: 500 }}>{e.title}</a>
                    <span className="faint" style={{ fontSize: 12 }}>{e.type} · {e.author}</span>
                    <div className="row wrap">
                      {(STAGE_ACTIONS[s] || []).map(([action, label], i) => <Btn key={action} size="sm" kind={i ? 'ghost' : ''} onClick={() => act(e, action, label)}>{label}</Btn>)}
                    </div>
                  </div>
                ))}
                {list.length === 0 && <span className="faint" style={{ fontSize: 12.5 }}>Empty</span>}
              </div>
            )
          })}
        </div>
      )}

      {tab === 'Releases' && (
        <>
          <div className="banner">Sample data. Bundled releases are not built on the server yet.</div>
          <Card flush>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Release</th><th>Goes live</th><th className="r">Items</th><th className="r">Markets</th><th className="r">Ready</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {RELEASES.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>{r.name}</td>
                      <td className="muted">{r.when}</td>
                      <td className="r num">{r.items}</td>
                      <td className="r num">{r.markets}</td>
                      <td className="r num">{r.ready}%</td>
                      <td><Badge tone={r.status === 'Published' ? 'good' : r.status === 'Scheduled' ? 'info' : 'warn'}>{r.status}</Badge></td>
                      <td className="r"><Btn size="sm" kind="ghost" onClick={() => toast('Releases are sample data for now')}>Open</Btn></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
