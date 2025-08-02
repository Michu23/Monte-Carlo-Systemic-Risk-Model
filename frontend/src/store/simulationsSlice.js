import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { dataAPI } from '../services/api';
import axios from 'axios';

// Direct API base URL
const API_BASE_URL = 'http://localhost:5001';

// Get all simulations
export const fetchSimulations = createAsyncThunk(
  'simulations/fetchSimulations',
  async (params = {}, { rejectWithValue }) => {
    try {
      console.log('📊 Fetching simulations...');
      const response = await dataAPI.getSimulations();
      console.log('✅ Simulations fetched:', response);
      return response;
    } catch (error) {
      console.error('❌ Failed to fetch simulations:', error);
      return rejectWithValue(error.message || 'Failed to fetch simulations');
    }
  }
);

// Get a specific simulation
export const fetchSimulation = createAsyncThunk(
  'simulations/fetchSimulation',
  async (simulationId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/simulations/${simulationId}`);
      return response.data.simulation;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch simulation');
    }
  }
);

// Get simulation results
export const fetchSimulationResults = createAsyncThunk(
  'simulations/fetchSimulationResults',
  async ({ simulationId, includeRawData = false }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/simulations/${simulationId}/results?include_raw_data=${includeRawData}`);
      return response.data.results;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch simulation results');
    }
  }
);

// Create a new simulation
export const createSimulation = createAsyncThunk(
  'simulations/createSimulation',
  async (simulationData, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/simulations', simulationData);
      return response.data.simulation;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to create simulation');
    }
  }
);

// Update simulation parameters
export const updateSimulationParameters = createAsyncThunk(
  'simulations/updateSimulationParameters',
  async ({ simulationId, parameters }, { rejectWithValue }) => {
    try {
      const response = await axios.put(`/api/simulations/${simulationId}/parameters`, parameters);
      return response.data.simulation;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to update simulation parameters');
    }
  }
);

// Delete a simulation
export const deleteSimulation = createAsyncThunk(
  'simulations/deleteSimulation',
  async (simulationId, { rejectWithValue }) => {
    try {
      await axios.delete(`/api/simulations/${simulationId}`);
      return simulationId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to delete simulation');
    }
  }
);

// Get simulation status
export const fetchSimulationStatus = createAsyncThunk(
  'simulations/fetchSimulationStatus',
  async (simulationId, { rejectWithValue }) => {
    try {
      const response = await axios.get(`/api/simulations/${simulationId}/status`);
      return { id: simulationId, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to fetch simulation status');
    }
  }
);

// Compare simulations
export const compareSimulations = createAsyncThunk(
  'simulations/compareSimulations',
  async (simulationIds, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      simulationIds.forEach(id => queryParams.append('ids', id));
      
      const response = await axios.get(`/api/simulations/compare?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.error?.message || 'Failed to compare simulations');
    }
  }
);

const initialState = {
  simulations: [],
  pagination: {
    page: 1,
    per_page: 10,
    total_pages: 0,
    total_items: 0
  },
  currentSimulation: null,
  currentResults: null,
  comparisonData: null,
  loading: false,
  error: null,
  statusPolling: {}
};

const simulationsSlice = createSlice({
  name: 'simulations',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentSimulation: (state) => {
      state.currentSimulation = null;
      state.currentResults = null;
    },
    clearComparisonData: (state) => {
      state.comparisonData = null;
    },
    startStatusPolling: (state, action) => {
      state.statusPolling[action.payload] = true;
    },
    stopStatusPolling: (state, action) => {
      state.statusPolling[action.payload] = false;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch simulations
      .addCase(fetchSimulations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSimulations.fulfilled, (state, action) => {
        // Handle the simple backend response structure
        state.simulations = action.payload.simulations || [];
        state.pagination = {
          page: 1,
          per_page: action.payload.count || 0,
          total_pages: 1,
          total_items: action.payload.count || 0
        };
        state.loading = false;
      })
      .addCase(fetchSimulations.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      
      // Fetch simulation
      .addCase(fetchSimulation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSimulation.fulfilled, (state, action) => {
        state.currentSimulation = action.payload;
        state.loading = false;
      })
      .addCase(fetchSimulation.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      
      // Fetch simulation results
      .addCase(fetchSimulationResults.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSimulationResults.fulfilled, (state, action) => {
        state.currentResults = action.payload;
        state.loading = false;
      })
      .addCase(fetchSimulationResults.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      
      // Create simulation
      .addCase(createSimulation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSimulation.fulfilled, (state, action) => {
        state.currentSimulation = action.payload;
        state.loading = false;
      })
      .addCase(createSimulation.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      
      // Update simulation parameters
      .addCase(updateSimulationParameters.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSimulationParameters.fulfilled, (state, action) => {
        state.currentSimulation = action.payload;
        state.loading = false;
      })
      .addCase(updateSimulationParameters.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      
      // Delete simulation
      .addCase(deleteSimulation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSimulation.fulfilled, (state, action) => {
        state.simulations = state.simulations.filter(sim => sim.id !== action.payload);
        if (state.currentSimulation && state.currentSimulation.id === action.payload) {
          state.currentSimulation = null;
          state.currentResults = null;
        }
        state.loading = false;
      })
      .addCase(deleteSimulation.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      
      // Fetch simulation status
      .addCase(fetchSimulationStatus.fulfilled, (state, action) => {
        if (state.currentSimulation && state.currentSimulation.id === action.payload.id) {
          state.currentSimulation = {
            ...state.currentSimulation,
            status: action.payload.status,
            progress: action.payload.progress,
            status_message: action.payload.status_message,
            error_message: action.payload.error_message
          };
        }
        
        // Update in simulations list if present
        const index = state.simulations.findIndex(sim => sim.id === action.payload.id);
        if (index !== -1) {
          state.simulations[index] = {
            ...state.simulations[index],
            status: action.payload.status,
            progress: action.payload.progress,
            status_message: action.payload.status_message,
            error_message: action.payload.error_message
          };
        }
      })
      
      // Compare simulations
      .addCase(compareSimulations.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(compareSimulations.fulfilled, (state, action) => {
        state.comparisonData = action.payload;
        state.loading = false;
      })
      .addCase(compareSimulations.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      });
  }
});

export const { 
  clearError, 
  clearCurrentSimulation, 
  clearComparisonData,
  startStatusPolling,
  stopStatusPolling
} = simulationsSlice.actions;

export default simulationsSlice.reducer;