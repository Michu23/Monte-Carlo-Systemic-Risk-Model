/**
 *  * Cache service for storing and retrieving data with TTL support
 *  */
class CacheService {
      constructor() {
        this.cache = new Map();
        this.defaultTTL = 5 * 60 * 1000; // 5 minutes
    
  }

  /**
   * Set item in cache with TTL
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  set(key, value, ttl = this.defaultTTL) {
        const expiresAt = Date.now() + ttl;
        this.cache.set(key, {
          value,
          expiresAt
    
    });
  }

  /**
   * Get item from cache
   * @param {string} key - Cache key
   * @returns {*} - Cached value or null if not found/expired
   */
  get(key) {
        const item = this.cache.get(key);
        
        if (!item) {
          return null;
    
    }
    
    if (Date.now() > item.expiresAt) {
          this.cache.delete(key);
          return null;
    
    }
    
    return item.value;
  }

  /**
   * Check if key exists and is not expired
   * @param {string} key - Cache key
   * @returns {boolean} - True if key exists and is valid
   */
  has(key) {
        return this.get(key) !== null;
    
  }

  /**
   * Delete item from cache
   * @param {string} key - Cache key
   */
  delete(key) {
        this.cache.delete(key);
    
  }

  /**
   * Clear all cache
   */
  clear() {
        this.cache.clear();
    
  }

  /**
   * Clean up expired items
   */
  cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
          if (now > item.expiresAt) {
            this.cache.delete(key);
    
      }
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache statistics
   */
  getStats() {
        const now = Date.now();
        let validItems = 0;
        let expiredItems = 0;
        
        for (const [key, item] of this.cache.entries()) {
          if (now > item.expiresAt) {
            expiredItems++;
    
      } else {
            validItems++;
    
      }
    }
    
    return {
          totalItems: this.cache.size,
          validItems,
          expiredItems,
          hitRate: this.hitCount / (this.hitCount + this.missCount) || 0
    
    };
  }

  /**
   * Get or set pattern - fetch data if not in cache
   * @param {string} key - Cache key
   * @param {Function} fetchFunction - Function to fetch data if not cached
   * @param {number} ttl - Time to live in milliseconds
   * @returns {Promise} - Cached or fetched data
   */
  async getOrSet(key, fetchFunction, ttl = this.defaultTTL) {
        const cached = this.get(key);
        
        if (cached !== null) {
          return cached;
    
    }
    
    try {
          const data = await fetchFunction();
          this.set(key, data, ttl);
          return data;
    
    } catch (error) {
          // Don't cache errors
          throw error;
    
    }
  }

  /**
   * Invalidate cache entries by pattern
   * @param {RegExp|string} pattern - Pattern to match keys
   */
  invalidatePattern(pattern) {
        const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern);
        
        for (const key of this.cache.keys()) {
          if (regex.test(key)) {
            this.cache.delete(key);
    
      }
    }
  }

  /**
   * Set multiple items at once
   * @param {Object} items - Object with key-value pairs
   * @param {number} ttl - Time to live in milliseconds
   */
  setMultiple(items, ttl = this.defaultTTL) {
        for (const [key, value] of Object.entries(items)) {
          this.set(key, value, ttl);
    
    }
  }

  /**
   * Get multiple items at once
   * @param {Array} keys - Array of cache keys
   * @returns {Object} - Object with key-value pairs
   */
  getMultiple(keys) {
        const result = {};
    
    for (const key of keys) {
          const value = this.get(key);
          if (value !== null) {
            result[key] = value;
    
      }
    }
    
    return result;
  }
}

// Create cache instances for different data types
const simulationCache = new CacheService();
const userCache = new CacheService();
const bankCache = new CacheService();

// Set up periodic cleanup
setInterval(() => {
      simulationCache.cleanup();
      userCache.cleanup();
      bankCache.cleanup();
    
}, 60000); // Clean up every minute

/**
 * Simulation-specific cache utilities
 */
export const simulationCacheService = {
      // Cache simulation data
      cacheSimulation: (id, data) => {
        simulationCache.set(`simulation:${id}`, data, 10 * 60 * 1000); // 10 minutes
  },
  
  getSimulation: (id) => {
        return simulationCache.get(`simulation:${id}`);
  },
  
  // Cache simulation results
  cacheResults: (id, results) => {
        simulationCache.set(`results:${id}`, results, 30 * 60 * 1000); // 30 minutes
  },
  
  getResults: (id) => {
        return simulationCache.get(`results:${id}`);
  },
  
  // Cache simulation list
  cacheSimulationList: (params, data) => {
        const key = `simulations:${JSON.stringify(params)}`;
    simulationCache.set(key, data, 2 * 60 * 1000); // 2 minutes
  },
  
  getSimulationList: (params) => {
        const key = `simulations:${JSON.stringify(params)}`;
    return simulationCache.get(key);
  },
  
  // Invalidate simulation-related cache
  invalidateSimulation: (id) => {
        simulationCache.delete(`simulation:${id}`);
    simulationCache.delete(`results:${id}`);
    simulationCache.invalidatePattern(/^simulations:/);
  },
  
  // Clear all simulation cache
  clearAll: () => {
        simulationCache.clear();
    
  }
};

/**
 * User-specific cache utilities
 */
export const userCacheService = {
      cacheUser: (id, data) => {
        userCache.set(`user:${id}`, data, 15 * 60 * 1000); // 15 minutes
  },
  
  getUser: (id) => {
        return userCache.get(`user:${id}`);
  },
  
  invalidateUser: (id) => {
        userCache.delete(`user:${id}`);
  },
  
  clearAll: () => {
        userCache.clear();
    
  }
};

/**
 * Bank data cache utilities
 */
export const bankCacheService = {
      cacheBanks: (data) => {
        bankCache.set('banks:all', data, 60 * 60 * 1000); // 1 hour
    
  },
  
  getBanks: () => {
        return bankCache.get('banks:all');
    
  },
  
  cacheBank: (id, data) => {
        bankCache.set(`bank:${id}`, data, 30 * 60 * 1000); // 30 minutes
  },
  
  getBank: (id) => {
        return bankCache.get(`bank:${id}`);
  },
  
  invalidateBanks: () => {
        bankCache.invalidatePattern(/^banks:/);
        bankCache.invalidatePattern(/^bank:/);
    
  },
  
  clearAll: () => {
        bankCache.clear();
    
  }
};

/**
 * Generic cache service
 */
export const cacheService = {
      simulation: simulationCacheService,
      user: userCacheService,
      bank: bankCacheService,
      
      // Global cache operations
      clearAll: () => {
        simulationCache.clear();
        userCache.clear();
        bankCache.clear();
    
  },
  
  getStats: () => {
        return {
          simulation: simulationCache.getStats(),
          user: userCache.getStats(),
          bank: bankCache.getStats()
    
    };
  }
};

export default cacheService;