# AI Sales Agent — Tech Stack & Architecture

## Overview

A single-page web app for life-insurance sales advisors. It runs entirely in the browser (React + Vite) with **no application backend**. It provides:

- An **AI Sales Agent dashboard** whose metrics are computed from real usage data (not mock numbers).
- A **client profiler** that produces AI-matched product recommendations and saves client profiles.
- **Approximate premium estimates** and side-by-side **policy comparison**.
- A **recommendation history** and **saved clients** list, both shared across devices via a GitHub Gist.

Product data is **not hardcoded** — it is fetched at runtime from a JSON feed produced by a Node ingestion script. Global state is managed with **Redux Toolkit**.

---

## Overall Architecture

```
┌──────────────────────────── Browser (SPA) ─────────────────────────────┐
│                                                                          │
│   React components                                                       │
│   Sidebar · MobileNav · SyncSettings · Dashboard · Profiler · …         │
│        │  useSelector / useDispatch                                      │
│        ▼                                                                 │
│   ┌─────────────────────────── Redux store ──────────────────────────┐  │
│   │  ui      client    plans      history    savedClients    sync     │  │
│   └──────────────────────────────────────────────────────────────────┘  │
│        │                    │            │           │                   │
│        ▼                    ▼            ▼           ▼                   │
│   match engine /       plans feed   localStorage  GitHub Gist            │
│   premium estimator    (loaded once) ch_advisor_  (shared JSON store,    │
│   (pure functions)     at startup    history       auto-sync on load     │
│                                      ch_saved_     and data change)      │
│                                      clients                             │
│                                      ch_sync_                            │
│                                      config                              │
└──────────────────────────────────────────────────────────────────────────┘
                │  fetch(/plans.json)          │  GitHub API (PATCH /gists)
                ▼                             ▼
         public/plans.json            gist.github.com
         (written by npm run feed)    sales-agent-data.json
```

**Layers**

1. **View** — React function components. No prop-drilling of shared state; they read/write the store via hooks.
2. **State** — a single Redux store with six slices (`ui`, `client`, `plans`, `history`, `savedClients`, `sync`).
3. **Domain logic** — pure modules: the match engine (scoring), the premium estimator, and the Gist sync engine. They read plan data from the store and take the client profile as input.
4. **Data** — plans are fetched at runtime from `public/plans.json`. History, saved clients, and sync config live in `localStorage`. All three are mirrored to a shared GitHub Gist.
5. **Ingestion (offline / server-side)** — Node scripts that write the feed. These run outside the browser, not as part of the app.

**Key data flows**

- *Startup:* `App` dispatches `loadPlans()` and `loadFromGist()` in parallel. Plans populate from feed/cache/fallback; history and saved clients merge in from the Gist (read-only if no PAT configured).
- *Profiling:* Profiler form → `setClient` + `addEntry(history)` + `upsertClient(savedClients)` → match engine ranks plans → Recommendations render scored cards. A 2.5s debounced subscriber pushes changes to the Gist automatically.
- *Dashboard:* reads `history` from the store → analytics functions compute KPIs, insights and next actions live.

---

## Tech Stack

### Core
| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.3 | UI component framework |
| **Redux Toolkit** | 2.x | Global state (store, slices, async thunks, selectors) |
| **react-redux** | 9.x | React bindings (`Provider`, `useSelector`, `useDispatch`) |
| **Vite** | 5.4 | Dev server + build tool (base: `/ai-sales-agent/` for GitHub Pages) |
| **JavaScript (ESM)** | ES2022 | Language (no TypeScript) |

### Styling
| Technology | Purpose |
|---|---|
| **Plain CSS** (`index.css`) | All styling — no CSS framework |
| **CSS Custom Properties** | Brand tokens: colours, spacing, shadows |
| **IBM Plex Sans** (Google Fonts) | Primary typeface |

**Design direction:** a restrained, enterprise look — minimal iconography (clean line-style SVG icons in the left nav only). The palette is defined as CSS variables in `:root`:

| Token | Value | Use |
|---|---|---|
| `--primary` | `#00ADEF` | Bright cyan — primary buttons, active states, CTA |
| `--primary-dark` | `#0090C8` | Darker cyan — hover states |
| `--primary-light` | `#0067B1` | Deep blue — accents, active nav indicator |
| `--navy` | `#0A2540` | Sidebar / dark headers |
| `--accent` | `#1A6B3C` | Green — success, match scores |
| `--danger` | `#C62828` | Red — destructive actions, low-score indicator |
| `--gold` | `#C8972A` | Secondary accent (used sparingly) |

### Tooling
| Tool | Purpose |
|---|---|
| **`@vitejs/plugin-react`** | JSX transform + Fast Refresh |
| **ESLint** | Linting (react-hooks, react-refresh) |
| **GitHub Actions** | CI/CD — builds and deploys to GitHub Pages on push to `main` |
| **npm** | Package manager + script runner |

---

## State Management (Redux Toolkit)

The store is created in `src/store/index.js` and provided at the root in `src/main.jsx` via `<Provider>`. Six slices:

| Slice | File | State | Actions / thunks |
|---|---|---|---|
| **ui** | `uiSlice.js` | `page`, `toasts` | `setPage`, `addToast`, `removeToast`, `notify` |
| **client** | `clientSlice.js` | `current` (active profile) | `setClient`, `clearClient` |
| **plans** | `plansSlice.js` | `items`, `meta`, `status` | `loadPlans` (async thunk); memoised selectors |
| **history** | `historySlice.js` | `items` | `addEntry`, `deleteEntry`, `clearAll`, `setHistoryItems` |
| **savedClients** | `savedClientsSlice.js` | `items` | `upsertClient` (insert or update by name), `deleteClient`, `clearSavedClients`, `setSavedClientItems` |
| **sync** | `syncSlice.js` | `gistId`, `pat`, `status`, `lastSync`, `errorMsg` | `setSyncConfig`, `clearSyncConfig`, `loadFromGist`, `pushToGist` |

