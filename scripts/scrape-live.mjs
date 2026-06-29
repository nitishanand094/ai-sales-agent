// ── Live catalogue scraper — canarahsbclife.com → public/plans.json ──
//
// Pulls the REAL product list from the official site. A page is treated
// as a genuine product only if it carries an IRDAI UIN (guides/SEO pages
// don't). Live fields (name, description, UIN, URL) come straight from the
// site; the structured fields the match engine needs (goals, risk, age)
// are derived from the product category, since the marketing site does not
// expose them in machine-readable form. Premiums are quote-based on the
// site, so premium/cover are indicative per-category values.
//
// Run:  npm run scrape         (uses --use-system-ca for proxied networks)
// ---------------------------------------------------------------------

import { writeFileSync } from 'node:fs'

const BASE = 'https://www.canarahsbclife.com'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
}

const SEEDS = [
  '/life-insurance-plans', '/term-insurance', '/ulips',
  '/savings-and-investment-plans', '/money-back-plans', '/retirement-plans',
  '/child-insurance', '/health-insurance', '/insurance-riders',
]

// Category (first URL segment) → engine attributes + display styling
const CAT = {
  'term-insurance':  { type: 'Term',       typeClass: 'type-term',   goals: ['Pure Protection'],                  risk: ['Conservative', 'Moderate', 'Aggressive'], color: '#0369A1', minAge: 18, maxAge: 65, premiumValue: 12000, coverValue: 10000000 },
  'ulips':           { type: 'ULIP',       typeClass: 'type-ulip',   goals: ['Wealth Creation', 'Tax Saving'],    risk: ['Moderate', 'Aggressive'],                 color: '#16A34A', minAge: 18, maxAge: 65, premiumValue: 30000, coverValue: 1000000 },
  'savings-and-investment-plans': { type: 'Savings', typeClass: 'type-endow', goals: ['Tax Saving', 'Wealth Creation'], risk: ['Conservative', 'Moderate'], color: '#D97706', minAge: 18, maxAge: 60, premiumValue: 24000, coverValue: 1000000 },
  'money-back-plans':{ type: 'Savings',    typeClass: 'type-endow',  goals: ['Tax Saving', 'Wealth Creation'],    risk: ['Conservative', 'Moderate'],               color: '#D97706', minAge: 18, maxAge: 60, premiumValue: 20000, coverValue: 800000 },
  'retirement-plans':{ type: 'Retirement', typeClass: 'type-retire', goals: ['Retirement Planning'],              risk: ['Conservative', 'Moderate'],               color: '#0F766E', minAge: 25, maxAge: 70, premiumValue: 40000, coverValue: 1500000 },
  'child-insurance': { type: 'Child Plan', typeClass: 'type-child',  goals: ["Child's Future"],                   risk: ['Conservative', 'Moderate'],               color: '#6D28D9', minAge: 18, maxAge: 55, premiumValue: 15000, coverValue: 2000000 },
  'health-insurance':{ type: 'Health',     typeClass: 'type-health', goals: ['Pure Protection'],                  risk: ['Conservative', 'Moderate', 'Aggressive'], color: '#DC2626', minAge: 18, maxAge: 65, premiumValue: 6000,  coverValue: 2500000 },
  'insurance-riders':{ type: 'Health',     typeClass: 'type-health', goals: ['Pure Protection'],                  risk: ['Conservative', 'Moderate', 'Aggressive'], color: '#DC2626', minAge: 18, maxAge: 65, premiumValue: 4000,  coverValue: 2500000 },
}

// Slugs that are clearly guides/landing pages, not products
const DENY = /(what-is|tax-benefit|types-of|calculator|in-your|-crore|vs-|difference|meaning|^guide|benefits-of|how-to|claim|for-nri|nris|why-)/i

