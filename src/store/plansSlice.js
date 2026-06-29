import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'
import { PLANS as BUNDLED } from '../data/plans'

const FEED_URL = import.meta.env.VITE_PLANS_URL || '/plans.json'
const CACHE_KEY = 'ch_plans_cache'
const CACHE_TTL = 60 * 60 * 1000 // 1 hour

function normalize(raw) {
  if (!Array.isArray(raw)) return null
  const clean = raw.filter(p => p && p.id && p.name && Array.isArray(p.goals) && Array.isArray(p.risk))
  return clean.length ? clean : null
}

function readCache() {
  try {
    const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
    if (c && Date.now() - c.fetchedAt < CACHE_TTL && Array.isArray(c.plans)) return c
  } catch { /* ignore */ }
  return null
}

// Load the catalogue: fresh cache → live feed → bundled fallback.
// Always resolves (never rejects) so meta reflects whichever source we used.
export const loadPlans = createAsyncThunk('plans/load', async ({ force = false } = {}) => {
  if (!force) {
    const cached = readCache()
    if (cached) {
      return { items: cached.plans, meta: { source: 'cache', fetchedAt: cached.fetchedAt, count: cached.plans.length } }
    }
  }
  try {
    const res = await fetch(FEED_URL, { cache: 'no-store' })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const body = await res.json()
    const plans = normalize(body.plans || body)
    if (!plans) throw new Error('Feed had no usable plan records')
    const fetchedAt = Date.now()
    localStorage.setItem(CACHE_KEY, JSON.stringify({ fetchedAt, plans }))
    return { items: plans, meta: { source: 'live', fetchedAt, count: plans.length } }
  } catch (err) {
    return { items: BUNDLED, meta: { source: 'bundled', fetchedAt: null, count: BUNDLED.length, error: String(err.message || err) } }
  }
})

const plansSlice = createSlice({
  name: 'plans',
  initialState: {
    items: BUNDLED,
    meta: { source: 'bundled', fetchedAt: null, count: BUNDLED.length },
    status: 'idle',
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(loadPlans.pending, (state) => { state.status = 'loading' })
      .addCase(loadPlans.fulfilled, (state, action) => {
        state.items = action.payload.items
        state.meta = action.payload.meta
        state.status = 'ready'
      })
  },
})

// Selectors
export const selectPlans = (state) => state.plans.items
export const selectPlansMeta = (state) => state.plans.meta
export const selectPlanTypes = createSelector(
  selectPlans,
  (items) => ['All', ...new Set(items.map(p => p.type))]
)

export default plansSlice.reducer
