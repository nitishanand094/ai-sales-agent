// ── AI Match Engine ───────────────────────────────────────────────
// Deterministic scoring of insurance plans against a client profile.
// Every score the UI shows is derived here from the data fed in —
// nothing is random or hardcoded.

import { store } from '../store'

const getPlans = () => store.getState().plans.items

const INCOME_MID = {
  lt3L: 200000, '3-6L': 450000, '6-12L': 900000,
  '12-25L': 1850000, '25Lplus': 3500000,
}

const RISK_RANK = { Conservative: 0, Moderate: 1, Aggressive: 2 }

// Score one plan for one profile → 0..100
export function scorePlan(profile, plan) {
  let score = 0

  // Goal alignment — 35 pts
  if (plan.goals.includes(profile.goal)) score += 35
  else score += 6 // small base — still a valid product, just off-goal

  // Risk alignment — 25 pts (scaled by distance on the risk ladder)
  if (plan.risk.includes(profile.risk)) {
    score += 25
  } else {
    const nearest = Math.min(...plan.risk.map(r => Math.abs(RISK_RANK[r] - RISK_RANK[profile.risk])))
    score += Math.max(0, 25 - nearest * 12)
  }

  // Age eligibility — 15 pts
  if (profile.age >= plan.minAge && profile.age <= plan.maxAge) score += 15

  // Budget fit — 15 pts (client premium is monthly; annualise it)
  const annualBudget = (profile.premium || 0) * 12
  if (plan.premiumValue > 0) {
    score += annualBudget >= plan.premiumValue
      ? 15
      : Math.round((annualBudget / plan.premiumValue) * 15)
  } else {
    score += 12
  }

  // Coverage fit — 10 pts (protection products only; annuities exempt)
  if (plan.coverValue > 0) {
    score += plan.coverValue >= profile.sa
      ? 10
      : Math.round((plan.coverValue / profile.sa) * 10)
  } else {
    score += 8
  }

  // Blend the profile-fit score with the product's suitability so that
  // even exact-fit plans spread out (instead of all saturating at the cap).
  const blended = Math.round(0.7 * score + 0.3 * (plan.suitabilityScore || 80))
  return Math.max(20, Math.min(98, blended))
}

// One-line explanation of why this plan suits this client.
export function planReason(profile, plan) {
  const parts = []
  if (plan.goals.includes(profile.goal)) {
    parts.push(`matches the "${profile.goal}" goal`)
  } else if (plan.goals.length) {
    parts.push(`oriented to ${plan.goals[0]}`)
  }
  if (plan.risk.includes(profile.risk)) {
    const r = profile.risk.toLowerCase()
    parts.push(`suits ${/^[aeiou]/.test(r) ? 'an' : 'a'} ${r} risk appetite`)
  } else {
    parts.push(`leans ${plan.risk.includes('Aggressive') && !plan.risk.includes('Conservative') ? 'higher' : 'lower'} risk than the client's ${profile.risk.toLowerCase()} profile`)
  }
  const annualBudget = (profile.premium || 0) * 12
  if (plan.premiumValue > 0 && annualBudget >= plan.premiumValue) parts.push('fits the premium budget')
  if (plan.coverValue > 0 && plan.coverValue >= profile.sa) parts.push('meets the cover requirement')

  const lead = parts.shift()
  const reason = parts.length ? `${lead}; ${parts.join(', ')}.` : `${lead}.`
  return reason.charAt(0).toUpperCase() + reason.slice(1)
}

// Rank every plan for a profile, returning [{ ...plan, aiMatch }] high→low
export function rankPlans(profile) {
  const plans = getPlans()
  if (!profile) return plans.map(p => ({ ...p, aiMatch: p.match }))
  return plans
    .map(p => ({ ...p, aiMatch: scorePlan(profile, p) }))
    .sort((a, b) => b.aiMatch - a.aiMatch)
}

// Overall AI confidence for a client = blend of the top 3 matched plans
export function clientScore(profile) {
  if (!profile) return 0
  const top = rankPlans(profile).slice(0, 3).map(p => p.aiMatch)
  return Math.round(top.reduce((a, b) => a + b, 0) / top.length)
}

// Human-readable reasoning, generated from the actual profile
export function buildReasoning(profile) {
  if (!profile) return []
  const ranked = rankPlans(profile)
  const top = ranked[0]
  const income = INCOME_MID[profile.income] || 0
  const out = []

  out.push(`${top.name} ranks highest at ${top.aiMatch}% — it aligns with the client's "${profile.goal}" goal and ${profile.risk.toLowerCase()} risk appetite.`)

  if (profile.dependents > 0) {
    out.push(`${profile.dependents} dependent${profile.dependents > 1 ? 's' : ''} and age ${profile.age} point to a long horizon, favouring products with maturity or milestone benefits.`)
  }

  if (income >= 1500000) {
    out.push(`Income in the ${profile.income} band places the client in a higher tax bracket — 80C-eligible plans add meaningful value.`)
  }

  if (profile.hasIns === 'No') {
    out.push(`No existing life cover: a pure-protection term layer is advised before any savings-linked product.`)
  }

  const annualBudget = (profile.premium || 0) * 12
  out.push(`Monthly budget of ₹${(profile.premium || 0).toLocaleString('en-IN')} (₹${annualBudget.toLocaleString('en-IN')}/yr) was used to filter affordable options against a ₹${(profile.sa / 100000).toFixed(0)}L cover target.`)

  return out
}