**Persistence** — a `store.subscribe` in `store/index.js` writes three keys to `localStorage`:
- `ch_advisor_history` — recommendation history items
- `ch_saved_clients` — saved client profiles
- `ch_sync_config` — Gist ID and PAT for the owner's device

A **debounced push subscriber** (2.5s delay) calls `pushToGist()` whenever history or savedClients change, but only if a PAT is configured.

---

## Cloud Sync (GitHub Gist)

All visitors auto-load shared data from a hardcoded Gist ID (`src/config.js`) on every page open — no credentials needed for reads. The Gist stores:

```json
{ "history": [...], "savedClients": [...] }
```

### Sync engine (`src/engine/gistSync.js`)
- `fetchGist(gistId, pat?)` — reads from the GitHub Gist API. PAT is optional; unauthenticated reads work for both public and secret Gists when the ID is known.
- `patchGist(gistId, pat, data)` — writes via `PATCH /gists/{id}`. Requires a PAT with `gist` scope.

### Sync thunks (`src/store/syncSlice.js`)
- `loadFromGist` — fetches Gist data, merges with local items by ID (Gist items are canonical), dispatches to `history` and `savedClients` slices. Writes merged result back only if PAT is present.
- `pushToGist` — pushes current history + savedClients to Gist. No-op if PAT is absent.

**Merge strategy:** union by `id`. Gist items take precedence on conflict; local-only items are appended. Prevents data loss when multiple sessions write concurrently.

---

## Data Layer

### Runtime feed
- The app fetches the catalogue from `VITE_PLANS_URL` (default `/plans.json`) on startup via the `loadPlans` thunk.
- Resolution order: **fresh `localStorage` cache** (`ch_plans_cache`, 1-hour TTL) → **live feed** → **bundled fallback** (`src/data/plans.js`).

### Ingestion scripts (`scripts/`, run with Node)
| Script | npm command | What it does |
|---|---|---|
| `build-plans-feed.mjs` | `npm run feed` | Writes the bundled catalogue as `public/plans.json` |
| `scrape-live.mjs` | `npm run scrape` | Scrapes the insurer's public site, keeps only IRDAI UIN-bearing products |
| `scrape-loop.mjs` | `npm run scrape:watch` | Recurring scrape (every `REFRESH_HOURS`, default 12) |
| `sync-feed.mjs` | `npm run sync` | Builds feed from a CMS endpoint or Google-Sheet CSV |
| `export-template.mjs` | `npm run feed:template` | Exports catalogue to `plans-source.csv` |

---

## Domain Logic

### `src/engine/matchEngine.js`
Deterministic AI matching. `scorePlan(profile, plan)` blends goal fit (35), risk fit (25), age eligibility (15), budget fit (15) and coverage fit (10) with a product-quality nudge. Exposes `rankPlans`, `clientScore`, and `buildReasoning`.

### `src/engine/premiumEstimator.js`
`estimatePremium(plan, profile?)` produces an indicative annual premium (rate per ₹1,000 of sum assured, adjusted for age/term, by product type). Not a quote — insurer rates are proprietary.

### `src/engine/gistSync.js`
`fetchGist` and `patchGist` — thin wrappers over the GitHub Gist REST API. Used by the sync slice thunks.

### `src/store/clientStore.js`
Pure analytics over the history array: `getDashboardStats`, `getGoalDistribution`, `getAIInsights`, `getNextActions`. Consumed by the Dashboard page.

---

## Components & Pages

### Components (`src/components/`)
- **Sidebar** — navigation + sync status dot; shows "Sync Settings" button only when sync is not yet configured; collapses to a dot indicator once active.
- **MobileNav** — bottom nav bar for ≤768px viewports.
- **SyncSettings** — modal for entering Gist ID + PAT, testing connection, and disconnecting. Includes a collapsible first-time setup guide.
- **PlanDetailModal** — full plan detail overlay.
- **ProgressBar / Slider / Toast** — small presentational helpers.

### Pages (`src/pages/`)
- **Dashboard** — live KPIs, AI insights, recommended next actions, goal distribution and recent activity computed from `history`. Onboarding empty state when no data.
- **Profiler** — four tabs: **Profile Builder** (3-step intake), **Recommendations** (scored cards + AI reasoning), **Saved Clients** (persistent profiles with load/edit/delete), **Recommendation History**.
- **Recommendations** — standalone product catalogue with filter/sort and approx premiums.
- **Comparison** — 2–4 plan side-by-side table with best-value highlighting, approx premiums, and Advisor's Verdict. PDF download via `window.print()`.

---

## Responsiveness
- **≤768px** — sidebar hidden, mobile bottom nav shown, grids collapse.
- **≤480px** — buttons stack, modal padding adjusts.

---

## Build & Deploy

```bash
npm install          # install dependencies
npm run feed         # generate public/plans.json
npm run dev          # dev server (http://localhost:5173)
npm run build        # production build → dist/
npm run preview      # preview the production build
```

Deployment is fully automated — pushing to `main` triggers `.github/workflows/deploy.yml`:
1. `npm ci` → `npm run feed` → `npm run build`
2. Upload `dist/` as a GitHub Pages artifact
3. Deploy to `https://nitishanand094.github.io/ai-sales-agent/`
