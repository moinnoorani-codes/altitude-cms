import { useState } from 'react'
import { Badge, Btn, Card, Field, Icon, Modal, PageHead, useApp } from '../ui.jsx'
import { FIELD_TYPES, TYPES } from '../data.js'

export default function Model() {
  const { toast } = useApp()
  const [types, setTypes] = useState(TYPES)
  const [cur, setCur] = useState('promotion')
  const [adding, setAdding] = useState(false)
  const [f, setF] = useState({ name: '', type: 'Short text', l10n: 'Translated', required: false })
  const t = types.find((x) => x.id === cur)

  const add = () => {
    const name = f.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
    setTypes((ts) => ts.map((x) => (x.id === cur ? { ...x, fields: [...x.fields, [name, f.type, f.l10n, f.required]] } : x)))
    setAdding(false)
    setF({ name: '', type: 'Short text', l10n: 'Translated', required: false })
    toast(`Field “${name}” added. Migration generated for Staging and Production.`)
  }
  const remove = (n) => setTypes((ts) => ts.map((x) => (x.id === cur ? { ...x, fields: x.fields.filter((fl) => fl[0] !== n) } : x)))

  return (
    <div className="page">
      <PageHead title="Content model" sub="Types and fields, editable here or as code. Airline types ship with the starter pack and stay fully editable.">
        <Btn onClick={() => toast('Schema exported as TypeScript to altitude.schema.ts')}>Export as code</Btn>
        <Btn kind="primary" icon="plus" onClick={() => toast('New content type created')}>New type</Btn>
      </PageHead>

      <div className="grid" style={{ gridTemplateColumns: 'minmax(220px, 280px) minmax(0, 1fr)' }}>
        <Card flush>
          <div className="list">
            {types.map((x) => (
              <button key={x.id} className="item" onClick={() => setCur(x.id)} style={{ background: x.id === cur ? 'var(--accent-soft)' : undefined }}>
                <Icon name={x.airline ? 'plane' : 'box'} />
                <div className="grow"><div style={{ fontWeight: 600 }}>{x.name}</div><div className="faint" style={{ fontSize: 12 }}>{x.kind} · {x.entries.toLocaleString('en-GB')}</div></div>
              </button>
            ))}
          </div>
        </Card>

        <Card flush title={<span className="row">{t.name} {t.airline && <Badge tone="info" plain>Airline starter pack</Badge>} <Badge plain>{t.kind}</Badge></span>}
          action={<Btn size="sm" icon="plus" onClick={() => setAdding(true)}>Add field</Btn>}>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Field</th><th>Type</th><th>Localization</th><th>Required</th><th /></tr></thead>
              <tbody>
                {t.fields.map(([name, type, l10n, req]) => (
                  <tr key={name}>
                    <td className="mono" style={{ fontWeight: 600 }}>{name}</td>
                    <td>{FIELD_TYPES.Airline.some((a) => type.startsWith(a)) ? <Badge tone="info" plain>{type}</Badge> : type}</td>
                    <td><Badge plain tone={l10n === 'Translated' ? 'violet' : l10n === 'Per market' ? 'warn' : ''}>{l10n}</Badge></td>
                    <td>{req ? 'Yes' : <span className="faint">No</span>}</td>
                    <td className="r"><Btn size="sm" kind="ghost" onClick={() => remove(name)}>Remove</Btn></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {adding && (
        <Modal title={`Add field to ${t.name}`} onClose={() => setAdding(false)} footer={<><Btn onClick={() => setAdding(false)}>Cancel</Btn><Btn kind="primary" disabled={!f.name.trim()} onClick={add}>Add field</Btn></>}>
          <Field label="Field name"><input autoFocus className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          {Object.entries(FIELD_TYPES).map(([group, list]) => (
            <Field key={group} label={`${group} types`}>
              <div className="row wrap">{list.map((x) => <button key={x} className={`chip ${f.type === x ? 'on' : ''}`} onClick={() => setF({ ...f, type: x })}>{x}</button>)}</div>
            </Field>
          ))}
          <div className="grid g2">
            <Field label="Localization" help="Shared: one value everywhere. Translated: per language. Per market: per country.">
              <select className="select" value={f.l10n} onChange={(e) => setF({ ...f, l10n: e.target.value })}>{['Shared', 'Translated', 'Per market'].map((x) => <option key={x}>{x}</option>)}</select>
            </Field>
            <Field label="Validation"><label className="row" style={{ height: 34, fontWeight: 400 }}><input type="checkbox" checked={f.required} onChange={(e) => setF({ ...f, required: e.target.checked })} /> Required</label></Field>
          </div>
        </Modal>
      )}
    </div>
  )
}
