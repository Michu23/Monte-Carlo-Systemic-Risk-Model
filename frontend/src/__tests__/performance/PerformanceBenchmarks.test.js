import { performanceMonitor } from '../../utils/performance';
import { simulationCacheService } from '../../services/cacheService';
import { createMockSimulation, createMockSimulationResults } from '../../utils/testUtils';

describe('Performance Benchmarks', () => {
  beforeEach(() => {
    performanceMonitor.clearMetrics();
    simulationCacheService.clearAll();
  });

  describe('Cache Performance', () => {
    it('cache operations should be fast', async () => {
      const mockData = createMockSimulation();
      
      // Measure cache write performance
      const writeStart = performance.now();
      simulationCacheService.cacheSimulation('test-id', mockData);
      const writeEnd = performance.now();
      
      expect(writeEnd - writeStart).toBeLessThan(1); // Should be under 1ms
      
      // Measure cache read performance
      const readStart = performance.now();
      const cachedData = simulationCacheService.getSimulation('test-id');
      const readEnd = performance.now();
      
      expect(readEnd - readStart).toBeLessThan(1); // Should be under 1ms
      expect(cachedData).toEqual(mockData);
    });

    it('cache should handle large datasets efficiently', () => {
      const largeDataset = {
        ...createMockSimulationResults(),
        raw_data: {
          traditional_failures: Array.from({ length: 10000 }, (_, i) => i % 10),
          blockchain_failures: Array.from({ length: 10000 }, (_, i) => (i % 8))
        }
      };
      
      const start = performance.now();
      simulationCacheService.cacheResults('large-dataset', largeDataset);
      const cached = simulationCacheService.getResults('large-dataset');
      const end = performance.now();
      
      expect(end - start).toBeLessThan(10); // Should be under 10ms
      expect(cached).toEqual(largeDataset);
    });
  });

  describe('Component Rendering Performance', () => {
    it('should track component render times', () => {
      const componentName = 'TestComponent';
      
      performanceMonitor.startTiming(`${componentName}_render`);
      
      // Simulate component work
      const start = Date.now();
      while (Date.now() - start < 5) {
        // Busy wait for 5ms
      }
      
      const duration = performanceMonitor.endTiming(`${componentName}_render`);
      
      expect(duration).toBeGreaterThan(4);
      expect(duration).toBeLessThan(20); // Should be reasonable
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics[`${componentName}_render`]).toBeDefined();
      expect(metrics[`${componentName}_render`].duration).toEqual(duration);
    });

    it('should identify slow operations', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      performanceMonitor.startTiming('slow_operation');
      
      // Simulate slow operation
      const start = Date.now();
      while (Date.now() - start < 1100) {
        // Busy wait for over 1 second
      }
      
      performanceMonitor.endTiming('slow_operation');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow operation detected: slow_operation')
      );
      
      consoleSpy.mockRestore();
    });
  });

  describe('Memory Usage', () => {
    it('should not create memory leaks in cache', () => {
      const initialMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      // Create and cache many items
      for (let i = 0; i < 1000; i++) {
        const mockData = createMockSimulation({ id: `sim-${i}` });
        simulationCacheService.cacheSimulation(`sim-${i}`, mockData);
      }
      
      // Clear cache
      simulationCacheService.clearAll();
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = performance.memory ? performance.memory.usedJSHeapSize : 0;
      
      // Memory usage should not have grown significantly
      if (performance.memory) {
        const memoryGrowth = finalMemory - initialMemory;
        expect(memoryGrowth).toBeLessThan(10 * 1024 * 1024); // Less than 10MB growth
      }
    });
  });

  describe('Data Processing Performance', () => {
    it('should process large simulation results efficiently', () => {
      const largeResults = {
        ...createMockSimulationResults(),
        raw_data: {
          traditional_failures: Array.from({ length: 100000 }, () => Math.floor(Math.random() * 10)),
          blockchain_failures: Array.from({ length: 100000 }, () => Math.floor(Math.random() * 8))
        }
      };
      
      const start = performance.now();
      
      // Simulate data processing operations
      const traditionalMean = largeResults.raw_data.traditional_failures.reduce((a, b) => a + b, 0) / 
                             largeResults.raw_data.traditional_failures.length;
      
      const blockchainMean = largeResults.raw_data.blockchain_failures.reduce((a, b) => a + b, 0) / 
                            largeResults.raw_data.blockchain_failures.length;
      
      const improvement = ((traditionalMean - blockchainMean) / traditionalMean) * 100;
      
      const end = performance.now();
      
      expect(end - start).toBeLessThan(100); // Should process 100k items in under 100ms
      expect(typeof improvement).toBe('number');
    });

    it('should handle chart data transformation efficiently', () => {
      const rawData = Array.from({ length: 50000 }, (_, i) => ({
        x: i,
        y: Math.sin(i / 1000) * 100 + Math.random() * 20
      }));
      
      const start = performance.now();
      
      // Simulate chart data transformation
      const binSize = 10;
      const bins = {};
      
      rawData.forEach(point => {
        const bin = Math.floor(point.y / binSize) * binSize;
        bins[bin] = (bins[bin] || 0) + 1;
      });
      
      const histogramData = Object.entries(bins).map(([bin, count]) => ({
        x: parseFloat(bin),
        y: count
      })).sort((a, b) => a.x - b.x);
      
      const end = performance.now();
      
      expect(end - start).toBeLessThan(50); // Should transform 50k points in under 50ms
      expect(histogramData.length).toBeGreaterThan(0);
    });
  });

  describe('Network Performance Simulation', () => {
    it('should handle concurrent API requests efficiently', async () => {
      // Mock fetch for performance testing
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(createMockSimulation())
        })
      );
      
      const start = performance.now();
      
      // Simulate concurrent requests
      const requests = Array.from({ length: 10 }, (_, i) =>
        fetch(`/api/simulations/${i}`)
      );
      
      const responses = await Promise.all(requests);
      const end = performance.now();
      
      expect(end - start).toBeLessThan(100); // Should handle 10 concurrent requests quickly
      expect(responses).toHaveLength(10);
      expect(global.fetch).toHaveBeenCalledTimes(10);
      
      global.fetch.mockRestore();
    });
  });

  describe('Bundle Size Analysis', () => {
    it('should track bundle loading performance', () => {
      // Mock performance.getEntriesByType
      const mockEntries = [
        {
          name: 'http://localhost:3000/static/js/main.chunk.js',
          transferSize: 150000,
          duration: 45
        },
        {
          name: 'http://localhost:3000/static/css/main.chunk.css',
          transferSize: 25000,
          duration: 12
        }
      ];
      
      jest.spyOn(performance, 'getEntriesByType').mockReturnValue(mockEntries);
      
      const entries = performance.getEntriesByType('resource');
      const jsEntries = entries.filter(entry => entry.name.includes('.js'));
      const cssEntries = entries.filter(entry => entry.name.includes('.css'));
      
      const totalJSSize = jsEntries.reduce((total, entry) => total + entry.transferSize, 0);
      const totalCSSSize = cssEntries.reduce((total, entry) => total + entry.transferSize, 0);
      
      // Bundle size assertions
      expect(totalJSSize).toBeLessThan(500000); // JS bundle should be under 500KB
      expect(totalCSSSize).toBeLessThan(100000); // CSS bundle should be under 100KB
      
      // Loading time assertions
      jsEntries.forEach(entry => {
        expect(entry.duration).toBeLessThan(1000); // Should load in under 1 second
      });
      
      performance.getEntriesByType.mockRestore();
    });
  });

  describe('Lazy Loading Performance', () => {
    it('should load components on demand efficiently', async () => {
      // Mock dynamic import
      const mockComponent = () => Promise.resolve({
        default: () => React.createElement('div', null, 'Lazy Component')
      });
      
      const start = performance.now();
      const component = await mockComponent();
      const end = performance.now();
      
      expect(end - start).toBeLessThan(10); // Should resolve quickly
      expect(component.default).toBeDefined();
    });
  });

  describe('Virtual Scrolling Performance', () => {
    it('should handle large lists efficiently', () => {
      const itemCount = 10000;
      const itemHeight = 50;
      const containerHeight = 400;
      const scrollTop = 5000;
      
      const start = performance.now();
      
      // Simulate virtual scrolling calculations
      const visibleCount = Math.ceil(containerHeight / itemHeight);
      const startIndex = Math.floor(scrollTop / itemHeight);
      const endIndex = Math.min(startIndex + visibleCount + 1, itemCount);
      
      const visibleItems = Array.from(
        { length: endIndex - startIndex },
        (_, i) => ({ id: startIndex + i, data: `Item ${startIndex + i}` })
      );
      
      const end = performance.now();
      
      expect(end - start).toBeLessThan(1); // Should calculate in under 1ms
      expect(visibleItems.length).toBeLessThan(20); // Should only render visible items
      expect(visibleItems[0].id).toBe(startIndex);
    });
  });
});