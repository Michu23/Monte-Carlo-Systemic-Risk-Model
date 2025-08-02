import simulationService from '../simulationService';
import { simulationCacheService } from '../cacheService';
import { createMockSimulation, createMockSimulationResults } from '../../utils/testUtils';

// Mock the API
jest.mock('../api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
}));

// Mock the cache service
jest.mock('../cacheService', () => ({
  simulationCacheService: {
    getSimulationList: jest.fn(),
    cacheSimulationList: jest.fn(),
    getSimulation: jest.fn(),
    cacheSimulation: jest.fn(),
    getResults: jest.fn(),
    cacheResults: jest.fn(),
    invalidateSimulation: jest.fn(),
    clearAll: jest.fn()
  }
}));

describe('SimulationService', () => {
  const mockApi = require('../api');
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSimulations', () => {
    it('returns cached data when available', async () => {
      const mockData = { simulations: [createMockSimulation()], total: 1 };
      simulationCacheService.getSimulationList.mockReturnValue(mockData);
      
      const result = await simulationService.getSimulations({ page: 1 });
      
      expect(result).toEqual(mockData);
      expect(simulationCacheService.getSimulationList).toHaveBeenCalledWith({ page: 1 });
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('fetches from API when cache is empty', async () => {
      const mockData = { simulations: [createMockSimulation()], total: 1 };
      simulationCacheService.getSimulationList.mockReturnValue(null);
      mockApi.get.mockResolvedValue({ data: mockData });
      
      const result = await simulationService.getSimulations({ page: 1 });
      
      expect(result).toEqual(mockData);
      expect(mockApi.get).toHaveBeenCalledWith('/simulations?page=1');
      expect(simulationCacheService.cacheSimulationList).toHaveBeenCalledWith({ page: 1 }, mockData);
    });

    it('constructs query parameters correctly', async () => {
      simulationCacheService.getSimulationList.mockReturnValue(null);
      mockApi.get.mockResolvedValue({ data: {} });
      
      const params = {
        page: 2,
        per_page: 20,
        status: 'completed',
        search: 'test',
        sort_by: 'created_at',
        sort_dir: 'desc'
      };
      
      await simulationService.getSimulations(params);
      
      expect(mockApi.get).toHaveBeenCalledWith(
        '/simulations?page=2&per_page=20&status=completed&search=test&sort_by=created_at&sort_dir=desc'
      );
    });
  });

  describe('getSimulation', () => {
    it('returns cached simulation when available', async () => {
      const mockSimulation = createMockSimulation();
      simulationCacheService.getSimulation.mockReturnValue(mockSimulation);
      
      const result = await simulationService.getSimulation('1');
      
      expect(result).toEqual(mockSimulation);
      expect(simulationCacheService.getSimulation).toHaveBeenCalledWith('1');
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('fetches from API when cache is empty', async () => {
      const mockSimulation = createMockSimulation();
      simulationCacheService.getSimulation.mockReturnValue(null);
      mockApi.get.mockResolvedValue({ data: mockSimulation });
      
      const result = await simulationService.getSimulation('1');
      
      expect(result).toEqual(mockSimulation);
      expect(mockApi.get).toHaveBeenCalledWith('/simulations/1');
      expect(simulationCacheService.cacheSimulation).toHaveBeenCalledWith('1', mockSimulation);
    });
  });

  describe('getSimulationResults', () => {
    it('returns cached results when available', async () => {
      const mockResults = createMockSimulationResults();
      simulationCacheService.getResults.mockReturnValue(mockResults);
      
      const result = await simulationService.getSimulationResults('1', true);
      
      expect(result).toEqual(mockResults);
      expect(simulationCacheService.getResults).toHaveBeenCalledWith('1_true');
      expect(mockApi.get).not.toHaveBeenCalled();
    });

    it('fetches from API when cache is empty', async () => {
      const mockResults = createMockSimulationResults();
      simulationCacheService.getResults.mockReturnValue(null);
      mockApi.get.mockResolvedValue({ data: mockResults });
      
      const result = await simulationService.getSimulationResults('1', false);
      
      expect(result).toEqual(mockResults);
      expect(mockApi.get).toHaveBeenCalledWith('/simulations/1/results?include_raw_data=false');
      expect(simulationCacheService.cacheResults).toHaveBeenCalledWith('1_false', mockResults);
    });
  });

  describe('createSimulation', () => {
    it('creates simulation and clears cache', async () => {
      const mockSimulation = createMockSimulation();
      const simulationData = { name: 'Test Simulation', parameters: {} };
      mockApi.post.mockResolvedValue({ data: mockSimulation });
      
      const result = await simulationService.createSimulation(simulationData);
      
      expect(result).toEqual(mockSimulation);
      expect(mockApi.post).toHaveBeenCalledWith('/simulations', simulationData);
      expect(simulationCacheService.clearAll).toHaveBeenCalled();
    });
  });

  describe('updateSimulationParameters', () => {
    it('updates parameters and invalidates cache', async () => {
      const mockSimulation = createMockSimulation();
      const parameters = { shock_prob: 0.2 };
      mockApi.put.mockResolvedValue({ data: mockSimulation });
      
      const result = await simulationService.updateSimulationParameters('1', parameters);
      
      expect(result).toEqual(mockSimulation);
      expect(mockApi.put).toHaveBeenCalledWith('/simulations/1/parameters', parameters);
      expect(simulationCacheService.invalidateSimulation).toHaveBeenCalledWith('1');
    });
  });

  describe('deleteSimulation', () => {
    it('deletes simulation and invalidates cache', async () => {
      const mockResponse = { message: 'Simulation deleted' };
      mockApi.delete.mockResolvedValue({ data: mockResponse });
      
      const result = await simulationService.deleteSimulation('1');
      
      expect(result).toEqual(mockResponse);
      expect(mockApi.delete).toHaveBeenCalledWith('/simulations/1');
      expect(simulationCacheService.invalidateSimulation).toHaveBeenCalledWith('1');
    });
  });

  describe('compareSimulations', () => {
    it('compares multiple simulations', async () => {
      const mockComparison = { comparison: 'data' };
      mockApi.get.mockResolvedValue({ data: mockComparison });
      
      const result = await simulationService.compareSimulations(['1', '2', '3']);
      
      expect(result).toEqual(mockComparison);
      expect(mockApi.get).toHaveBeenCalledWith('/simulations/compare?ids=1&ids=2&ids=3');
    });
  });

  describe('error handling', () => {
    it('propagates API errors', async () => {
      const error = new Error('API Error');
      simulationCacheService.getSimulation.mockReturnValue(null);
      mockApi.get.mockRejectedValue(error);
      
      await expect(simulationService.getSimulation('1')).rejects.toThrow('API Error');
    });

    it('does not cache failed requests', async () => {
      const error = new Error('API Error');
      simulationCacheService.getSimulation.mockReturnValue(null);
      mockApi.get.mockRejectedValue(error);
      
      try {
        await simulationService.getSimulation('1');
      } catch (e) {
        // Expected to throw
      }
      
      expect(simulationCacheService.cacheSimulation).not.toHaveBeenCalled();
    });
  });
});