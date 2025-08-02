import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render, createMockUser, createMockSimulation, createMockSimulationResults } from '../../utils/testUtils';
import App from '../../App';

// Mock services
jest.mock('../../services/authService');
jest.mock('../../services/simulationService');
jest.mock('../../services/websocketService');

// Mock react-router-dom navigation
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('Simulation Flow Integration Tests', () => {
  const user = userEvent.setup();
  const mockUser = createMockUser();
  const mockSimulation = createMockSimulation();
  const mockResults = createMockSimulationResults();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock localStorage for auth token
    localStorage.setItem('token', 'mock-jwt-token');
    
    // Setup service mocks
    const authService = require('../../services/authService');
    const simulationService = require('../../services/simulationService');
    
    authService.getCurrentUser.mockResolvedValue({ user: mockUser });
    simulationService.getSimulations.mockResolvedValue({
      simulations: [mockSimulation],
      total: 1,
      page: 1,
      per_page: 10,
      pages: 1
    });
    simulationService.getSimulation.mockResolvedValue(mockSimulation);
    simulationService.getSimulationResults.mockResolvedValue(mockResults);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('completes full simulation workflow', async () => {
    const simulationService = require('../../services/simulationService');
    
    // Mock simulation creation
    const newSimulation = { ...mockSimulation, id: '2', name: 'New Test Simulation' };
    simulationService.createSimulation.mockResolvedValue(newSimulation);

    render(<App />, {
      route: '/simulations/new',
      preloadedState: {
        auth: {
          isAuthenticated: true,
          user: mockUser,
          loading: false,
          error: null
        }
      }
    });

    // Wait for the new simulation page to load
    await waitFor(() => {
      expect(screen.getByText(/create new simulation/i)).toBeInTheDocument();
    });

    // Fill out simulation form
    const nameInput = screen.getByLabelText(/simulation name/i);
    await user.type(nameInput, 'Integration Test Simulation');

    const descriptionInput = screen.getByLabelText(/description/i);
    await user.type(descriptionInput, 'A test simulation created during integration testing');

    // Adjust parameters
    const shockProbSlider = screen.getByLabelText(/shock probability/i);
    await user.clear(shockProbSlider);
    await user.type(shockProbSlider, '0.15');

    const simulationsInput = screen.getByLabelText(/number of simulations/i);
    await user.clear(simulationsInput);
    await user.type(simulationsInput, '5000');

    // Submit the form
    const createButton = screen.getByRole('button', { name: /create simulation/i });
    await user.click(createButton);

    // Verify simulation creation was called
    await waitFor(() => {
      expect(simulationService.createSimulation).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Integration Test Simulation',
          description: 'A test simulation created during integration testing',
          parameters: expect.objectContaining({
            shock_prob: 0.15,
            n_sim: 5000
          })
        })
      );
    });

    // Should navigate to simulation detail page
    expect(mockNavigate).toHaveBeenCalledWith('/simulations/2');
  });

  it('navigates through simulation list and views details', async () => {
    render(<App />, {
      route: '/simulations',
      preloadedState: {
        auth: {
          isAuthenticated: true,
          user: mockUser,
          loading: false,
          error: null
        }
      }
    });

    // Wait for simulations list to load
    await waitFor(() => {
      expect(screen.getByText(/simulations/i)).toBeInTheDocument();
    });

    // Find and click on a simulation
    const simulationCard = screen.getByText(mockSimulation.name);
    await user.click(simulationCard);

    // Should navigate to simulation detail
    expect(mockNavigate).toHaveBeenCalledWith(`/simulations/${mockSimulation.id}`);
  });

  it('handles simulation comparison workflow', async () => {
    const simulationService = require('../../services/simulationService');
    
    // Mock multiple simulations
    const simulations = [
      mockSimulation,
      { ...mockSimulation, id: '2', name: 'Simulation 2' },
      { ...mockSimulation, id: '3', name: 'Simulation 3' }
    ];
    
    simulationService.getSimulations.mockResolvedValue({
      simulations,
      total: 3,
      page: 1,
      per_page: 10,
      pages: 1
    });

    simulationService.compareSimulations.mockResolvedValue({
      comparison: {
        simulations: simulations,
        analysis: 'Comparison analysis data'
      }
    });

    render(<App />, {
      route: '/simulations',
      preloadedState: {
        auth: {
          isAuthenticated: true,
          user: mockUser,
          loading: false,
          error: null
        }
      }
    });

    // Wait for simulations list to load
    await waitFor(() => {
      expect(screen.getByText(/simulations/i)).toBeInTheDocument();
    });

    // Enter comparison mode
    const compareButton = screen.getByRole('button', { name: /compare/i });
    await user.click(compareButton);

    // Select simulations for comparison
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]); // Select first simulation
    await user.click(checkboxes[1]); // Select second simulation

    // Start comparison
    const startComparisonButton = screen.getByRole('button', { name: /compare selected/i });
    await user.click(startComparisonButton);

    // Verify comparison was called
    await waitFor(() => {
      expect(simulationService.compareSimulations).toHaveBeenCalledWith(['1', '2']);
    });
  });

  it('handles export functionality', async () => {
    render(<App />, {
      route: `/simulations/${mockSimulation.id}`,
      preloadedState: {
        auth: {
          isAuthenticated: true,
          user: mockUser,
          loading: false,
          error: null
        }
      }
    });

    // Wait for simulation detail to load
    await waitFor(() => {
      expect(screen.getByText(mockSimulation.name)).toBeInTheDocument();
    });

    // Open export menu
    const moreButton = screen.getByRole('button', { name: /more/i });
    await user.click(moreButton);

    // Click export option
    const exportButton = screen.getByText(/export as json/i);
    await user.click(exportButton);

    // Verify export was initiated
    // Note: In a real test, you might mock the download functionality
    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  it('handles sharing functionality', async () => {
    const exportService = require('../../services/exportService');
    
    exportService.generateShareLink.mockResolvedValue({
      token: 'mock-share-token',
      url: 'http://localhost:3000/shared/mock-share-token',
      expires_at: '2024-01-01T00:00:00Z'
    });

    render(<App />, {
      route: `/simulations/${mockSimulation.id}`,
      preloadedState: {
        auth: {
          isAuthenticated: true,
          user: mockUser,
          loading: false,
          error: null
        }
      }
    });

    // Wait for simulation detail to load
    await waitFor(() => {
      expect(screen.getByText(mockSimulation.name)).toBeInTheDocument();
    });

    // Open share dialog
    const shareButton = screen.getByRole('button', { name: /share/i });
    await user.click(shareButton);

    // Wait for share dialog to open
    await waitFor(() => {
      expect(screen.getByText(/share simulation results/i)).toBeInTheDocument();
    });

    // Create share link
    const createLinkButton = screen.getByRole('button', { name: /create share link/i });
    await user.click(createLinkButton);

    // Verify share link creation
    await waitFor(() => {
      expect(exportService.generateShareLink).toHaveBeenCalledWith(
        mockSimulation.id,
        expect.objectContaining({
          expiresIn: 7,
          passwordProtected: false,
          includeRawData: false
        })
      );
    });
  });

  it('handles error states gracefully', async () => {
    const simulationService = require('../../services/simulationService');
    
    // Mock API error
    simulationService.getSimulations.mockRejectedValue(new Error('API Error'));

    render(<App />, {
      route: '/simulations',
      preloadedState: {
        auth: {
          isAuthenticated: true,
          user: mockUser,
          loading: false,
          error: null
        }
      }
    });

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });

    // Should have retry functionality
    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('maintains state during navigation', async () => {
    render(<App />, {
      route: '/simulations',
      preloadedState: {
        auth: {
          isAuthenticated: true,
          user: mockUser,
          loading: false,
          error: null
        }
      }
    });

    // Wait for simulations list to load
    await waitFor(() => {
      expect(screen.getByText(/simulations/i)).toBeInTheDocument();
    });

    // Navigate to dashboard
    const dashboardLink = screen.getByRole('link', { name: /dashboard/i });
    await user.click(dashboardLink);

    // Navigate back to simulations
    const simulationsLink = screen.getByRole('link', { name: /simulations/i });
    await user.click(simulationsLink);

    // Should still show simulations (cached)
    await waitFor(() => {
      expect(screen.getByText(mockSimulation.name)).toBeInTheDocument();
    });
  });
});