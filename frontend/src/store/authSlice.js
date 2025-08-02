import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import jwtDecode from 'jwt-decode';
import websocketService from '../services/websocketService';
import { authAPI } from '../services/api';

// Direct API base URL
const API_BASE_URL = 'http://localhost:5001';

// Check if user is already authenticated
export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    const token = localStorage.getItem('token');
    
    if (!token) {
      return rejectWithValue('No token found');
    }
    
    try {
      // For now, just return a basic auth check since we're using simple tokens
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        localStorage.removeItem('token');
        return rejectWithValue('Authentication failed');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      localStorage.removeItem('token');
      return rejectWithValue('Authentication failed');
    }
  }
);

// Login user
export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authAPI.login(credentials);
      
      if (response.error) {
        return rejectWithValue(response.error);
      }
      
      // Save token to localStorage
      localStorage.setItem('token', response.token);
      
      return response.user;
    } catch (error) {
      return rejectWithValue(error.message || 'Login failed');
    }
  }
);

// Register user
export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (userData, { rejectWithValue }) => {
    try {
      const registerResponse = await authAPI.register(userData);
      
      if (registerResponse.error) {
        return rejectWithValue(registerResponse.error);
      }
      
      // Login after successful registration
      const loginResponse = await authAPI.login({
        username: userData.username,
        password: userData.password,
      });
      
      if (loginResponse.error) {
        return rejectWithValue(loginResponse.error);
      }
      
      // Save token to localStorage
      localStorage.setItem('token', loginResponse.token);
      
      return loginResponse.user;
    } catch (error) {
      return rejectWithValue(error.message || 'Registration failed');
    }
  }
);

// Logout user
export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    try {
      // Remove token from localStorage
      localStorage.removeItem('token');
      
      return null;
    } catch (error) {
      return rejectWithValue(error.message || 'Logout failed');
    }
  }
);

const initialState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Check auth
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
        
        // Connect to WebSocket
        const token = localStorage.getItem('token');
        if (token) {
          websocketService.connect(token);
        }
      })
      .addCase(checkAuth.rejected, (state, action) => {
        state.user = null;
        state.isAuthenticated = false;
        state.loading = false;
      })
      
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
        
        // Connect to WebSocket
        const token = localStorage.getItem('token');
        if (token) {
          websocketService.connect(token);
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
        state.loading = false;
        
        // Connect to WebSocket
        const token = localStorage.getItem('token');
        if (token) {
          websocketService.connect(token);
        }
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.error = action.payload;
        state.loading = false;
      })
      
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        
        // Disconnect from WebSocket
        websocketService.disconnect();
      });
  },
});

export const { clearError } = authSlice.actions;

export default authSlice.reducer;