const clean = s => (s || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()

// Site-wide footer disclaimer figures — generic, NOT plan-specific. Never use as a price.
const GENERIC_PREMIUMS = new Set(['626', '938', '46,800', '46800'])

// Extract a genuine per-plan premium where the page publishes one (mainly ULIPs:
// "Annualized Premium ₹12,000", "Minimum Premium … Single ₹50,000"). Returns
// { premium, premiumValue } or null when the plan lists no real price.
function extractPremium(html) {
  const txt = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&#8377;|&#x20B9;/g, '₹').replace(/\s+/g, ' ')

  // Anchor on a real premium-type label; tolerate footnote markers in the gap.
  // (The site-wide footer "The premium of ₹938…" is NOT matched — it lacks these labels.)
  const vals = []
  for (const m of txt.matchAll(/(?:annualized|annual|minimum|single)\s+premium[^₹]{0,40}?₹\s?([\d,]{4,})/gi)) {
    const raw = m[1].replace(/,/g, '')
    if (GENERIC_PREMIUMS.has(m[1]) || GENERIC_PREMIUMS.has(raw)) continue
    const v = Number(raw)
    if (v >= 1000 && v <= 2000000) vals.push(v)
  }
  if (!vals.length) return null

  const val = Math.min(...vals) // the entry-level premium
  // Frequency varies and is unreliable across layouts, so we don't assert it.
  return { premium: `From ₹${val.toLocaleString('en-IN')}*`, premiumValue: val }
}

// Strip insurer branding so the UI shows only neutral, AI-Sales-Agent copy
const stripBrand = s => (s || '')
  .replace(/Canara\s*HSBC(\s+Life\s+Insurance|\s+Life|\s+OBC\s+Life\s+Insurance)?/gi, '')
  .replace(/\bthe\s+Plan\b/gi, 'this plan')
  .replace(/\s{2,}/g, ' ')
  .replace(/\s+([.,])/g, '$1')
  .trim()

// Infer goals/risk per plan from its name + description + UIN, so plans
// within a category are differentiated (instead of all sharing defaults).
const GOAL_RULES = [
  [/child|junior|education|kid/, "Child's Future"],
  [/pension|retire|annuity|vesting|life-?long|legacy/, 'Retirement Planning'],
  [/cancer|critical illness|accident|disabilit|health|hospital|surgical/, 'Pure Protection'],
  [/\bterm\b|protect|life cover|family.{0,12}secure/, 'Pure Protection'],
  [/wealth|growth|market|equity|fund|invest|ulip/, 'Wealth Creation'],
  [/\btax\b|80c/, 'Tax Saving'],
  [/guarantee|assured|saving|income|money\s?back|endowment|nivesh/, 'Tax Saving'],
]
function inferGoals(text, cat, linked) {
  const t = text.toLowerCase(); const g = new Set()
  for (const [re, goal] of GOAL_RULES) if (re.test(t)) g.add(goal)
  if (linked) g.add('Wealth Creation')
  if (!g.size) CAT[cat].goals.forEach(x => g.add(x))
  return [...g]
}
function inferRisk(text, cat, linked) {
  const t = text.toLowerCase(); const r = new Set()
  if (linked || /market|equity|growth|aggressive|maximi[sz]e|wealth/.test(t)) { r.add('Moderate'); r.add('Aggressive') }
  if (!linked || /guarantee|assured|secure|\bincome\b|annuity|saving|pension/.test(t)) { r.add('Conservative'); r.add('Moderate') }
  if (/\bterm\b|protect|life cover|critical|cancer|accident/.test(t)) { r.add('Conservative'); r.add('Moderate'); r.add('Aggressive') }
  if (!r.size) CAT[cat].risk.forEach(x => r.add(x))
  return [...r]
}
// Pull a sum-assured hint from the copy (e.g. "1 Crore", "50 Lakh")
function inferCover(text, fallback) {
  const cr = text.match(/(\d+(?:\.\d+)?)\s*crore/i)
  if (cr) return { coverValue: Math.round(parseFloat(cr[1]) * 10000000), cover: `₹${cr[1]} Crore` }
  const lk = text.match(/(\d+)\s*lakh/i)
  if (lk) return { coverValue: parseInt(lk[1]) * 100000, cover: `₹${lk[1]} Lakh` }
  return { coverValue: fallback, cover: 'As per need' }
}

async function get(path) {
  try {
    const res = await fetch(BASE + path, { headers: HEADERS, redirect: 'follow' })
    return res.ok ? await res.text() : null
  } catch { return null }
}

// 1) Collect candidate product links from all seed pages
async function collectCandidates() {
  const cand = new Map()
  for (const seed of SEEDS) {
    const html = await get(seed)
    if (!html) continue
    for (const m of html.matchAll(/href="(\/[^"#?]+)"/gi)) {
      const href = m[1].replace(/\/$/, '')
      const seg = href.split('/').filter(Boolean)
      if (seg.length === 2 && CAT[seg[0]] && !DENY.test(seg[1])) cand.set(href, seg[0])
    }
  }
  return cand
}

// 2) Confirm each candidate is a real product (has a UIN) and extract fields
async function scrapeProduct(href, cat) {
  const html = await get(href)
  if (!html) return null
  const uin = html.match(/UIN[:\s]*([0-9]{3}[A-Z][0-9]{3}V[0-9]{2})/i)?.[1]
  if (!uin) return null // not a product page

  const name = stripBrand(clean(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1]) ||
               clean(html.match(/<title[^>]*>([^<|]+)/i)?.[1]))
  const desc = stripBrand(clean(html.match(/<meta\s+name="description"\s+content="([^"]+)"/i)?.[1]))
  const c = CAT[cat]
  const priced = extractPremium(html) // genuine per-plan premium, or null
  const linked = /^136L/i.test(uin)  // L = unit-linked (market-linked); N = traditional
  const text = `${name} ${desc}`
  const goals = inferGoals(text, cat, linked)
  const risk = inferRisk(text, cat, linked)
  const { coverValue, cover } = inferCover(text, c.coverValue)
  // Versatility-based suitability so similar plans still differ a little
  const suitabilityScore = Math.max(78, Math.min(95, 80 + goals.length * 3 + (linked ? 2 : 0)))

  return {
    id: href.split('/').pop(),
    name, shortName: name.replace(/\s*(Plan|Term Plan)$/i, '').trim() || name,
    type: c.type, typeClass: c.typeClass,
    premium: priced ? priced.premium : 'On quote',
    premiumValue: priced ? priced.premiumValue : c.premiumValue,
    cover, coverValue,
    policyTerm: 'See brochure', paymentTerm: 'Regular / Limited / Single',
    deathBenefit: 'As per plan terms', maturityBenefit: 'As per plan terms',
    taxBenefit: '80C + 10(10D)', criticalIllness: 'See riders',
    premiumWaiver: 'See riders', surrenderValue: 'As per plan terms',
    loanFacility: 'As per plan terms', claimSettlement: '99%+',
    suitabilityScore, match: suitabilityScore, color: c.color,
    linked, goals, risk, minAge: c.minAge, maxAge: c.maxAge,
    benefit: desc || `${c.type} insurance plan.`,
    highlights: [],
    uin, sourceUrl: BASE + href,
  }
}

async function main() {
  console.log('Collecting product links…')
  const cand = await collectCandidates()
  console.log(`  ${cand.size} candidate pages to check`)

  const plans = []
  for (const [href, cat] of cand) {
    const p = await scrapeProduct(href, cat)
    if (p) { plans.push(p); console.log(`  ✓ [${p.type}] ${p.name} (UIN ${p.uin})`) }
  }

  if (!plans.length) throw new Error('No products scraped — site structure may have changed.')

  // Dedupe by UIN
  const byUin = new Map(plans.map(p => [p.uin, p]))
  const out = [...byUin.values()]

  const feed = {
    source: BASE + ' (live scrape)',
    fetchedAt: new Date().toISOString(),
    count: out.length,
    plans: out,
  }
  writeFileSync('public/plans.json', JSON.stringify(feed, null, 2))
  console.log(`\nScraped ${out.length} live products → public/plans.json`)
}

main().catch(err => { console.error('Scrape failed:', err.message); process.exit(1) })
