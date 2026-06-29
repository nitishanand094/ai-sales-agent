import { configureStore } from '@reduxjs/toolkit'
import ui from './uiSlice'
import client from './clientSlice'
import plans from './plansSlice'
import history, { HISTORY_KEY } from './historySlice'

export const store = configureStore({
  reducer: { ui, client, plans, history },
})

// Persist the search history to localStorage whenever it changes.
let lastHistory = store.getState().history.items
store.subscribe(() => {
  const current = store.getState().history.items
  if (current !== lastHistory) {
    lastHistory = current
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(current)) } catch { /* ignore */ }
  }
})
