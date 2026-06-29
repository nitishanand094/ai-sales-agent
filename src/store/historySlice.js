import { createSlice } from '@reduxjs/toolkit'

export const HISTORY_KEY = 'ch_advisor_history'

function loadInitial() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') }
  catch { return [] }
}

const historySlice = createSlice({
  name: 'history',
  initialState: { items: loadInitial() },
  reducers: {
    addEntry: {
      reducer: (state, action) => {
        state.items.unshift(action.payload)
        state.items = state.items.slice(0, 100)
      },
      prepare: (profile, topRec, score, recs = []) => ({
        payload: { id: Date.now(), timestamp: new Date().toISOString(), profile, topRec, score, recs },
      }),
    },
    deleteEntry: (state, action) => {
      state.items = state.items.filter(e => e.id !== action.payload)
    },
    clearAll: (state) => { state.items = [] },
  },
})

export const { addEntry, deleteEntry, clearAll } = historySlice.actions
export default historySlice.reducer
