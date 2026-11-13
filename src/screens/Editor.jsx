import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge, Btn, Card, StageBadge, useApp } from '../ui.jsx'
import { LOCALES, STAGES } from '../data.js'
import { STAGE_ACTIONS, api, time } from '../api.js'

const SOURCE = 'en-GB'
const L10N = { current: ['good', 'Current'], stale: ['warn', 'Stale: source changed'], missing: ['crit', 'Missing'], progress: ['info', 'With translator'], review: ['info', 'Awaiting review'] }
const SCOPE = { shared: 'same in every market', translated: 'per language', market: 'per market' }
const SYM = { GBP: '£', USD: '$', EUR: '€', AED: 'AED ', INR: '₹', JPY: '¥', BRL: 'R$' }
const empty = (v) => v === undefined || v === null || v === ''

export default function Editor({ params }) {
  const { nav, run, toast, alerts, locale, setLocale, reloadEntries } = useApp()
  const [entry, setEntry] = useState(null)
  const [versions, setVersions] = useState([])
  const [drafts, setDrafts] = useState({})
  const [title, setTitle] = useState(null)
  const [errors, setErrors] = useState({})
  const [focus, setFocus] = useState(null)
  const [device, setDevice] = useState('desktop')
  const refs = useRef({})

  const loadVersions = useCallback(() => api(`/entries/${params.id}/versions`).then((r) => setVersions(r.items)).catch(() => {}), [params.id])
  useEffect(() => {
    api(`/entries/${params.id}`).then(setEntry).catch((e) => { toast(e.message, true); nav('content') })
    loadVersions()
  }, [params.id, loadVersions, nav, toast])

  if (!entry) return <div className="empty">Loading entry…</div>

  const loc = LOCALES.find((l) => l.code === locale) || LOCALES[0]
  const isSource = locale === SOURCE
  const defs = entry.fieldDefs
  const savedSrc = entry.locales[SOURCE] || {}
  const src = drafts[SOURCE] ?? savedSrc
  const values = drafts[locale] ?? entry.locales[locale] ?? {}
  const dirty = Object.keys(drafts).length > 0 || title !== null
  const status = entry.l10n[locale]
  const hasText = Object.values(entry.locales[locale] || {}).some((v) => !empty(v))
  const liveAlert = alerts.find((a) => a.status === 'Live' && a.sev === 1)
  const stages = STAGES.filter((s) => entry.type.requiresLegal || s !== 'Legal review')

  const set = (name, v) => { setDrafts((d) => ({ ...d, [locale]: { ...values, [name]: v } })); setErrors((e) => ({ ...e, [name]: undefined })) }
  const after = async (next) => { setEntry(next); await Promise.all([reloadEntries(), loadVersions()]) }

  const save = async () => {
    const fields = Object.fromEntries(Object.entries(values).filter(([, v]) => !empty(v)))
    try {
      const next = await api(`/entries/${entry.id}/locales/${locale}`, { method: 'PUT', body: { fields, ...(isSource && title ? { title } : {}), ...(isSource ? {} : { status: 'current' }) } })
      setDrafts((d) => { const n = { ...d }; delete n[locale]; return n })
      if (isSource) setTitle(null)
      setErrors({})
      await after(next)
      toast(isSource ? 'Saved. Translations of changed text are now marked stale.' : `Saved ${loc.lang} and marked current`)
    } catch (err) {
      setErrors(err.details || {})
      toast(err.message, true)
    }
  }
  const discard = () => { setDrafts({}); setTitle(null); setErrors({}) }
  const act = async (action, label) => { const next = await run(() => api(`/entries/${entry.id}/transition`, { method: 'POST', body: { action } }), label); if (next) await after(next) }
  const setStatus = async (s, label) => { const next = await run(() => api(`/entries/${entry.id}/locales/${locale}/status`, { method: 'POST', body: { status: s } }), label); if (next) await after(next) }

  const input = (def) => {
    const locked = !isSource && def.localization === 'shared'
    const v = locked ? src[def.name] : values[def.name]
    const common = {
      ref: (el) => (refs.current[def.name] = el), disabled: locked, dir: loc.rtl && !locked ? 'rtl' : 'ltr',
      placeholder: !isSource && !empty(src[def.name]) ? String(src[def.name]) : '',
      onFocus: () => setFocus(def.name), onBlur: () => setFocus(null),
    }
    switch (def.type) {
      case 'long_text': case 'rich_text':
        return <textarea className="textarea" {...common} value={v ?? ''} onChange={(e) => set(def.name, e.target.value)} />
      case 'number': case 'currency_amount':
        return <input className="input num" type="number" min="0" {...common} value={v ?? ''} onChange={(e) => set(def.name, e.target.value === '' ? '' : Number(e.target.value))} />
      case 'iata_airport':
        return <input className="input mono" maxLength={3} style={{ width: 90 }} {...common} value={v ?? ''} onChange={(e) => set(def.name, e.target.value.toUpperCase())} />
      case 'date':
        return <input className="input" type="date" style={{ width: 170 }} {...common} value={v ?? ''} onChange={(e) => set(def.name, e.target.value)} />
      case 'boolean':
        return <input type="checkbox" {...common} checked={!!v} onChange={(e) => set(def.name, e.target.checked)} />
      case 'select':
        return <select className="select" {...common} value={v ?? ''} onChange={(e) => set(def.name, e.target.value)}><option value="">—</option>{(def.options || []).map((o) => <option key={o}>{o}</option>)}</select>
      default:
        return <input className="input" {...common} value={v ?? ''} onChange={(e) => set(def.name, e.target.value)} />
    }
  }

  // Preview resolves each field the way delivery does: this market first, then the source.
  const shown = (name) => (empty(values[name]) || defs.find((d) => d.name === name)?.localization === 'shared' ? src[name] : values[name])
  const has = (name) => defs.some((d) => d.name === name)
  const hl = (name) => (focus === name ? 'hl' : '')
  const jump = (name) => { refs.current[name]?.focus(); refs.current[name]?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }
  const missingRequired = defs.filter((d) => d.required && empty(src[d.name])).map((d) => d.name)
  const notCurrent = Object.entries(entry.l10n).filter(([, s]) => s !== 'current').length

  return (
    <div className="page">
      <div className="page-head">
        <div style={{ minWidth: 0 }}>
          <div className="faint" style={{ fontSize: 12.5 }}><a href="#" onClick={(e) => { e.preventDefault(); nav('content') }}>Content</a> / {entry.type.name} / <span className="mono">{entry.slug}</span></div>
          <h1 className="truncate">{title ?? entry.title}</h1>
        </div>
        <div className="row wrap">
          {dirty
            ? <><span className="faint">Unsaved changes</span><Btn onClick={discard}>Discard</Btn><Btn kind="primary" onClick={save}>Save {isSource ? '' : loc.code}</Btn></>
            : (STAGE_ACTIONS[entry.stage] || []).map(([action, label], i) => <Btn key={action} kind={i === 0 ? 'primary' : ''} onClick={() => act(action, `${label}: done`)}>{label}</Btn>)}
        </div>
      </div>

      <div className="banner" style={{ borderLeftColor: 'var(--line-2)' }}>
        <div className="stage-track">
          {stages.map((s) => {
            const i = STAGES.indexOf(s), cur = STAGES.indexOf(entry.stage)
            return <span key={s} className={`stage ${i < cur ? 'done' : i === cur ? 'now' : ''}`}>{s}</span>
          })}
        </div>
        <span className="grow" />
        <span className="faint">
          {entry.type.requiresLegal ? 'Legal review required; the author cannot approve.' : 'No legal review for this type.'}
          {entry.published && entry.stage !== 'Published' ? ' An earlier version is live until this one is published.' : ''}
        </span>
      </div>

      <div className="editor">
        <div className="col" style={{ gap: 16 }}>
          <Card title="Fields" action={
            <div className="row">
              <select className="select" style={{ height: 26, width: 'auto' }} value={locale} onChange={(e) => setLocale(e.target.value)} aria-label="Market">
                {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.market} ({l.code})</option>)}
              </select>
              {isSource ? <span className="badge plain">source</span> : <Badge tone={L10N[status][0]}>{L10N[status][1]}</Badge>}
            </div>}>
            <div className="col" style={{ gap: 14 }}>
              {!isSource && (
                <div className={`banner ${status === 'stale' ? 'warn' : status === 'missing' ? 'crit' : ''}`}>
                  <span className="grow">
                    {status === 'stale' ? 'The English source changed after this translation was approved.'
                      : status === 'missing' ? `No ${loc.lang} text yet. The site shows English here until one is saved.`
                        : status === 'progress' ? 'Out with the translator.' : status === 'review' ? 'Translation is waiting for review.' : 'Empty fields show the English text.'}
                  </span>
                  {(status === 'missing' || status === 'stale') && <Btn size="sm" disabled={dirty} onClick={() => setStatus('progress', 'Marked as with translator')}>Send to translation</Btn>}
                  {status !== 'current' && hasText && <Btn size="sm" disabled={dirty} onClick={() => setStatus('current', `${loc.lang} approved as current`)}>Approve as current</Btn>}
                </div>
              )}
              {isSource && (
                <div className="field">
                  <label>Title <span className="field-meta">internal name</span></label>
                  <input className="input" value={title ?? entry.title} onChange={(e) => setTitle(e.target.value)} />
                </div>
              )}
              {defs.map((def) => (
                <div key={def.name} className="field">
                  <label>
                    {def.name.replaceAll('_', ' ').replace(/^./, (c) => c.toUpperCase())}{def.required ? ' *' : ''}
                    <span className="field-meta">{def.type.replaceAll('_', ' ')} · {SCOPE[def.localization]}</span>
                  </label>
                  {input(def)}
                  {errors[def.name] && <span className="help" style={{ color: 'var(--red)' }}>This {errors[def.name]}.</span>}
                  {!isSource && def.localization === 'shared' && <span className="help">Edit in the source locale.</span>}
                </div>
              ))}
            </div>
          </Card>

          <Card title="History" flush>
            <div className="table-wrap"><table>
              <tbody>{versions.slice(0, 8).map((v) => (
                <tr key={v.version}><td className="mono faint" style={{ width: 40 }}>v{v.version}</td><td>{v.note}</td><td className="muted">{v.createdBy}</td><td className="faint r">{time(v.createdAt)}</td></tr>
              ))}</tbody>
            </table></div>
          </Card>
        </div>

        <div className="col" style={{ gap: 16 }}>
          <div className="preview-frame">
            <div className="preview-chrome">
              <span>Preview</span>
              <span className="preview-url">meridianair.example/{locale.toLowerCase()}/{entry.slug}</span>
              <button className={`chip ${device === 'desktop' ? 'on' : ''}`} onClick={() => setDevice('desktop')}>Desktop</button>
              <button className={`chip ${device === 'mobile' ? 'on' : ''}`} onClick={() => setDevice('mobile')}>Phone</button>
            </div>
            <div className={`site ${device === 'mobile' ? 'mobile' : ''}`} dir={loc.rtl ? 'rtl' : 'ltr'}>
              {liveAlert && <div className="site-alert">{liveAlert.title}. Check your flight status.</div>}
              <div className="site-nav"><span>MERIDIAN AIR</span><span>{loc.market} · {loc.currency}</span></div>
              <div className="site-hero">
                <h4 className={`click-edit ${hl('headline')}`} onClick={() => jump('headline')}>{shown('headline') || entry.title}</h4>
                {has('subtitle') && <p className={`click-edit ${hl('subtitle')}`} onClick={() => jump('subtitle')}>{shown('subtitle') || 'Subtitle'}</p>}
                {has('cta_label') && shown('cta_label') && <span className={`site-cta click-edit ${hl('cta_label')}`} onClick={() => jump('cta_label')}>{shown('cta_label')}</span>}
              </div>
              {has('body') && shown('body') && <div className={`site-body click-edit ${hl('body')}`} onClick={() => jump('body')}>{shown('body')}</div>}
              {has('fare_from') && !empty(shown('fare_from')) && (
                <div className={`site-fares ${hl('fare_from')}`} style={{ paddingTop: 16 }}>
                  <div className="site-fare click-edit" onClick={() => jump('fare_from')}>
                    {src.origin && src.destination ? `${src.origin} to ${src.destination}` : 'One way from'}<b>{SYM[loc.currency]}{shown('fare_from')}</b>incl. taxes and fees
                  </div>
                </div>
              )}
            </div>
          </div>
          <p className="note">Click text in the preview to jump to its field. Empty fields in a market fall back to English, as on the live site.</p>

          <Card title="Before publishing" flush>
            <div className="list">
              <div><span className="grow">Required fields complete</span>{missingRequired.length ? <Badge tone="crit">Missing: {missingRequired.join(', ')}</Badge> : <Badge tone="good">Yes</Badge>}</div>
              <div><span className="grow">Markets with a current translation</span><Badge tone={notCurrent ? 'warn' : 'good'}>{Object.keys(entry.l10n).length - notCurrent} of {Object.keys(entry.l10n).length}</Badge></div>
              <div><span className="grow">Live on the site</span><span className="muted">{entry.published ? (entry.stage === 'Published' ? 'This version' : 'An earlier version') : 'Not yet'}</span></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
