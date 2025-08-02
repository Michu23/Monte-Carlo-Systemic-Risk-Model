import api from './api';

/**
 * Bank service for handling bank operations
 */
const bankService = {
  /**
   * Get all banks with pagination and filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.per_page - Items per page
   * @param {string} params.search - Search term
   * @param {string} params.sort_by - Sort field
   * @param {string} params.sort_dir - Sort direction
   * @returns {Promise} - Promise with banks data
   */
  getBanks: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.per_page) queryParams.append('per_page', params.per_page);
    if (params.search) queryParams.append('search', params.search);
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.sort_dir) queryParams.append('sort_dir', params.sort_dir);
    
    const response = await api.get(`/banks?${queryParams.toString()}`);
    return response.data;
  },
  
  /**
   * Get a specific bank
   * @param {string} id - Bank ID
   * @returns {Promise} - Promise with bank data
   */
  getBank: async (id) => {
    const response = await api.get(`/banks/${id}`);
    return response.data;
  },
  
  /**
   * Create a new bank
   * @param {Object} data - Bank data
   * @returns {Promise} - Promise with created bank
   */
  createBank: async (data) => {
    const response = await api.post('/banks', data);
    return response.data;
  },
  
  /**
   * Update a bank
   * @param {string} id - Bank ID
   * @param {Object} data - Bank data
   * @returns {Promise} - Promise with updated bank
   */
  updateBank: async (id, data) => {
    const response = await api.put(`/banks/${id}`, data);
    return response.data;
  },
  
  /**
   * Delete a bank
   * @param {string} id - Bank ID
   * @returns {Promise} - Promise with deletion status
   */
  deleteBank: async (id) => {
    const response = await api.delete(`/banks/${id}`);
    return response.data;
  },
  
  /**
   * Get exposure matrix
   * @returns {Promise} - Promise with exposure matrix data
   */
  getExposureMatrix: async () => {
    const response = await api.get('/banks/exposure-matrix');
    return response.data;
  },
  
  /**
   * Import banks from CSV
   * @param {FormData} formData - Form data with CSV file
   * @returns {Promise} - Promise with import results
   */
  importBanks: async (formData) => {
    const response = await api.post('/banks/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
  
  /**
   * Export banks to CSV
   * @returns {Promise} - Promise with CSV data
   */
  exportBanks: async () => {
    const response = await api.get('/banks/export', {
      responseType: 'blob'
    });
    return response.data;
  }
};

export default bankService;