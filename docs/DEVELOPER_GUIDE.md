# Developer Onboarding Guide

Welcome to the Systemic Risk Dashboard development team! This guide will help you get up and running with the codebase.

## Table of Contents

- [Project Overview](#project-overview)
- [Development Environment Setup](#development-environment-setup)
- [Architecture Overview](#architecture-overview)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Deployment Process](#deployment-process)
- [Contributing Guidelines](#contributing-guidelines)

## Project Overview

The Systemic Risk Dashboard is a full-stack web application for analyzing systemic risk in banking systems, comparing traditional banking with blockchain-based alternatives.

### Technology Stack

**Frontend:**
- React 18 with TypeScript
- Material-UI (MUI) for components
- Redux Toolkit for state management
- D3.js for data visualization
- Jest and React Testing Library for testing

**Backend:**
- Python 3.11 with Flask
- SQLAlchemy for database ORM
- Celery for background tasks
- Redis for caching and task queue
- PostgreSQL for production database

**Infrastructure:**
- Docker for containerization
- Nginx for reverse proxy
- GitHub Actions for CI/CD
- Prometheus and Grafana for monitoring

### Key Features

- Monte Carlo simulation engine
- Real-time progress tracking via WebSockets
- Interactive data visualizations
- Export capabilities (PDF, CSV, JSON)
- Secure sharing system
- Comprehensive test suite

## Development Environment Setup

### Prerequisites

Ensure you have the following installed:

- **Node.js 18+** and npm
- **Python 3.11+** and pip
- **Docker** and Docker Compose
- **Git**
- **VS Code** (recommended) with extensions:
  - Python
  - ES7+ React/Redux/React-Native snippets
  - Prettier
  - ESLint
  - GitLens

### Initial Setup

1. **Clone the repository:**
```bash
git clone https://github.com/your-org/systemic-risk-dashboard.git
cd systemic-risk-dashboard
```

2. **Set up Python environment:**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r backend/requirements.txt
```

3. **Set up Node.js environment:**
```bash
cd frontend
npm install
cd ..
```

4. **Environment configuration:**
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env with your settings
```

5. **Initialize database:**
```bash
cd backend
python init_db.py
cd ..
```

6. **Start development servers:**

Terminal 1 (Backend):
```bash
cd backend
python run_simple.py
```

Terminal 2 (Frontend):
```bash
cd frontend
npm start
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5001

### Docker Development (Alternative)

```bash
# Start all services
docker-compose up --build

# Run specific service
docker-compose up backend
docker-compose up frontend

# View logs
docker-compose logs -f backend
```

## Architecture Overview

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (React)       │◄──►│   (Flask)       │◄──►│ (PostgreSQL)    │
│                 │    │                 │    │                 │
│ - Components    │    │ - API Routes    │    │ - User Data     │
│ - State Mgmt    │    │ - Business Logic│    │ - Simulations   │
│ - Visualizations│    │ - Auth System   │    │ - Bank Data     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │     Redis       │
                       │                 │
                       │ - Caching       │
                       │ - Task Queue    │
                       │ - Sessions      │
                       └─────────────────┘
```

### Frontend Architecture

```
src/
├── components/          # Reusable UI components
│   ├── auth/           # Authentication components
│   ├── charts/         # Data visualization components
│   ├── common/         # Shared components
│   └── simulation/     # Simulation-specific components
├── pages/              # Page-level components
├── services/           # API and external service calls
├── store/              # Redux store and slices
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
└── __tests__/          # Test files
```

### Backend Architecture

```
backend/
├── api/                # API route handlers
├── models/             # Database models
├── services/           # Business logic services
├── config/             # Configuration files
├── migrations/         # Database migrations
└── tests/              # Test files
```

### Data Flow

1. **User Interaction**: User interacts with React components
2. **State Management**: Redux manages application state
3. **API Calls**: Services make HTTP requests to Flask backend
4. **Authentication**: JWT tokens validate requests
5. **Business Logic**: Flask services process requests
6. **Database Operations**: SQLAlchemy handles data persistence
7. **Background Tasks**: Celery processes long-running simulations
8. **Real-time Updates**: WebSockets provide live progress updates

## Development Workflow

### Git Workflow

We use GitFlow with the following branches:

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: Individual feature development
- `hotfix/*`: Critical production fixes
- `release/*`: Release preparation

### Feature Development Process

1. **Create feature branch:**
```bash
git checkout develop
git pull origin develop
git checkout -b feature/your-feature-name
```

2. **Develop and test:**
```bash
# Make changes
git add .
git commit -m "feat: add new feature"

# Run tests
npm test                    # Frontend tests
python -m pytest          # Backend tests
```

3. **Push and create PR:**
```bash
git push origin feature/your-feature-name
# Create Pull Request on GitHub
```

4. **Code review and merge:**
- Address review feedback
- Ensure CI passes
- Merge to develop

### Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

feat(auth): add password reset functionality
fix(simulation): resolve parameter validation bug
docs(api): update endpoint documentation
test(frontend): add unit tests for chart components
refactor(backend): optimize database queries
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Code Review Guidelines

**For Authors:**
- Keep PRs small and focused
- Write clear descriptions
- Include tests for new features
- Update documentation
- Ensure CI passes

**For Reviewers:**
- Review within 24 hours
- Focus on logic, security, and maintainability
- Provide constructive feedback
- Test locally if needed
- Approve when satisfied

## Code Standards

### Frontend Standards

**React Components:**
```javascript
// Use functional components with hooks
import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';

const MyComponent = ({ prop1, prop2 }) => {
  const [localState, setLocalState] = useState('');
  const globalState = useSelector(state => state.feature);
  const dispatch = useDispatch();

  useEffect(() => {
    // Side effects
  }, []);

  return (
    <div>
      {/* JSX content */}
    </div>
  );
};

export default MyComponent;
```

**State Management:**
```javascript
// Redux Toolkit slices
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchData = createAsyncThunk(
  'feature/fetchData',
  async (params, { rejectWithValue }) => {
    try {
      const response = await api.getData(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const featureSlice = createSlice({
  name: 'feature',
  initialState: {
    data: [],
    loading: false,
    error: null
  },
  reducers: {
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchData.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchData.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});
```

### Backend Standards

**Flask Routes:**
```python
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from marshmallow import ValidationError

from models import Simulation
from schemas import SimulationSchema
from services.simulation_service import SimulationService

bp = Blueprint('simulations', __name__)

@bp.route('/simulations', methods=['POST'])
@jwt_required()
def create_simulation():
    """Create a new simulation."""
    try:
        schema = SimulationSchema()
        data = schema.load(request.json)
        
        user_id = get_jwt_identity()
        simulation = SimulationService.create_simulation(user_id, data)
        
        return jsonify({
            'success': True,
            'data': {'simulation': schema.dump(simulation)},
            'message': 'Simulation created successfully'
        }), 201
        
    except ValidationError as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'VALIDATION_ERROR',
                'message': 'Invalid input data',
                'details': e.messages
            }
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': {
                'code': 'INTERNAL_ERROR',
                'message': str(e)
            }
        }), 500
```

**Database Models:**
```python
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, JSON
from database import db

class Simulation(db.Model):
    __tablename__ = 'simulations'
    
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    description = Column(Text)
    parameters = Column(JSON, nullable=False)
    status = Column(String(50), default='pending')
    progress = Column(db.Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    user_id = Column(String(36), db.ForeignKey('users.id'), nullable=False)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'parameters': self.parameters,
            'status': self.status,
            'progress': self.progress,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'user_id': self.user_id
        }
```

### Styling Guidelines

**CSS/SCSS:**
- Use Material-UI theme system
- Follow BEM naming convention for custom styles
- Use CSS-in-JS for component-specific styles
- Maintain consistent spacing and typography

**Component Styling:**
```javascript
import { styled } from '@mui/material/styles';
import { Box, Paper } from '@mui/material';

const StyledContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(2),
  [theme.breakpoints.down('md')]: {
    padding: theme.spacing(2)
  }
}));

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  elevation: 2,
  '&:hover': {
    elevation: 4
  }
}));
```

## Testing Guidelines

### Frontend Testing

**Unit Tests:**
```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import MyComponent from './MyComponent';
import { mySlice } from '../store/mySlice';

const renderWithStore = (component, initialState = {}) => {
  const store = configureStore({
    reducer: { my: mySlice.reducer },
    preloadedState: initialState
  });
  
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('MyComponent', () => {
  it('renders correctly', () => {
    renderWithStore(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
  
  it('handles user interaction', async () => {
    renderWithStore(<MyComponent />);
    
    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('Updated Text')).toBeInTheDocument();
    });
  });
});
```

**Integration Tests:**
```javascript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import App from './App';

const server = setupServer(
  rest.get('/api/simulations', (req, res, ctx) => {
    return res(ctx.json({ simulations: [] }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Simulation Flow', () => {
  it('creates and runs simulation', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Navigate to create simulation
    await user.click(screen.getByText('New Simulation'));
    
    // Fill form
    await user.type(screen.getByLabelText('Name'), 'Test Simulation');
    await user.click(screen.getByText('Create'));
    
    // Verify creation
    await waitFor(() => {
      expect(screen.getByText('Simulation created')).toBeInTheDocument();
    });
  });
});
```

### Backend Testing

**Unit Tests:**
```python
import pytest
from unittest.mock import Mock, patch
from services.simulation_service import SimulationService
from models import Simulation, User

class TestSimulationService:
    def test_create_simulation(self, db_session):
        # Arrange
        user = User(username='testuser', email='test@example.com')
        db_session.add(user)
        db_session.commit()
        
        simulation_data = {
            'name': 'Test Simulation',
            'parameters': {'shock_prob': 0.1}
        }
        
        # Act
        simulation = SimulationService.create_simulation(user.id, simulation_data)
        
        # Assert
        assert simulation.name == 'Test Simulation'
        assert simulation.user_id == user.id
        assert simulation.status == 'pending'
    
    @patch('services.simulation_service.celery_app.send_task')
    def test_start_simulation(self, mock_send_task, db_session):
        # Arrange
        simulation = Simulation(
            name='Test',
            parameters={'shock_prob': 0.1},
            user_id='user-id'
        )
        db_session.add(simulation)
        db_session.commit()
        
        # Act
        SimulationService.start_simulation(simulation.id)
        
        # Assert
        mock_send_task.assert_called_once()
        assert simulation.status == 'running'
```

**API Tests:**
```python
import pytest
import json
from app import create_app
from models import User, Simulation

@pytest.fixture
def client():
    app = create_app('testing')
    with app.test_client() as client:
        with app.app_context():
            yield client

@pytest.fixture
def auth_headers(client):
    # Create test user and get token
    user_data = {
        'username': 'testuser',
        'email': 'test@example.com',
        'password': 'testpass'
    }
    client.post('/api/auth/register', json=user_data)
    
    response = client.post('/api/auth/login', json={
        'username': 'testuser',
        'password': 'testpass'
    })
    
    token = response.json['data']['access_token']
    return {'Authorization': f'Bearer {token}'}

class TestSimulationAPI:
    def test_create_simulation(self, client, auth_headers):
        simulation_data = {
            'name': 'Test Simulation',
            'parameters': {'shock_prob': 0.1}
        }
        
        response = client.post(
            '/api/simulations',
            json=simulation_data,
            headers=auth_headers
        )
        
        assert response.status_code == 201
        assert response.json['success'] is True
        assert response.json['data']['simulation']['name'] == 'Test Simulation'
    
    def test_get_simulations(self, client, auth_headers):
        response = client.get('/api/simulations', headers=auth_headers)
        
        assert response.status_code == 200
        assert 'simulations' in response.json['data']
```

### Test Coverage

Maintain minimum test coverage:
- Frontend: 80%
- Backend: 85%
- Critical paths: 95%

Run coverage reports:
```bash
# Frontend
npm test -- --coverage

# Backend
pytest --cov=. --cov-report=html
```

## Deployment Process

### Development Deployment

1. **Feature branch**: Automatic deployment to feature environment
2. **Develop branch**: Automatic deployment to staging
3. **Main branch**: Manual deployment to production

### Production Deployment

1. **Create release branch:**
```bash
git checkout develop
git pull origin develop
git checkout -b release/v1.2.0
```

2. **Update version numbers:**
```bash
# Update package.json version
# Update backend version
# Update CHANGELOG.md
```

3. **Create release:**
```bash
git tag v1.2.0
git push origin v1.2.0
```

4. **GitHub Actions** automatically deploys to production

### Rollback Procedure

If deployment fails:
```bash
# SSH to production server
ssh deploy@production-server

# Navigate to app directory
cd /opt/systemic-risk-dashboard

# Run rollback script
./deploy.sh rollback
```

## Contributing Guidelines

### Before Contributing

1. **Check existing issues** and PRs
2. **Discuss major changes** in issues first
3. **Follow coding standards** and conventions
4. **Write tests** for new functionality
5. **Update documentation** as needed

### Pull Request Process

1. **Create feature branch** from develop
2. **Make focused changes** (single responsibility)
3. **Write/update tests** with good coverage
4. **Update documentation** if needed
5. **Ensure CI passes** all checks
6. **Request review** from team members
7. **Address feedback** promptly
8. **Squash commits** before merge

### Code Review Checklist

**Functionality:**
- [ ] Code works as intended
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] Performance is acceptable

**Code Quality:**
- [ ] Code is readable and maintainable
- [ ] Follows project conventions
- [ ] No code duplication
- [ ] Appropriate abstractions

**Testing:**
- [ ] Tests cover new functionality
- [ ] Tests are meaningful and reliable
- [ ] Coverage meets requirements
- [ ] Tests pass consistently

**Documentation:**
- [ ] Code is self-documenting
- [ ] Complex logic is commented
- [ ] API changes are documented
- [ ] User-facing changes are documented

### Getting Help

**Team Communication:**
- **Slack**: #dev-systemic-risk
- **Daily Standups**: 9:00 AM EST
- **Code Reviews**: Tag @dev-team
- **Architecture Decisions**: Create RFC issue

**Resources:**
- **Wiki**: Internal documentation
- **Confluence**: Design documents
- **Jira**: Issue tracking
- **GitHub**: Code and PRs

**Mentorship:**
- **Buddy System**: New developers paired with senior dev
- **Office Hours**: Senior devs available for questions
- **Code Pairing**: Schedule pairing sessions
- **Learning Resources**: Curated list of tutorials and docs

### Development Tools

**Recommended VS Code Extensions:**
```json
{
  "recommendations": [
    "ms-python.python",
    "ms-python.flake8",
    "ms-python.black-formatter",
    "bradlc.vscode-tailwindcss",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-typescript-next",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "eamodio.gitlens"
  ]
}
```

**Useful Scripts:**
```bash
# Setup development environment
npm run dev:setup

# Run all tests
npm run test:all

# Format code
npm run format

# Lint code
npm run lint

# Build for production
npm run build:prod

# Generate API documentation
npm run docs:api
```

Welcome to the team! 🚀