import { createSlice } from '@reduxjs/toolkit'

let toastSeq = 0

const uiSlice = createSlice({
  name: 'ui',
  initialState: { page: 'dashboard', toasts: [] },
  reducers: {
    setPage: (state, action) => { state.page = action.payload },
    addToast: {
      reducer: (state, action) => { state.toasts.push(action.payload) },
      prepare: (msg, type = 'default') => ({ payload: { id: ++toastSeq, msg, type } }),
    },
    removeToast: (state, action) => {
      state.toasts = state.toasts.filter(t => t.id !== action.payload)
    },
  },
})

export const { setPage, addToast, removeToast } = uiSlice.actions

// Thunk: show a toast and auto-dismiss it after a few seconds
export const notify = (msg, type = 'default') => (dispatch) => {
  const action = addToast(msg, type)
  dispatch(action)
  setTimeout(() => dispatch(removeToast(action.payload.id)), 3500)
}

export default uiSlice.reducer
