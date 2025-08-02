import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 0 },  // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
    http_req_failed: ['rate<0.1'],     // Error rate should be below 10%
    errors: ['rate<0.1'],              // Custom error rate should be below 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost';

// Test data
const testUser = {
  username: 'testuser',
  password: 'testpass123',
  email: 'test@example.com'
};

export function setup() {
  // Setup phase - create test user if needed
  console.log('Setting up load test...');
  
  // Register test user
  const registerResponse = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify(testUser), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (registerResponse.status === 201 || registerResponse.status === 409) {
    console.log('Test user ready');
  }
  
  return { baseUrl: BASE_URL };
}

export default function(data) {
  // Login
  const loginResponse = http.post(`${data.baseUrl}/api/auth/login`, JSON.stringify({
    username: testUser.username,
    password: testUser.password
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const loginSuccess = check(loginResponse, {
    'login successful': (r) => r.status === 200,
    'login response time < 1s': (r) => r.timings.duration < 1000,
  });
  
  if (!loginSuccess) {
    errorRate.add(1);
    return;
  }
  
  const authToken = loginResponse.json('access_token');
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  };
  
  sleep(1);
  
  // Get simulations list
  const simulationsResponse = http.get(`${data.baseUrl}/api/simulations`, { headers });
  
  check(simulationsResponse, {
    'simulations list loaded': (r) => r.status === 200,
    'simulations response time < 2s': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // Get banks data
  const banksResponse = http.get(`${data.baseUrl}/api/banks`, { headers });
  
  check(banksResponse, {
    'banks data loaded': (r) => r.status === 200,
    'banks response time < 1s': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // Create a simulation
  const simulationData = {
    name: `Load Test Simulation ${__VU}-${__ITER}`,
    description: 'Simulation created during load testing',
    parameters: {
      shock_prob: 0.1,
      n_sim: 100,
      systemic_threshold: 3,
      trad_lgd: 0.45,
      bc_lgd: 0.35,
      bc_liability_reduction: 0.2
    }
  };
  
  const createSimResponse = http.post(`${data.baseUrl}/api/simulations`, JSON.stringify(simulationData), { headers });
  
  const createSuccess = check(createSimResponse, {
    'simulation created': (r) => r.status === 201,
    'create simulation response time < 3s': (r) => r.timings.duration < 3000,
  });
  
  if (createSuccess) {
    const simulationId = createSimResponse.json('id');
    
    sleep(2);
    
    // Get simulation details
    const detailResponse = http.get(`${data.baseUrl}/api/simulations/${simulationId}`, { headers });
    
    check(detailResponse, {
      'simulation details loaded': (r) => r.status === 200,
      'detail response time < 1s': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);
    
    sleep(1);
    
    // Check simulation status
    const statusResponse = http.get(`${data.baseUrl}/api/simulations/${simulationId}/status`, { headers });
    
    check(statusResponse, {
      'simulation status checked': (r) => r.status === 200,
      'status response time < 500ms': (r) => r.timings.duration < 500,
    }) || errorRate.add(1);
    
  } else {
    errorRate.add(1);
  }
  
  sleep(2);
}

export function teardown(data) {
  // Cleanup phase
  console.log('Cleaning up load test...');
  
  // Could add cleanup logic here if needed
  // For example, delete test simulations
}