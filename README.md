# AI Sales Agent

An AI-powered advisor portal for life-insurance and financial product sales. Profile clients, generate ranked product recommendations, and compare policies — all in the browser with no backend.

**Live app:** https://nitishanand094.github.io/ai-sales-agent/

---

## Features

### Client Profiler
Build a client profile in 3 steps (personal details → financial info → health & lifestyle). The app scores and ranks suitable products based on the profile.

### AI Recommendations
Instant product recommendations ranked by fit score, with plain-English reasoning for each suggestion. Saves automatically to history.

### Policy Comparison
Side-by-side feature comparison of up to 4 products. Download as a formatted PDF with one click.

### Saved Clients
Save client profiles for future reference. Reload a saved client and regenerate recommendations in one click without re-entering their data.

### Recommendation History
Full log of all past recommendation sessions.

### Cloud Sync
All saved clients and history are shared across devices automatically. Anyone who opens the app URL sees the same data — no setup or login required for read access. Data is stored in a GitHub Gist.

---

## Tech stack

- **React 18 + Vite 5** — frontend framework and build tool
- **Redux Toolkit** — state management with localStorage persistence
- **GitHub Pages** — static hosting via GitHub Actions CI/CD
- **GitHub Gist** — free shared cloud data store (no backend)

---

## Cloud sync — write access setup

All visitors can read shared data automatically. To add or update data from a device:

1. Go to [gist.github.com](https://gist.github.com) → New secret Gist
   - Filename: `sales-agent-data.json`
   - Content: `{"history":[],"savedClients":[]}`
   - Click **Create secret Gist**, copy the Gist ID from the URL

2. Go to [github.com/settings/tokens](https://github.com/settings/tokens) → Generate new token (classic)
   - Enable the **gist** scope only → Generate → copy the token

3. In the app, click **Sync Settings** in the sidebar → paste the Gist ID and token → **Save & Sync**

After setup, writes are automatic. A status dot in the sidebar shows sync state (green = synced, yellow = syncing, red = error). Other devices remain read-only.

---

## Local development

```bash
npm install
npm run feed        # generates public/plans.json from product data
npm run dev         # starts dev server at localhost:5173
```

### Deploy

The app deploys automatically to GitHub Pages on every push to `main` via `.github/workflows/deploy.yml`.

```bash
npm run build       # production build → dist/
```

---

## Project structure

```
src/
  pages/          # Dashboard, Profiler, Recommendations, Comparison
  components/     # Sidebar, MobileNav, SyncSettings
  store/          # Redux slices: ui, client, plans, history, savedClients, sync
  engine/         # Scoring logic, premium estimator, Gist sync
  data/           # Product definitions
  config.js       # Shared Gist ID and app-level constants
scripts/
  feed.js         # Generates public/plans.json
.github/
  workflows/
    deploy.yml    # GitHub Actions → GitHub Pages
```
