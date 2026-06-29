// Exports the current catalogue as a CSV you can paste into Google Sheets
// to seed your editable source. Run: node scripts/export-template.mjs
// goals / risk / highlights are pipe-separated (e.g. "Tax Saving|Wealth Creation").

import { PLANS } from '../src/data/plans.js'
import { writeFileSync } from 'node:fs'

const COLS = [
  'id', 'name', 'shortName', 'type', 'typeClass', 'premium', 'premiumValue',
  'cover', 'coverValue', 'policyTerm', 'paymentTerm', 'deathBenefit',
  'maturityBenefit', 'taxBenefit', 'criticalIllness', 'premiumWaiver',
  'surrenderValue', 'loanFacility', 'claimSettlement', 'suitabilityScore',
  'match', 'color', 'goals', 'risk', 'minAge', 'maxAge', 'benefit', 'highlights',
]

const esc = v => {
  const s = Array.isArray(v) ? v.join('|') : String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const lines = [COLS.join(',')]
for (const p of PLANS) lines.push(COLS.map(c => esc(p[c])).join(','))

writeFileSync('plans-source.csv', lines.join('\n'))
console.log(`Wrote plans-source.csv (${PLANS.length} rows, ${COLS.length} columns)`)
