# AI Sales Agent — Tech Stack & Architecture

## Overview

A single-page web app for life-insurance sales advisors. It runs entirely in the browser (React + Vite) with **no application backend**. It provides:

- An **AI Sales Agent dashboard** whose metrics are computed from real usage data (not mock numbers).
- A **client profiler** that produces AI-matched product recommendations.
- **Approximate premium estimates** and side-by-side **policy comparison**.
- A **search history** of past client profiles.

Product data is **not hardcoded** — it is fetched at runtime from a JSON feed, which is produced by a live scraper of the insurer's public site (or, alternatively, a CMS/Google-Sheet export). Global state is managed with **Redux Toolkit**.

---

## Overall Architecture

```
┌──────────────────────────── Browser (SPA) ────────────────────────────┐
│                                                                        │
│   React components                                                     │
│   Sidebar · MobileNav · Dashboard · Profiler · Recommendations · …     │
│        │  useSelector / useDispatch                                    │
│        ▼                                                               │
│   ┌──────────────────────── Redux store ────────────────────────┐     │
│   │   ui          client         plans           history         │     │
│   │  (page,      (current      (catalogue +    (search history,   │     │
│   │   toasts)     profile)      async load)     persisted)        │     │
│   └──────────────────────────────────────────────────────────────┘    │
│        │                    │                 │                        │
│        ▼                    ▼                 ▼                        │
│   match engine /       plans feed        localStorage                  │
│   premium estimator    (loaded once)     • ch_advisor_history          │
│   (pure functions,     at startup        • ch_plans_cache (1h TTL)     │
│    read store)                                                         │
└────────────────────────────────│──────────────────────────────────────┘
                                  │  fetch(VITE_PLANS_URL, default /plans.json)
                                  ▼
                         public/plans.json   ◄── written, server-side (Node), by:
                                  ▲                • npm run scrape  → live insurer site
                                  │                • npm run sync    → CMS / Google-Sheet CSV
                                  │                • npm run feed    → bundled catalogue
                    canarahsbclife.com (scraped with --use-system-ca)
```

**Layers**

1. **View** — React function components. No prop-drilling of shared state; they read/write the store via hooks.
2. **State** — a single Redux store with four slices (`ui`, `client`, `plans`, `history`).
3. **Domain logic** — pure modules: the match engine (scoring) and the premium estimator. They read plan data from the store and take the client profile as input.
4. **Data** — plans are fetched at runtime from `public/plans.json`; the bundled `src/data/plans.js` is only a fallback. History and the plan cache live in `localStorage`.
5. **Ingestion (offline / server-side)** — Node scripts that write the feed: a live scraper, a CMS/Sheet sync, and a bundled-catalogue generator. These run outside the browser (cron / manual), not as part of the app.

**Key data flows**

- *Startup:* `App` dispatches `loadPlans()` → thunk reads cache → else fetches the feed → else falls back to bundled → store populated → components render.
- *Profiling:* Profiler form → `setClient` + `addEntry(history)` → match engine ranks plans for that profile → Recommendations render scored cards; history persists to `localStorage`.
- *Dashboard:* reads `history` from the store → analytics functions compute KPIs, insights and next actions live.

---

## Tech Stack

### Core
| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.3 | UI component framework |
| **Redux Toolkit** | 2.x | Global state (store, slices, async thunks, selectors) |
| **react-redux** | 9.x | React bindings (`Provider`, `useSelector`, `useDispatch`) |
| **Vite** | 5.4 | Dev server + build tool |
| **JavaScript (ESM)** | ES2022 | Language (no TypeScript) |

### Styling
| Technology | Purpose |
|---|---|
| **Plain CSS** (`index.css`) | All styling — no CSS framework |
| **CSS Custom Properties** | Brand tokens: colours, spacing, shadows |
| **IBM Plex Sans** (Google Fonts) | Primary typeface |

**Design direction:** a restrained, enterprise look — minimal iconography (clean line-style SVG icons in the left nav only; no emojis or decorative glyphs elsewhere). The palette is **CanaraHSBC-inspired blue**, defined as CSS variables in `:root`:

| Token | Value | Use |
|---|---|---|
| `--primary` | `#0067B1` | Deep brand blue — primary buttons, active states, table headers |
| `--primary-light` | `#00ADEF` | Signature bright blue — accents, active nav indicator |
| `--primary-muted` | `#E6F4FC` | Light blue tint — surfaces, chips |
| `--navy` | `#0A2540` | Sidebar / dark headers |
| `--accent` | `#1A6B3C` | Green — success, match scores |
| `--danger` | `#C62828` | Red — destructive actions, low-score indicator |
| `--gold` | `#C8972A` | Secondary accent (used sparingly) |

### Tooling
| Tool | Purpose |
|---|---|
| **`@vitejs/plugin-react`** | JSX transform + Fast Refresh |
| **ESLint** | Linting (react-hooks, react-refresh) |
| **Node `fetch` + `--use-system-ca`** | Server-side scraping/sync scripts (trusts the corporate proxy CA) |
| **npm** | Package manager + script runner |

---

## State Management (Redux Toolkit)

The store is created in `src/store/index.js` and provided at the root in `src/main.jsx` via `<Provider>`. Four slices:

