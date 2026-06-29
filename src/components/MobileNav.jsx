import { useSelector, useDispatch } from 'react-redux'
import { setPage } from '../store/uiSlice'

const NAV = [
  {
    id: 'dashboard',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
        <path d="M9 21V12h6v9" />
      </svg>
    ),
  },
  {
    id: 'profiler',
    label: 'Profile',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
  {
    id: 'recommendations',
    label: 'Catalogue',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
        <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
        <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'comparison',
    label: 'Compare',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="10" width="4.5" height="11" rx="1" />
        <rect x="9.75" y="5" width="4.5" height="16" rx="1" />
        <rect x="16.5" y="7.5" width="4.5" height="13.5" rx="1" />
      </svg>
    ),
  },
]

export default function MobileNav() {
  const page = useSelector(s => s.ui.page)
  const dispatch = useDispatch()

  return (
    <nav className="mobile-nav" role="navigation" aria-label="Main navigation">
      {NAV.map(n => {
        const active = page === n.id
        return (
          <button
            key={n.id}
            className={`mnav-btn${active ? ' active' : ''}`}
            onClick={() => dispatch(setPage(n.id))}
            aria-current={active ? 'page' : undefined}
            aria-label={n.label}
          >
            <span className="mnav-icon">{n.icon}</span>
            <span className="mnav-label">{n.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
