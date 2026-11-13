import { useState } from 'react'
import { Btn, Card, PageHead, useApp } from '../ui.jsx'
import { LOCALES } from '../data.js'

const LABEL = { current: 'Current', stale: 'Stale', missing: 'Missing', progress: 'In transl.', review: 'In review' }
const LEGEND = [['current', 'Current'], ['stale', 'Stale: source changed'], ['missing', 'Missing'], ['progress', 'With translator'], ['review', 'Awaiting review']]

export default function Translations() {
  const { nav, toast, entries, setEntries, setLocale } = useApp()
  const [sel, setSel] = useState([]) // "entryId|locale"
  const [only, setOnly] = useState(false)
  const targets = LOCALES.filter((l) => l.code !== 'en-GB')

  const rows = entries.filter((e) => !only || targets.some((l) => e.l10n[l.code] !== 'current'))
  const all = entries.flatMap((e) => targets.map((l) => e.l10n[l.code]))
  const count = (s) => all.filter((x) => x === s).length
  const key = (e, l) => `${e.id}|${l}`
  const toggle = (k) => setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]))
  const selectGaps = () => setSel(entries.flatMap((e) => targets.filter((l) => ['missing', 'stale'].includes(e.l10n[l.code])).map((l) => key(e, l.code))))
  const apply = (to, msg) => {
    setEntries((es) => es.map((e) => {
      const l10n = { ...e.l10n }
      sel.forEach((k) => { const [id, l] = k.split('|'); if (id === e.id) l10n[l] = to })
      return { ...e, l10n }
    }))
    toast(msg)
    setSel([])
  }
  const words = sel.length * 180

  return (
    <div className="page">
      <PageHead title="Translation control tower" sub="Status of every entry in every market. Click cells to select them, then send to an agency, translate with AI, or approve.">
        <Btn onClick={selectGaps}>Select all gaps</Btn>
        <Btn icon="spark" disabled={!sel.length} onClick={() => apply('review', `${sel.length} translations drafted by AI and queued for human review`)}>Translate with AI</Btn>
        <Btn kind="primary" icon="send" disabled={!sel.length} onClick={() => apply('progress', `${sel.length} jobs sent to agency · est. €${Math.round(words * 0.11)} · due in 2 days`)}>Send to agency</Btn>
      </PageHead>

      <div className="grid g4">
        {[['current', 'Current', 'var(--good)'], ['stale', 'Stale', 'var(--warn)'], ['missing', 'Missing', 'var(--crit)'], ['progress', 'In progress', 'var(--accent)']].map(([s, label, color]) => (
          <div key={s} className="card stat" style={{ cursor: 'default' }}>
            <span className="label">{label}</span>
            <span className="value" style={{ color }}>{s === 'progress' ? count('progress') + count('review') : count(s)}</span>
            <span className="hint">{Math.round(((s === 'progress' ? count('progress') + count('review') : count(s)) / all.length) * 100)}% of {all.length} locale versions</span>
          </div>
        ))}
      </div>

      <div className="toolbar">
        <label className="row"><input type="checkbox" checked={only} onChange={(e) => setOnly(e.target.checked)} /> Only entries with gaps</label>
        <div className="grow" />
        {sel.length > 0 && (
          <>
            <span className="muted">{sel.length} selected · about {words.toLocaleString('en-GB')} words</span>
            <Btn size="sm" onClick={() => apply('current', `${sel.length} translations approved and marked current`)}>Approve as current</Btn>
            <Btn size="sm" kind="ghost" onClick={() => setSel([])}>Clear</Btn>
          </>
        )}
      </div>

      <Card flush>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Entry <span style={{ textTransform: 'none', letterSpacing: 0 }}>· source en-GB</span></th>
                {targets.map((l) => <th key={l.code} title={l.market}>{l.code}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td style={{ minWidth: 220 }}>
                    <a href="#" onClick={(ev) => { ev.preventDefault(); nav('editor', { id: e.id }) }} style={{ fontWeight: 600, color: 'var(--ink)' }}>{e.title}</a>
                    <div className="faint" style={{ fontSize: 12 }}>{e.type}</div>
                  </td>
                  {targets.map((l) => {
                    const s = e.l10n[l.code], k = key(e, l.code)
                    return (
                      <td key={l.code} style={{ padding: '6px 5px' }}>
                        <button className={`cell ${s} ${sel.includes(k) ? 'sel' : ''}`} aria-pressed={sel.includes(k)} title={`${e.title} · ${l.market}: ${s}. Double-click to open.`}
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

      <div className="row wrap faint" style={{ fontSize: 12.5 }}>
        {LEGEND.map(([s, label]) => <span key={s} className="row"><span className={`cell ${s}`} style={{ width: 14, minWidth: 14, height: 14, display: 'inline-block' }} />{label}</span>)}
        <span>· Double-click a cell to open that locale in the editor.</span>
      </div>
    </div>
  )
}
