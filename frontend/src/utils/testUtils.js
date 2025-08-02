import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

// Import your store slices
import authSlice from '../store/authSlice';
import simulationsSlice from '../store/simulationsSlice';
import banksSlice from '../store/banksSlice';
import uiSlice from '../store/uiSlice';

const theme = createTheme();

/**
 * Create a test store with initial state
 * @param {Object} preloadedState - Initial state for the store
 * @returns {Object} - Configured store
 */
export function createTestStore(preloadedState = {}) {
  return configureStore({
    reducer: {
      auth: authSlice,
      simulations: simulationsSlice,
      banks: banksSlice,
      ui: uiSlice
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: ['persist/PERSIST']
        }
      })
  });
}

/**
 * Custom render function that includes providers
 * @param {React.Component} ui - Component to render
 * @param {Object} options - Render options
 * @returns {Object} - Render result with additional utilities
 */
export function render(ui, options = {}) {
  const {
    preloadedState = {},
    store = createTestStore(preloadedState),
    route = '/',
    ...renderOptions
  } = options;

  // Set initial route
  window.history.pushState({}, 'Test page', route);

  function Wrapper({ children }) {
    return (
      <Provider store={store}>
        <BrowserRouter>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            {children}
          </ThemeProvider>
        </BrowserRouter>
      </Provider>
    );
  }

  const result = rtlRender(ui, { wrapper: Wrapper, ...renderOptions });

  return {
    ...result,
    store,
    // Add custom utilities
    rerender: (ui, options) =>
      render(ui, { container: result.container, ...options })
  };
}

/**
 * Create mock user data
 * @param {Object} overrides - Properties to override
 * @returns {Object} - Mock user object
 */
export function createMockUser(overrides = {}) {
  return {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'user',
    created_at: '2023-01-01T00:00:00Z',
    ...overrides
  };
}

/**
 * Create mock simulation data
 * @param {Object} overrides - Properties to override
 * @returns {Object} - Mock simulation object
 */
export function createMockSimulation(overrides = {}) {
  return {
    id: '1',
    name: 'Test Simulation',
    description: 'A test simulation',
    status: 'completed',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    parameters: {
      shock_prob: 0.1,
      n_sim: 1000,
      systemic_threshold: 3,
      trad_lgd: 0.45,
      bc_lgd: 0.35,
      bc_liability_reduction: 0.2
    },
    progress: 1.0,
    user_id: '1',
    ...overrides
  };
}

/**
 * Create mock simulation results
 * @param {Object} overrides - Properties to override
 * @returns {Object} - Mock results object
 */
export function createMockSimulationResults(overrides = {}) {
  return {
    traditional_summary: {
      average_failures: 2.5,
      max_failures: 8,
      min_failures: 0,
      std_failures: 1.2,
      probability_systemic_event: 0.15
    },
    blockchain_summary: {
      average_failures: 1.8,
      max_failures: 6,
      min_failures: 0,
      std_failures: 0.9,
      probability_systemic_event: 0.08
    },
    improvements: {
      average_failures: 28.0,
      max_failures: 25.0,
      probability_systemic_event: 46.7
    },
    statistical_analysis: {
      t_stat: -5.23,
      p_value: 0.000001,
      cohens_d: -0.58,
      effect: 'medium'
    },
    raw_data: {
      traditional_failures: [1, 2, 3, 2, 4, 1, 3, 2, 5, 1],
      blockchain_failures: [0, 1, 2, 1, 2, 0, 2, 1, 3, 0]
    },
    ...overrides
  };
}

/**
 * Create mock bank data
 * @param {Object} overrides - Properties to override
 * @returns {Object} - Mock bank object
 */
export function createMockBank(overrides = {}) {
  return {
    id: '1',
    name: 'Test Bank',
    assets: 1000000,
    liabilities: 800000,
    capital_ratio: 0.12,
    liquidity_ratio: 0.15,
    country: 'US',
    bank_type: 'commercial',
    ...overrides
  };
}

/**
 * Mock API responses
 */
export const mockApiResponses = {
  // Auth responses
  login: {
    access_token: 'mock-jwt-token',
    user: createMockUser()
  },
  
  register: {
    message: 'User registered successfully',
    user: createMockUser()
  },
  
  // Simulation responses
  simulations: {
    simulations: [createMockSimulation()],
    total: 1,
    page: 1,
    per_page: 10,
    pages: 1
  },
  
  simulation: createMockSimulation(),
  
  simulationResults: createMockSimulationResults(),
  
  // Bank responses
  banks: [createMockBank()],
  
  bank: createMockBank()
};

/**
 * Mock axios for API testing
 * @param {Object} responses - Custom responses
 * @returns {Object} - Mocked axios instance
 */
export function createMockAxios(responses = {}) {
  const mockAxios = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    create: jest.fn(() => mockAxios),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  };

  // Set up default responses
  mockAxios.get.mockImplementation((url) => {
    if (url.includes('/simulations')) {
      return Promise.resolve({ data: responses.simulations || mockApiResponses.simulations });
    }
    if (url.includes('/banks')) {
      return Promise.resolve({ data: responses.banks || mockApiResponses.banks });
    }
    return Promise.resolve({ data: {} });
  });

  mockAxios.post.mockImplementation((url, data) => {
    if (url.includes('/auth/login')) {
      return Promise.resolve({ data: responses.login || mockApiResponses.login });
    }
    if (url.includes('/auth/register')) {
      return Promise.resolve({ data: responses.register || mockApiResponses.register });
    }
    return Promise.resolve({ data: {} });
  });

  return mockAxios;
}

/**
 * Wait for async operations to complete
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} - Promise that resolves after timeout
 */
export function waitFor(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock WebSocket for testing
 */
export class MockWebSocket {
  constructor(url) {
    this.url = url;
    this.readyState = MockWebSocket.CONNECTING;
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;
    
    // Simulate connection
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) this.onopen();
    }, 0);
  }
  
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  
  send(data) {
    // Mock send implementation
  }
  
  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) this.onclose();
  }
  
  // Helper method to simulate receiving messages
  simulateMessage(data) {
    if (this.onmessage) {
      this.onmessage({ data: JSON.stringify(data) });
    }
  }
}

/**
 * Create mock chart element for testing
 * @returns {Object} - Mock chart element
 */
export function createMockChartElement() {
  return {
    getBoundingClientRect: () => ({
      width: 400,
      height: 300,
      top: 0,
      left: 0,
      right: 400,
      bottom: 300
    }),
    querySelector: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  };
}

/**
 * Mock file for testing file uploads
 * @param {string} name - File name
 * @param {string} type - MIME type
 * @param {string} content - File content
 * @returns {File} - Mock file object
 */
export function createMockFile(name = 'test.csv', type = 'text/csv', content = 'test,data') {
  const file = new File([content], name, { type });
  return file;
}

/**
 * Custom matchers for testing
 */
export const customMatchers = {
  toBeInTheDocument: (received) => {
    const pass = document.body.contains(received);
    return {
      message: () => `expected element ${pass ? 'not ' : ''}to be in the document`,
      pass
    };
  }
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';