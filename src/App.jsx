import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppCtx, Btn } from './ui.jsx'
import { BRANDS, ENVS, LOCALES, ROUTES } from './data.js'
import { DEV_USERS, api, detectApi, getToken, setToken, toUiAlert, toUiEntry, toUiTemplate } from './api.js'
import Dashboard from './screens/Dashboard.jsx'
import Content from './screens/Content.jsx'
import Editor from './screens/Editor.jsx'
import Model from './screens/Model.jsx'
import Assets from './screens/Assets.jsx'
import Translations from './screens/Translations.jsx'
import Releases from './screens/Releases.jsx'
import Disruption from './screens/Disruption.jsx'
import Fares from './screens/Fares.jsx'
import Markets from './screens/Markets.jsx'
import Access from './screens/Access.jsx'
import Settings from './screens/Settings.jsx'

const NAV = [
  ['Work', [['home', 'Overview'], ['content', 'Content'], ['translations', 'Translations'], ['releases', 'Workflow']]],
  ['Airline', [['disruption', 'Disruption centre'], ['fares', 'Routes and fares']]],
  ['Library', [['assets', 'Assets'], ['model', 'Content model'], ['markets', 'Markets']]],
  ['Admin', [['access', 'Users and audit'], ['settings', 'Settings']]],
]

const SCREENS = {
  home: Dashboard, content: Content, editor: Editor, model: Model, assets: Assets, translations: Translations,
  releases: Releases, disruption: Disruption, fares: Fares, markets: Markets, access: Access, settings: Settings,
}

