import { useState } from 'react'
import { Avatar, Btn, Card, Field, Modal, PageHead, StageBadge, useApp } from '../ui.jsx'
import { LOCALES, STAGES, TYPES, USERS } from '../data.js'

export default function Content() {
  const { nav, toast, entries, setEntries } = useApp()
  const [q, setQ] = useState('')
  const [type, setType] = useState('All types')
  const [stage, setStage] = useState('All stages')
  const [picked, setPicked] = useState([])
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ title: '', type: 'Promotion' })

  const types = ['All types', ...new Set(entries.map((e) => e.type))]
  const rows = entries.filter((e) =>
    (type === 'All types' || e.type === type) &&
    (stage === 'All stages' || e.stage === stage) &&
    e.title.toLowerCase().includes(q.toLowerCase()))
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const coverage = (e) => Object.values(e.l10n).filter((v) => v === 'current').length

  const bulk = (to) => {
    setEntries((es) => es.map((e) => (picked.includes(e.id) ? { ...e, stage: to, updated: 'just now' } : e)))
    toast(`${picked.length} ${picked.length === 1 ? 'entry' : 'entries'} moved to ${to}`)
    setPicked([])
  }
  const create = () => {
    const id = `n${Date.now()}`
    const l10n = Object.fromEntries(LOCALES.map((l) => [l.code, l.code === 'en-GB' ? 'current' : 'missing']))
    setEntries((es) => [{ id, title: draft.title.trim(), type: draft.type, stage: 'Draft', author: 'u1', updated: 'just now', expires: null, l10n }, ...es])
    setCreating(false)
    setDraft({ title: '', type: 'Promotion' })
    nav('editor', { id })
  }

  return (
    <div className="page">
      <PageHead title="Content" sub="Every entry across types, markets and workflow stages. Select rows for bulk actions.">
        <Btn kind="primary" icon="plus" onClick={() => setCreating(true)}>New entry</Btn>
      </PageHead>

      <div className="toolbar">
        <input className="input" placeholder="Filter by title" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter by title" />
        <select className="select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Type">{types.map((t) => <option key={t}>{t}</option>)}</select>
        <select className="select" value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Stage">{['All stages', ...STAGES].map((t) => <option key={t}>{t}</option>)}</select>
        <span className="faint">{rows.length} of {entries.length}</span>
        <div className="grow" />
        {picked.length > 0 && (
          <>
            <span className="muted">{picked.length} selected</span>
            <Btn size="sm" onClick={() => bulk('In review')}>Send to review</Btn>
            <Btn size="sm" onClick={() => bulk('Published')}>Publish</Btn>
            <Btn size="sm" kind="ghost" onClick={() => setPicked([])}>Clear</Btn>
          </>
        )}
      </div>

      <Card flush>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}><input type="checkbox" aria-label="Select all" checked={rows.length > 0 && rows.every((r) => picked.includes(r.id))} onChange={(e) => setPicked(e.target.checked ? rows.map((r) => r.id) : [])} /></th>
                <th>Title</th><th>Type</th><th>Stage</th><th>Locales current</th><th>Owner</th><th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const u = USERS.find((x) => x.id === e.author)
                const c = coverage(e)
                return (
                  <tr key={e.id} className="click" onClick={() => nav('editor', { id: e.id })}>
                    <td onClick={(ev) => ev.stopPropagation()}><input type="checkbox" aria-label={`Select ${e.title}`} checked={picked.includes(e.id)} onChange={() => toggle(e.id)} /></td>
                    <td style={{ fontWeight: 600 }}>{e.title}{e.expires && <div className="faint" style={{ fontWeight: 400, fontSize: 12 }}>Expires {e.expires}</div>}</td>
                    <td className="muted">{e.type}</td>
                    <td><StageBadge stage={e.stage} /></td>
                    <td>
                      <div className="row">
                        <div className={`bar ${c === 8 ? 'good' : c >= 6 ? 'warn' : 'crit'}`} style={{ width: 70 }}><i style={{ width: `${(c / 8) * 100}%` }} /></div>
                        <span className="num faint">{c}/8</span>
                      </div>
                    </td>
                    <td><div className="row"><Avatar sm initials={u.initials} /><span className="muted">{u.name}</span></div></td>
                    <td className="faint">{e.updated}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 && <div className="empty">No entries match these filters.</div>}
        </div>
      </Card>

      {creating && (
        <Modal title="New entry" onClose={() => setCreating(false)} footer={<><Btn onClick={() => setCreating(false)}>Cancel</Btn><Btn kind="primary" disabled={!draft.title.trim()} onClick={create}>Create and open</Btn></>}>
          <Field label="Content type">
            <select className="select" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
              {TYPES.filter((t) => t.kind === 'Collection').map((t) => <option key={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Title" help="The source locale is English (United Kingdom). Other markets start as missing translations.">
            <input autoFocus className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && draft.title.trim() && create()} />
          </Field>
        </Modal>
      )}
    </div>
  )
}
