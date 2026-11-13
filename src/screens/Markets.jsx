import { useState } from 'react'
import { Badge, Btn, Card, PageHead, Switch, useApp } from '../ui.jsx'
import { LOCALES } from '../data.js'

export default function Markets() {
  const { toast, entries } = useApp()
  const [off, setOff] = useState([])
  const pct = (code) => Math.round((entries.filter((e) => e.l10n[code] === 'current').length / entries.length) * 100)

  return (
    <div className="page">
      <PageHead title="Markets and locales" sub="Unlimited markets on every plan. Each market has a language, currency, fallback chain and regulatory pack.">
        <Btn kind="primary" icon="plus" onClick={() => toast('Add market: choose country, language and fallback')}>Add market</Btn>
      </PageHead>
      <Card flush>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Market</th><th>Locale</th><th>Currency</th><th>Fallback chain</th><th>Regulatory pack</th><th>Coverage</th><th>Live</th></tr></thead>
            <tbody>
              {LOCALES.map((l) => (
                <tr key={l.code}>
                  <td style={{ fontWeight: 600 }}>{l.market}{l.rtl && <> <Badge plain>RTL</Badge></>}</td>
                  <td className="mono">{l.code} <span className="faint">{l.lang}</span></td>
                  <td>{l.currency}</td>
                  <td className="mono muted">{l.fallback ? `${l.code} → ${l.fallback}` : 'Source'}</td>
                  <td><Badge tone="violet" plain>{l.pack}</Badge></td>
                  <td><div className="row"><div className={`bar ${pct(l.code) >= 90 ? 'good' : pct(l.code) >= 75 ? 'warn' : 'crit'}`} style={{ width: 80 }}><i style={{ width: `${pct(l.code)}%` }} /></div><span className="num faint">{pct(l.code)}%</span></div></td>
                  <td><Switch label={`${l.market} live`} on={!off.includes(l.code)} onChange={(v) => { setOff((o) => (v ? o.filter((x) => x !== l.code) : [...o, l.code])); toast(`${l.market} ${v ? 'is live' : 'taken offline'}`) }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
