import { configureStore } from '@reduxjs/toolkit'
import ui from './uiSlice'
import client from './clientSlice'
import plans from './plansSlice'
import history, { HISTORY_KEY } from './historySlice'
import savedClients, { SAVED_CLIENTS_KEY } from './savedClientsSlice'
import sync, { SYNC_CONFIG_KEY, pushToGist } from './syncSlice'

export const store = configureStore({
  reducer: { ui, client, plans, history, savedClients, sync },
})

// Persist history to localStorage
let lastHistory = store.getState().history.items
store.subscribe(() => {
  const current = store.getState().history.items
  if (current !== lastHistory) {
    lastHistory = current
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(current)) } catch { /* ignore */ }
  }
})

// Persist saved clients to localStorage
let lastSaved = store.getState().savedClients.items
store.subscribe(() => {
  const current = store.getState().savedClients.items
  if (current !== lastSaved) {
    lastSaved = current
    try { localStorage.setItem(SAVED_CLIENTS_KEY, JSON.stringify(current)) } catch { /* ignore */ }
  }
})

// Persist sync config (gistId + pat) to localStorage
let lastSyncCfg = null
store.subscribe(() => {
  const { gistId, pat } = store.getState().sync
  const cfg = JSON.stringify({ gistId, pat })
  if (cfg !== lastSyncCfg) {
    lastSyncCfg = cfg
    try { localStorage.setItem(SYNC_CONFIG_KEY, cfg) } catch { /* ignore */ }
  }
})

// Debounced push to Gist when data changes (skip during load/syncing)
let lastDataSnapshot = null
let pushTimer = null
store.subscribe(() => {
  const state = store.getState()
  const { gistId, pat, status } = state.sync
  if (!gistId || !pat || status === 'syncing') return

  const snapshot = state.history.items === lastHistory && state.savedClients.items === lastSaved
    ? lastDataSnapshot
    : JSON.stringify([state.history.items, state.savedClients.items])

  if (snapshot === lastDataSnapshot) return
  lastDataSnapshot = snapshot

  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => store.dispatch(pushToGist()), 2500)
})
