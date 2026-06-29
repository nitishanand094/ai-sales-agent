// ── Local recurring scrape ───────────────────────────────────────────
// Runs the live scrape now, then again every REFRESH_HOURS while this
// stays open. No OS scheduler / system change — just a terminal process.
//
//   npm run scrape:watch                 (default: every 12 hours)
//   REFRESH_HOURS=6 npm run scrape:watch (custom interval)
//
// Leave the terminal open; press Ctrl+C to stop.
// ---------------------------------------------------------------------

import { spawn } from 'node:child_process'

const HOURS = Number(process.env.REFRESH_HOURS) || 12

function run() {
  const child = spawn(process.execPath, ['--use-system-ca', 'scripts/scrape-live.mjs'], { stdio: 'inherit' })
  child.on('close', code => {
    const next = new Date(Date.now() + HOURS * 3600 * 1000)
    console.log(`[loop] scrape exited ${code} · next run ~${next.toLocaleTimeString()}`)
  })
}

console.log(`[loop] Live scrape scheduled every ${HOURS}h. Keep this open; Ctrl+C to stop.`)
run()
setInterval(run, HOURS * 3600 * 1000)
