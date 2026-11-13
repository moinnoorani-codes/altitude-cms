import { useState } from 'react'
import { Badge, Btn, Card, Field, Icon, Modal, PageHead, useApp } from '../ui.jsx'
import { CHANNELS, LOCALES } from '../data.js'
import { api } from '../api.js'

const SEV = { 1: ['crit', 'Severity 1 · single approver'], 2: ['warn', 'Severity 2 · one reviewer'], 3: ['info', 'Severity 3 · standard workflow'] }

export default function Disruption({ params }) {
  const { toast, alerts, setAlerts, apiLive, templates: ALERT_TEMPLATES, reloadAlerts } = useApp()
  const [open, setOpen] = useState(!!params.compose)
  const [show, setShow] = useState('Live')
  const blank = { tpl: ALERT_TEMPLATES[0].id, sev: 1, airport: 'LHR', title: '', body: '', channels: ['Web banner', 'App', 'Email'], hours: 12 }
  const [f, setF] = useState(blank)

  const tpl = ALERT_TEMPLATES.find((t) => t.id === f.tpl) || ALERT_TEMPLATES[0]
  const fill = (s) => s.replaceAll('{airport}', f.airport || 'the airport')
  const title = f.title || fill(tpl.title)
  const body = f.body || fill(tpl.body)
  const rows = alerts.filter((a) => show === 'All' || a.status === show)

  const pickTpl = (id) => { const t = ALERT_TEMPLATES.find((x) => x.id === id); setF({ ...f, tpl: id, sev: t.sev, title: '', body: '' }) }
  const toggleCh = (c) => setF({ ...f, channels: f.channels.includes(c) ? f.channels.filter((x) => x !== c) : [...f.channels, c] })
  const publish = async () => {
    if (apiLive) {
      try {
        const airports = f.airport.split(/[\s,]+/).filter(Boolean)
        const made = await api('/alerts', { method: 'POST', body: { templateId: tpl.id, severity: f.sev, title, body, airports, channels: f.channels, expiresInHours: f.hours } })
        await reloadAlerts()
        setOpen(false)
        setF(blank)
        toast(`Alert live on ${made.channels.length} channels · saved and audited by the API`)
      } catch (err) { toast(`Not published: ${err.message}`) }
      return
    }
    const now = new Date().toTimeString().slice(0, 5)
    setAlerts((as) => [{ id: `al${Date.now()}`, sev: f.sev, title, scope: `${f.airport} · all flights · today`, channels: f.channels, by: 'Priya Raman', published: now, expires: `in ${f.hours} h`, status: 'Live', reach: 'Calculating…' }, ...as])
    setOpen(false)
    setF(blank)
    toast(`Alert live on ${f.channels.length} channels in ${LOCALES.length} languages · 4.1 s`)
  }
  const end = async (id) => {
    if (apiLive) {
      try { await api(`/alerts/${id}/end`, { method: 'POST' }); await reloadAlerts(); toast('Alert ended and removed from all channels') } catch (err) { toast(`Not ended: ${err.message}`) }
      return
    }
    setAlerts((as) => as.map((a) => (a.id === id ? { ...a, status: 'Expired', expires: 'Ended manually' } : a)))
    toast('Alert ended and removed from all channels')
  }

  return (
    <div className="page">
      <PageHead title="Disruption centre" sub="Publish travel alerts to every channel in minutes. Templates are pre-approved and pre-translated; every alert must have an expiry.">
        <Btn kind="danger" icon="alert" onClick={() => setOpen(true)}>New travel alert</Btn>
      </PageHead>

      <div className="grid g3">
        <div className="card stat" style={{ cursor: 'default' }}><span className="label">Live alerts</span><span className="value">{alerts.filter((a) => a.status === 'Live').length}</span><span className="hint">across web, app, email, SMS, kiosks</span></div>
        <div className="card stat" style={{ cursor: 'default' }}><span className="label">Median time to publish</span><span className="value">1 min 48 s</span><span className="hint">target under 2 min for severity 1</span></div>
        <div className="card stat" style={{ cursor: 'default' }}><span className="label">Flight-status signal</span><span className="value" style={{ fontSize: 18, lineHeight: '34px' }}>62 delays at LHR</span><span className="hint">draft alert suggested automatically</span></div>
      </div>

      <div className="row">
        {['Live', 'Expired', 'All'].map((s) => <button key={s} className={`chip ${show === s ? 'on' : ''}`} onClick={() => setShow(s)}>{s}</button>)}
      </div>

      <Card flush>
        <div className="list">
          {rows.length === 0 && <div className="empty" style={{ display: 'block' }}>No alerts in this view.</div>}
          {rows.map((a) => (
            <div key={a.id} style={{ alignItems: 'stretch' }}>
              <span className={`sev s${a.sev}`} />
              <div className="grow col" style={{ gap: 6 }}>
                <div className="row wrap">
                  <b>{a.title}</b>
                  <Badge tone={a.status === 'Live' ? SEV[a.sev][0] : ''}>{a.status === 'Live' ? `Live · sev ${a.sev}` : 'Expired'}</Badge>
                </div>
                <div className="muted" style={{ fontSize: 12.5 }}>{a.scope} · {a.reach}</div>
                <div className="row wrap">{a.channels.map((c) => <Badge key={c} plain>{c}</Badge>)}</div>
                <div className="faint" style={{ fontSize: 12.5 }}>Published {a.published} by {a.by} · expires {a.expires}</div>
              </div>
              <div className="col" style={{ justifyContent: 'center' }}>
                {a.status === 'Live' && <Btn size="sm" onClick={() => end(a.id)}>End alert</Btn>}
                <Btn size="sm" kind="ghost" onClick={() => toast('Timeline report exported')}>Timeline</Btn>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {open && (
        <Modal wide title="New travel alert" onClose={() => setOpen(false)}
          footer={<><span className="grow muted" style={{ fontSize: 12.5, alignSelf: 'center' }}>{SEV[f.sev][1]}</span><Btn onClick={() => setOpen(false)}>Cancel</Btn><Btn kind="danger" icon="send" disabled={!f.channels.length || !f.airport} onClick={publish}>Publish to {f.channels.length} channels</Btn></>}>
          <div className="grid g2">
            <div className="col" style={{ gap: 14 }}>
              <Field label="Template" help="Pre-approved by Legal in all 8 languages.">
                <select className="select" value={tpl.id} onChange={(e) => pickTpl(e.target.value)}>{ALERT_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
              </Field>
              <div className="grid g2">
                <Field label="Airports (IATA)"><input className="input mono" value={f.airport} onChange={(e) => setF({ ...f, airport: e.target.value.toUpperCase() })} /></Field>
                <Field label="Expires after"><select className="select" value={f.hours} onChange={(e) => setF({ ...f, hours: Number(e.target.value) })}>{[6, 12, 24, 48, 72].map((h) => <option key={h} value={h}>{h} hours</option>)}</select></Field>
              </div>
              <Field label="Severity">
                <div className="row">{[1, 2, 3].map((s) => <button key={s} className={`chip ${f.sev === s ? 'on' : ''}`} onClick={() => setF({ ...f, sev: s })}>Sev {s}</button>)}</div>
              </Field>
              <Field label="Headline"><input className="input" value={title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
              <Field label="Message" help="Editing the text sends the changed sentences for instant AI translation and flags them for post-hoc review."><textarea className="textarea" value={body} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
            </div>
            <div className="col" style={{ gap: 14 }}>
              <Field label="Channels">
                <div className="row wrap">{CHANNELS.map((c) => <button key={c} className={`chip ${f.channels.includes(c) ? 'on' : ''}`} onClick={() => toggleCh(c)}>{c}</button>)}</div>
              </Field>
              <Field label="Preview · web banner">
                <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
                  <div className="site-alert">⚠ {title}</div>
                  <div className="site-body" style={{ background: '#fff' }}>{body}</div>
                </div>
              </Field>
              <div className="banner"><Icon name="shield" /><span>Targets passengers booked via {f.airport || '…'} today. Recorded in the audit log with channels, approver and expiry.</span></div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
