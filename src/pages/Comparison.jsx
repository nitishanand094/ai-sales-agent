import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { selectPlans } from '../store/plansSlice'
import { notify } from '../store/uiSlice'
import { estimatePremium } from '../engine/premiumEstimator'

const ROWS = [
  { label: 'Plan Type',         key: 'type' },
  { label: 'Approx Premium',    key: 'premium' },
  { label: 'Sum Assured',       key: 'cover' },
  { label: 'Policy Term',       key: 'policyTerm' },
  { label: 'Premium Payment',   key: 'paymentTerm' },
  { label: 'Death Benefit',     key: 'deathBenefit' },
  { label: 'Maturity Benefit',  key: 'maturityBenefit' },
  { label: 'Tax Benefit',       key: 'taxBenefit' },
  { label: 'Critical Illness',  key: 'criticalIllness' },
  { label: 'Premium Waiver',    key: 'premiumWaiver' },
  { label: 'Surrender Value',   key: 'surrenderValue' },
  { label: 'Loan Facility',     key: 'loanFacility' },
  { label: 'Claim Settlement',  key: 'claimSettlement' },
  { label: 'Suitability Score', key: 'suitabilityScore' },
]

// Rows where the numerically highest value wins (for best-cell highlighting)
const HIGHER_IS_BETTER = new Set(['suitabilityScore'])
// Rows where the numerically lowest value wins
const LOWER_IS_BETTER = new Set(['premiumValue'])

function Pips({ score }) {
  const n = Math.round(score / 20)
  return (
    <div className="pips">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className={`pip${i <= n ? ' on' : ''}`} />
      ))}
    </div>
  )
}

function getBestCol(plans, key) {
  if (key === 'suitabilityScore') {
    const max = Math.max(...plans.map(p => p.suitabilityScore))
    return plans.findIndex(p => p.suitabilityScore === max)
  }
  if (key === 'premium') {
    const min = Math.min(...plans.map(p => p.premiumValue))
    return plans.findIndex(p => p.premiumValue === min)
  }
  if (key === 'cover') {
    const max = Math.max(...plans.map(p => p.coverValue))
    return plans.findIndex(p => p.coverValue === max)
  }
  return null
}

// Default 3 plans for initial load
const DEFAULT_IDS = ['iselect-smart360', 'smart-junior', 'invest-4g']

