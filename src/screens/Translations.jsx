import { useState } from 'react'
import { Btn, Card, PageHead, useApp } from '../ui.jsx'
import { LOCALES } from '../data.js'
import { api } from '../api.js'

const LABEL = { current: 'ok', stale: 'stale', missing: 'missing', progress: 'sent', review: 'review' }
const LEGEND = [['var(--line-2)', 'ok: current'], ['var(--amber)', 'stale: source changed since'], ['var(--red)', 'missing'], ['var(--blue)', 'sent to translator or awaiting review']]

export default function Translations() {
  const { nav, toast, entries, reloadEntries, setLocale } = useApp()
  const [sel, setSel] = useState([]) // "entryId|locale"
  const [only, setOnly] = useState(true)
  const [busy, setBusy] = useState(false)
  const targets = LOCALES.filter((l) => l.code !== 'en-GB')

  const rows = entries.filter((e) => !only || targets.some((l) => e.l10n[l.code] !== 'current'))
  const all = entries.flatMap((e) => targets.map((l) => e.l10n[l.code]))
  const count = (...s) => all.filter((x) => s.includes(x)).length
  const key = (e, l) => `${e.id}|${l}`
  const toggle = (k) => setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))
  const selectGaps = () => setSel(entries.flatMap((e) => targets.filter((l) => ['missing', 'stale'].includes(e.l10n[l.code])).map((l) => key(e, l.code))))

  const apply = async (status, done) => {
    setBusy(true)
    const results = await Promise.allSettled(sel.map((k) => { const [id, l] = k.split('|'); return api(`/entries/${id}/locales/${l}/status`, { method: 'POST', body: { status } }) }))
    const failed = results.filter((r) => r.status === 'rejected')
    await reloadEntries()
    setBusy(false)
    setSel([])
    if (failed.length) toast(`${results.length - failed.length} ${done}, ${failed.length} refused: ${failed[0].reason.message}`, true)
    else toast(`${results.length} ${done}`)
  }

  return (
    <div className="page">
      <PageHead title="Translations">
        <Btn onClick={selectGaps}>Select all gaps</Btn>
        <Btn disabled={!sel.length || busy} onClick={() => apply('current', 'approved as current')}>Approve as current</Btn>
        <Btn kind="primary" disabled={!sel.length || busy} onClick={() => apply('progress', 'sent to translation')}>Send to translation{sel.length ? ` (${sel.length})` : ''}</Btn>
      </PageHead>

      <div className="figs">
        <div className="stat" style={{ cursor: 'default' }}><span className="label">Current</span><span className="value">{count('current')}</span><span className="hint">of {all.length} market versions</span></div>
        <div className="stat" style={{ cursor: 'default' }}><span className="label">Missing</span><span className="value" style={{ color: count('missing') ? 'var(--red)' : undefined }}>{count('missing')}</span><span className="hint">site shows English</span></div>
        <div className="stat" style={{ cursor: 'default' }}><span className="label">Stale</span><span className="value" style={{ color: count('stale') ? 'var(--amber)' : undefined }}>{count('stale')}</span><span className="hint">source changed since</span></div>
        <div className="stat" style={{ cursor: 'default' }}><span className="label">In progress</span><span className="value">{count('progress', 'review')}</span><span className="hint">with translator or in review</span></div>
      </div>

      <div className="toolbar">
        <label className="row"><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} /> Only entries with gaps</label>
        <span className="faint">Click cells to select. Double-click to open that market in the editor.</span>
        <div className="grow" />
        {sel.length > 0 && <Btn size="sm" kind="ghost" onClick={() => setSel([])}>Clear selection</Btn>}
      </div>

      <Card flush>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Entry</th>{targets.map((l) => <th key={l.code} title={l.market} style={{ textAlign: 'center' }}>{l.code}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td style={{ minWidth: 220 }}>
                    <a href="#" onClick={(ev) => { ev.preventDefault(); nav('editor', { id: e.id }) }} style={{ fontWeight: 500 }}>{e.title}</a>
                    <span className="faint"> · {e.type}</span>
                  </td>
                  {targets.map((l) => {
                    const s = e.l10n[l.code], k = key(e, l.code)
                    return (
                      <td key={l.code} style={{ padding: '3px 4px' }}>
                        <button className={`cell ${s} ${sel.includes(k) ? 'sel' : ''}`} aria-pressed={sel.includes(k)} aria-label={`${LABEL[s]}: ${e.title}, ${l.market}`}
                          onClick={() => toggle(k)} onDoubleClick={() => { setLocale(l.code); nav('editor', { id: e.id }) }}>{LABEL[s]}</button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="empty">Every entry is current in every market.</div>}
        </div>
      </Card>

      <div className="row wrap faint" style={{ fontSize: 12, gap: 16 }}>
        {LEGEND.map(([c, label]) => <span key={label} className="row" style={{ gap: 6 }}><span className="swatch" style={{ background: c }} />{label}</span>)}
      </div>
    </div>
  )
}
