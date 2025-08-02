import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import simulationsReducer from './simulationsSlice';
import banksReducer from './banksSlice';
import uiReducer from './uiSlice';

const store = configureStore({
  reducer: {
    auth: authReducer,
    simulations: simulationsReducer,
    banks: banksReducer,
    ui: uiReducer,
  },
});

export default store;