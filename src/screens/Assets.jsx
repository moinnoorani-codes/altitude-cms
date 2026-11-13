import { useState } from 'react'
import { Badge, Btn, PageHead, useApp } from '../ui.jsx'
import { ASSETS } from '../data.js'

const STATE = { ok: ['good', 'Rights valid'], soon: ['warn', 'Expires soon'], expired: ['crit', 'Blocked from publishing'] }

export default function Assets() {
  const { toast } = useApp()
  const [q, setQ] = useState('')
  const [tag, setTag] = useState('all')
  const tags = ['all', 'destination', 'cabin', 'campaign', 'fleet', 'lounge', 'video']
  const rows = ASSETS.filter((a) => (tag === 'all' || a.tags.includes(tag)) && a.name.includes(q.toLowerCase()))

  return (
    <div className="page">
      <PageHead title="Assets" sub="Images, video and documents with rights tracking. Assets with expired rights cannot be published in any market.">
        <Btn kind="primary" icon="plus" onClick={() => toast('Upload started · AI tagging and alt text will follow')}>Upload</Btn>
      </PageHead>
      <div className="toolbar">
        <input className="input" placeholder="Search assets" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search assets" />
        {tags.map((t) => <button key={t} className={`chip ${tag === t ? 'on' : ''}`} onClick={() => setTag(t)}>{t}</button>)}
      </div>
      <div className="asset-grid">
        {rows.map((a) => (
          <div key={a.id} className="card asset" onClick={() => toast(`${a.name} · used in ${a.id.length + 2} entries`)}>
            <div className="thumb" style={{ background: `linear-gradient(135deg, ${a.g[0]}, ${a.g[1]})` }} />
            <div className="meta">
              <div className="truncate" style={{ fontWeight: 600 }}>{a.name}</div>
              <div className="faint" style={{ fontSize: 12 }}>{a.dims} · {a.size}</div>
              <div><Badge tone={STATE[a.state][0]}>{STATE[a.state][1]}</Badge></div>
              <div className="faint truncate" style={{ fontSize: 12 }}>{a.rights}</div>
            </div>
          </div>
        ))}
      </div>
      {rows.length === 0 && <div className="empty">No assets match.</div>}
    </div>
  )
}
