import { cloneElement, createContext, isValidElement, useContext, useEffect, useId } from 'react'

const PATHS = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10',
  file: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9h.01',
  layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  alert: 'M12 3l10 18H2zM12 10v5M12 18h.01',
  plane: 'M2 16l20-7-4 9-6-3-3 5-2-5z',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  map: 'M9 4L3 6v14l6-2 6 2 6-2V4l-6 2zM9 4v14M15 6v14',
  box: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM4 7.5l8 4.5 8-4.5M12 12v9',
  users: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21c0-4 3-6 7-6s7 2 7 6M17 4a4 4 0 010 7M22 21c0-3-1.5-5-4-5.6',
  settings: 'M12 9a3 3 0 100 6 3 3 0 000-6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12l5 5 9-10',
  right: 'M9 6l6 6-6 6',
  left: 'M15 6l-6 6 6 6',
  sun: 'M12 8a4 4 0 100 8 4 4 0 000-8zM12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  moon: 'M20 14A8 8 0 019 4a8 8 0 1011 10z',
  spark: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
  menu: 'M4 6h16M4 12h16M4 18h16',
  x: 'M6 6l12 12M18 6L6 18',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z',
  send: 'M21 3L3 10l7 3 3 7zM10 13l5-5',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z',
  phone: 'M8 3h8v18H8zM11 18h2',
  desktop: 'M3 5h18v11H3zM8 20h8M12 16v4',
}

export function Icon({ name, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}>
      <path d={PATHS[name] || ''} />
    </svg>
  )
}

export function Btn({ kind = '', size = '', icon, children, ...rest }) {
  return (
    <button type="button" className={`btn ${kind} ${size} ${!children && icon ? 'icon' : ''}`} {...rest}>
      {icon && !children && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {children}
    </button>
  )
}

export const Badge = ({ tone = '', plain, children }) => (
  <span className={`badge ${tone} ${plain ? 'plain' : ''}`}>{children}</span>
)

const STAGE_TONE = { Draft: '', 'In review': 'info', 'Legal review': 'info', Approved: 'warn', Published: 'good' }
export const StageBadge = ({ stage }) => <Badge tone={STAGE_TONE[stage]}>{stage}</Badge>

export function Card({ title, action, children, flush, style }) {
  return (
    <section className="card" style={style}>
      {title && (
        <div className="card-head">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      <div className={flush ? '' : 'card-body'}>{children}</div>
    </section>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t} role="tab" aria-selected={value === t} className={`tab ${value === t ? 'active' : ''}`} onClick={() => onChange(t)}>
          {t}
        </button>
      ))}
    </div>
  )
}

export const Switch = ({ on, onChange, label }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />
)

export const Avatar = ({ initials, sm }) => <span className={`avatar ${sm ? 'sm' : ''}`}>{initials}</span>

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="card-head">
          <h2>{title}</h2>
          <Btn kind="ghost" icon="x" aria-label="Close" onClick={onClose} />
        </div>
        <div className="card-body col" style={{ gap: 14 }}>{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, help, badge, children }) {
  // A single form control is tied to its label; anything else (chip groups, previews) becomes a labelled group.
  const id = useId()
  const control = isValidElement(children) && ['input', 'select', 'textarea'].includes(children.type)
  return (
    <div className="field" role={control ? undefined : 'group'} aria-labelledby={control ? undefined : id}>
      <label id={id} htmlFor={control ? `${id}-c` : undefined}>
        {label} {badge}
      </label>
      {control ? cloneElement(children, { id: `${id}-c` }) : children}
      {help && <span className="help">{help}</span>}
    </div>
  )
}

export const PageHead = ({ title, sub, children }) => (
  <div className="page-head">
    <div>
      <h1>{title}</h1>
    </div>
    <div className="row wrap">{children}</div>
  </div>
)

export const AppCtx = createContext(null)
export const useApp = () => useContext(AppCtx)