function Palette({ onClose, nav, entries, setTheme, theme }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const items = useMemo(() => {
    const all = [
      ...NAV.flatMap(([, list]) => list.map(([id, label]) => ({ label, hint: 'Go to', run: () => nav(id) }))),
      { label: 'New travel alert', hint: 'Action', run: () => nav('disruption', { compose: true }) },
      { label: `Use ${theme === 'dark' ? 'light' : 'dark'} theme`, hint: 'Action', run: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
      ...entries.map((e) => ({ label: e.title, hint: e.type, run: () => nav('editor', { id: e.id }) })),
    ]
    const s = q.trim().toLowerCase()
    return (s ? all.filter((i) => `${i.label} ${i.hint}`.toLowerCase().includes(s)) : all).slice(0, 14)
  }, [q, entries, nav, setTheme, theme])
  const run = (i) => { if (i) { i.run(); onClose() } }
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, items.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
    if (e.key === 'Enter') run(items[sel])
    if (e.key === 'Escape') onClose()
  }
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-label="Search">
        <input autoFocus className="palette-input" placeholder="Search entries, screens and actions" value={q} onChange={(e) => { setQ(e.target.value); setSel(0) }} onKeyDown={onKey} />
        <div className="palette-list">
          {items.length === 0 && <div className="empty">Nothing matches “{q}”.</div>}
          {items.map((i, n) => (
            <button key={i.label + n} className={`palette-item ${n === sel ? 'sel' : ''}`} onMouseEnter={() => setSel(n)} onClick={() => run(i)}>
              <span className="grow truncate">{i.label}</span>
              <span className="faint mono">{i.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Offline({ retry }) {
  return (
    <div style={{ maxWidth: 560, margin: '14vh auto', padding: 24 }} className="col">
      <div className="brand-name">Altitude</div>
      <h1>The API server is not running</h1>
      <p className="muted">Content, translations, workflow, alerts and the audit log are read from the server. Start it in a second terminal, then retry.</p>
      <pre className="mono card card-body" style={{ margin: '8px 0' }}>cd server && npm install && npm run dev</pre>
      <div><Btn kind="primary" onClick={retry}>Retry</Btn></div>
    </div>
  )
}

export default function App() {
  const [route, setRoute] = useState({ screen: 'home', params: {} })
  const [theme, setTheme] = useState(() => (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'))
  const [brand, setBrand] = useState(BRANDS[0])
  const [env, setEnv] = useState(ENVS[0])
  const [locale, setLocale] = useState('en-GB')
  const [palette, setPalette] = useState(false)
  const [menu, setMenu] = useState(false)
  const [toasts, setToasts] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | offline
  const [me, setMe] = useState(null)
  const [entries, setEntries] = useState([])
  const [types, setTypes] = useState([])
  const [alerts, setAlerts] = useState([])
  const [templates, setTemplates] = useState([])
  const [routes, setRoutes] = useState(ROUTES)
  const [maxAge, setMaxAge] = useState(6)
  const [who, setWho] = useState(getToken())
  const toastId = useRef(0)

  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  useEffect(() => {
    const h = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p) } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const nav = useCallback((screen, params = {}) => { setRoute({ screen, params }); setMenu(false) }, [])
  const toast = useCallback((msg, err = false) => {
    const id = ++toastId.current
    setToasts((t) => [...t, { id, msg, err }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), err ? 6000 : 3200)
  }, [])

  const reloadEntries = useCallback(async () => setEntries((await api('/entries')).items.map(toUiEntry)), [])
  const reloadAlerts = useCallback(async () => setAlerts((await api('/alerts')).items.map(toUiAlert)), [])
  const load = useCallback(async () => {
    if (!(await detectApi())) return setStatus('offline')
    try {
      const [m, t, tp] = await Promise.all([api('/me'), api('/alert-templates'), api('/types')])
      setMe(m); setTemplates(t.items.map(toUiTemplate)); setTypes(tp.items)
      await Promise.all([reloadEntries(), reloadAlerts()])
      setStatus('ready')
    } catch (err) {
      toast(err.message, true)
      setStatus('offline')
    }
  }, [reloadEntries, reloadAlerts, toast])
  useEffect(() => { load() }, [load])

  /** Runs a server change, reports the outcome, and returns whether it worked. */
  const run = useCallback(async (fn, okMsg) => {
    try { const out = await fn(); if (okMsg) toast(okMsg); return out ?? true } catch (err) { toast(err.message, true); return false }
  }, [toast])

  const switchUser = async (t) => { setToken(t); setWho(t); await load() }

  if (status === 'loading') return <div className="empty">Loading…</div>
  if (status === 'offline') return <Offline retry={() => { setStatus('loading'); load() }} />

  const liveAlerts = alerts.filter((a) => a.status === 'Live').length
  const ctx = { nav, toast, run, me, entries, types, reloadEntries, alerts, templates, reloadAlerts, routes, setRoutes, maxAge, setMaxAge, locale, setLocale, brand, env, theme }
  const Screen = SCREENS[route.screen] || Dashboard
  const activeNav = route.screen === 'editor' ? 'content' : route.screen

  return (
    <AppCtx.Provider value={ctx}>
      <div className="shell">
        <aside className={`sidebar ${menu ? 'open' : ''}`}>
          <div className="brand">
            <div className="brand-name">Altitude</div>
            <div className="brand-sub">{brand}</div>
          </div>
          <nav className="nav" aria-label="Main">
            {NAV.map(([group, list]) => (
              <div key={group}>
                <div className="nav-group">{group}</div>
                {list.map(([id, label]) => (
                  <button key={id} className={`nav-item ${activeNav === id ? 'active' : ''}`} onClick={() => nav(id)}>
                    <span>{label}</span>
                    {id === 'disruption' && liveAlerts > 0 && <span className="count">{liveAlerts} live</span>}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div className="sidebar-foot">Live data: content, translations, workflow, alerts, audit.<br />Sample data: routes, assets, model, markets, settings.</div>
        </aside>

        <div className="main">
          <header className="topbar">
            <Btn kind="ghost menu-btn" icon="menu" aria-label="Open menu" onClick={() => setMenu((m) => !m)} />
            <label className="ctx">
              <span>Brand</span>
              <select aria-label="Brand" value={brand} onChange={(e) => setBrand(e.target.value)}>{BRANDS.map((b) => <option key={b}>{b}</option>)}</select>
            </label>
            <label className="ctx hide-sm">
              <span>Environment</span>
              <select aria-label="Environment" value={env} onChange={(e) => setEnv(e.target.value)}>{ENVS.map((b) => <option key={b}>{b}</option>)}</select>
            </label>
            <label className="ctx hide-sm">
              <span>Market</span>
              <select aria-label="Market" value={locale} onChange={(e) => setLocale(e.target.value)}>
                {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.market} ({l.code})</option>)}
              </select>
            </label>
            <div className="grow" />
            <button className="search-trigger" onClick={() => setPalette(true)} aria-label="Search">
              <span className="lbl">Search</span>
              <span className="kbd">Ctrl K</span>
            </button>
            <label className="who hide-sm" title="Sign-in is not built yet. This switches between the server's demo users.">
              Acting as
              <select value={who} onChange={(e) => switchUser(e.target.value)}>
                {DEV_USERS.map((u) => <option key={u.token} value={u.token}>{u.name} · {u.role}</option>)}
              </select>
            </label>
            <Btn kind="ghost" size="sm" aria-label="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? 'Light' : 'Dark'}</Btn>
          </header>
          <main className="content" onClick={() => menu && setMenu(false)}>
            <Screen key={route.screen + (route.params.id || '') + who} params={route.params} />
          </main>
        </div>
      </div>
      {palette && <Palette onClose={() => setPalette(false)} nav={nav} entries={entries} theme={theme} setTheme={setTheme} />}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.err ? 'err' : ''}`}>{t.msg}</div>)}
      </div>
    </AppCtx.Provider>
  )
}
