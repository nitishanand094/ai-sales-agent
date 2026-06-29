// ── Approximate Premium Estimator ────────────────────────────────────
// The insurer's exact premium tables are proprietary and sit behind its
// quote API (not publicly callable). This produces an INDICATIVE estimate
// using the standard industry method, so the catalogue can show a number.
// It is NOT a quote — the real premium comes from a personalised quote.

const DEFAULT_AGE = 30
const DEFAULT_TERM = { Term: 20, Health: 10, Savings: 15, 'Child Plan': 15, ULIP: 10, Retirement: 15 }

// Annual rate per ₹1,000 of sum assured at age 30 (protection products)
const BASE_RATE = { Term: 1.1, Health: 1.5 }

// Estimate the annual premium for a plan. If a client profile is given, it
// personalises by the client's age, cover and term; otherwise it uses
// catalogue defaults (30-year-old, the plan's representative cover/term).
export function estimatePremium(plan, profile) {
  const age = profile?.age || DEFAULT_AGE
  const term = profile?.term || DEFAULT_TERM[plan.type] || 15
  const sa = profile?.sa || plan.coverValue || 0
  const ageLoad = 1 + Math.max(0, age - DEFAULT_AGE) * 0.045 // ~4.5% per year over 30

  let est
  switch (plan.type) {
    case 'Term':
    case 'Health':
      est = (BASE_RATE[plan.type] || 1.2) * ageLoad * (sa / 1000)
      break
    case 'Savings':
    case 'Child Plan':
      // pay-to-save: annual contribution ≈ target maturity ÷ term, slight age load
      est = (sa / term) * 0.9 * (1 + Math.max(0, age - DEFAULT_AGE) * 0.008)
      break
    case 'ULIP':
      // investment-led: use the declared minimum / typical annual investment
      est = Math.max(plan.premiumValue || 0, 24000)
      break
    case 'Retirement':
      est = (sa / term) * 0.85 // contribution toward the retirement corpus
      break
    default:
      est = plan.premiumValue || 0
  }
  return Math.max(2000, Math.round(est / 100) * 100) // round to nearest ₹100
}

// Shown to the user so the calculation is transparent
export const PREMIUM_METHODOLOGY = [
  'These are indicative estimates, not insurer quotes. The insurer computes the exact premium through its own quote engine (age, gender, smoker status, sum assured, term and riders).',
  'Term & Health: annual premium ≈ a base rate per ₹1,000 of sum assured, increased ~4.5% for each year of age above 30.',
  'Savings & Child plans: annual premium ≈ target sum assured ÷ policy term (these are savings-led, so you pay in to build the maturity value).',
  'ULIP: investment-led — we use the declared minimum/typical annual investment.',
  'Retirement: annual premium ≈ corpus target ÷ term.',
  'Catalogue view assumes a 30-year-old; inside Recommendations the estimate uses the client’s actual age, cover and term. "Insurer min" is the minimum premium published on the insurer’s own site.',
]
