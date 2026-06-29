import { useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { loadPlans } from './store/plansSlice'
import { loadFromGist } from './store/syncSlice'
import Sidebar from './components/Sidebar'
import MobileNav from './components/MobileNav'
import Dashboard from './pages/Dashboard'
import Profiler from './pages/Profiler'
import Recommendations from './pages/Recommendations'
import Comparison from './pages/Comparison'

function Toast({ msg, type }) {
  return (
    <div className={`toast ${type || ''}`}>
      <span>{msg}</span>
    </div>
  )
}

function CurrentPage({ page }) {
  switch (page) {
    case 'profiler':         return <Profiler />
    case 'recommendations':  return <Recommendations />
    case 'comparison':       return <Comparison />
    default:                 return <Dashboard />
  }
}

export default function App() {
  const dispatch = useDispatch()
  const page = useSelector(s => s.ui.page)
  const toasts = useSelector(s => s.ui.toasts)
  const plansReady = useSelector(s => s.plans.status)

  useEffect(() => { dispatch(loadPlans()) }, [dispatch])

  // If sync is configured, load from Gist on mount
  const syncGistId = useSelector(s => s.sync.gistId)
  useEffect(() => {
    if (syncGistId) dispatch(loadFromGist())
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content" key={`${page}-${plansReady}`}>
        <CurrentPage page={page} />
      </main>
      <MobileNav />
      <div className="toast-container">
        {toasts.map(t => <Toast key={t.id} msg={t.msg} type={t.type} />)}
      </div>
    </div>
  )
}
