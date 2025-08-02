import { api } from './api';
import { simulationCacheService } from './cacheService';

/**
 * Simulation service for handling simulation operations
 */
const simulationService = {
  /**
   * Get all simulations with pagination and filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number
   * @param {number} params.per_page - Items per page
   * @param {string} params.status - Filter by status
   * @param {string} params.search - Search term
   * @param {string} params.sort_by - Sort field
   * @param {string} params.sort_dir - Sort direction
   * @returns {Promise} - Promise with simulations data
   */
  getSimulations: async (params = {}) => {
    // Check cache first
    const cached = simulationCacheService.getSimulationList(params);
    if (cached) {
      return cached;
    }
    
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.per_page) queryParams.append('per_page', params.per_page);
    if (params.status) queryParams.append('status', params.status);
    if (params.search) queryParams.append('search', params.search);
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.sort_dir) queryParams.append('sort_dir', params.sort_dir);
    
    const response = await api.get(`/api/simulations?${queryParams.toString()}`);
    
    // Cache the result
    simulationCacheService.cacheSimulationList(params, response.data);
    
    return response.data;
  },
  
  /**
   * Get a specific simulation
   * @param {string} id - Simulation ID
   * @returns {Promise} - Promise with simulation data
   */
  getSimulation: async (id) => {
    // Check cache first
    const cached = simulationCacheService.getSimulation(id);
    if (cached) {
      return cached;
    }
    
    const response = await api.get(`/api/simulations/${id}`);
    
    // Cache the result
    simulationCacheService.cacheSimulation(id, response.data);
    
    return response.data;
  },
  
  /**
   * Get simulation results
   * @param {string} id - Simulation ID
   * @param {boolean} includeRawData - Whether to include raw data
   * @returns {Promise} - Promise with simulation results
   */
  getSimulationResults: async (id, includeRawData = false) => {
    // Check cache first
    const cacheKey = `${id}_${includeRawData}`;
    const cached = simulationCacheService.getResults(cacheKey);
    if (cached) {
      return cached;
    }
    
    const response = await api.get(`/api/simulations/${id}/results?include_raw_data=${includeRawData}`);
    
    // Cache the result
    simulationCacheService.cacheResults(cacheKey, response.data);
    
    return response.data;
  },
  
  /**
   * Create a new simulation
   * @param {Object} data - Simulation data
   * @returns {Promise} - Promise with created simulation
   */
  createSimulation: async (data) => {
    const response = await api.post('/api/simulations', data);
    
    // Invalidate simulation list cache
    simulationCacheService.clearAll();
    
    return response.data;
  },
  
  /**
   * Update simulation parameters
   * @param {string} id - Simulation ID
   * @param {Object} parameters - New parameters
   * @returns {Promise} - Promise with updated simulation
   */
  updateSimulationParameters: async (id, parameters) => {
    const response = await api.put(`/api/simulations/${id}/parameters`, parameters);
    
    // Invalidate cache for this simulation
    simulationCacheService.invalidateSimulation(id);
    
    return response.data;
  },
  
  /**
   * Delete a simulation
   * @param {string} id - Simulation ID
   * @returns {Promise} - Promise with deletion status
   */
  deleteSimulation: async (id) => {
    const response = await api.delete(`/api/simulations/${id}`);
    
    // Invalidate cache for this simulation and lists
    simulationCacheService.invalidateSimulation(id);
    
    return response.data;
  },
  
  /**
   * Get simulation status
   * @param {string} id - Simulation ID
   * @returns {Promise} - Promise with simulation status
   */
  getSimulationStatus: async (id) => {
    const response = await api.get(`/api/simulations/${id}/status`);
    return response.data;
  },
  
  /**
   * Cancel a running simulation
   * @param {string} id - Simulation ID
   * @returns {Promise} - Promise with cancellation status
   */
  cancelSimulation: async (id) => {
    const response = await api.post(`/api/simulations/${id}/cancel`);
    return response.data;
  },
  
  /**
   * Restart a simulation
   * @param {string} id - Simulation ID
   * @returns {Promise} - Promise with restart status
   */
  restartSimulation: async (id) => {
    const response = await api.post(`/api/simulations/${id}/restart`);
    return response.data;
  },
  
  /**
   * Compare multiple simulations
   * @param {Array} ids - Array of simulation IDs
   * @returns {Promise} - Promise with comparison data
   */
  compareSimulations: async (ids) => {
    const queryParams = new URLSearchParams();
    ids.forEach(id => queryParams.append('ids', id));
    
    const response = await api.get(`/api/simulations/compare?${queryParams.toString()}`);
    return response.data;
  },
  
  /**
   * Get simulation history
   * @param {number} days - Number of days to include
   * @returns {Promise} - Promise with history data
   */
  getSimulationHistory: async (days = 30) => {
    const response = await api.get(`/api/simulations/history?days=${days}`);
    return response.data;
  },
  
  /**
   * Export simulation results
   * @param {string} id - Simulation ID
   * @param {string} format - Export format (json, csv)
   * @returns {Promise} - Promise with export data
   */
  exportSimulationResults: async (id, format = 'json') => {
    const response = await api.get(`/api/simulations/${id}/export?format=${format}`, {
      responseType: 'blob'
    });
    return response.data;
  }
};

export default simulationService;