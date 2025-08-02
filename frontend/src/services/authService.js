import api from './api';

/**
 * Authentication service for handling user authentication
 */
const authService = {
  /**
   * Login user
   * @param {Object} credentials - User credentials
   * @param {string} credentials.username - Username
   * @param {string} credentials.password - Password
   * @returns {Promise} - Promise with user data and tokens
   */
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  
  /**
   * Register new user
   * @param {Object} userData - User data
   * @param {string} userData.username - Username
   * @param {string} userData.email - Email
   * @param {string} userData.password - Password
   * @returns {Promise} - Promise with user data
   */
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  
  /**
   * Logout user
   * @returns {Promise} - Promise with logout status
   */
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  
  /**
   * Get current user info
   * @returns {Promise} - Promise with user data
   */
  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  /**
   * Request password reset
   * @param {Object} data - Reset data
   * @param {string} data.email - User email
   * @returns {Promise} - Promise with reset status
   */
  requestPasswordReset: async (data) => {
    const response = await api.post('/auth/reset-password', data);
    return response.data;
  },
  
  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {Object} data - New password data
   * @param {string} data.password - New password
   * @returns {Promise} - Promise with reset status
   */
  resetPassword: async (token, data) => {
    const response = await api.post(`/auth/reset-password/${token}`, data);
    return response.data;
  },
  
  /**
   * Change password
   * @param {Object} data - Password data
   * @param {string} data.current_password - Current password
   * @param {string} data.new_password - New password
   * @returns {Promise} - Promise with change status
   */
  changePassword: async (data) => {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  },
  
  /**
   * Refresh access token
   * @returns {Promise} - Promise with new access token
   */
  refreshToken: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  }
};

export default authService;