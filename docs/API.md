# API Documentation

The Systemic Risk Dashboard API provides endpoints for managing simulations, banks data, and user authentication.

## Base URL

- **Development**: `http://localhost:5001/api`
- **Production**: `https://yourdomain.com/api`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Response Format

All API responses follow this format:

```json
{
  "success": true,
  "data": {},
  "message": "Success message",
  "timestamp": "2023-12-01T10:00:00Z"
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  },
  "timestamp": "2023-12-01T10:00:00Z"
}
```

## Endpoints

### Authentication

#### POST /auth/register

Register a new user account.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "first_name": "string",
  "last_name": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "username": "string",
      "email": "string",
      "first_name": "string",
      "last_name": "string",
      "role": "user",
      "created_at": "2023-12-01T10:00:00Z"
    }
  },
  "message": "User registered successfully"
}
```

#### POST /auth/login

Authenticate user and receive access token.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "jwt-token-string",
    "refresh_token": "refresh-token-string",
    "user": {
      "id": "string",
      "username": "string",
      "email": "string",
      "role": "user"
    }
  },
  "message": "Login successful"
}
```

#### POST /auth/logout

Logout user and invalidate token.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

#### GET /auth/me

Get current user information.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "username": "string",
      "email": "string",
      "first_name": "string",
      "last_name": "string",
      "role": "user",
      "created_at": "2023-12-01T10:00:00Z"
    }
  }
}
```

### Simulations

#### GET /simulations

Get list of simulations with pagination and filtering.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `page` (integer): Page number (default: 1)
- `per_page` (integer): Items per page (default: 10, max: 100)
- `status` (string): Filter by status (pending, running, completed, failed)
- `search` (string): Search in simulation names and descriptions
- `sort_by` (string): Sort field (created_at, name, status)
- `sort_dir` (string): Sort direction (asc, desc)

**Response:**
```json
{
  "success": true,
  "data": {
    "simulations": [
      {
        "id": "string",
        "name": "string",
        "description": "string",
        "status": "completed",
        "progress": 1.0,
        "parameters": {
          "shock_prob": 0.1,
          "n_sim": 1000,
          "systemic_threshold": 3,
          "trad_lgd": 0.45,
          "bc_lgd": 0.35,
          "bc_liability_reduction": 0.2
        },
        "created_at": "2023-12-01T10:00:00Z",
        "updated_at": "2023-12-01T10:30:00Z",
        "user_id": "string"
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 10,
      "total": 25,
      "pages": 3
    }
  }
}
```

#### POST /simulations

Create a new simulation.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "parameters": {
    "shock_prob": 0.1,
    "n_sim": 1000,
    "systemic_threshold": 3,
    "trad_lgd": 0.45,
    "bc_lgd": 0.35,
    "bc_liability_reduction": 0.2
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "simulation": {
      "id": "string",
      "name": "string",
      "description": "string",
      "status": "pending",
      "progress": 0.0,
      "parameters": {},
      "created_at": "2023-12-01T10:00:00Z",
      "user_id": "string"
    }
  },
  "message": "Simulation created successfully"
}
```

#### GET /simulations/{id}

Get simulation details by ID.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "simulation": {
      "id": "string",
      "name": "string",
      "description": "string",
      "status": "completed",
      "progress": 1.0,
      "parameters": {},
      "created_at": "2023-12-01T10:00:00Z",
      "updated_at": "2023-12-01T10:30:00Z",
      "user_id": "string"
    }
  }
}
```

#### GET /simulations/{id}/results

Get simulation results.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `include_raw_data` (boolean): Include raw simulation data (default: false)

**Response:**
```json
{
  "success": true,
  "data": {
    "results": {
      "traditional_summary": {
        "average_failures": 2.5,
        "max_failures": 8,
        "min_failures": 0,
        "std_failures": 1.2,
        "probability_systemic_event": 0.15
      },
      "blockchain_summary": {
        "average_failures": 1.8,
        "max_failures": 6,
        "min_failures": 0,
        "std_failures": 0.9,
        "probability_systemic_event": 0.08
      },
      "improvements": {
        "average_failures": 28.0,
        "max_failures": 25.0,
        "probability_systemic_event": 46.7
      },
      "statistical_analysis": {
        "t_stat": -5.23,
        "p_value": 0.000001,
        "cohens_d": -0.58,
        "effect": "medium"
      },
      "raw_data": {
        "traditional_failures": [1, 2, 3, 2, 4],
        "blockchain_failures": [0, 1, 2, 1, 2]
      }
    }
  }
}
```

#### DELETE /simulations/{id}

Delete a simulation.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "message": "Simulation deleted successfully"
}
```

