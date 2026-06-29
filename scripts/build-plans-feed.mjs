// Generates public/plans.json — the runtime feed the app fetches.
// Run: node scripts/build-plans-feed.mjs
// In production this output would instead come from your CMS / data
// source / scraper (see scrape-plans.mjs), but the JSON shape is the same.

import { PLANS } from '../src/data/plans.js'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const out = resolve(__dirname, '../public/plans.json')

const feed = {
  source: 'AI Sales Agent — product catalogue',
  fetchedAt: new Date().toISOString(),
  count: PLANS.length,
  plans: PLANS,
}

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(feed, null, 2))
console.log(`Wrote ${PLANS.length} plans → ${out}`)
