import { useState } from 'react'
import { Badge, Btn, Card, Field, Modal, PageHead, useApp } from '../ui.jsx'
import { CHANNELS } from '../data.js'
import { api } from '../api.js'

const SEV_TONE = { 1: 'crit', 2: 'warn', 3: 'info' }

export default function Disruption({ params }) {
  const { run, alerts, templates, reloadAlerts } = useApp()
  const [open, setOpen] = useState(!!params.compose)
  const [show, setShow] = useState('Live')
  const blank = { tpl: templates[0]?.id, sev: templates[0]?.sev ?? 1, airport: 'LHR', title: '', body: '', channels: ['Web banner', 'App', 'Email'], hours: 12 }
  const [f, setF] = useState(blank)

  const tpl = templates.find((t) => t.id === f.tpl) || templates[0]
  const airports = f.airport.split(/[\s,]+/).filter(Boolean)
  const fill = (s) => s.replaceAll('{airport}', airports.join(', ') || 'the airport')
  const title = f.title || fill(tpl.title)
  const body = f.body || fill(tpl.body)
  const rows = alerts.filter((a) => show === 'All' || a.status === show)
  const live = alerts.filter((a) => a.status === 'Live')

  const pickTpl = (id) => { const t = templates.find((x) => x.id === id); setF({ ...f, tpl: id, sev: t.sev, title: '', body: '' }) }
  const toggleCh = (c) => setF({ ...f, channels: f.channels.includes(c) ? f.channels.filter((x) => x !== c) : [...f.channels, c] })
  const publish = async () => {
    const made = await run(() => api('/alerts', { method: 'POST', body: { templateId: tpl.id, severity: f.sev, title, body, airports, channels: f.channels, expiresInHours: f.hours } }))
    if (!made) return
    await reloadAlerts()
    setOpen(false)
    setF(blank)
  }
  const end = async (id) => { if (await run(() => api(`/alerts/${id}/end`, { method: 'POST' }), 'Alert ended')) await reloadAlerts() }

  return (
    <div className="page">
      <PageHead title="Disruption centre">
        <Btn kind="danger" onClick={() => setOpen(true)}>New travel alert</Btn>
      </PageHead>

      <div className="figs">
        <div className="stat" style={{ cursor: 'default' }}><span className="label">Live</span><span className="value">{live.length}</span><span className="hint">{live.filter((a) => a.sev === 1).length} severity 1</span></div>
        <div className="stat" style={{ cursor: 'default' }}><span className="label">Airports affected</span><span className="value">{new Set(live.flatMap((a) => a.scope.split(' · ')[0].split(', '))).size}</span><span className="hint">with a live alert</span></div>
        <div className="stat" style={{ cursor: 'default' }}><span className="label">Ended or expired</span><span className="value">{alerts.length - live.length}</span><span className="hint">kept for the record</span></div>
      </div>

      <div className="row">
        {['Live', 'Expired', 'All'].map((s) => <button key={s} className={`chip ${show === s ? 'on' : ''}`} onClick={() => setShow(s)}>{s}</button>)}
        <span className="grow" />
        <span className="note">Channel hand-offs are recorded as queued; no email, SMS or app provider is connected yet.</span>
      </div>

      <Card flush>
        {rows.length === 0 ? <div className="empty">No alerts in this view.</div> : (
          <div className="table-wrap"><table>
            <thead><tr><th style={{ width: 3, padding: 0 }} /><th>Alert</th><th>Scope</th><th>Channels</th><th>Published</th><th>Expires</th><th /></tr></thead>
            <tbody>{rows.map((a) => (
              <tr key={a.id}>
                <td style={{ padding: 0 }}><div className={`sev s${a.sev}`} style={{ height: 36 }} /></td>
                <td><span style={{ fontWeight: 500 }}>{a.title}</span><div><Badge tone={a.status === 'Live' ? SEV_TONE[a.sev] : ''}>{a.status === 'Live' ? `Live, severity ${a.sev}` : 'Ended'}</Badge></div></td>
                <td className="mono">{a.scope.split(' · ')[0]}</td>
                <td className="muted">{a.channels.join(', ')}</td>
                <td className="muted">{a.published}<div className="faint">{a.by}</div></td>
                <td className="muted">{a.expires}</td>
                <td className="r">{a.status === 'Live' && <Btn size="sm" onClick={() => end(a.id)}>End alert</Btn>}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </Card>

      {open && (
        <Modal wide title="New travel alert" onClose={() => setOpen(false)}
          footer={<><span className="grow faint" style={{ alignSelf: 'center' }}>Goes live immediately and is written to the audit log.</span><Btn onClick={() => setOpen(false)}>Cancel</Btn><Btn kind="danger" disabled={!f.channels.length} onClick={publish}>Publish to {f.channels.length} channels</Btn></>}>
          <div className="grid g2">
            <div className="col" style={{ gap: 14 }}>
              <Field label="Template">
                <select className="select" value={tpl.id} onChange={(e) => pickTpl(e.target.value)}>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
              </Field>
              <div className="grid g2">
                <Field label="Airports" help="IATA codes. Leave empty for all."><input className="input mono" value={f.airport} onChange={(e) => setF({ ...f, airport: e.target.value.toUpperCase() })} /></Field>
                <Field label="Expires after" help="Required. 7 days at most."><select className="select" value={f.hours} onChange={(e) => setF({ ...f, hours: Number(e.target.value) })}>{[6, 12, 24, 48, 72, 168].map((h) => <option key={h} value={h}>{h} hours</option>)}</select></Field>
              </div>
              <Field label="Severity">
                <div className="row">{[1, 2, 3].map((s) => <button key={s} className={`chip ${f.sev === s ? 'on' : ''}`} onClick={() => setF({ ...f, sev: s })}>{s}</button>)}</div>
              </Field>
              <Field label="Headline"><input className="input" value={title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
              <Field label="Message"><textarea className="textarea" rows={5} value={body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
            </div>
            <div className="col" style={{ gap: 14 }}>
              <Field label="Channels">
                <div className="row wrap">{CHANNELS.map((c) => <button key={c} className={`chip ${f.channels.includes(c) ? 'on' : ''}`} onClick={() => toggleCh(c)}>{c}</button>)}</div>
              </Field>
              <Field label="As it appears on the website">
                <div style={{ border: '1px solid var(--line)', borderRadius: 2, overflow: 'hidden' }}>
                  <div className="site-alert">{title}</div>
                  <div className="site-body">{body}</div>
                </div>
              </Field>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
