import { useState } from 'react'
import { Badge, Btn, Card, Icon, PageHead, useApp } from '../ui.jsx'
import { LOCALES } from '../data.js'

const RATE = { GBP: 1, USD: 1.27, EUR: 1.17, AED: 4.66, INR: 106, JPY: 190, BRL: 6.9 }
const SYM = { GBP: '£', USD: '$', EUR: '€', AED: 'AED ', INR: '₹', JPY: '¥', BRL: 'R$' }
const ageText = (h) => (h < 1 ? `${Math.round(h * 60)} min` : `${h.toFixed(1)} h`)

export default function Fares() {
  const { toast, routes, setRoutes, maxAge, setMaxAge, locale } = useApp()
  const [picked, setPicked] = useState([])
  const [q, setQ] = useState('')
  const [view, setView] = useState(null)
  const loc = LOCALES.find((l) => l.code === locale)
  const price = (gbp) => `${SYM[loc.currency]}${Math.round(gbp * RATE[loc.currency]).toLocaleString('en-GB')}`

  const rows = routes.filter((r) => `${r.od} ${r.o} ${r.d}`.toLowerCase().includes(q.toLowerCase()))
  const stale = (r) => r.status === 'Live' && r.age > maxAge
  const staleCount = routes.filter(stale).length
  const apply = (patch, msg) => { setRoutes((rs) => rs.map((r) => (picked.includes(r.id) ? { ...r, ...patch } : r))); toast(`${picked.length} route pages ${msg}`); setPicked([]) }
  const refresh = () => { setRoutes((rs) => rs.map((r) => ({ ...r, age: 0.05 }))); toast('Fare feed refreshed for all routes') }
  const sel = view && routes.find((r) => r.id === view)

  return (
    <div className="page">
      <PageHead title="Routes and fares" sub={`Programmatic landing pages generated from the route network and the live fare feed. Showing prices for ${loc.market} (${loc.currency}).`}>
        <Btn icon="clock" onClick={refresh}>Refresh fare feed</Btn>
        <Btn kind="primary" onClick={() => toast('Template editor opens in the visual page builder')}>Edit page template</Btn>
      </PageHead>

      <div className="grid g3">
        <div className="card stat" style={{ cursor: 'default' }}><span className="label">Route pages</span><span className="value">2,140</span><span className="hint">{routes.length} shown · 8 markets · 1 template</span></div>
        <div className="card stat" style={{ cursor: 'default' }}><span className="label">Stale fares</span><span className="value" style={{ color: staleCount ? 'var(--warn)' : 'var(--good)' }}>{staleCount}</span><span className="hint">price hidden, shows “check latest fares”</span></div>
        <div className="card card-body col" style={{ justifyContent: 'center' }}>
          <div className="spread"><b>Freshness rule</b><span className="num">max {maxAge} h</span></div>
          <input type="range" min="1" max="24" value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))} aria-label="Maximum fare age in hours" />
          <span className="faint" style={{ fontSize: 12.5 }}>Fares older than this are never displayed. Required by {loc.pack} fare-advertising rules.</span>
        </div>
      </div>

      <div className="toolbar">
        <input className="input" placeholder="Filter by city or airport code" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter routes" />
        <div className="grow" />
        {picked.length > 0 && (
          <>
            <span className="muted">{picked.length} selected</span>
            <Btn size="sm" onClick={() => apply({ status: 'Live', index: true }, 'enabled')}>Enable</Btn>
            <Btn size="sm" onClick={() => apply({ status: 'Paused', index: false }, 'paused')}>Pause</Btn>
            <Btn size="sm" onClick={() => apply({ index: false }, 'set to noindex')}>Noindex</Btn>
          </>
        )}
      </div>

      <Card flush>
        <div className="table-wrap">
          <table>
            <thead><tr>
              <th style={{ width: 36 }}><input type="checkbox" aria-label="Select all" checked={rows.length > 0 && rows.every((r) => picked.includes(r.id))} onChange={(e) => setPicked(e.target.checked ? rows.map((r) => r.id) : [])} /></th>
              <th>Route</th><th className="r">Lowest fare</th><th>Fare age</th><th>Status</th><th>Search</th><th className="r">Visits / 30 d</th>
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="click" onClick={() => setView(r.id)}>
                  <td onClick={(e) => e.stopPropagation()}><input type="checkbox" aria-label={`Select ${r.od}`} checked={picked.includes(r.id)} onChange={() => setPicked((p) => (p.includes(r.id) ? p.filter((x) => x !== r.id) : [...p, r.id]))} /></td>
                  <td><b>{r.od}</b> <span className="mono faint">{r.o}–{r.d}</span></td>
                  <td className="r num" style={{ fontWeight: 600, textDecoration: stale(r) ? 'line-through' : 'none', color: stale(r) ? 'var(--faint)' : undefined }}>{price(r.fare)}</td>
                  <td><Badge tone={stale(r) ? 'warn' : 'good'}>{ageText(r.age)}{stale(r) ? ' · hidden' : ''}</Badge></td>
                  <td><Badge tone={r.status === 'Live' ? 'good' : r.status === 'Scheduled' ? 'info' : ''}>{r.status}</Badge></td>
                  <td className="muted">{r.index ? 'Indexed' : 'Noindex'}</td>
                  <td className="r num muted">{r.visits.toLocaleString('en-GB')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {sel && (
        <aside className="drawer" aria-label="Route page preview">
          <div className="card-head"><h2>{sel.od}</h2><Btn kind="ghost" icon="x" aria-label="Close" onClick={() => setView(null)} /></div>
          <div className="drawer-body">
            <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', background: '#fff', color: '#14171f' }}>
              <div className="site-nav"><span>MERIDIAN AIR</span><span>{loc.market}</span></div>
              <div className="site-hero">
                <h4>Flights from {sel.od.replace(' to ', ' to ')}</h4>
                <p>{stale(sel) ? 'Check the latest fares for your dates.' : `One way from ${price(sel.fare)}, including taxes and fees. Price found ${ageText(sel.age)} ago.`}</p>
                <span className="site-cta">Search {sel.o} → {sel.d}</span>
              </div>
            </div>
            <div className="col">
              <div className="spread"><span className="muted">URL</span><span className="mono">/{locale.toLowerCase()}/flights/{sel.o.toLowerCase()}-{sel.d.toLowerCase()}</span></div>
              <div className="spread"><span className="muted">Fare source</span><span>Pricing cache · push API</span></div>
              <div className="spread"><span className="muted">Structured data</span><span>Flight, Offer, FAQ, Breadcrumb</span></div>
              <div className="spread"><span className="muted">hreflang</span><span>8 markets linked</span></div>
              <div className="spread"><span className="muted">Editorial overrides</span><span>Hero copy, 4 FAQs</span></div>
            </div>
            <div className="banner"><Icon name="spark" /><span>Unique intro copy was drafted by AI and approved in a 5% human review sample.</span></div>
          </div>
        </aside>
      )}
    </div>
  )
}
