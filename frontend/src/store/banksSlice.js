import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dataAPI } from '../services/api';
import axios from 'axios';

// Get all banks
export const fetchBanks = createAsyncThunk(
  'banks/fetchBanks',
  async (params = {}, { rejectWithValue }) => {
    try {
      console.log('🏦 Fetching banks...');
      const response = await dataAPI.getBanks();
      console.log('✅ Banks fetched:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch banks:', error);
      return rejectWithValue(error.message || 'Failed to fetch banks');
    }
  }
);

// Get a specific bank
export const fetchBank = createAsyncThunk(
  'banks/fetchBank',
  async (bankId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/banks/${bankId}`);
      return response.data.bank;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch bank');
    }
  }
);

// Create a new bank
export const createBank = createAsyncThunk(
  'banks/createBank',
  async (bankData, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/banks', bankData);
      return response.data.bank;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to create bank');
    }
  }
);

// Update a bank
export const updateBank = createAsyncThunk(
  'banks/updateBank',
  async ({ bankId, bankData }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/banks/${bankId}`, bankData);
      return response.data.bank;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update bank');
    }
  }
);

// Delete a bank
export const deleteBank = createAsyncThunk(
  'banks/deleteBank',
  async (bankId, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/banks/${bankId}`);
      return bankId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to delete bank');
    }
  }
);

// Get exposure matrix
export const fetchExposureMatrix = createAsyncThunk(
  'banks/fetchExposureMatrix',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get('/api/banks/exposure-matrix');
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch exposure matrix');
    }
  }
);

// Import banks from CSV
export const importBanks = createAsyncThunk(
  'banks/importBanks',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/banks/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to import banks');
    }
  }
);

const initialState = {
  banks: [],
  pagination: {
    page: 1,
    per_page: 10,
    total_pages: 0,
    total_items: 0
  },
  currentBank: null,
  exposureMatrix: null,
  loading: false,
  error: null,
  importResult: null
};

const banksSlice = createSlice({
  name: 'banks',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentBank: (state) => {
      state.currentBank = null;
    },
    clearImportResult: (state) => {
      state.importResult = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch banks
      .addCase(fetchBanks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBanks.fulfilled, (state, action) => {
        // Handle the simple backend response structure
        state.banks = action.payload.banks || [];
        state.pagination = {
          page: 1,
          per_page: action.payload.count || 0,
          total_pages: 1,
          total_items: action.payload.count || 0
        };
        state.loading = false;
      })
      .addCase(fetchBanks.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      
      // Fetch bank
      .addCase(fetchBank.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBank.fulfilled, (state, action) => {
        state.currentBank = action.payload;
        state.loading = false;
      })
      .addCase(fetchBank.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      
      // Create bank
      .addCase(createBank.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBank.fulfilled, (state, action) => {
        state.banks.push(action.payload);
        state.currentBank = action.payload;
        state.loading = false;
      })
      .addCase(createBank.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      
      // Update bank
      .addCase(updateBank.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateBank.fulfilled, (state, action) => {
        const index = state.banks.findIndex(bank => bank.id === action.payload.id);
        if (index !== -1) {
          state.banks[index] = action.payload;
        }
        state.currentBank = action.payload;
        state.loading = false;
      })
      .addCase(updateBank.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      
      // Delete bank
      .addCase(deleteBank.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteBank.fulfilled, (state, action) => {
        state.banks = state.banks.filter(bank => bank.id !== action.payload);
        if (state.currentBank && state.currentBank.id === action.payload) {
          state.currentBank = null;
        }
        state.loading = false;
      })
      .addCase(deleteBank.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      
      // Fetch exposure matrix
      .addCase(fetchExposureMatrix.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchExposureMatrix.fulfilled, (state, action) => {
        state.exposureMatrix = action.payload;
        state.loading = false;
      })
      .addCase(fetchExposureMatrix.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      
      // Import banks
      .addCase(importBanks.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.importResult = null;
      })
      .addCase(importBanks.fulfilled, (state, action) => {
        state.importResult = action.payload;
        state.loading = false;
      })
      .addCase(importBanks.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      });
  }
});

export const { clearError, clearCurrentBank, clearImportResult } = banksSlice.actions;

export default banksSlice.reducer;