import { createSlice } from '@reduxjs/toolkit'

export const SAVED_CLIENTS_KEY = 'ch_saved_clients'

function loadInitial() {
  try { return JSON.parse(localStorage.getItem(SAVED_CLIENTS_KEY) || '[]') }
  catch { return [] }
}

const savedClientsSlice = createSlice({
  name: 'savedClients',
  initialState: { items: loadInitial() },
  reducers: {
    upsertClient: {
      reducer(state, action) {
        const idx = state.items.findIndex(
          c => c.name.toLowerCase() === action.payload.name.toLowerCase()
        )
        if (idx !== -1) {
          state.items[idx] = action.payload
        } else {
          state.items.unshift(action.payload)
        }
      },
      prepare(profile) {
        return {
          payload: {
            id: Date.now(),
            savedAt: new Date().toISOString(),
            name: profile.name || 'Unnamed Client',
            profile,
          },
        }
      },
    },
    deleteClient: (state, action) => {
      state.items = state.items.filter(c => c.id !== action.payload)
    },
    clearSavedClients: (state) => { state.items = [] },
  },
})

export const { upsertClient, deleteClient, clearSavedClients } = savedClientsSlice.actions
export default savedClientsSlice.reducer
