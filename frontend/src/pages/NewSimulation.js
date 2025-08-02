import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Breadcrumbs,
  Link,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import ParameterControlPanel from '../components/simulation/ParameterControlPanel';
import simulationService from '../services/simulationService';

const NewSimulation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Get pre-filled parameters from navigation state (for rerun functionality)
  const prefilledParameters = location.state?.prefilledParameters;
  const simulationName = location.state?.simulationName;

  const handleRunSimulation = async (parameters) => {
    try {
      setLoading(true);
      setError(null);
      setValidationErrors({});

      // Create simulation data
      const simulationData = {
        name: simulationName || `Simulation ${new Date().toLocaleString()}`,
        description: `Monte Carlo simulation with ${parameters.n_sim} iterations`,
        parameters: parameters
      };

      // Create and start the simulation
      const response = await simulationService.createSimulation(simulationData);
      
      // Navigate to the simulation detail page
      navigate(`/simulations/${response.simulation.id}`);
    } catch (err) {
      console.error('Error creating simulation:', err);
        console.error('Full error details:', err.response || err);
      
      if (err.response?.status === 422) {
        // Validation errors
        setValidationErrors(err.response.data.errors || {});
        setError('Please fix the validation errors and try again.');
      } else {
        setError('Failed to create simulation. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          color="inherit"
          href="/dashboard"
          onClick={(e) => {
            e.preventDefault();
            navigate('/dashboard');
          }}
        >
          Dashboard
        </Link>
        <Link
          color="inherit"
          href="/simulations"
          onClick={(e) => {
            e.preventDefault();
            navigate('/simulations');
          }}
        >
          Simulations
        </Link>
        <Typography color="text.primary">New Simulation</Typography>
      </Breadcrumbs>

      {/* Page Header */}
      <Box mb={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          {simulationName || 'New Simulation'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Configure parameters and run a new Monte Carlo simulation to analyze systemic risk 
          in traditional vs blockchain banking systems.
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Parameter Control Panel */}
      <Card>
        <CardContent>
          <ParameterControlPanel
            initialParameters={prefilledParameters}
            onRunSimulation={handleRunSimulation}
            loading={loading}
            validationErrors={validationErrors}
            title="Simulation Parameters"
            submitButtonText="Run Simulation"
          />
        </CardContent>
      </Card>
    </Container>
  );
};

export default NewSimulation;