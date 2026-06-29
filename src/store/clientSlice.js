import { createSlice } from '@reduxjs/toolkit'

const clientSlice = createSlice({
  name: 'client',
  initialState: { current: null },
  reducers: {
    setClient: (state, action) => { state.current = action.payload },
    clearClient: (state) => { state.current = null },
  },
})

export const { setClient, clearClient } = clientSlice.actions
export default clientSlice.reducer