#### GET /simulations/{id}/export

Export simulation results in various formats.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `format` (string): Export format (json, csv, pdf)
- `include_raw_data` (boolean): Include raw data
- `include_parameters` (boolean): Include parameters
- `include_statistics` (boolean): Include statistical analysis

**Response:** File download or JSON data depending on format.

### Banks

#### GET /banks

Get list of banks.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "banks": [
      {
        "id": "string",
        "name": "string",
        "assets": 1000000,
        "liabilities": 800000,
        "capital_ratio": 0.12,
        "liquidity_ratio": 0.15,
        "country": "US",
        "bank_type": "commercial"
      }
    ]
  }
}
```

#### POST /banks

Create a new bank.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "string",
  "assets": 1000000,
  "liabilities": 800000,
  "capital_ratio": 0.12,
  "liquidity_ratio": 0.15,
  "country": "US",
  "bank_type": "commercial"
}
```

#### PUT /banks/{id}

Update bank information.

**Headers:** `Authorization: Bearer <token>`

**Request Body:** Same as POST /banks

#### DELETE /banks/{id}

Delete a bank.

**Headers:** `Authorization: Bearer <token>`

### Sharing

#### POST /simulations/{id}/share

Create a shareable link for simulation results.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "expires_in": 7,
  "password_protected": false,
  "password": "optional-password",
  "include_raw_data": false
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "share_token": "string",
    "share_url": "https://yourdomain.com/shared/token",
    "expires_at": "2023-12-08T10:00:00Z",
    "password_protected": false
  }
}
```

#### GET /shared/{token}

Access shared simulation results.

**Query Parameters:**
- `password` (string): Required if share is password protected

**Response:** Same as GET /simulations/{id}/results

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Request validation failed |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Resource already exists |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Server error |
| `SERVICE_UNAVAILABLE` | Service temporarily unavailable |

## Rate Limiting

API endpoints are rate limited:

- **Authentication**: 5 requests per minute
- **General API**: 100 requests per minute
- **File uploads**: 10 requests per minute

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

## WebSocket API

Real-time updates are available via WebSocket connection.

**Connection:** `wss://yourdomain.com/ws?token=<jwt-token>`

### Events

#### Simulation Updates

```json
{
  "type": "simulation_status",
  "data": {
    "simulation_id": "string",
    "status": "running",
    "progress": 0.5,
    "message": "Processing step 500 of 1000"
  }
}
```

#### Notifications

```json
{
  "type": "notification",
  "data": {
    "id": "string",
    "type": "info",
    "title": "Simulation Complete",
    "message": "Your simulation has finished successfully",
    "timestamp": "2023-12-01T10:00:00Z"
  }
}
```

### Subscribing to Events

Send subscription messages:

```json
{
  "type": "subscribe_simulation",
  "payload": {
    "simulation_id": "string"
  }
}
```

## SDK Examples

### JavaScript/Node.js

```javascript
const API_BASE = 'https://yourdomain.com/api';

class SystemicRiskAPI {
  constructor(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    return response.json();
  }

  async getSimulations(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/simulations?${query}`);
  }

  async createSimulation(data) {
    return this.request('/simulations', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}

// Usage
const api = new SystemicRiskAPI('your-jwt-token');
const simulations = await api.getSimulations({ page: 1, per_page: 10 });
```

### Python

```python
import requests
import json

class SystemicRiskAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.token = token
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        })
    
    def get_simulations(self, **params):
        response = self.session.get(f'{self.base_url}/simulations', params=params)
        response.raise_for_status()
        return response.json()
    
    def create_simulation(self, data):
        response = self.session.post(f'{self.base_url}/simulations', json=data)
        response.raise_for_status()
        return response.json()

# Usage
api = SystemicRiskAPI('https://yourdomain.com/api', 'your-jwt-token')
simulations = api.get_simulations(page=1, per_page=10)
```