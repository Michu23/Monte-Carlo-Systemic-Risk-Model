import api from './api';

/**
 * Export service for handling various export operations
 */
const exportService = {
  /**
   * Export simulation results in various formats
   * @param {string} simulationId - Simulation ID
   * @param {string} format - Export format (json, csv, pdf)
   * @param {Object} options - Export options
   * @returns {Promise} - Promise with export data
   */
  exportSimulationResults: async (simulationId, format = 'json', options = {}) => {
    const queryParams = new URLSearchParams();
    queryParams.append('format', format);
    
    if (options.includeRawData) queryParams.append('include_raw_data', 'true');
    if (options.includeParameters) queryParams.append('include_parameters', 'true');
    if (options.includeStatistics) queryParams.append('include_statistics', 'true');
    if (options.includeCharts) queryParams.append('include_charts', 'true');
    
    const response = await api.get(`/simulations/${simulationId}/export?${queryParams.toString()}`, {
      responseType: format === 'json' ? 'json' : 'blob'
    });
    
    return response.data;
  },

  /**
   * Export multiple simulations comparison
   * @param {Array} simulationIds - Array of simulation IDs
   * @param {string} format - Export format
   * @param {Object} options - Export options
   * @returns {Promise} - Promise with export data
   */
  exportComparison: async (simulationIds, format = 'json', options = {}) => {
    const queryParams = new URLSearchParams();
    simulationIds.forEach(id => queryParams.append('ids', id));
    queryParams.append('format', format);
    
    if (options.includeRawData) queryParams.append('include_raw_data', 'true');
    if (options.includeParameters) queryParams.append('include_parameters', 'true');
    if (options.includeStatistics) queryParams.append('include_statistics', 'true');
    
    const response = await api.get(`/simulations/compare/export?${queryParams.toString()}`, {
      responseType: format === 'json' ? 'json' : 'blob'
    });
    
    return response.data;
  },

  /**
   * Generate shareable link for simulation results
   * @param {string} simulationId - Simulation ID
   * @param {Object} options - Sharing options
   * @returns {Promise} - Promise with share data
   */
  generateShareLink: async (simulationId, options = {}) => {
    const response = await api.post(`/simulations/${simulationId}/share`, {
      expires_in: options.expiresIn || 7, // days
      password_protected: options.passwordProtected || false,
      password: options.password,
      include_raw_data: options.includeRawData || false
    });
    
    return response.data;
  },

  /**
   * Get shared simulation data
   * @param {string} shareToken - Share token
   * @param {string} password - Optional password
   * @returns {Promise} - Promise with shared data
   */
  getSharedSimulation: async (shareToken, password = null) => {
    const response = await api.get(`/shared/${shareToken}`, {
      params: password ? { password } : {}
    });
    
    return response.data;
  },

  /**
   * Revoke shared link
   * @param {string} simulationId - Simulation ID
   * @param {string} shareToken - Share token to revoke
   * @returns {Promise} - Promise with revocation status
   */
  revokeShareLink: async (simulationId, shareToken) => {
    const response = await api.delete(`/simulations/${simulationId}/share/${shareToken}`);
    return response.data;
  },

  /**
   * Get list of active share links for a simulation
   * @param {string} simulationId - Simulation ID
   * @returns {Promise} - Promise with share links
   */
  getShareLinks: async (simulationId) => {
    const response = await api.get(`/simulations/${simulationId}/shares`);
    return response.data;
  },

  /**
   * Download file from blob data
   * @param {Blob} blob - Blob data
   * @param {string} filename - Filename for download
   */
  downloadBlob: (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Copy text to clipboard
   * @param {string} text - Text to copy
   * @returns {Promise} - Promise indicating success
   */
  copyToClipboard: async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return true;
      } catch (fallbackErr) {
        document.body.removeChild(textArea);
        throw fallbackErr;
      }
    }
  },

  /**
   * Format data for CSV export
   * @param {Object} data - Data to format
   * @returns {string} - CSV formatted string
   */
  formatCSV: (data) => {
    if (!data || typeof data !== 'object') return '';
    
    const headers = Object.keys(data);
    const csvHeaders = headers.join(',');
    
    // Handle array data
    if (Array.isArray(data[headers[0]])) {
      const rows = [];
      const maxLength = Math.max(...headers.map(h => Array.isArray(data[h]) ? data[h].length : 1));
      
      for (let i = 0; i < maxLength; i++) {
        const row = headers.map(header => {
          const value = Array.isArray(data[header]) ? data[header][i] : data[header];
          return value !== undefined ? value : '';
        });
        rows.push(row.join(','));
      }
      
      return [csvHeaders, ...rows].join('\n');
    }
    
    // Handle object data
    const csvRow = headers.map(header => data[header] || '').join(',');
    return [csvHeaders, csvRow].join('\n');
  },

  /**
   * Validate export options
   * @param {Object} options - Export options to validate
   * @returns {Object} - Validation result
   */
  validateExportOptions: (options) => {
    const errors = [];
    const warnings = [];
    
    if (options.format && !['json', 'csv', 'pdf', 'images'].includes(options.format)) {
      errors.push('Invalid export format');
    }
    
    if (options.includeRawData && options.format === 'pdf') {
      warnings.push('Including raw data in PDF may result in a very large file');
    }
    
    if (options.format === 'csv' && options.includeCharts) {
      warnings.push('Charts cannot be included in CSV format');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
};

export default exportService;