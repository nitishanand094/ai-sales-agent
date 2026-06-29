import { configureStore } from '@reduxjs/toolkit'
import ui from './uiSlice'
import client from './clientSlice'
import plans from './plansSlice'
import history, { HISTORY_KEY } from './historySlice'
import savedClients, { SAVED_CLIENTS_KEY } from './savedClientsSlice'

export const store = configureStore({
  reducer: { ui, client, plans, history, savedClients },
})

let lastHistory = store.getState().history.items
store.subscribe(() => {
  const current = store.getState().history.items
  if (current !== lastHistory) {
    lastHistory = current
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(current)) } catch { /* ignore */ }
  }
})

let lastSaved = store.getState().savedClients.items
store.subscribe(() => {
  const current = store.getState().savedClients.items
  if (current !== lastSaved) {
    lastSaved = current
    try { localStorage.setItem(SAVED_CLIENTS_KEY, JSON.stringify(current)) } catch { /* ignore */ }
  }
})
