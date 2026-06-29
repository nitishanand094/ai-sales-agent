import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { fetchGist, patchGist } from '../engine/gistSync'
import { setHistoryItems } from './historySlice'
import { setSavedClientItems } from './savedClientsSlice'

export const SYNC_CONFIG_KEY = 'ch_sync_config'

function loadConfig() {
  try { return JSON.parse(localStorage.getItem(SYNC_CONFIG_KEY) || 'null') || { gistId: '', pat: '' } }
  catch { return { gistId: '', pat: '' } }
}

const cfg = loadConfig()

// Merge: Gist items are canonical; append any local-only items by id
function mergeById(gistItems = [], localItems = []) {
  return [...gistItems, ...localItems.filter(l => !gistItems.find(g => g.id === l.id))]
}

export const loadFromGist = createAsyncThunk('sync/load', async (_, { getState, dispatch }) => {
  const { gistId, pat } = getState().sync
  const data = await fetchGist(gistId, pat)

  const mergedHistory = mergeById(data.history || [], getState().history.items).slice(0, 100)
  const mergedClients = mergeById(data.savedClients || [], getState().savedClients.items)

  dispatch(setHistoryItems(mergedHistory))
  dispatch(setSavedClientItems(mergedClients))

  // Write merged result back so any local-only items are preserved in Gist
  await patchGist(gistId, pat, { history: mergedHistory, savedClients: mergedClients })

  return { historyCount: mergedHistory.length, clientsCount: mergedClients.length }
})

export const pushToGist = createAsyncThunk('sync/push', async (_, { getState }) => {
  const { gistId, pat } = getState().sync
  if (!gistId || !pat) return
  await patchGist(gistId, pat, {
    history: getState().history.items,
    savedClients: getState().savedClients.items,
  })
})

const syncSlice = createSlice({
  name: 'sync',
  initialState: {
    gistId: cfg.gistId,
    pat: cfg.pat,
    status: 'idle',   // 'idle' | 'syncing' | 'synced' | 'error'
    lastSync: null,
    errorMsg: '',
  },
  reducers: {
    setSyncConfig(state, action) {
      state.gistId = action.payload.gistId
      state.pat = action.payload.pat
      state.status = 'idle'
      state.errorMsg = ''
    },
    clearSyncConfig(state) {
      state.gistId = ''
      state.pat = ''
      state.status = 'idle'
      state.lastSync = null
      state.errorMsg = ''
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loadFromGist.pending,   s => { s.status = 'syncing'; s.errorMsg = '' })
      .addCase(loadFromGist.fulfilled, s => { s.status = 'synced'; s.lastSync = new Date().toISOString() })
      .addCase(loadFromGist.rejected,  (s, a) => { s.status = 'error'; s.errorMsg = a.error.message || 'Sync failed' })
      .addCase(pushToGist.pending,     s => { s.status = 'syncing' })
      .addCase(pushToGist.fulfilled,   s => { s.status = 'synced'; s.lastSync = new Date().toISOString() })
      .addCase(pushToGist.rejected,    (s, a) => { s.status = 'error'; s.errorMsg = a.error.message || 'Push failed' })
  },
})

export const { setSyncConfig, clearSyncConfig } = syncSlice.actions
export default syncSlice.reducer
