import { useEffect } from 'react'
import ProgressBar from './ProgressBar'
import { estimatePremium } from '../engine/premiumEstimator'

const NA = <span className="modal-detail-val na">Not Available</span>

function DetailVal({ val }) {
  if (!val || val === 'Not Available' || val === 'No' || val === 'None') {
    return <div className="modal-detail-val na">{val || 'N/A'}</div>
  }
  const isGood = val.includes('✓') || val.startsWith('After') || val === 'Yes'
  return <div className={`modal-detail-val${isGood ? ' good' : ''}`}>{val}</div>
}

export default function PlanDetailModal({ plan, onClose, onCompare, isCompared, addToast, clientName = 'Client', client }) {
  // Close on Escape key
  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const chipColors = {
    'Term':       { bg: '#E6F4FC', color: '#0067B1', border: 'rgba(0,103,177,0.2)' },
    'ULIP':       { bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' },
    'Savings':    { bg: '#FFFBEB', color: '#92400E', border: '#FDE68A' },
    'Child Plan': { bg: '#FAF5FF', color: '#6D28D9', border: '#DDD6FE' },
    'Retirement': { bg: '#F0FDFA', color: '#0F766E', border: '#99F6E4' },
    'Health':     { bg: '#FFF1F2', color: '#BE123C', border: '#FECDD3' },
  }
  const c = chipColors[plan.type] || chipColors['Term']

  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={plan.name}>

        {/* Header */}
        <div className="modal-header">
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
          <div className="modal-plan-type">
            <span
              className="product-type"
              style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', fontSize: 10.5 }}
            >
              {plan.type}
            </span>
          </div>
          <div className="modal-plan-name">{plan.name}</div>
          <div className="modal-plan-tagline">{plan.benefit}</div>
          <div className="modal-header-stats">
            <div className="modal-stat">
              <div className="modal-stat-lbl">Approx Premium</div>
              <div className="modal-stat-val">₹{estimatePremium(plan, client).toLocaleString('en-IN')}/yr*</div>
            </div>
            <div className="modal-stat">
              <div className="modal-stat-lbl">Sum Assured</div>
              <div className="modal-stat-val">{plan.cover}</div>
            </div>
            <div className="modal-stat">
              <div className="modal-stat-lbl">Policy Term</div>
              <div className="modal-stat-val">{plan.policyTerm}</div>
            </div>
            <div className="modal-stat">
              <div className="modal-stat-lbl">Claim Settled</div>
              <div className="modal-stat-val">{plan.claimSettlement}</div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body">

          {/* Profile match */}
          <div className="modal-section">
            <div className="modal-section-title">Profile Match — {clientName}</div>
            <div className="modal-match-bar">
              <div className="modal-match-label">
                <span>Match Score</span>
                <span style={{ color: plan.color, fontWeight: 700 }}>{plan.match}%</span>
              </div>
              <ProgressBar value={plan.match} color={plan.color} />
            </div>
            <div className="modal-goals" style={{ marginTop: 12 }}>
              {plan.goals.map(g => (
                <span key={g} className="modal-goal-chip">{g}</span>
              ))}
              {plan.risk.map(r => (
                <span key={r} className="modal-goal-chip" style={{ background: '#F0FDF4', color: '#15803D', borderColor: '#BBF7D0' }}>{r} Risk</span>
              ))}
            </div>
          </div>

          {/* Key highlights */}
          <div className="modal-section">
            <div className="modal-section-title">Key Highlights</div>
            <ul className="modal-highlights">
              {plan.highlights.map((h, i) => (
                <li key={i} className="modal-highlight">
                  <span className="modal-highlight-dot">✓</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Plan details grid */}
          <div className="modal-section">
            <div className="modal-section-title">Plan Details</div>
            <div className="modal-detail-grid">
              <div className="modal-detail-item">
                <div className="modal-detail-lbl">Premium Payment</div>
                <div className="modal-detail-val">{plan.paymentTerm}</div>
              </div>
              <div className="modal-detail-item">
                <div className="modal-detail-lbl">Death Benefit</div>
                <div className="modal-detail-val">{plan.deathBenefit}</div>
              </div>
              <div className="modal-detail-item">
                <div className="modal-detail-lbl">Maturity Benefit</div>
                <DetailVal val={plan.maturityBenefit} />
              </div>
              <div className="modal-detail-item">
                <div className="modal-detail-lbl">Tax Benefit</div>
                <div className="modal-detail-val good">{plan.taxBenefit}</div>
              </div>
              <div className="modal-detail-item">
                <div className="modal-detail-lbl">Critical Illness</div>
                <DetailVal val={plan.criticalIllness} />
              </div>
              <div className="modal-detail-item">
                <div className="modal-detail-lbl">Premium Waiver</div>
                <DetailVal val={plan.premiumWaiver} />
              </div>
              <div className="modal-detail-item">
                <div className="modal-detail-lbl">Surrender Value</div>
                <DetailVal val={plan.surrenderValue} />
              </div>
              <div className="modal-detail-item">
                <div className="modal-detail-lbl">Loan Facility</div>
                <DetailVal val={plan.loanFacility} />
              </div>
              <div className="modal-detail-item">
                <div className="modal-detail-lbl">Entry Age</div>
                <div className="modal-detail-val">{plan.minAge} – {plan.maxAge} yrs</div>
              </div>
              <div className="modal-detail-item">
                <div className="modal-detail-lbl">Suitability Score</div>
                <div className="modal-detail-val good">{plan.suitabilityScore} / 100</div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className="modal-footer">
          <button className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
          <button
            className={`btn btn-sm${isCompared ? ' btn-accent' : ' btn-outline'}`}
            onClick={() => {
              onCompare(plan.id)
              addToast(isCompared ? `Removed ${plan.shortName} from comparison.` : `${plan.shortName} added to comparison.`, 'info')
            }}
          >
            {isCompared ? '✓ In Comparison' : '+ Add to Compare'}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              addToast(`Recommending ${plan.shortName} to client…`, 'success')
              onClose()
            }}
          >
            Recommend to Client
          </button>
        </div>

      </div>
    </div>
  )
}
