import { useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { setPage } from '../store/uiSlice'
import { selectPlansMeta } from '../store/plansSlice'
import {
  getDashboardStats, getGoalDistribution, getAIInsights, getNextActions,
} from '../store/clientStore'

const fmtCr = v => v >= 10000000 ? '₹' + (v / 10000000).toFixed(2) + ' Cr'
  : v > 0 ? '₹' + (v / 100000).toFixed(1) + ' L' : '₹0'

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

const timeAgo = iso => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hr ago`
  return `${Math.floor(hrs / 24)} day ago`
}

export default function Dashboard() {
  const dispatch = useDispatch()
  const goTo = (p) => dispatch(setPage(p))
  const history = useSelector(s => s.history.items)
  const meta = useSelector(selectPlansMeta)

  const stats = useMemo(() => getDashboardStats(history), [history])
  const insights = useMemo(() => getAIInsights(history), [history])
  const actions = useMemo(() => getNextActions(history), [history])
  const dist = useMemo(() => getGoalDistribution(history), [history])
  const maxGoal = Math.max(1, ...dist.map(d => d.count))
  const sourceLabel = meta.source === 'live' ? 'live feed'
    : meta.source === 'cache' ? 'cached feed' : 'bundled catalogue'

  const kpis = [
    { label: 'Clients Profiled', value: stats.uniqueClients, sub: `${stats.totalProfiles} total session${stats.totalProfiles !== 1 ? 's' : ''}` },
    { label: 'Avg Match Confidence', value: stats.avgScore ? stats.avgScore + '%' : '—', sub: 'AI-computed across book' },
    { label: 'Cover Advised', value: fmtCr(stats.totalCoverAdvised), sub: 'total sum assured' },
    { label: 'Recommendations Today', value: stats.recsToday, sub: `${stats.recsThisWeek} this week` },
  ]

  return (
    <div className="page">
      {/* ── Header ────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-eyebrow">Sales AI Agent</div>
        <h1 className="page-title">Advisor Dashboard</h1>
        {stats.isEmpty ? (
          <p className="page-subtitle">
            {greeting()}. Build a client profile to begin — every metric below is computed from the data you add.
          </p>
        ) : (
          <p className="page-subtitle">
            {greeting()}. You have profiled {stats.uniqueClients} client{stats.uniqueClients !== 1 ? 's' : ''} with
            an average match confidence of {stats.avgScore}%.
            {stats.protectionGaps > 0 && ` ${stats.protectionGaps} ${stats.protectionGaps > 1 ? 'have' : 'has'} a protection gap worth a follow-up.`}
          </p>
        )}
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => goTo('profiler')}>New Client Profile</button>
          <button className="btn btn-outline" onClick={() => goTo('comparison')}>Compare Policies</button>
          <button className="btn btn-outline" onClick={() => goTo('recommendations')}>View Catalogue</button>
        </div>
        <div className="data-source">
          Catalogue: {sourceLabel} · {meta.count} plans
          {meta.fetchedAt ? ` · synced ${new Date(meta.fetchedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}` : ''}
        </div>
      </div>

      {/* ── Live KPIs (computed from fed data) ────────── */}
      <div className="section-label">Portfolio Metrics</div>
      <div className="stats-grid">
        {kpis.map(k => (
          <div key={k.label} className="stat-card">
            <div className="stat-label">{k.label}</div>
            <div className="stat-value">{k.value}</div>
            <div className="stat-delta" style={{ color: 'var(--muted)', fontWeight: 500 }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {stats.isEmpty ? (
        /* ── Empty / onboarding state ─────────────────── */
        <div className="agent-empty">
          <div className="agent-empty-title">No client data yet</div>
          <p className="agent-empty-desc">
            These metrics are not demo numbers — they build up from the profiles you create.
            Start your first client profile to populate your portfolio, insights, and recommended actions.
          </p>
          <button className="btn btn-primary" onClick={() => goTo('profiler')}>
            Build your first profile
          </button>
        </div>
      ) : (
        <>
          {/* ── AI insights + next actions ──────────────── */}
          <div className="agent-grid">
            <div className="card">
              <div className="agent-panel-head">
                <span>AI Insights</span>
                <span className="agent-panel-sub">from your data</span>
              </div>
              <div className="insight-list">
                {insights.map((ins, i) => (
                  <div key={i} className="insight-row">
                    <span className={`insight-tag tag-${ins.tag.toLowerCase()}`}>{ins.tag}</span>
                    <span className="insight-text">{ins.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="agent-panel-head">
                <span>Recommended Next Actions</span>
              </div>
              <div className="action-list">
                {actions.map((a, i) => (
                  <button key={i} className="action-row" onClick={() => goTo('profiler')}>{a}</button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Goal distribution (real data) ───────────── */}
          <div className="section-label">Client Goals — Your Book</div>
          <div className="card">
            <div className="goal-bars">
              {dist.map(d => (
                <div key={d.goal} className="goal-bar-row">
                  <span className="goal-bar-label">{d.goal}</span>
                  <div className="goal-bar-track">
                    <div className="goal-bar-fill" style={{ width: (d.count / maxGoal * 100) + '%' }} />
                  </div>
                  <span className="goal-bar-count">{d.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Recent activity (real history) ──────────── */}
          <div className="section-label">Recent Activity</div>
          <div className="card" style={{ padding: '6px 22px' }}>
            <div className="activity-list">
              {history.slice(0, 6).map(e => (
                <div key={e.id} className="activity-row">
                  <div className="activity-pip" style={{ background: e.score >= 85 ? '#16A34A' : e.score >= 70 ? '#C8972A' : '#C62828' }} />
                  <div style={{ flex: 1 }}>
                    <div className="activity-main">
                      <span className="activity-name">{e.profile.name || 'Unnamed client'}</span> — recommendation generated
                      <span className="activity-goal">{e.profile.goal}</span>
                    </div>
                    <div className="activity-meta">Top match: {e.topRec} · {e.score}% confidence · {timeAgo(e.timestamp)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
