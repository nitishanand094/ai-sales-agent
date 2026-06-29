import { useSelector, useDispatch } from 'react-redux'
import { setPage } from '../store/uiSlice'

const NAV = [
  { id: 'dashboard', label: 'Home' },
  { id: 'profiler', label: 'Profile' },
  { id: 'recommendations', label: 'Catalogue' },
  { id: 'comparison', label: 'Compare' },
]
export default function MobileNav() {
  const page = useSelector(s => s.ui.page)
  const dispatch = useDispatch()
  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-inner">
        {NAV.map(n => (
          <button key={n.id} className={`mnav-btn${page === n.id ? ' active' : ''}`} onClick={() => dispatch(setPage(n.id))}>
            <span className="mnav-label">{n.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}
