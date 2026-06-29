import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import PlanDetailModal from '../components/PlanDetailModal'
import { selectPlans, selectPlanTypes, selectPlansMeta } from '../store/plansSlice'
import { setPage, notify } from '../store/uiSlice'
import { estimatePremium, PREMIUM_METHODOLOGY } from '../engine/premiumEstimator'

// Generic product catalogue — NOT client-specific. For AI-matched, per-client
// recommendations, use the Client Profile → Recommendations tab.
export default function Recommendations() {
  const dispatch = useDispatch()
  const addToast = (msg, type) => dispatch(notify(msg, type))
  const plans = useSelector(selectPlans)
  const planTypes = useSelector(selectPlanTypes)
  const meta = useSelector(selectPlansMeta)
  const [filter, setFilter] = useState('All')
  const [sel, setSel] = useState([])
  const [sortBy, setSortBy] = useState('match')
  const [detailPlan, setDetailPlan] = useState(null)
  const [methodOpen, setMethodOpen] = useState(false)

  const toggle = id => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])

  const filtered = plans
    .filter(p => filter === 'All' || p.type === filter)
    .sort((a, b) => sortBy === 'match' ? b.suitabilityScore - a.suitabilityScore : a.premiumValue - b.premiumValue)

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-eyebrow">Product Catalogue</div>
        <h1 className="page-title">All Plans</h1>
        <p className="page-subtitle">
          Browse the full product range. For recommendations matched to a specific client,
          build a profile under <button className="link-btn" onClick={() => dispatch(setPage('profiler'))}>Client Profile</button>.
        </p>
        <div className="data-source">Catalogue source: {meta.source === 'live' ? 'live feed' : meta.source === 'cache' ? 'cached feed' : 'bundled'} · {plans.length} plans</div>
      </div>

      {/* Filter + sort row */}
      <div className="filter-row">
        {planTypes.map(t => (
          <button key={t} className={`filter-btn${filter === t ? ' active' : ''}`} onClick={() => setFilter(t)}>{t}</button>
        ))}
        <span className="filter-count">{filtered.length} plan{filtered.length !== 1 ? 's' : ''}</span>
        <select className="form-select" style={{ width: 'auto', padding: '5px 28px 5px 10px', fontSize: 12.5 }}
          value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="match">Sort: Suitability</option>
          <option value="premium">Sort: Lowest Premium</option>
        </select>
      </div>

      {/* Product grid */}
      {filtered.length === 0 ? (
        <div className="empty-state"><div>No plans found for this filter.</div></div>
      ) : (
        <div className="product-grid">
          {filtered.map(p => (
            <div key={p.id} className={`product-card${sel.includes(p.id) ? ' selected' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className={`product-type ${p.typeClass}`}>{p.type}</span>
                {sel.includes(p.id) && (
                  <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600, background: 'var(--primary-muted)', border: '1px solid rgba(0,173,239,0.18)', borderRadius: 3, padding: '2px 7px' }}>
                    In Comparison
                  </span>
                )}
              </div>
              <div className="product-name">{p.name}</div>
              <div style={{ marginBottom: 4 }}>
                <div className="product-premium-lbl">Approx Annual Premium</div>
                <div className="product-premium">₹{estimatePremium(p).toLocaleString('en-IN')}<span className="est-tag">est.</span></div>
                <div className="product-cover">
                  {p.premium !== 'On quote' ? `Insurer min: ${p.premium.replace('*', '')} · ` : ''}Cover: {p.cover}
                </div>
              </div>
              <div className="product-benefit">{p.benefit}</div>
              <ul className="plan-card-highlights">
                {p.highlights.map((h, i) => <li key={i} className="plan-card-highlight">{h}</li>)}
              </ul>
              <div className="product-actions">
                <button
                  className={`btn btn-sm${sel.includes(p.id) ? ' btn-accent' : ' btn-outline'}`}
                  onClick={() => {
                    toggle(p.id)
                    addToast(sel.includes(p.id) ? `Removed ${p.shortName} from comparison.` : `${p.shortName} added to comparison.`, 'info')
                  }}
                >
                  {sel.includes(p.id) ? 'Added' : 'Add to Compare'}
                </button>
                <button className="btn btn-sm btn-primary" onClick={() => setDetailPlan(p)}>View Details</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="expandable" style={{ marginTop: 20 }}>
        <div className="expand-head" onClick={() => setMethodOpen(!methodOpen)}>
          <span>How are approx premiums calculated?</span>
          <span className={`expand-arrow${methodOpen ? ' open' : ''}`}>▾</span>
        </div>
        {methodOpen && (
          <div className="expand-body">
            <ul className="reason-list">
              {PREMIUM_METHODOLOGY.map((m, i) => (
                <li key={i} className="reason-item"><span className="reason-dot" /><span>{m}</span></li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {detailPlan && (
        <PlanDetailModal
          plan={detailPlan}
          onClose={() => setDetailPlan(null)}
          onCompare={id => toggle(id)}
          isCompared={sel.includes(detailPlan.id)}
          addToast={addToast}
        />
      )}
    </div>
  )
}
