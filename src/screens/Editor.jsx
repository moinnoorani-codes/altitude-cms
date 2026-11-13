import { useRef, useState } from 'react'
import { Avatar, Badge, Btn, Card, Field, Icon, Tabs, useApp } from '../ui.jsx'
import { LOCALES, SAMPLE_TRANSLATIONS, STAGES, USERS, blankContent } from '../data.js'

const L10N_LABEL = { current: ['good', 'Current'], stale: ['warn', 'Stale'], missing: ['crit', 'Missing'], progress: ['info', 'In translation'], review: ['violet', 'In review'] }
const NEXT_LABEL = { Draft: 'Send to review', 'In review': 'Approve', 'Legal review': 'Approve as legal', Approved: 'Publish', Published: null }
const TEXT_FIELDS = ['heroTitle', 'heroSubtitle', 'cta', 'body']

export default function Editor({ params }) {
  const { nav, toast, entries, setEntries, locale, setLocale, alerts } = useApp()
  const entry = entries.find((e) => e.id === params.id) || entries[0]
  const [content, setContent] = useState(() => {
    const base = { 'en-GB': blankContent(entry) }
    if (entry.id === 'e1') Object.assign(base, SAMPLE_TRANSLATIONS)
    return base
  })
  const [focus, setFocus] = useState(null)
  const [device, setDevice] = useState('desktop')
  const [showPreview, setShowPreview] = useState(true)
  const [tab, setTab] = useState('Checks')
  const [comments, setComments] = useState([
    { who: 'u5', text: 'Fare claim needs the "price includes taxes" disclosure in every market.', when: '2 h ago' },
    { who: 'u1', text: 'Added to the subtitle. Please re-check.', when: '40 min ago' },
  ])
  const [note, setNote] = useState('')
  const [blocks, setBlocks] = useState(['Hero', 'Fare grid', 'Rich text', 'Terms and conditions'])
  const refs = useRef({})

  const loc = LOCALES.find((l) => l.code === locale)
  const isSource = locale === 'en-GB'
  const own = content[locale] || {}
  const src = content['en-GB']
  const val = (k) => own[k] ?? ''
  const shown = (k) => own[k] || src[k]
  const status = entry.l10n[locale]
  const requiresLegal = entry.type === 'Promotion' || entry.type === 'Policy' || entry.type === 'Legal text'
  const liveAlert = alerts.find((a) => a.status === 'Live' && a.sev === 1)

  const patchEntry = (p) => setEntries((es) => es.map((e) => (e.id === entry.id ? { ...e, ...p, updated: 'just now' } : e)))
  const set = (k, v) => {
    setContent((c) => ({ ...c, [locale]: { ...c[locale], [k]: v } }))
    if (isSource && entry.stage === 'Published') patchEntry({ stage: 'Draft' })
  }
  const focusField = (k) => { refs.current[k]?.focus(); refs.current[k]?.scrollIntoView({ block: 'center', behavior: 'smooth' }) }

  const advance = () => {
    const i = STAGES.indexOf(entry.stage)
    let next = STAGES[i + 1]
    if (entry.stage === 'In review' && !requiresLegal) next = 'Approved'
    patchEntry({ stage: next })
    toast(next === 'Published' ? 'Published to all current locales in 3.8 s' : `Moved to ${next}`)
  }
  const aiDraft = () => {
    set('heroSubtitle', 'Book by 30 November and fly between January and March. Fares include taxes, fees and one cabin bag. Seats are limited.')
    toast('AI draft inserted. It follows the brand voice and adds the fare disclosure.')
  }
  const aiTranslate = () => {
    const sample = SAMPLE_TRANSLATIONS[locale]
    const out = Object.fromEntries(TEXT_FIELDS.map((k) => [k, sample?.[k] || `[${loc.lang}] ${src[k]}`]))
    setContent((c) => ({ ...c, [locale]: { ...c[locale], ...out } }))
    patchEntry({ l10n: { ...entry.l10n, [locale]: 'review' } })
    toast(`Translated to ${loc.lang} with glossary applied. Sent to human review.`)
  }
  const markCurrent = () => { patchEntry({ l10n: { ...entry.l10n, [locale]: 'current' } }); toast(`${loc.market} marked current`) }

  const checks = [
    ['Required fields complete', !!src.heroTitle && !!src.heroSubtitle],
    ['Fare disclosure present ("includes taxes")', !src.fareFrom || /tax/i.test(src.heroSubtitle)],
    ['Hero image rights valid', entry.id !== 'e11'],
    ['Accessibility: heading order and alt text', true],
    ['All active markets translated', Object.values(entry.l10n).every((v) => v === 'current')],
    ['SEO title under 60 characters', src.heroTitle.length <= 60],
  ]
  const text = (k, label, opts = {}) => (
    <Field label={label} help={!isSource && !val(k) ? `Empty: inherits ${loc.fallback} → “${src[k].slice(0, 60)}${src[k].length > 60 ? '…' : ''}”` : opts.help}
      badge={opts.badge}>
      {opts.long
        ? <textarea ref={(el) => (refs.current[k] = el)} className="textarea" dir={loc.rtl ? 'rtl' : 'ltr'} value={val(k)} onChange={(e) => set(k, e.target.value)} onFocus={() => setFocus(k)} onBlur={() => setFocus(null)} />
        : <input ref={(el) => (refs.current[k] = el)} className="input" dir={loc.rtl ? 'rtl' : 'ltr'} value={val(k)} onChange={(e) => set(k, e.target.value)} onFocus={() => setFocus(k)} onBlur={() => setFocus(null)} />}
    </Field>
  )
  const hl = (k) => (focus === k ? 'hl' : '')
  const sym = { GBP: '£', USD: '$', EUR: '€', AED: 'AED ', INR: '₹', JPY: '¥', BRL: 'R$' }[loc.currency]

  return (
    <div className="page">
      <div className="spread" style={{ flexWrap: 'wrap' }}>
        <div className="row" style={{ minWidth: 0 }}>
          <Btn kind="ghost" icon="left" aria-label="Back to content" onClick={() => nav('content')} />
          <div style={{ minWidth: 0 }}>
            <div className="faint" style={{ fontSize: 12.5 }}>{entry.type} · <span className="mono">/{src.slug}</span></div>
            <h1 className="truncate">{entry.title}</h1>
          </div>
        </div>
        <div className="row wrap">
          <span className="faint" style={{ fontSize: 12.5 }}>Saved · {entry.updated}</span>
          <Btn icon="eye" onClick={() => setShowPreview((s) => !s)}>{showPreview ? 'Hide preview' : 'Show preview'}</Btn>
          <Btn icon="send" onClick={() => toast('Preview link copied. Expires in 7 days, no login needed.')}>Share preview</Btn>
          {NEXT_LABEL[entry.stage]
            ? <Btn kind="primary" icon="check" onClick={advance}>{NEXT_LABEL[entry.stage]}</Btn>
            : <Btn onClick={() => { patchEntry({ stage: 'Draft' }); toast('Unpublished. Entry is back in Draft.') }}>Unpublish</Btn>}
        </div>
      </div>

      <div className="card card-body spread" style={{ flexWrap: 'wrap' }}>
        <div className="stage-track">
          {STAGES.filter((s) => requiresLegal || s !== 'Legal review').map((s) => {
            const i = STAGES.indexOf(s), cur = STAGES.indexOf(entry.stage)
            return <span key={s} className={`stage ${i < cur ? 'done' : i === cur ? 'now' : ''}`}>{i < cur && <Icon name="check" size={12} />}{s}</span>
          })}
        </div>
        <span className="muted" style={{ fontSize: 12.5 }}>
          {requiresLegal ? 'Legal review is mandatory for this type (fare or policy claims). Four-eyes rule applies.' : 'Standard two-step workflow.'}
        </span>
      </div>

      <div className={`editor ${showPreview ? '' : 'nopreview'}`}>
        <div className="col" style={{ gap: 16 }}>
          <Card title="Content" action={
            <div className="row">
              <select className="select" style={{ height: 28, width: 'auto' }} value={locale} onChange={(e) => setLocale(e.target.value)} aria-label="Locale">
                {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.market} · {l.code}</option>)}
              </select>
              <Badge tone={L10N_LABEL[status][0]}>{isSource ? 'Source' : L10N_LABEL[status][1]}</Badge>
            </div>}>
            <div className="col" style={{ gap: 14 }}>
              {!isSource && (
                <div className={`banner ${status === 'stale' ? 'warn' : ''}`}>
                  <Icon name="globe" />
                  <div className="grow">
                    {status === 'stale' ? 'The English source changed after this translation was approved. Review the highlighted fields.'
                      : status === 'missing' ? `No ${loc.lang} translation yet. The site shows the ${loc.fallback} fallback.`
                        : status === 'review' ? 'Machine translation awaiting human review.' : `Editing the ${loc.lang} version. Other locales are not locked.`}
                  </div>
                  <Btn size="sm" icon="spark" onClick={aiTranslate}>Translate with AI</Btn>
                  {status !== 'current' && <Btn size="sm" onClick={markCurrent}>Mark current</Btn>}
                </div>
              )}
              {text('heroTitle', 'Headline', { badge: <Badge plain>Translated</Badge> })}
              {text('heroSubtitle', 'Subtitle', { long: true, badge: isSource && <Btn size="sm" kind="ghost" icon="spark" onClick={aiDraft}>Draft with AI</Btn> })}
              <div className="grid g2">
                {text('cta', 'Button label')}
                <Field label="Fare from" badge={<Badge plain tone="info">Per market · {loc.currency}</Badge>} help="Currency amount field. Validated against the live fare feed on publish.">
                  <input ref={(el) => (refs.current.fareFrom = el)} className="input num" value={src.fareFrom} disabled={!isSource} onChange={(e) => set('fareFrom', e.target.value.replace(/[^0-9]/g, ''))} onFocus={() => setFocus('fareFrom')} onBlur={() => setFocus(null)} />
                </Field>
              </div>
              {text('body', 'Body', { long: true })}
            </div>
          </Card>

          <Card title="Page blocks" action={<Btn size="sm" icon="plus" onClick={() => { setBlocks((b) => [...b, 'FAQ list']); toast('FAQ list block added') }}>Add block</Btn>}>
            <div className="col">
              {blocks.map((b, i) => (
                <div key={b + i} className="block">
                  <span className="handle">⋮⋮</span>
                  <div className="grow"><b>{b}</b>{b === 'Terms and conditions' && <span className="faint"> · locked region, required by compliance pack {loc.pack}</span>}</div>
                  <Btn size="sm" kind="ghost" disabled={i === 0} onClick={() => setBlocks((bs) => { const n = [...bs];[n[i - 1], n[i]] = [n[i], n[i - 1]]; return n })}>Up</Btn>
                  <Btn size="sm" kind="ghost" disabled={b === 'Terms and conditions'} onClick={() => setBlocks((bs) => bs.filter((_, n) => n !== i))}>Remove</Btn>
                </div>
              ))}
            </div>
          </Card>

          <Card flush>
            <div style={{ padding: '4px 8px 0' }}><Tabs tabs={['Checks', 'Comments', 'History']} value={tab} onChange={setTab} /></div>
            {tab === 'Checks' && (
              <div className="list">
                {checks.map(([label, ok]) => (
                  <div key={label}>
                    <span style={{ color: ok ? 'var(--good)' : 'var(--crit)' }}><Icon name={ok ? 'check' : 'x'} /></span>
                    <span className="grow">{label}</span>
                    <Badge tone={ok ? 'good' : 'crit'} plain>{ok ? 'Pass' : 'Needs attention'}</Badge>
                  </div>
                ))}
              </div>
            )}
            {tab === 'Comments' && (
              <div className="card-body col" style={{ gap: 12 }}>
                {comments.map((c, i) => {
                  const u = USERS.find((x) => x.id === c.who)
                  return <div key={i} className="row" style={{ alignItems: 'flex-start' }}><Avatar sm initials={u.initials} /><div><b>{u.name}</b> <span className="faint">{c.when}</span><div>{c.text}</div></div></div>
                })}
                <div className="row">
                  <input className="input" placeholder="Add a comment, @mention a reviewer" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && note.trim()) { setComments((c) => [...c, { who: 'u1', text: note.trim(), when: 'just now' }]); setNote('') } }} />
                  <Btn disabled={!note.trim()} onClick={() => { setComments((c) => [...c, { who: 'u1', text: note.trim(), when: 'just now' }]); setNote('') }}>Comment</Btn>
                </div>
              </div>
            )}
            {tab === 'History' && (
              <div className="list">
                {[['v7', 'Priya Raman', 'Subtitle edited', '40 min ago'], ['v6', 'Altitude AI', 'ar-AE translation drafted', '1 h ago'], ['v5', 'Mei Tanaka', 'Comment: disclosure required', '2 h ago'], ['v4', 'Priya Raman', 'Sent to review', '3 h ago'], ['v1', 'Priya Raman', 'Created', 'Yesterday']].map((h) => (
                  <div key={h[0]}><span className="mono faint" style={{ width: 28 }}>{h[0]}</span><div className="grow"><b>{h[1]}</b> · {h[2]}</div><span className="faint">{h[3]}</span><Btn size="sm" kind="ghost" onClick={() => toast(`Compared ${h[0]} with current draft`)}>Compare</Btn></div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {showPreview && (
          <div className="preview-frame">
            <div className="preview-chrome">
              <Icon name="eye" /><span>Live preview</span>
              <span className="preview-url">meridianair.example/{locale.toLowerCase()}/{src.slug}</span>
              <Btn size="sm" kind={device === 'desktop' ? '' : 'ghost'} icon="desktop" aria-label="Desktop" onClick={() => setDevice('desktop')} />
              <Btn size="sm" kind={device === 'mobile' ? '' : 'ghost'} icon="phone" aria-label="Mobile" onClick={() => setDevice('mobile')} />
            </div>
            <div className={`site ${device === 'mobile' ? 'mobile' : ''}`} dir={loc.rtl ? 'rtl' : 'ltr'}>
              {liveAlert && <div className="site-alert">⚠ {liveAlert.title}. Check your flight status.</div>}
              <div className="site-nav"><span>MERIDIAN AIR</span><span>{loc.market} · {loc.currency}</span></div>
              <div className="site-hero">
                <h4 className={hl('heroTitle')} onClick={() => focusField('heroTitle')} style={{ cursor: 'pointer' }}>{shown('heroTitle')}</h4>
                <p className={hl('heroSubtitle')} onClick={() => focusField('heroSubtitle')} style={{ cursor: 'pointer' }}>{shown('heroSubtitle')}</p>
                <span className={`site-cta ${hl('cta')}`} onClick={() => focusField('cta')} style={{ cursor: 'pointer' }}>{shown('cta')}</span>
              </div>
              <div className={`site-body ${hl('body')}`} onClick={() => focusField('body')} style={{ cursor: 'pointer' }}>{shown('body')}</div>
              {src.fareFrom && (
                <div className={`site-fares ${hl('fareFrom')}`}>
                  {[['Paris', 0], ['Barcelona', 6], ['Frankfurt', 13]].map(([c, add]) => (
                    <div key={c} className="site-fare">{c}<b>{sym}{Number(src.fareFrom) + add}</b>one way, incl. taxes</div>
                  ))}
                </div>
              )}
            </div>
            <div className="preview-chrome" style={{ borderTop: '1px solid var(--line)', borderBottom: 0 }}>
              Click any text in the preview to edit it. Changes appear as you type.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
