
import React from "react";
/**
 * Performance monitoring and optimization utilities
 */

/**
 * Performance metrics collector
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.observers = [];
    this.isEnabled = process.env.NODE_ENV === 'development' || 
                     localStorage.getItem('enablePerformanceMonitoring') === 'true';
  }

  /**
   * Start timing an operation
   * @param {string} name - Operation name
   */
  startTiming(name) {
    if (!this.isEnabled) return;
    
    this.metrics.set(name, {
      startTime: performance.now(),
      name
    });
  }

  /**
   * End timing an operation
   * @param {string} name - Operation name
   * @returns {number} - Duration in milliseconds
   */
  endTiming(name) {
    if (!this.isEnabled) return 0;
    
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`No timing started for: ${name}`);
      return 0;
    }

    const duration = performance.now() - metric.startTime;
    
    // Store the completed metric
    this.metrics.set(name, {
      ...metric,
      endTime: performance.now(),
      duration
    });

    // Log slow operations
    if (duration > 1000) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  /**
   * Measure a function execution time
   * @param {string} name - Operation name
   * @param {Function} fn - Function to measure
   * @returns {*} - Function result
   */
  async measure(name, fn) {
    if (!this.isEnabled) return await fn();
    
    this.startTiming(name);
    try {
      const result = await fn();
      return result;
    } finally {
      this.endTiming(name);
    }
  }

  /**
   * Get all metrics
   * @returns {Object} - All collected metrics
   */
  getMetrics() {
    const result = {};
    for (const [name, metric] of this.metrics.entries()) {
      if (metric.duration !== undefined) {
        result[name] = {
          duration: metric.duration,
          startTime: metric.startTime,
          endTime: metric.endTime
        };
      }
    }
    return result;
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics.clear();
  }

  /**
   * Log performance summary
   */
  logSummary() {
    if (!this.isEnabled) return;
    
    const metrics = this.getMetrics();
    const sortedMetrics = Object.entries(metrics)
      .sort(([, a], [, b]) => b.duration - a.duration);

    console.group('Performance Summary');
    sortedMetrics.forEach(([name, metric]) => {
      console.log(`${name}: ${metric.duration.toFixed(2)}ms`);
    });
    console.groupEnd();
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for measuring component render performance
 * @param {string} componentName - Component name
 * @returns {Function} - Measurement function
 */
export const usePerformanceMonitor = (componentName) => {
  const measureRender = React.useCallback(() => {
    performanceMonitor.startTiming(`${componentName}_render`);
    
    return () => {
      performanceMonitor.endTiming(`${componentName}_render`);
    };
  }, [componentName]);

  React.useEffect(() => {
    const endMeasure = measureRender();
    return endMeasure;
  });

  return measureRender;
};

/**
 * Higher-order component for measuring component performance
 * @param {React.Component} Component - Component to wrap
 * @param {string} name - Component name for metrics
 * @returns {React.Component} - Wrapped component
 */
export const withPerformanceMonitoring = (Component, name) => {
  const WrappedComponent = React.forwardRef((props, ref) => {
    usePerformanceMonitor(name || Component.displayName || Component.name);
    return <Component {...props} ref={ref} />;
  });
  
  WrappedComponent.displayName = `withPerformanceMonitoring(${name || Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately
 * @returns {Function} - Debounced function
 */
export const debounce = (func, wait, immediate = false) => {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
};

/**
 * Throttle function to limit function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Memoization utility for expensive calculations
 * @param {Function} fn - Function to memoize
 * @param {Function} keyGenerator - Function to generate cache key
 * @returns {Function} - Memoized function
 */
export const memoize = (fn, keyGenerator = (...args) => JSON.stringify(args)) => {
  const cache = new Map();
  
  return function memoizedFunction(...args) {
    const key = keyGenerator(...args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn.apply(this, args);
    cache.set(key, result);
    
    return result;
  };
};

/**
 * React hook for memoizing expensive calculations
 * @param {Function} fn - Function to memoize
 * @param {Array} deps - Dependencies
 * @returns {*} - Memoized result
 */
export const useMemoizedCallback = (fn, deps) => {
  return React.useMemo(() => memoize(fn), deps);
};

/**
 * Image lazy loading utility
 * @param {string} src - Image source
 * @param {Object} options - Loading options
 * @returns {Object} - Loading state and utilities
 */
export const useImageLazyLoading = (src, options = {}) => {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  
  const { placeholder, onLoad, onError } = options;

  React.useEffect(() => {
    if (!src) return;
    
    const img = new Image();
    
    img.onload = () => {
      setLoaded(true);
      setLoading(false);
      setError(false);
      if (onLoad) onLoad();
    };
    
    img.onerror = () => {
      setError(true);
      setLoading(false);
      if (onError) onError();
    };
    
    img.src = src;
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, onLoad, onError]);

  return {
    src: loaded ? src : placeholder,
    loaded,
    loading,
    error
  };
};

/**
 * Bundle size analyzer (development only)
 */
export const analyzeBundleSize = () => {
  if (process.env.NODE_ENV !== 'development') return;
  
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
  
  console.group('Bundle Analysis');
  
  scripts.forEach(script => {
    console.log(`Script: ${script.src}`);
  });
  
  styles.forEach(style => {
    console.log(`Style: ${style.href}`);
  });
  
  console.groupEnd();
};

/**
 * Memory usage monitor
 */
export const monitorMemoryUsage = () => {
  if (!performance.memory) {
    console.warn('Memory monitoring not supported in this browser');
    return null;
  }
  
  const memory = performance.memory;
  
  return {
    used: Math.round(memory.usedJSHeapSize / 1048576), // MB
    total: Math.round(memory.totalJSHeapSize / 1048576), // MB
    limit: Math.round(memory.jsHeapSizeLimit / 1048576), // MB
    percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
  };
};

/**
 * Network performance monitor
 */
export const monitorNetworkPerformance = () => {
  if (!navigator.connection) {
    console.warn('Network monitoring not supported in this browser');
    return null;
  }
  
  const connection = navigator.connection;
  
  return {
    effectiveType: connection.effectiveType,
    downlink: connection.downlink,
    rtt: connection.rtt,
    saveData: connection.saveData
  };
};

/**
 * Performance observer for Core Web Vitals
 */
export const observeWebVitals = () => {
  if (!window.PerformanceObserver) return;
  
  // Largest Contentful Paint
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log('LCP:', entry.startTime);
    }
  }).observe({ entryTypes: ['largest-contentful-paint'] });
  
  // First Input Delay
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      console.log('FID:', entry.processingStart - entry.startTime);
    }
  }).observe({ entryTypes: ['first-input'] });
  
  // Cumulative Layout Shift
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!entry.hadRecentInput) {
        console.log('CLS:', entry.value);
      }
    }
  }).observe({ entryTypes: ['layout-shift'] });
};

/**
 * Initialize performance monitoring
 */
export const initializePerformanceMonitoring = () => {
  if (process.env.NODE_ENV === 'development') {
    observeWebVitals();
    
    // Log performance metrics periodically
    setInterval(() => {
      const memory = monitorMemoryUsage();
      const network = monitorNetworkPerformance();
      
      if (memory) {
        console.log('Memory Usage:', memory);
      }
      
      if (network) {
        console.log('Network Info:', network);
      }
      
      performanceMonitor.logSummary();
    }, 30000); // Every 30 seconds
  }
};

export default performanceMonitor;