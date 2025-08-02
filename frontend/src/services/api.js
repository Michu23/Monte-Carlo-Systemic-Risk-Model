// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Debug logging
console.log('API Base URL:', API_BASE_URL);

// Create fetch-based API client with better error handling
export const api = {
  post: async (endpoint, data) => {
    console.log(`🔄 API POST: ${endpoint}`, data);
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      
      // Add Authorization header if token exists
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ API POST ERROR: ${endpoint}`, response.status, errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`✅ API POST SUCCESS: ${endpoint}`, result);
      return result;
    } catch (error) {
      console.error(`💥 API POST FAILED: ${endpoint}`, error);
      throw error;
    }
  },
  
  get: async (endpoint) => {
    console.log(`🔄 API GET: ${endpoint}`);
    try {
      const headers = {};
      
      // Add Authorization header if token exists
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ API GET ERROR: ${endpoint}`, response.status, errorData);
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`✅ API GET SUCCESS: ${endpoint}`, result);
      return result;
    } catch (error) {
      console.error(`💥 API GET FAILED: ${endpoint}`, error);
      throw error;
    }
  },
  
  put: async (endpoint, data) => {
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Add Authorization header if token exists
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    return response.json();
  },
  
  delete: async (endpoint) => {
    const headers = {};
    
    // Add Authorization header if token exists
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers,
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }
    
    return response.json();
  }
};

// Auth API calls
export const authAPI = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  register: (userData) => api.post('/api/auth/register', userData),
  getProfile: () => api.get('/api/auth/profile')
};

// Data API calls  
export const dataAPI = {
  getBanks: () => api.get('/api/banks'),
  getSimulations: () => api.get('/api/simulations'),
  createSimulation: (data) => api.post('/api/simulations', data)
};

export default api;
