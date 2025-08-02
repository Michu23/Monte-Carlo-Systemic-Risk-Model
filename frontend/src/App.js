import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Box, CircularProgress } from '@mui/material';
import { checkAuth } from './store/authSlice';
import ErrorBoundary from './components/common/ErrorBoundary';
import NotificationSystem from './components/common/NotificationSystem';
import { initializePerformanceMonitoring } from './utils/performance';
import { initializeAccessibility } from './utils/accessibility';

// Layouts
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';

// Pages - using lazy loading for better performance
import { LazyPages } from './utils/lazyLoading';
import Login from './pages/Login';
import Register from './pages/Register';
import NotFound from './pages/NotFound';
import AuthTest from './components/AuthTest';

const {
  Dashboard,
  SimulationsList,
  SimulationDetail,
  SimulationHistory,
  BanksList,
  NewSimulation,
  SharedSimulation
} = LazyPages;

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useSelector(state => state.auth);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

const App = () => {
  const dispatch = useDispatch();
  
  useEffect(() => {
    dispatch(checkAuth());
    
    // Initialize performance monitoring
    initializePerformanceMonitoring();
    
    // Initialize accessibility features
    initializeAccessibility();
  }, [dispatch]);
  
  return (
    <ErrorBoundary>
      <Routes>
        {/* Auth routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        
        {/* API Test Route */}
        <Route path="/test" element={<AuthTest />} />
        
        {/* Public shared simulation route */}
        <Route path="/shared/:shareToken" element={<SharedSimulation />} />
        
        {/* Protected routes */}
        <Route element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route path="/" element={<Dashboard />} />
          <Route path="/simulations" element={<SimulationsList />} />
          <Route path="/simulations/:id" element={<SimulationDetail />} />
          <Route path="/simulations/new" element={<NewSimulation />} />
          <Route path="/simulations/history" element={<SimulationHistory />} />
          <Route path="/banks" element={<BanksList />} />
        </Route>
        
        {/* 404 route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      {/* Global notification system */}
      <NotificationSystem />
    </ErrorBoundary>
  );
};

export default App;