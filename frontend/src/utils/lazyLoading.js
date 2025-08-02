import React, { Suspense } from 'react';
import { CircularProgress, Box } from '@mui/material';
import ErrorBoundary from '../components/common/ErrorBoundary';

/**
 * Default loading component
 */
const DefaultLoadingComponent = ({ message = 'Loading...' }) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px',
      gap: 2
    }}
  >
    <CircularProgress />
    {message && (
      <span style={{ color: '#666', fontSize: '14px' }}>
        {message}
      </span>
    )}
  </Box>
);

/**
 * Higher-order component for lazy loading with error boundary and loading state
 * @param {Function} importFunction - Dynamic import function
 * @param {Object} options - Configuration options
 * @returns {React.Component} - Lazy loaded component
 */
export const createLazyComponent = (importFunction, options = {}) => {
  const {
    fallback: FallbackComponent = DefaultLoadingComponent,
    errorFallback,
    loadingMessage = 'Loading component...'
  } = options;

  const LazyComponent = React.lazy(importFunction);

  return React.forwardRef((props, ref) => (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={<FallbackComponent message={loadingMessage} />}>
        <LazyComponent {...props} ref={ref} />
      </Suspense>
    </ErrorBoundary>
  ));
};

/**
 * Lazy load pages with route-specific loading messages
 */
export const LazyPages = {
  Dashboard: createLazyComponent(
    () => import('../pages/Dashboard'),
    { loadingMessage: 'Loading dashboard...' }
  ),
  
  SimulationsList: createLazyComponent(
    () => import('../pages/SimulationsList'),
    { loadingMessage: 'Loading simulations...' }
  ),
  
  SimulationDetail: createLazyComponent(
    () => import('../pages/SimulationDetail'),
    { loadingMessage: 'Loading simulation details...' }
  ),
  
  NewSimulation: createLazyComponent(
    () => import('../pages/NewSimulation'),
    { loadingMessage: 'Loading simulation form...' }
  ),
  
  SimulationHistory: createLazyComponent(
    () => import('../pages/SimulationHistory'),
    { loadingMessage: 'Loading simulation history...' }
  ),
  
  BanksList: createLazyComponent(
    () => import('../pages/BanksList'),
    { loadingMessage: 'Loading banks data...' }
  ),
  
  SharedSimulation: createLazyComponent(
    () => import('../pages/SharedSimulation'),
    { loadingMessage: 'Loading shared simulation...' }
  )
};

/**
 * Lazy load charts with chart-specific loading
 */
export const LazyCharts = {
  FailureDistributionChart: createLazyComponent(
    () => import('../components/charts/FailureDistributionChart'),
    { loadingMessage: 'Loading chart...' }
  ),
  
  CumulativeProbabilityChart: createLazyComponent(
    () => import('../components/charts/CumulativeProbabilityChart'),
    { loadingMessage: 'Loading chart...' }
  ),
  
  BoxPlotChart: createLazyComponent(
    () => import('../components/charts/BoxPlotChart'),
    { loadingMessage: 'Loading chart...' }
  ),
  
  CorrelationHeatmap: createLazyComponent(
    () => import('../components/charts/CorrelationHeatmap'),
    { loadingMessage: 'Loading heatmap...' }
  ),
  
  HeatmapChart: createLazyComponent(
    () => import('../components/charts/HeatmapChart'),
    { loadingMessage: 'Loading heatmap...' }
  ),
  
  LineChart: createLazyComponent(
    () => import('../components/charts/LineChart'),
    { loadingMessage: 'Loading chart...' }
  ),
  
  BarChart: createLazyComponent(
    () => import('../components/charts/BarChart'),
    { loadingMessage: 'Loading chart...' }
  )
};

/**
 * Preload components for better UX
 * @param {Array} components - Array of lazy components to preload
 */
export const preloadComponents = (components) => {
  components.forEach(component => {
    if (component && typeof component === 'function') {
      // Trigger the lazy loading
      component();
    }
  });
};

/**
 * Hook for preloading components on user interaction
 * @param {Array} components - Components to preload
 * @returns {Function} - Preload function
 */
export const usePreload = (components) => {
  const preload = React.useCallback(() => {
    preloadComponents(components);
  }, [components]);

  return preload;
};

/**
 * Intersection Observer hook for lazy loading on scroll
 * @param {Object} options - Intersection observer options
 * @returns {Array} - [ref, isIntersecting]
 */
export const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [element, setElement] = React.useState(null);

  const {
    threshold = 0.1,
    rootMargin = '0px',
    triggerOnce = true
  } = options;

  React.useEffect(() => {
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          if (triggerOnce) {
            observer.unobserve(element);
          }
        } else if (!triggerOnce) {
          setIsIntersecting(false);
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [element, threshold, rootMargin, triggerOnce]);

  return [setElement, isIntersecting];
};

/**
 * Component for lazy loading content when it comes into view
 */
export const LazyLoadOnScroll = ({ 
  children, 
  fallback = <DefaultLoadingComponent />,
  ...observerOptions 
}) => {
  const [ref, isIntersecting] = useIntersectionObserver(observerOptions);

  return (
    <div ref={ref}>
      {isIntersecting ? children : fallback}
    </div>
  );
};

/**
 * Virtual scrolling hook for large lists
 * @param {Array} items - Array of items
 * @param {number} itemHeight - Height of each item
 * @param {number} containerHeight - Height of container
 * @returns {Object} - Virtual scrolling utilities
 */
export const useVirtualScrolling = (items, itemHeight, containerHeight) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const visibleCount = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.floor(scrollTop / itemHeight);
  const endIndex = Math.min(startIndex + visibleCount + 1, items.length);
  
  const visibleItems = items.slice(startIndex, endIndex);
  const totalHeight = items.length * itemHeight;
  const offsetY = startIndex * itemHeight;

  const handleScroll = React.useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex,
    endIndex
  };
};

export default createLazyComponent;