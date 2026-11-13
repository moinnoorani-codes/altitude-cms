import { useState } from 'react'
import { Btn, Card, Field, Modal, PageHead, StageBadge, useApp } from '../ui.jsx'
import { STAGES } from '../data.js'
import { api } from '../api.js'

export default function Content({ params }) {
  const { nav, toast, run, entries, types, reloadEntries } = useApp()
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [stage, setStage] = useState('')
  const [picked, setPicked] = useState([])
  const [creating, setCreating] = useState(!!params.create)
  const [draft, setDraft] = useState({ title: '', typeId: types[0]?.id || '' })
  const [busy, setBusy] = useState(false)

  const rows = entries.filter((e) => (!type || e.typeId === type) && (!stage || e.stage === stage) && e.title.toLowerCase().includes(q.toLowerCase()))
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const localeCount = (e) => Object.keys(e.l10n).length
  const current = (e) => Object.values(e.l10n).filter((v) => v === 'current').length

  // Bulk actions go through the same workflow rules as single ones; entries the server refuses are reported.
  const bulk = async (action, label) => {
    setBusy(true)
    const results = await Promise.allSettled(picked.map((id) => api(`/entries/${id}/transition`, { method: 'POST', body: { action } })))
    const failed = results.filter((r) => r.status === 'rejected')
    await reloadEntries()
    setBusy(false)
    setPicked([])
    if (failed.length) toast(`${results.length - failed.length} ${label}, ${failed.length} refused: ${failed[0].reason.message}`, true)
    else toast(`${results.length} ${label}`)
  }

  const create = async () => {
    const t = types.find((x) => x.id === draft.typeId)
    const fields = t.fields.some((f) => f.name === 'headline') ? { headline: draft.title.trim() } : {}
    const made = await run(() => api('/entries', { method: 'POST', body: { typeId: draft.typeId, title: draft.title.trim(), fields } }))
    if (!made) return
    await reloadEntries()
    nav('editor', { id: made.id })
  }

  return (
    <div className="page">
      <PageHead title="Content">
        <Btn kind="primary" onClick={() => setCreating(true)}>New entry</Btn>
      </PageHead>

      <div className="toolbar">
        <input className="input" placeholder="Filter by title" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter by title" />
        <select className="select" value={type} onChange={(e) => setType(e.target.value)} aria-label="Type"><option value="">All types</option>{types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <select className="select" value={stage} onChange={(e) => setStage(e.target.value)} aria-label="Stage"><option value="">All stages</option>{STAGES.map((t) => <option key={t}>{t}</option>)}</select>
        <span className="faint num">{rows.length} of {entries.length}</span>
        <div className="grow" />
        {picked.length > 0 && (
          <>
            <span className="muted">{picked.length} selected</span>
            <Btn size="sm" disabled={busy} onClick={() => bulk('submit', 'sent to review')}>Send to review</Btn>
            <Btn size="sm" disabled={busy} onClick={() => bulk('publish', 'published')}>Publish</Btn>
            <Btn size="sm" kind="ghost" onClick={() => setPicked([])}>Clear</Btn>
          </>
        )}
      </div>

      <Card flush>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 32 }}><input type="checkbox" aria-label="Select all" checked={rows.length > 0 && rows.every((r) => picked.includes(r.id))} onChange={(e) => setPicked(e.target.checked ? rows.map((r) => r.id) : [])} /></th>
                <th>Title</th><th>Type</th><th>Stage</th><th>Live</th><th className="r">Markets current</th><th>Owner</th><th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id} className="click" onClick={() => nav('editor', { id: e.id })}>
                  <td onClick={(ev) => ev.stopPropagation()}><input type="checkbox" aria-label={`Select ${e.title}`} checked={picked.includes(e.id)} onChange={() => toggle(e.id)} /></td>
                  <td style={{ fontWeight: 500 }}>{e.title} <span className="mono faint">/{e.slug}</span></td>
                  <td className="muted">{e.type}</td>
                  <td><StageBadge stage={e.stage} /></td>
                  <td className="muted">{e.published ? (e.stage === 'Published' ? 'Yes' : 'Yes, older version') : 'No'}</td>
                  <td className="r num" style={{ color: current(e) < localeCount(e) ? 'var(--amber)' : 'var(--ink-3)' }}>{current(e)}/{localeCount(e)}</td>
                  <td className="muted">{e.author}</td>
                  <td className="faint">{e.updated}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="empty">No entries match these filters.</div>}
        </div>
      </Card>

      {creating && (
        <Modal title="New entry" onClose={() => setCreating(false)} footer={<><Btn onClick={() => setCreating(false)}>Cancel</Btn><Btn kind="primary" disabled={!draft.title.trim()} onClick={create}>Create</Btn></>}>
          <Field label="Content type">
            <select className="select" value={draft.typeId} onChange={(e) => setDraft({ ...draft, typeId: e.target.value })}>
              {types.map((t) => <option key={t.id} value={t.id}>{t.name}{t.requiresLegal ? ' (legal review required)' : ''}</option>)}
            </select>
          </Field>
          <Field label="Title" help="Written in the source language, English (United Kingdom).">
            <input autoFocus className="input" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && draft.title.trim() && create()} />
          </Field>
        </Modal>
      )}
    </div>
  )
}