| Slice | File | State | Actions / thunks |
|---|---|---|---|
| **ui** | `uiSlice.js` | `page`, `toasts` | `setPage`, `addToast`, `removeToast`, `notify` (thunk — shows a toast and auto-dismisses after 3.5s) |
| **client** | `clientSlice.js` | `current` (active profile) | `setClient`, `clearClient` |
| **plans** | `plansSlice.js` | `items`, `meta`, `status` | `loadPlans` (async thunk); selectors `selectPlans`, `selectPlansMeta`, `selectPlanTypes` (memoised) |
| **history** | `historySlice.js` | `items` | `addEntry`, `deleteEntry`, `clearAll` |

- **Persistence:** a `store.subscribe` in `store/index.js` writes the `history` slice to `localStorage` (`ch_advisor_history`) whenever it changes.
- **Non-React access:** the match engine reads plans via `store.getState().plans.items`, so pure logic can score without hooks.

---

## Data Layer

### Runtime feed
- The app fetches the catalogue from `VITE_PLANS_URL` (default `/plans.json`) on startup via the `loadPlans` thunk.
- Resolution order: **fresh `localStorage` cache** (`ch_plans_cache`, 1-hour TTL) → **live feed** → **bundled fallback** (`src/data/plans.js`).
- `meta.source` records which was used (`live` / `cache` / `bundled`) and is shown on the dashboard.

### Ingestion scripts (`scripts/`, run with Node, not in the browser)
| Script | npm command | What it does |
|---|---|---|
| `scrape-live.mjs` | `npm run scrape` | Scrapes the insurer's public site, keeps only real products (those carrying an IRDAI **UIN**), strips insurer branding from copy, captures any published minimum premium, and writes `public/plans.json`. |
| `scrape-loop.mjs` | `npm run scrape:watch` | Runs the scrape now and re-runs every `REFRESH_HOURS` (default 12) while open. |
| `sync-feed.mjs` | `npm run sync` | Builds the feed from a CMS endpoint or a published Google-Sheet **CSV** (or a local `plans-source.csv`). |
| `export-template.mjs` | `npm run feed:template` | Exports the current catalogue to `plans-source.csv` for editing in a sheet. |
| `build-plans-feed.mjs` | `npm run feed` | Writes the bundled catalogue out as `public/plans.json` (offline demo). |

> The scraper runs server-side because the site blocks bots, has no public API, returns quote-based premiums, and (on a corporate network) sits behind a TLS-intercepting proxy — handled with Node's `--use-system-ca`.

### `.env`
- `VITE_PLANS_URL` — where the app fetches the catalogue (default `/plans.json`).
- `FEED_SOURCE_URL` — source for `npm run sync` (Google-Sheet CSV / CMS URL). Blank → uses local `plans-source.csv`.

---

## Domain Logic (pure modules)

### `src/engine/matchEngine.js`
Deterministic AI matching. `scorePlan(profile, plan)` blends goal fit (35), risk fit (25), age eligibility (15), budget fit (15) and coverage fit (10) with a small product-quality nudge. Exposes `rankPlans`, `clientScore`, and `buildReasoning` (human-readable explanation generated from the profile). Reads plans from the store.

### `src/engine/premiumEstimator.js`
`estimatePremium(plan, profile?)` produces an **indicative** annual premium using the standard industry method (rate per ₹1,000 of sum assured, adjusted for age/term, by product type). Catalogue view uses a 30-year-old default; inside Recommendations it uses the client's actual age/cover/term. `PREMIUM_METHODOLOGY` is the user-facing explanation. Not a quote — the insurer's real rates are proprietary.

### `src/store/clientStore.js`
Pure analytics over the history array: `getDashboardStats`, `getGoalDistribution`, `getAIInsights`, `getNextActions`. The dashboard passes in the Redux `history` and renders the results.

---

## Components & Pages

### Components (`src/components/`)
- **Sidebar / MobileNav** — navigation; read `page`, dispatch `setPage`.
- **PlanDetailModal** — full plan detail overlay (esc/backdrop close, scroll lock, approx premium, highlights, details grid).
- **ProgressBar / Slider / Toast** — small presentational helpers.

### Pages (`src/pages/`)
- **Dashboard** — AI Sales Agent console: live KPIs, AI insights, recommended next actions, goal distribution and recent activity, all computed from `history`. Shows an onboarding empty state when there's no data.
- **Profiler** — three tabs: **Profile Builder** (3-step intake), **Recommendations** (scored cards + approx premiums + AI reasoning; empty state prompts profile creation), **Search History** (table with restore/delete).
- **Recommendations** — standalone product catalogue with filter/sort, approx premiums and a "how premiums are calculated" note.
- **Comparison** — 2–4 plan side-by-side table with best-value highlighting, approx premiums, and an Advisor's Verdict panel.

---

## Responsiveness
- **≤768px** — sidebar hidden, mobile bottom nav shown, grids collapse.
- **≤480px** — buttons stack, modal padding adjusts.

---

## Build & Run

```bash
npm install          # install dependencies
npm run dev          # dev server (http://localhost:5173)
npm run build        # production build → dist/
npm run preview      # preview the production build

# Data feed
npm run scrape       # refresh public/plans.json from the live site
npm run scrape:watch # recurring local refresh (every REFRESH_HOURS)
npm run sync         # refresh from a CMS / Google-Sheet CSV
npm run feed         # write the bundled catalogue out as the feed
```
