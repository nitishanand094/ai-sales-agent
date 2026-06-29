import { useState, Fragment } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import Slider from '../components/Slider'
import ProgressBar from '../components/ProgressBar'
import PlanDetailModal from '../components/PlanDetailModal'
import { selectPlanTypes } from '../store/plansSlice'
import { setPage, notify } from '../store/uiSlice'
import { setClient } from '../store/clientSlice'
import { addEntry, deleteEntry } from '../store/historySlice'
import { upsertClient, deleteClient } from '../store/savedClientsSlice'
import { rankPlans, clientScore, buildReasoning, planReason } from '../engine/matchEngine'
import { estimatePremium, PREMIUM_METHODOLOGY } from '../engine/premiumEstimator'

const fmtCr = v => v >= 10000000 ? '₹' + (v / 10000000).toFixed(1) + ' Cr' : '₹' + (v / 100000).toFixed(0) + ' L'
const fmtRs = v => '₹' + v.toLocaleString('en-IN')
const fmtDate = iso => {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

const TYPE_CLASS = {
  Term: 'type-term', ULIP: 'type-ulip', Savings: 'type-endow',
  'Child Plan': 'type-child', Retirement: 'type-retire', Health: 'type-health',
}
const typeClassFor = t => TYPE_CLASS[t] || 'type-term'

const BLANK = {
  name: '', age: 35, gender: 'Female', city: '', income: '12-25L',
  marital: 'Married', dependents: 2, goal: "Child's Future", risk: 'Moderate',
  hasIns: 'No', sa: 5000000, term: 20, premium: 10000,
}

function RecommendationsTab({ client, addToast, onGoToBuilder, planTypes }) {
  const [filter, setFilter] = useState('All')
  const [sortBy, setSortBy] = useState('match')
  const [sel, setSel] = useState([])
  const [open, setOpen] = useState(false)
  const [methodOpen, setMethodOpen] = useState(false)
  const [detailPlan, setDetailPlan] = useState(null)

  if (!client) {
    return (
      <div className="rec-empty-wrap">
        <div className="rec-empty-title">Client Profile Required</div>
        <p className="rec-empty-desc">
          To see AI-matched product recommendations, please complete the client profile first.
          The AI engine uses the client's age, income, goals, risk appetite, and coverage needs
          to rank and select the most suitable plans.
        </p>
        <button className="btn btn-primary" onClick={onGoToBuilder}>
          + Build Client Profile
        </button>
      </div>
    )
  }

  const filtered = rankPlans(client)
    .filter(p => filter === 'All' || p.type === filter)
    .sort((a, b) => sortBy === 'match' ? b.aiMatch - a.aiMatch : a.premiumValue - b.premiumValue)

  const score = clientScore(client)
  const reasons = buildReasoning(client)
  const toggle = id => setSel(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const clientName = client.name || 'Client'

  return (
    <div>
      <button className="btn btn-outline btn-sm" style={{ marginBottom: 14 }} onClick={onGoToBuilder}>← Edit Profile</button>
      <div className="client-bar" style={{ marginBottom: 20 }}>
        <div>
          <div className="client-name">{clientName}</div>
          <div className="client-detail">Age {client.age} · {client.gender}{client.city ? ` · ${client.city}` : ''}</div>
          <div className="client-tags">
            <span className="client-tag">{client.income} Annual Income</span>
            <span className="client-tag">{client.goal}</span>
            <span className="client-tag">{client.risk} Risk</span>
            <span className="client-tag">{client.dependents} Dependents</span>
          </div>
        </div>
        <div className="ai-score-box">
          <div className="ai-score-num">{score}%</div>
          <div className="ai-score-lbl">AI Match Score</div>
        </div>
      </div>

      <div className="filter-row">
        {planTypes.map(t => (
          <button key={t} className={`filter-btn${filter === t ? ' active' : ''}`} onClick={() => setFilter(t)}>{t}</button>
        ))}
        <span className="filter-count">{filtered.length} plan{filtered.length !== 1 ? 's' : ''}</span>
        <select className="form-select" style={{ width: 'auto', padding: '5px 28px 5px 10px', fontSize: 12.5 }}
          value={sortBy} onChange={e => setSortBy(e.target.value)}>
          <option value="match">Sort: Best Match</option>
          <option value="premium">Sort: Lowest Premium</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div>No plans found for this filter.</div>
        </div>
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
              <div>
                <div className="product-premium-lbl">Approx Annual Premium</div>
                <div className="product-premium">₹{estimatePremium(p, client).toLocaleString('en-IN')}<span className="est-tag">est.</span></div>
                <div className="product-cover">
                  {p.premium !== 'On quote' ? `Insurer min: ${p.premium.replace('*', '')} · ` : ''}Cover: {p.cover}
                </div>
              </div>
              <div className="product-benefit">{p.benefit}</div>
              <ul className="plan-card-highlights">
                {p.highlights.map((h, i) => <li key={i} className="plan-card-highlight">{h}</li>)}
              </ul>
              <div className="rec-why"><span className="rec-why-label">Why for {clientName}:</span> {planReason(client, p)}</div>
              <div className="match-row" style={{ marginTop: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>AI Profile Match</span>
                <span className="match-pct">{p.aiMatch}%</span>
              </div>
              <ProgressBar value={p.aiMatch} color={p.color} />
              <div className="product-actions">
                <button className={`btn btn-sm${sel.includes(p.id) ? ' btn-accent' : ' btn-outline'}`}
                  onClick={() => { toggle(p.id); addToast(sel.includes(p.id) ? `Removed ${p.shortName} from comparison.` : `${p.shortName} added to comparison.`, 'info') }}>
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
          clientName={clientName}
          client={client}
        />
      )}

      <div className="expandable" style={{ marginTop: 20 }}>
        <div className="expand-head" onClick={() => setOpen(!open)}>
          <span>Why these products? — AI Reasoning</span>
          <span className={`expand-arrow${open ? ' open' : ''}`}>▾</span>
        </div>
        {open && (
          <div className="expand-body">
            <p>Based on {clientName}'s profile, the AI engine applied the following reasoning:</p>
            <ul className="reason-list">
              {reasons.map((r, i) => (
                <li key={i} className="reason-item">
                  <span className="reason-dot" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function SavedClientsTab({ savedClients, onLoadAndGenerate, onEdit, onDelete }) {
  if (savedClients.length === 0) {
    return (
      <div className="rec-empty-wrap">
        <div className="rec-empty-title">No Saved Clients Yet</div>
        <p className="rec-empty-desc">
          Fill the Profile Builder and click <strong>Save Client</strong> to store a client here.
          Saved clients persist across sessions and can be reloaded or re-analysed in one click.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 16 }}>
        {savedClients.length} saved client{savedClients.length !== 1 ? 's' : ''}
      </div>
      <div className="product-grid">
        {savedClients.map(c => (
          <div key={c.id} className="product-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <span className="product-type type-term" style={{ fontSize: 12 }}>{c.name}</span>
              <span className="activity-goal" style={{ marginLeft: 0 }}>{c.profile.goal}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--fg)', marginBottom: 4 }}>
              Age {c.profile.age} · {c.profile.gender}{c.profile.city ? ` · ${c.profile.city}` : ''}
            </div>
            <div style={{ marginBottom: 6 }}>
              <span className={`risk-chip risk-${c.profile.risk.toLowerCase()}`}>{c.profile.risk} Risk</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>
              {c.profile.income} income · {c.profile.dependents} dependent{c.profile.dependents !== 1 ? 's' : ''}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 16 }}>
              Saved {fmtDate(c.savedAt)}
            </div>
            <div className="product-actions">
              <button className="btn btn-sm btn-primary" onClick={() => onLoadAndGenerate(c.profile)}>
                Load &amp; Generate
              </button>
              <button className="btn btn-sm btn-outline" onClick={() => onEdit(c.profile)}>
                Edit
              </button>
              <button className="btn btn-sm hist-del-btn" onClick={() => onDelete(c.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function HistoryTab({ history, onDelete, onRestoreProfile }) {
  const [openId, setOpenId] = useState(null)
  const handleDelete = id => onDelete(id)
  const toggle = id => setOpenId(cur => cur === id ? null : id)

  if (history.length === 0) {
    return (
      <div className="rec-empty-wrap">
        <div className="rec-empty-title">No Recommendation History Yet</div>
        <p className="rec-empty-desc">
          Saved profiles and the recommendations generated for them will appear here. Complete a profile in the Profile Builder to create your first record.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 16 }}>
        {history.length} saved profile{history.length !== 1 ? 's' : ''} — select one to view the recommendations generated for it.
      </div>
      <div className="table-wrap">
        <table className="hist-table">
          <thead>
            <tr>
              <th>Client</th>
              <th>Profile</th>
              <th>Goal</th>
              <th>Risk</th>
              <th>Top Match</th>
              <th>Date &amp; Time</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {history.map(e => (
              <Fragment key={e.id}>
                <tr>
                  <td>
                    <div className="hist-client-name">{e.profile.name || '—'}</div>
                    <div className="hist-client-sub">{e.profile.city || 'City not set'}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 13, color: 'var(--fg)' }}>Age {e.profile.age} · {e.profile.gender}</div>
                    <div className="hist-client-sub">{e.profile.income}</div>
                  </td>
                  <td><span className="activity-goal" style={{ marginLeft: 0 }}>{e.profile.goal}</span></td>
                  <td>
                    <span className={`risk-chip risk-${e.profile.risk.toLowerCase()}`}>{e.profile.risk}</span>
                  </td>
                  <td className="hist-top-rec">{e.topRec}</td>
                  <td className="hist-date">{fmtDate(e.timestamp)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm btn-outline" onClick={() => toggle(e.id)}>
                        {openId === e.id ? 'Hide' : 'Recommendations'}
                      </button>
                      <button className="btn btn-sm btn-outline" onClick={() => onRestoreProfile(e.profile)}>Restore</button>
                      <button className="btn btn-sm hist-del-btn" onClick={() => handleDelete(e.id)}>✕</button>
                    </div>
                  </td>
                </tr>
                {openId === e.id && (
                  <tr className="hist-recs-row">
                    <td colSpan={7}>
                      <div className="hist-recs-title">Recommendations generated for {e.profile.name || 'this profile'}</div>
                      {(e.recs && e.recs.length) ? (
                        <ol className="hist-recs-list">
                          {e.recs.map((r, i) => (
                            <li key={i} className="hist-rec-item">
                              <div className="hist-rec-head">
                                <span className="hist-rec-name">{r.name}</span>
                                <span className={`product-type ${typeClassFor(r.type)}`}>{r.type}</span>
                                <span className="hist-rec-match">{r.aiMatch}% match</span>
                              </div>
                              {r.reason && <div className="hist-rec-reason">{r.reason}</div>}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <div className="hist-client-sub">Top match: {e.topRec} (detailed recommendations not stored for this older record).</div>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function Profiler() {
  const dispatch = useDispatch()
  const client = useSelector(s => s.client.current)
  const history = useSelector(s => s.history.items)
  const savedClientsList = useSelector(s => s.savedClients.items)
  const planTypes = useSelector(selectPlanTypes)
  const addToast = (msg, type) => dispatch(notify(msg, type))

  const [tab, setTab] = useState('builder')
  const [step, setStep] = useState(1)
  const [f, setF] = useState(BLANK)
  const set = (k, v) => setF(p => ({ ...p, [k]: v }))
  const STEPS = ['Basic Info', 'Family & Goals', 'Coverage Needs']

  const handleGenerateRecs = () => {
    const ranked = rankPlans(f)
    const topPlan = ranked[0]
    const recs = ranked.slice(0, 5).map(p => ({
      name: p.shortName || p.name,
      type: p.type,
      aiMatch: p.aiMatch,
      reason: planReason(f, p),
    }))
    dispatch(setClient(f))
    dispatch(addEntry(f, topPlan?.shortName || topPlan?.name || 'N/A', clientScore(f), recs))
    dispatch(upsertClient(f))
    addToast(`Profile saved for ${f.name || 'client'}. Recommendations ready.`, 'success')
    setTab('recommendations')
  }

  const handleSaveClient = () => {
    dispatch(upsertClient(f))
    addToast(`${f.name || 'Client'} saved.`, 'success')
  }

  const handleLoadAndGenerate = profile => {
    const ranked = rankPlans(profile)
    const topPlan = ranked[0]
    const recs = ranked.slice(0, 5).map(p => ({
      name: p.shortName || p.name,
      type: p.type,
      aiMatch: p.aiMatch,
      reason: planReason(profile, p),
    }))
    dispatch(setClient(profile))
    dispatch(addEntry(profile, topPlan?.shortName || topPlan?.name || 'N/A', clientScore(profile), recs))
    setF(profile)
    addToast(`Recommendations generated for ${profile.name || 'client'}.`, 'success')
    setTab('recommendations')
  }

  const handleEditSaved = profile => {
    setF(profile)
    setStep(1)
    setTab('builder')
    addToast(`Profile loaded for ${profile.name || 'client'}.`, 'info')
  }

  const handleDeleteSaved = id => {
    dispatch(deleteClient(id))
    addToast('Saved client removed.', 'info')
  }

  const handleRestore = profile => {
    setF(profile)
    dispatch(setClient(profile))
    setStep(1)
    setTab('builder')
    addToast(`Profile restored for ${profile.name || 'client'}.`, 'info')
  }

  const handleDelete = id => {
    dispatch(deleteEntry(id))
    addToast('Record removed.', 'info')
  }

  const TABS = [
    { id: 'builder', label: 'Profile Builder', badge: null },
    { id: 'recommendations', label: 'Recommendations', badge: client ? <span className="tab-dot-green" /> : <span className="tab-dot-grey" /> },
    { id: 'saved', label: 'Saved Clients', badge: savedClientsList.length > 0 ? <span className="tab-badge">{savedClientsList.length}</span> : null },
    { id: 'history', label: 'Recommendation History', badge: history.length > 0 ? <span className="tab-badge">{history.length}</span> : null },
  ]

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-eyebrow">Client Profiler</div>
        <h1 className="page-title">Client Profile &amp; Recommendations</h1>
        <p className="page-subtitle">Build a client profile, generate AI-matched recommendations, and review the recommendation history for each saved profile.</p>
      </div>

      <div className="profile-tab-bar">
        {TABS.map(t => (
          <button key={t.id} className={`profile-tab-btn${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
            {t.badge}
          </button>
        ))}
      </div>

      {tab === 'builder' && (
        <div>
          <div className="stepper">
            {STEPS.map((label, i) => {
              const n = i + 1
              const state = n < step ? 'done' : n === step ? 'active' : 'pending'
              return (
                <div key={n} className="step-seg">
                  <div className={`step-bubble ${state}`}>{state === 'done' ? '✓' : n}</div>
                  <span className={`step-name ${state}`}>{label}</span>
                  {i < STEPS.length - 1 && <div className={`step-line${n < step ? ' done' : ''}`} />}
                </div>
              )
            })}
          </div>
          <div className="card">
            {step === 1 && (
              <div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="fname">Full Name</label>
                    <input id="fname" className="form-input" placeholder="e.g. Priya Sharma" value={f.name} onChange={e => set('name', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="city">City</label>
                    <input id="city" className="form-input" placeholder="e.g. Bengaluru" value={f.city} onChange={e => set('city', e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Age: {f.age} years</label>
                  <Slider min={18} max={70} value={f.age} onChange={v => set('age', v)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Gender</label>
                  <div className="toggle-row">
                    {['Male', 'Female', 'Other'].map(g => (
                      <button key={g} className={`toggle-opt${f.gender === g ? ' on' : ''}`} onClick={() => set('gender', g)}>{g}</button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="income">Annual Income</label>
                  <div className="form-select-wrap">
                    <select id="income" className="form-select" value={f.income} onChange={e => set('income', e.target.value)}>
                      <option value="lt3L">Below ₹3 Lakhs</option>
                      <option value="3-6L">₹3 – 6 Lakhs</option>
                      <option value="6-12L">₹6 – 12 Lakhs</option>
                      <option value="12-25L">₹12 – 25 Lakhs</option>
                      <option value="25Lplus">Above ₹25 Lakhs</option>
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button className="btn btn-primary" onClick={() => setStep(2)}>Continue to Family &amp; Goals</button>
                </div>
              </div>
            )}
            {step === 2 && (
              <div>
                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label">Marital Status</label>
                    <div className="toggle-row">
                      {['Single', 'Married', 'Divorced'].map(s => (
                        <button key={s} className={`toggle-opt${f.marital === s ? ' on' : ''}`} onClick={() => set('marital', s)}>{s}</button>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Dependents: {f.dependents}</label>
                    <Slider min={0} max={8} value={f.dependents} onChange={v => set('dependents', v)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Primary Goal</label>
                  <div className="chip-group">
                    {["Tax Saving", "Child's Future", "Retirement Planning", "Pure Protection", "Wealth Creation"].map(g => (
                      <label className="chip-opt" key={g}>
                        <input type="radio" name="goal" checked={f.goal === g} onChange={() => set('goal', g)} />
                        <span className="chip-label">{g}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Risk Appetite</label>
                  <div className="chip-group">
                    {[
                      { v: 'Conservative', d: 'Capital preservation' },
                      { v: 'Moderate', d: 'Balanced growth' },
                      { v: 'Aggressive', d: 'High growth potential' },
                    ].map(r => (
                      <label className="chip-opt" key={r.v}>
                        <input type="radio" name="risk" checked={f.risk === r.v} onChange={() => set('risk', r.v)} />
                        <span className="chip-label">{r.v} <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 4 }}>· {r.d}</span></span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-actions spread">
                  <button className="btn btn-outline" onClick={() => setStep(1)}>Back</button>
                  <button className="btn btn-primary" onClick={() => setStep(3)}>Continue to Coverage</button>
                </div>
              </div>
            )}
            {step === 3 && (
              <div>
                <div className="form-group">
                  <label className="form-label">Existing Life Insurance?</label>
                  <div className="toggle-row">
                    {['Yes', 'No'].map(v => (
                      <button key={v} className={`toggle-opt${f.hasIns === v ? ' on' : ''}`} onClick={() => set('hasIns', v)}>{v}</button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Sum Assured Required</label>
                  <Slider min={1000000} max={20000000} step={500000} value={f.sa} onChange={v => set('sa', v)} format={fmtCr} />
                </div>
                <div className="form-group">
                  <label className="form-label">Policy Term Preference</label>
                  <div className="chip-group">
                    {[10, 15, 20, 25, 30].map(t => (
                      <label className="chip-opt" key={t}>
                        <input type="radio" name="term" checked={f.term === t} onChange={() => set('term', t)} />
                        <span className="chip-label">{t} yrs</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Premium Budget</label>
                  <Slider min={500} max={50000} step={500} value={f.premium} onChange={v => set('premium', v)} format={fmtRs} />
                </div>
                <div className="form-actions spread">
                  <button className="btn btn-outline" onClick={() => setStep(2)}>Back</button>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-outline" onClick={handleSaveClient}>Save Client</button>
                    <button className="btn btn-primary btn-lg" onClick={handleGenerateRecs}>
                      Generate Recommendations
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="step-foot">
            <div className="step-foot-lbl">Step {step} of 3</div>
            <div className="step-foot-track">
              <div className="step-foot-fill" style={{ width: (step / 3 * 100) + '%' }} />
            </div>
          </div>
        </div>
      )}

      {tab === 'recommendations' && (
        <RecommendationsTab
          client={client}
          addToast={addToast}
          onGoToBuilder={() => setTab('builder')}
          planTypes={planTypes}
        />
      )}

      {tab === 'saved' && (
        <SavedClientsTab
          savedClients={savedClientsList}
          onLoadAndGenerate={handleLoadAndGenerate}
          onEdit={handleEditSaved}
          onDelete={handleDeleteSaved}
        />
      )}

      {tab === 'history' && (
        <HistoryTab
          history={history}
          onDelete={handleDelete}
          onRestoreProfile={handleRestore}
        />
      )}
    </div>
  )
}
