// ── Sync plan catalogue from a CMS / Google Sheet → public/plans.json ─
//
// You maintain the plans in ONE place (a published Google Sheet or a CMS
// endpoint). This job pulls it and writes the JSON feed the app fetches
// at runtime. No scraping — fully legitimate and easy to update.
//
//   Google Sheet : File → Share → Publish to web → CSV, paste that link
//   CMS / API    : any URL returning JSON ({ plans: [...] } or [...])
//   Local file   : a path to a .csv / .json on disk (handy for testing)
//
// Run:
//   FEED_SOURCE_URL="https://docs.google.com/.../pub?output=csv" npm run sync
//   FEED_SOURCE_URL="./plans-template.csv" npm run sync
//
// Schedule it (cron / GitHub Action / CI) to keep the feed fresh.
// ---------------------------------------------------------------------

import { writeFileSync, readFileSync, existsSync } from 'node:fs'

// Load .env (no dependency) so FEED_SOURCE_URL can be set once and reused.
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

// Source priority: env var → local editable catalogue → error.
const LOCAL_SOURCE = './plans-source.csv'
const SOURCE = process.env.FEED_SOURCE_URL || (existsSync(LOCAL_SOURCE) ? LOCAL_SOURCE : null)
const OUT = process.env.FEED_OUT || 'public/plans.json'
const LIST_SEP = '|' // goals / risk / highlights use pipe-separated lists

if (!SOURCE) {
  console.error('No source. Set FEED_SOURCE_URL (Sheet/CMS URL) in .env, or create plans-source.csv.')
  console.error('Tip: run "npm run feed:template" to generate plans-source.csv.')
  process.exit(1)
}

// Minimal RFC-4180 CSV parser (handles quoted fields, commas, escaped quotes)
function parseCSV(text) {
  const rows = []
  let row = [], field = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') q = false
      else field += c
    } else if (c === '"') q = true
    else if (c === ',') { row.push(field); field = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(field); field = ''
      if (row.some(v => v !== '')) rows.push(row)
      row = []
    } else field += c
  }
  if (field !== '' || row.length) { row.push(field); if (row.some(v => v !== '')) rows.push(row) }
  return rows
}

const num = (v, d = 0) => { const n = Number(String(v).replace(/[^0-9.-]/g, '')); return Number.isFinite(n) ? n : d }
const list = v => String(v || '').split(LIST_SEP).map(s => s.trim()).filter(Boolean)

function normalize(r) {
  return {
    id: r.id, name: r.name, shortName: r.shortName || r.name,
    type: r.type, typeClass: r.typeClass,
    premium: r.premium, premiumValue: num(r.premiumValue),
    cover: r.cover, coverValue: num(r.coverValue),
    policyTerm: r.policyTerm, paymentTerm: r.paymentTerm,
    deathBenefit: r.deathBenefit, maturityBenefit: r.maturityBenefit,
    taxBenefit: r.taxBenefit, criticalIllness: r.criticalIllness,
    premiumWaiver: r.premiumWaiver, surrenderValue: r.surrenderValue,
    loanFacility: r.loanFacility, claimSettlement: r.claimSettlement,
    suitabilityScore: num(r.suitabilityScore, 80), match: num(r.match, 80),
    color: r.color || '#B3001B',
    goals: list(r.goals), risk: list(r.risk),
    minAge: num(r.minAge, 18), maxAge: num(r.maxAge, 65),
    benefit: r.benefit || '', highlights: list(r.highlights),
  }
}

async function readSource(src) {
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(src, { headers: { 'User-Agent': 'CanaraHSBC-SalesAgent/1.0' } })
    if (!res.ok) throw new Error(`Source returned HTTP ${res.status}`)
    const ct = res.headers.get('content-type') || ''
    const body = await res.text()
    return { body, isJson: ct.includes('json') || src.endsWith('.json') }
  }
  if (!existsSync(src)) throw new Error(`Local file not found: ${src}`)
  return { body: readFileSync(src, 'utf8'), isJson: src.endsWith('.json') }
}

async function main() {
  const { body, isJson } = await readSource(SOURCE)
  let plans
  if (isJson) {
    const j = JSON.parse(body)
    plans = (Array.isArray(j) ? j : j.plans || []).map(normalize)
  } else {
    const rows = parseCSV(body)
    const header = rows.shift().map(h => h.trim())
    plans = rows.map(cols => normalize(Object.fromEntries(header.map((h, i) => [h, cols[i] ?? '']))))
  }

  const valid = plans.filter(p => p.id && p.name && p.goals.length && p.risk.length)
  if (!valid.length) throw new Error('No usable plan rows after parsing — check your columns.')

  const feed = { source: SOURCE, fetchedAt: new Date().toISOString(), count: valid.length, plans: valid }
  writeFileSync(OUT, JSON.stringify(feed, null, 2))
  console.log(`Synced ${valid.length} plans from ${isJson ? 'JSON' : 'CSV'} → ${OUT}`)
}

main().catch(err => { console.error('Sync failed:', err.message); process.exit(1) })
