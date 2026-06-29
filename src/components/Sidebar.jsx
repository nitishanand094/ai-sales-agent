import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { setPage } from '../store/uiSlice'
import SyncSettings from './SyncSettings'

const ICONS = {
  dashboard: (
    <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>
  ),
  profiler: (
    <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>
  ),
  recommendations: (
    <><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>
  ),
  comparison: (
    <><line x1="6" y1="20" x2="6" y2="14" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="18" y1="20" x2="18" y2="10" /></>
  ),
}

function NavIcon({ id }) {
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
      stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[id]}
    </svg>
  )
}

const NAV = [
  { id: 'dashboard',       label: 'Dashboard' },
  { id: 'profiler',        label: 'Client Profile' },
  { id: 'recommendations', label: 'Product Catalogue' },
  { id: 'comparison',      label: 'Policy Comparison' },
]

const SYNC_DOT_COLOR = { synced: '#22C55E', syncing: '#F59E0B', error: '#EF4444', idle: '#94A3B8' }

export default function Sidebar() {
  const page = useSelector(s => s.ui.page)
  const syncStatus = useSelector(s => s.sync.status)
  const syncConfigured = useSelector(s => !!s.sync.gistId)
  const dispatch = useDispatch()
  const [settingsOpen, setSettingsOpen] = useState(false)

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-org">Advisor Portal</div>
          <div className="sidebar-brand">AI Sales Agent</div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-group-label">Navigation</div>
          {NAV.map(n => (
            <button key={n.id} className={`nav-item${page === n.id ? ' active' : ''}`} onClick={() => dispatch(setPage(n.id))}>
              <NavIcon id={n.id} />
              {n.label}
            </button>
          ))}
        </nav>

        <button className="sync-settings-btn" onClick={() => setSettingsOpen(true)}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          <span>Sync Settings</span>
          <span
            className="sync-dot"
            style={{ background: syncConfigured ? SYNC_DOT_COLOR[syncStatus] : 'rgba(255,255,255,0.2)' }}
            title={syncConfigured ? syncStatus : 'not configured'}
          />
        </button>

        <div className="sidebar-footer">
          <div className="avatar">D</div>
          <div>
            <div className="advisor-name">demo</div>
            <div className="advisor-role">demo-role</div>
          </div>
        </div>
      </aside>

      {settingsOpen && <SyncSettings onClose={() => setSettingsOpen(false)} />}
    </>
  )
}
