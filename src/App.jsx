import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppCtx, Avatar, Btn, Icon } from './ui.jsx'
import { ALERTS, ALERT_TEMPLATES, BRANDS, ENTRIES, ENVS, LOCALES, ROUTES } from './data.js'
import { api, detectApi, toUiAlert, toUiTemplate } from './api.js'
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
  ['Workspace', [
    ['home', 'Home', 'home'],
    ['content', 'Content', 'file'],
    ['assets', 'Assets', 'image'],
    ['releases', 'Workflow and releases', 'layers'],
  ]],
  ['Airline', [
    ['disruption', 'Disruption centre', 'alert'],
    ['fares', 'Routes and fares', 'plane'],
  ]],
  ['Global', [
    ['translations', 'Translations', 'globe'],
    ['markets', 'Markets and locales', 'map'],
  ]],
  ['Build', [['model', 'Content model', 'box']]],
  ['Admin', [
    ['access', 'Users, roles and audit', 'users'],
    ['settings', 'Settings', 'settings'],
  ]],
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
      ...NAV.flatMap(([, list]) => list.map(([id, label, icon]) => ({ label: `Go to ${label}`, hint: 'Navigate', icon, run: () => nav(id) }))),
      { label: 'New travel alert', hint: 'Action', icon: 'alert', run: () => nav('disruption', { compose: true }) },
      { label: `Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`, hint: 'Action', icon: theme === 'dark' ? 'sun' : 'moon', run: () => setTheme(theme === 'dark' ? 'light' : 'dark') },
      ...entries.map((e) => ({ label: e.title, hint: e.type, icon: 'file', run: () => nav('editor', { id: e.id }) })),
    ]
    const s = q.trim().toLowerCase()
    return (s ? all.filter((i) => `${i.label} ${i.hint}`.toLowerCase().includes(s)) : all).slice(0, 12)
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
      <div className="modal" role="dialog" aria-label="Command palette">
        <input autoFocus className="palette-input" placeholder="Search entries, screens and actions" value={q} onChange={(e) => { setQ(e.target.value); setSel(0) }} onKeyDown={onKey} />
        <div className="palette-list">
          {items.length === 0 && <div className="empty">Nothing matches “{q}”.</div>}
          {items.map((i, n) => (
            <button key={i.label + n} className={`palette-item ${n === sel ? 'sel' : ''}`} onMouseEnter={() => setSel(n)} onClick={() => run(i)}>
              <Icon name={i.icon} />
              <span className="grow truncate">{i.label}</span>
              <span className="faint" style={{ fontSize: 12 }}>{i.hint}</span>
            </button>
          ))}
        </div>
      </div>
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
  const [entries, setEntries] = useState(ENTRIES)
  const [alerts, setAlerts] = useState(ALERTS)
  const [routes, setRoutes] = useState(ROUTES)
  const [maxAge, setMaxAge] = useState(6)
  const [apiLive, setApiLive] = useState(false)
  const [templates, setTemplates] = useState(ALERT_TEMPLATES)
  const toastId = useRef(0)

  // With the API running, alerts and templates come from the server; otherwise the mock data stays.
  const reloadAlerts = useCallback(async () => setAlerts((await api('/alerts')).items.map(toUiAlert)), [])
  useEffect(() => {
    let off = false
    detectApi().then(async (ok) => {
      if (!ok || off) return
      try {
        const [a, t] = await Promise.all([api('/alerts'), api('/alert-templates')])
        if (off) return
        setAlerts(a.items.map(toUiAlert))
        setTemplates(t.items.map(toUiTemplate))
        setApiLive(true)
      } catch { /* stay on mock data */ }
    })
    return () => { off = true }
  }, [])

  useEffect(() => { document.documentElement.dataset.theme = theme }, [theme])
  useEffect(() => {
    const h = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPalette((p) => !p) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const nav = useCallback((screen, params = {}) => { setRoute({ screen, params }); setMenu(false) }, [])
  const toast = useCallback((msg) => {
    const id = ++toastId.current
    setToasts((t) => [...t, { id, msg }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600)
  }, [])

  const liveAlerts = alerts.filter((a) => a.status === 'Live').length
  const ctx = { nav, toast, entries, setEntries, alerts, setAlerts, routes, setRoutes, maxAge, setMaxAge, locale, setLocale, brand, env, theme, apiLive, templates, reloadAlerts }
  const Screen = SCREENS[route.screen] || Dashboard
  const activeNav = route.screen === 'editor' ? 'content' : route.screen

  return (
    <AppCtx.Provider value={ctx}>
      <div className="shell">
        <aside className={`sidebar ${menu ? 'open' : ''}`}>
          <div className="brand">
            <div className="brand-mark"><Icon name="plane" size={16} /></div>
            <div>
              <div className="brand-name">Altitude</div>
              <div className="brand-sub">Content platform for airlines</div>
            </div>
          </div>
          <nav className="nav" aria-label="Main">
            {NAV.map(([group, list]) => (
              <div key={group}>
                <div className="nav-group">{group}</div>
                {list.map(([id, label, icon]) => (
                  <button key={id} className={`nav-item ${activeNav === id ? 'active' : ''}`} onClick={() => nav(id)}>
                    <Icon name={icon} />
                    <span>{label}</span>
                    {id === 'disruption' && liveAlerts > 0 && <span className="count">{liveAlerts}</span>}
                  </button>
                ))}
              </div>
            ))}
          </nav>
          <div className="sidebar-foot">{apiLive ? 'Alerts and audit log: live API · rest: mock data' : 'Prototype · mock data · v0.1'}</div>
        </aside>

        <div className="main">
          <header className="topbar">
            <Btn kind="ghost menu-btn" icon="menu" aria-label="Open menu" onClick={() => setMenu((m) => !m)} />
            <label className="ctx">
              <span>Brand</span>
              <select value={brand} onChange={(e) => { setBrand(e.target.value); toast(`Switched to ${e.target.value}`) }}>
                {BRANDS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </label>
            <label className="ctx hide-sm">
              <span>Env</span>
              <select value={env} onChange={(e) => setEnv(e.target.value)}>{ENVS.map((b) => <option key={b}>{b}</option>)}</select>
            </label>
            <label className="ctx hide-sm">
              <span>Market</span>
              <select value={locale} onChange={(e) => setLocale(e.target.value)}>
                {LOCALES.map((l) => <option key={l.code} value={l.code}>{l.market} · {l.code}</option>)}
              </select>
            </label>
            <div className="grow" />
            <button className="search-trigger" onClick={() => setPalette(true)} aria-label="Search">
              <Icon name="search" />
              <span className="lbl">Search or jump to…</span>
              <span className="kbd">Ctrl K</span>
            </button>
            <Btn kind="ghost" icon={theme === 'dark' ? 'sun' : 'moon'} aria-label="Toggle theme" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
            <Avatar initials="PR" />
          </header>
          <main className="content" onClick={() => menu && setMenu(false)}>
            <Screen key={route.screen + (route.params.id || '')} params={route.params} />
          </main>
        </div>
      </div>
      {palette && <Palette onClose={() => setPalette(false)} nav={nav} entries={entries} theme={theme} setTheme={setTheme} />}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => <div key={t.id} className="toast"><Icon name="check" />{t.msg}</div>)}
      </div>
    </AppCtx.Provider>
  )
}