export default function Comparison() {
  const dispatch = useDispatch()
  const addToast = (msg, type) => dispatch(notify(msg, type))
  const ALL = useSelector(selectPlans)
  // Seed selection with the default IDs that exist in the current feed,
  // otherwise just take the first three plans available.
  const seedIds = DEFAULT_IDS.filter(id => ALL.some(p => p.id === id))
  const [selectedIds, setSelectedIds] = useState(
    seedIds.length >= 2 ? seedIds : ALL.slice(0, 3).map(p => p.id)
  )

  const togglePlan = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) {
        if (prev.length <= 2) {
          addToast('Minimum 2 plans required for comparison.', 'info')
          return prev
        }
        return prev.filter(x => x !== id)
      } else {
        if (prev.length >= 4) {
          addToast('Maximum 4 plans can be compared at once.', 'info')
          return prev
        }
        return [...prev, id]
      }
    })
  }

  const plans = ALL.filter(p => selectedIds.includes(p.id))

  function handleDownloadPDF() {
    const headerCells = plans.map(p =>
      `<th>${p.shortName}<br><small style="font-weight:400;opacity:0.8">${p.type}</small></th>`
    ).join('')

    const rowsHtml = ROWS.map(row => {
      const bestCol = getBestCol(plans, row.key)
      const cells = plans.map((p, ci) => {
        const isBest = bestCol === ci
        let val = p[row.key]
        if (row.key === 'premium') {
          val = `₹${estimatePremium(p).toLocaleString('en-IN')}/yr (est.)`
          if (p.premium !== 'On quote') val += ` — Insurer min: ${p.premium.replace('*', '')}`
        } else if (row.key === 'suitabilityScore') {
          val = `${val}/100`
        }
        return `<td style="${isBest ? 'background:#E0F5FD;font-weight:600;' : ''}">${val !== undefined ? String(val) : '—'}</td>`
      }).join('')
      return `<tr><td><strong>${row.label}</strong></td>${cells}</tr>`
    }).join('')

    const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Policy Comparison — AI Sales Agent</title>
<style>
  body{font-family:Arial,sans-serif;padding:28px;color:#1A2733;font-size:13px}
  h1{color:#00ADEF;font-size:20px;margin:0 0 3px}
  .meta{color:#647382;font-size:11px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  th{background:#0067B1;color:#fff;padding:10px 12px;text-align:left;font-size:12px}
  td{padding:8px 12px;border-bottom:1px solid #DDE5EC;vertical-align:top}
  tr:nth-child(even) td{background:#F5F8FB}
  td:first-child{font-weight:500;white-space:nowrap;color:#4A4A4A}
  .note{font-size:10px;color:#647382;margin-top:12px;border-top:1px solid #DDE5EC;padding-top:10px}
  @media print{body{padding:0}}
</style></head>
<body>
<h1>Policy Comparison Report</h1>
<div class="meta">AI Sales Agent &nbsp;·&nbsp; ${date} &nbsp;·&nbsp; ${plans.length} plan${plans.length !== 1 ? 's' : ''} compared</div>
<table><thead><tr><th>Feature</th>${headerCells}</tr></thead><tbody>${rowsHtml}</tbody></table>
<div class="note">Approx premiums are indicative estimates (standard actuarial rate/₹1,000 SA for a 30-yr-old), not insurer quotes. Actual premium requires a personalised quote from the insurer.</div>
</body></html>`

    const win = window.open('', '_blank', 'width=960,height=720')
    if (!win) { addToast('Allow pop-ups in your browser to download the PDF.', 'info'); return }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 400)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-eyebrow">Policy Comparison</div>
        <h1 className="page-title">Side-by-Side Plan Analysis</h1>
        <p className="page-subtitle">
          Select 2–4 plans to compare. Green cells mark the best-in-category value.
        </p>
      </div>

      {/* Plan selector */}
      <div style={{ marginBottom: 20 }}>
        <div className="section-label" style={{ marginTop: 0 }}>Select Plans to Compare</div>
        <div className="col-selector">
          {ALL.map(p => (
            <button
              key={p.id}
              className={`col-chip${selectedIds.includes(p.id) ? ' active' : ''}`}
              onClick={() => togglePlan(p.id)}
              title={`${p.name} — ${p.premium}`}
            >
              <span className={`product-type ${p.typeClass}`} style={{ fontSize: 9, padding: '1px 5px', marginRight: 5, verticalAlign: 'middle' }}>{p.type}</span>
              {p.shortName}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)' }}>
            {selectedIds.length} / 4 selected
          </span>
        </div>
      </div>

      {/* Actions row */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button
          className="btn btn-outline btn-sm"
          onClick={handleDownloadPDF}
        >
          ↓ Download PDF
        </button>
      </div>

      {/* Comparison table */}
      <div className="table-wrap">
        <table className="comp-table">
          <thead>
            <tr>
              <th>Feature</th>
              {plans.map((p, i) => (
                <th key={i} style={{ borderTop: `3px solid ${p.color}` }}>
                  <div className="col-product">{p.shortName}</div>
                  <div className="col-type">{p.type}</div>
                  <div className="col-cta">
                    <button
                      className="btn btn-ghost-white btn-sm"
                      style={{ fontSize: 11, padding: '4px 11px' }}
                      onClick={() => addToast(`Recommending ${p.shortName} to client…`, 'success')}
                    >
                      Recommend
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, ri) => {
              const bestCol = getBestCol(plans, row.key)
              return (
                <tr key={ri}>
                  <td>{row.label}</td>
                  {plans.map((p, ci) => {
                    const val = p[row.key]
                    const isBest = bestCol === ci
                    return (
                      <td key={ci} className={isBest ? 'best' : ''}>
                        {row.key === 'suitabilityScore' ? (
                          <div>
                            <div style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{val} / 100</div>
                            <Pips score={val} />
                          </div>
                        ) : row.key === 'premium' ? (
                          <div>
                            <div style={{ fontWeight: 600 }}>₹{estimatePremium(p).toLocaleString('en-IN')}/yr <span className="est-tag">est.</span></div>
                            {p.premium !== 'On quote' && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Insurer min: {p.premium.replace('*', '')}</div>}
                          </div>
                        ) : String(val)}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="premium-note">Approx premiums are indicative estimates (standard rate per ₹1,000 of sum assured by product type, for a 30-year-old), not insurer quotes. "Insurer min" is the minimum premium published on the insurer's site. Actual premium needs a personalised quote.</p>

      {/* Advisor's verdict */}
      <div className="verdict-panel">
        <div className="verdict-head">Advisor's Verdict</div>
        {plans.map((p, i) => {
          const chipColors = {
            'Term':       { bg: 'rgba(0,173,239,0.35)',  color: '#9FD6F5' },
            'ULIP':       { bg: 'rgba(22,163,74,0.3)',   color: '#86EFAC' },
            'Savings':    { bg: 'rgba(200,151,42,0.3)',  color: '#FCDFA0' },
            'Child Plan': { bg: 'rgba(109,40,217,0.3)',  color: '#C4B5FD' },
            'Retirement': { bg: 'rgba(15,118,110,0.3)',  color: '#5EEAD4' },
            'Health':     { bg: 'rgba(220,38,38,0.3)',   color: '#FCA5A5' },
          }
          const c = chipColors[p.type] || { bg: 'rgba(255,255,255,0.1)', color: '#fff' }
          const verdicts = {
            'iselect-smart360':       `Best-in-class pure protection at ₹12,400/yr for ₹1 Crore cover. Non-negotiable foundation for any client with dependents before adding savings products.`,
            'iselect-plus':           `Budget-friendly term cover for clients who need basic protection without complexity. Ideal as a standalone policy for young earners with limited premium budgets.`,
            'easy-bima':              `Entry point for first-time insurance buyers. Straightforward cover with minimal paperwork — best suited to clients with income below ₹6L/yr.`,
            'invest-4g':              `Best ULIP for clients with a 15+ year horizon and moderate-to-aggressive risk appetite. 8 fund options give flexibility; loyalty additions improve long-term returns.`,
            'guaranteed-wealth-plus': `Ideal for clients who want equity participation but need a guaranteed floor. Suits HNI clients seeking wealth creation with downside protection.`,
            'future-smart':           `Best for aggressive investors who want systematic equity exposure with auto-rebalancing. Not suitable for conservative clients.`,
            'jeevan-nivesh':          `Classic participating endowment — suits conservative savers who want guaranteed bonuses and a loan facility. Good complement to a term plan.`,
            'guaranteed-income4life': `Best for clients planning retirement income. Limited pay + guaranteed income payout stream makes this ideal for those 10–15 years from retirement.`,
            'monthly-income-plan':    `Suits clients who need monthly cash flow alongside life cover. Good for self-employed clients with irregular income seeking predictable payouts.`,
            'guaranteed-savings-plan':`Zero-risk savings product. Best for clients who want the certainty of guaranteed maturity — no market exposure whatsoever.`,
            'smart-junior':           `Purpose-built for Priya Sharma's profile. Premium waiver on parent death is the decisive feature — education fund is protected regardless of what happens to the policyholder.`,
            'pension4life':           `Best deferred pension product for clients 25–50 years old planning retirement. Builds a corpus and converts to lifelong annuity — section 80CCC benefit adds extra value.`,
            'new-immediate-annuity':  `Best for clients already at or near retirement (45+) with a lump sum to deploy. Pension starts immediately — 8 annuity options including joint life and return of purchase price.`,
            'cancer-secure':          `Essential add-on for clients with family history of cancer or tobacco users. Low premium (₹6,000/yr) for ₹25L cover — section 80D deduction makes it tax-efficient.`,
          }
          return (
            <div key={p.id} className="verdict-row">
              <span className="verdict-chip" style={{ background: c.bg, color: c.color }}>{p.type}</span>
              <span className="verdict-text">
                <strong>{p.shortName}</strong> — {verdicts[p.id] || p.benefit}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
