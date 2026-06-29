# CanaraHSBC AI Sales Agent

An AI-powered advisor portal for insurance and financial product sales. Built for Canara HSBC Life Insurance sales teams to profile clients, generate product recommendations, and compare policies — all in the browser with no backend.

**Live app:** https://nitishanand094.github.io/ai-sales-agent/

---

## What it does

### Client Profiler
Build a client profile in 3 steps (personal details → financial info → health & lifestyle). The app scores and ranks suitable insurance/investment products based on the profile.

### AI Recommendations
Instant product recommendations ranked by fit score, with reasoning for each suggestion. Saves automatically to the client's history.

### Policy Comparison
Side-by-side feature comparison of up to 4 products. Download as a formatted PDF with one click.

### Saved Clients
Save client profiles for future reference. Reload a saved client and regenerate recommendations in one click without re-entering their data.

### Recommendation History
Full log of all past recommendation sessions, searchable by client name.

### Cloud Sync (optional)
Share client data and history across devices and team members via a GitHub Gist. Anyone with the app URL and the same Gist configuration sees the same data. Syncs automatically on every page load and after every data change.

---

## Tech stack

- **React 18 + Vite 5** — frontend framework and build tool
- **Redux Toolkit** — state management with localStorage persistence
- **GitHub Pages** — static hosting via GitHub Actions CI/CD
- **GitHub Gist** — optional free cloud sync (no backend required)

---

## Cloud sync setup

To share data across devices:

1. Go to [gist.github.com](https://gist.github.com) → New secret Gist
   - Filename: `sales-agent-data.json`
   - Content: `{"history":[],"savedClients":[]}`
   - Click **Create secret Gist**, copy the ID from the URL

2. Go to [github.com/settings/tokens](https://github.com/settings/tokens) → Generate new token (classic)
   - Enable the **gist** scope only → Generate → copy the token

3. In the app, click **Sync Settings** in the sidebar → paste the Gist ID and token → **Save & Sync**

After setup, sync is fully automatic. A status dot in the sidebar shows the sync state (green = synced, yellow = syncing, red = error).

---

## Local development

```bash
npm install
npm run feed        # generates public/plans.json from product data
npm run dev         # starts dev server at localhost:5173
```

### Build and deploy

The app deploys automatically to GitHub Pages on every push to `main` via the GitHub Actions workflow in `.github/workflows/deploy.yml`.

```bash
npm run build       # production build → dist/
```

---

## Project structure

```
src/
  pages/          # Dashboard, Profiler, Recommendations, Comparison
  components/     # Sidebar, MobileNav, SyncSettings
  store/          # Redux slices (ui, client, plans, history, savedClients, sync)
  engine/         # Scoring logic, Gist sync
  data/           # Product definitions
scripts/
  feed.js         # Generates public/plans.json
```
